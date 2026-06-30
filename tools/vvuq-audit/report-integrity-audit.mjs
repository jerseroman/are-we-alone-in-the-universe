import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, sanitizeFilePart, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

async function readJson(file, failures, required = false) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (error) {
    if (required || fs.existsSync(file)) {
      failures.push({ file, message: error.message });
    }
    return null;
  }
}

async function readJsonl(file, failures, required = false) {
  if (!fs.existsSync(file)) {
    if (required) failures.push({ file, message: 'missing required JSONL file' });
    return [];
  }
  const rows = [];
  const lines = (await fsp.readFile(file, 'utf8')).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      failures.push({ file, line: i + 1, message: error.message });
    }
  }
  return rows;
}

async function listFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, predicate));
    else if (!predicate || predicate(full)) files.push(full);
  }
  return files;
}

function countByStatus(items) {
  const counts = {};
  for (const item of items) counts[item.status || 'UNKNOWN'] = (counts[item.status || 'UNKNOWN'] || 0) + 1;
  return counts;
}

export async function runReportIntegrityAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const runDir = options.runDir ? path.resolve(repoRoot, options.runDir) : outDir;
  const failures = [];
  const warnings = [];

  if (!fs.existsSync(runDir)) {
    failures.push({ file: runDir, message: 'audit run directory does not exist' });
  }

  const events = await readJsonl(path.join(runDir, 'events.jsonl'), failures, true);
  const checkpoints = [];
  const checkpointFiles = await listFiles(path.join(runDir, 'checkpoints'), file => /checkpoint-\d+\.json$/i.test(path.basename(file)));
  for (const file of checkpointFiles) {
    const parsed = await readJson(file, failures, true);
    if (parsed) checkpoints.push(parsed);
  }
  const latest = await readJson(path.join(runDir, 'latest-status.json'), failures, false);

  const profileSummaries = [];
  const profileFiles = await listFiles(path.join(runDir, 'profiles'), file => path.basename(file) === 'profile-summary.json');
  for (const file of profileFiles) {
    const parsed = await readJson(file, failures, true);
    if (parsed) profileSummaries.push({ file, ...parsed });
  }

  const commandFiles = await listFiles(path.join(runDir, 'commands'), file => file.endsWith('.json'));
  const commandResults = [];
  for (const file of commandFiles) {
    const parsed = await readJson(file, failures, true);
    if (parsed) commandResults.push({ file, ...parsed });
  }

  for (const profile of profileSummaries) {
    const actualFailed = (profile.steps || []).filter(step => step.summary?.status !== 'PASS').length;
    if (profile.commands_failed !== actualFailed) {
      failures.push({
        file: profile.file,
        message: `profile commands_failed=${profile.commands_failed} but failed step count=${actualFailed}`
      });
    }
    if (actualFailed > 0 && profile.status === 'PASS') {
      failures.push({ file: profile.file, message: 'profile is PASS while one or more steps failed' });
    }
    if (actualFailed === 0 && profile.status === 'FAIL') {
      warnings.push({ file: profile.file, message: 'profile is FAIL but no failed step is listed' });
    }
  }

  const failedProfiles = profileSummaries.filter(item => item.status !== 'PASS');
  if (latest) {
    if (latest.failed_profile_executions < failedProfiles.length) {
      failures.push({
        file: path.join(runDir, 'latest-status.json'),
        message: `latest failed_profile_executions=${latest.failed_profile_executions} but profile summaries contain ${failedProfiles.length} failures`
      });
    }
    if (latest.profile_executions < profileSummaries.length) {
      failures.push({
        file: path.join(runDir, 'latest-status.json'),
        message: `latest profile_executions=${latest.profile_executions} but ${profileSummaries.length} profile summaries exist`
      });
    }
  } else if (profileSummaries.length || checkpoints.length) {
    failures.push({ file: path.join(runDir, 'latest-status.json'), message: 'missing latest-status.json after checkpoints/profiles were written' });
  }

  const finalSummary = await readJson(path.join(runDir, 'extended-rotating-summary.json'), failures, false);
  if (finalSummary) {
    if (finalSummary.profile_executions !== profileSummaries.length) {
      failures.push({
        file: path.join(runDir, 'extended-rotating-summary.json'),
        message: `final profile_executions=${finalSummary.profile_executions} but ${profileSummaries.length} profile summaries exist`
      });
    }
    if (finalSummary.failed_profile_executions !== failedProfiles.length) {
      failures.push({
        file: path.join(runDir, 'extended-rotating-summary.json'),
        message: `final failed_profile_executions=${finalSummary.failed_profile_executions} but ${failedProfiles.length} failed profile summaries exist`
      });
    }
    if (finalSummary.status === 'PASS' && failedProfiles.length > 0) {
      failures.push({
        file: path.join(runDir, 'extended-rotating-summary.json'),
        message: 'final summary is PASS while at least one profile summary failed'
      });
    }
    const reportFile = path.join(runDir, 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md');
    if (!fs.existsSync(reportFile)) {
      failures.push({ file: reportFile, message: 'final summary exists but final markdown report is missing' });
    } else {
      const reportText = await fsp.readFile(reportFile, 'utf8');
      if (finalSummary.status === 'PASS' && !/badge\/PASS-green/.test(reportText)) {
        failures.push({ file: reportFile, message: 'PASS final report does not contain a green PASS badge' });
      }
      if (finalSummary.status === 'FAIL' && /badge\/PASS-green/.test(reportText)) {
        failures.push({ file: reportFile, message: 'FAIL final report contains a green PASS badge' });
      }
    }
  }

  const commandFailures = commandResults.filter(item => item.status !== 'PASS');
  const eventStarts = events.filter(item => item.type === 'profile_start').length;
  const eventEnds = events.filter(item => item.type === 'profile_end').length;
  if (eventEnds > eventStarts) {
    failures.push({ file: path.join(runDir, 'events.jsonl'), message: 'profile_end count exceeds profile_start count' });
  }

  const summary = {
    status: failures.length ? 'FAIL' : 'PASS',
    run_dir: runDir,
    events: events.length,
    profile_starts: eventStarts,
    profile_ends: eventEnds,
    checkpoint_files: checkpoints.length,
    profile_summaries: profileSummaries.length,
    command_results: commandResults.length,
    failed_command_results: commandFailures.length,
    profile_status_counts: countByStatus(profileSummaries),
    command_status_counts: countByStatus(commandResults),
    failures,
    warnings
  };

  await writeJson(path.join(outDir, 'report-integrity-summary.json'), summary);
  await writeText(path.join(outDir, 'report-integrity-report.md'), [
    '# Report Integrity Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Run dir: ${summary.run_dir}`,
    `Events: ${summary.events}`,
    `Profile summaries: ${summary.profile_summaries}`,
    `Command results: ${summary.command_results}`,
    `Failures: ${summary.failures.length}`,
    `Warnings: ${summary.warnings.length}`,
    '',
    '| Area | Count |',
    '| --- | ---: |',
    `| Checkpoints | ${summary.checkpoint_files} |`,
    `| Profile starts | ${summary.profile_starts} |`,
    `| Profile ends | ${summary.profile_ends} |`,
    `| Failed commands | ${summary.failed_command_results} |`,
    '',
    summary.failures.length
      ? `Failure details: ${summary.failures.map(item => `${item.file}: ${item.message}`).join('; ')}`
      : 'Failure details: none'
  ].join('\n'));

  process.stdout.write(`REPORT_INTEGRITY ${summary.status}: profiles=${summary.profile_summaries}, commands=${summary.command_results}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('report-integrity');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runReportIntegrityAudit(outDir, {
    runDir: args['run-dir'] || args.runDir
  });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
