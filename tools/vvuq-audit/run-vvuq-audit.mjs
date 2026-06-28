import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROTATING_PROFILES } from './profile-definitions.mjs';
import { runStaticScan } from './static-scan.mjs';
import { writeTraceability } from './traceability.mjs';
import { runOracle } from './run-oracle.mjs';
import { compileReport } from './compile-report.mjs';
import {
  appendJsonl,
  collectEnvironment,
  ensureDir,
  parseArgs,
  recordCommandResult,
  repoRoot,
  runCommand,
  sanitizeFilePart,
  summarizeOutput,
  timestampId,
  writeJson,
  writeText
} from './lib/audit-utils.mjs';

function modeDefaults(mode, args) {
  if (mode === '10h') return { hours: Number(args.hours || 10), rotating: true };
  if (mode === '24h') return { hours: Number(args.hours || 24), rotating: true };
  if (mode === 'rotating') return { hours: Number(args.hours || 24), rotating: true };
  return { hours: 0, rotating: false };
}

function replacePlaceholders(args, context) {
  return args.map(arg => String(arg)
    .replaceAll('{profileOut}', context.profileOut)
    .replaceAll('{runDir}', context.runDir));
}

async function runStep(runDir, name, step, context, timeoutMs) {
  const args = replacePlaceholders(step.args || [], context);
  const result = await runCommand(step.command, args, { timeoutMs });
  await recordCommandResult(runDir, name, result);
  return result;
}

async function runProfile(runDir, profile, options) {
  const startedAt = new Date();
  const profileOut = path.join(runDir, 'profiles', `${String(options.executionIndex).padStart(5, '0')}-${profile.id}`);
  await ensureDir(profileOut);
  const stepResults = [];
  const timeoutMs = Math.max(30000, Number(options.sliceMinutes || 5) * 60 * 1000);

  for (let i = 0; i < profile.steps.length; i += 1) {
    const step = profile.steps[i];
    const name = `${String(options.executionIndex).padStart(5, '0')}-${profile.id}-step-${i + 1}`;
    const result = await runStep(runDir, name, step, { runDir, profileOut }, timeoutMs);
    stepResults.push({
      name,
      command: result.commandLine,
      summary: summarizeOutput(result)
    });
    if (result.status !== 'PASS') break;
  }

  const status = stepResults.every(r => r.summary.status === 'PASS') ? 'PASS' : 'FAIL';
  const summary = {
    id: profile.id,
    title: profile.title,
    execution_index: options.executionIndex,
    status,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    steps: stepResults
  };
  await writeJson(path.join(profileOut, 'profile-summary.json'), summary);
  return summary;
}

async function runSmoke(runDir) {
  const commands = [
    { name: 'baseline-test-all', command: 'npm', args: ['run', 'test:all'], timeoutMs: 240000 },
    { name: 'absolute-deep-audit', command: 'npm', args: ['run', 'test:absolute'], timeoutMs: 180000 }
  ];
  const results = [];
  for (const spec of commands) {
    const result = await runCommand(spec.command, spec.args, { timeoutMs: spec.timeoutMs });
    await recordCommandResult(runDir, spec.name, result);
    results.push({ name: spec.name, ...summarizeOutput(result) });
    if (result.status !== 'PASS') break;
  }

  const staticSummary = await runStaticScan({ outDir: runDir });
  const traceability = await writeTraceability(runDir);
  const oracle = await runOracle(runDir);
  const status = results.every(r => r.status === 'PASS')
    && staticSummary.status === 'PASS'
    && traceability.status === 'PASS'
    && oracle.status !== 'FAIL'
    ? 'PASS'
    : 'FAIL';

  const summary = {
    status,
    mode: 'smoke',
    generated_at: new Date().toISOString(),
    command_results: results,
    static_scan_status: staticSummary.status,
    traceability_rows: traceability.rows.length,
    oracle_status: oracle.status
  };
  await writeJson(path.join(runDir, 'smoke-summary.json'), summary);
  return summary;
}

async function runRotating(runDir, args, defaults) {
  const sliceMinutes = Number(args['slice-minutes'] || args.sliceMinutes || 5);
  const hours = defaults.hours;
  const seed = args.seed || String(Date.now());
  const workers = args.workers || 'sequential';
  const maxProfiles = args['max-profiles'] ? Number(args['max-profiles']) : null;
  const deadline = Date.now() + hours * 60 * 60 * 1000;
  const failuresFile = path.join(runDir, 'failures', 'profile-failures.jsonl');
  await ensureDir(path.join(runDir, 'checkpoints'));
  await ensureDir(path.join(runDir, 'failures'));

  await runStaticScan({ outDir: runDir });
  await writeTraceability(runDir);
  await runOracle(runDir);

  const executions = [];
  let executionIndex = 0;
  while (Date.now() < deadline && (!maxProfiles || executions.length < maxProfiles)) {
    const profile = ROTATING_PROFILES[executionIndex % ROTATING_PROFILES.length];
    executionIndex += 1;
    const result = await runProfile(runDir, profile, { executionIndex, sliceMinutes });
    executions.push({
      id: result.id,
      title: result.title,
      execution_index: result.execution_index,
      status: result.status,
      started_at: result.started_at,
      ended_at: result.ended_at
    });
    if (result.status !== 'PASS') {
      await appendJsonl(failuresFile, result);
    }
    await writeJson(path.join(runDir, 'checkpoints', `checkpoint-${String(executionIndex).padStart(5, '0')}.json`), {
      generated_at: new Date().toISOString(),
      execution_index: executionIndex,
      profile_id: profile.id,
      status: result.status,
      remaining_ms: Math.max(0, deadline - Date.now())
    });
  }

  const failed = executions.filter(e => e.status !== 'PASS');
  const summary = {
    status: failed.length ? 'FAIL' : 'PASS',
    mode: hours === 24 ? '24h' : hours === 10 ? '10h' : 'rotating',
    hours_requested: hours,
    slice_minutes: sliceMinutes,
    workers,
    seed,
    max_profiles: maxProfiles,
    started_at: new Date(deadline - hours * 60 * 60 * 1000).toISOString(),
    ended_at: new Date().toISOString(),
    profile_count: ROTATING_PROFILES.length,
    profile_executions: executions.length,
    failed_profile_executions: failed.length,
    profiles: ROTATING_PROFILES.map(p => ({ id: p.id, title: p.title })),
    executions
  };
  await writeJson(path.join(runDir, 'timeboxed-summary.json'), summary);
  await writeText(path.join(runDir, 'timeboxed-report.md'), [
    '# Randomized Timeboxed Stress Summary',
    '',
    `Status: **${summary.status}**`,
    '',
    `Hours requested: ${summary.hours_requested}`,
    `Slice minutes: ${summary.slice_minutes}`,
    `Profile executions: ${summary.profile_executions}`,
    `Failed profile executions: ${summary.failed_profile_executions}`,
    '',
    '| Execution | Profile | Status |',
    '| ---: | --- | --- |',
    ...executions.map(e => `| ${e.execution_index} | ${e.id} | ${e.status} |`)
  ].join('\n'));
  return summary;
}

export async function runAudit(args = parseArgs()) {
  const mode = String(args.mode || args._?.[0] || 'smoke').toLowerCase();
  const defaults = modeDefaults(mode, args);
  const runId = args.runId || timestampId(mode);
  const runDir = args.out
    ? path.resolve(repoRoot, args.out)
    : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  await ensureDir(runDir);

  await collectEnvironment(runDir);
  const summary = defaults.rotating
    ? await runRotating(runDir, args, defaults)
    : await runSmoke(runDir);

  const compiled = await compileReport(runDir);
  await writeJson(path.join(runDir, 'run-summary.json'), {
    ...summary,
    final_report_status: compiled.status,
    final_report: path.join(runDir, 'FULL_VVUQ_MODEL_AUDIT_REPORT.md')
  });

  process.stdout.write(`VVUQ_AUDIT ${summary.status}: ${path.join(runDir, 'FULL_VVUQ_MODEL_AUDIT_REPORT.md')}\n`);
  return { runDir, summary, compiled };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAudit().then(({ summary }) => {
    process.exit(summary.status === 'PASS' ? 0 : 1);
  }).catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
