import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, recordCommandResult, repoRoot, runCommand, sanitizeFilePart, summarizeOutput, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

function adjudicateCommand(result, summary) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const hasFailureEvidence = summary.failLines > 0 || Number(summary.failures || 0) > 0 || /^FAIL:/m.test(output);
  const hasCompletionEvidence = /completed\.|completed successfully|regression test completed/i.test(output);
  if (result.timedOut && !hasFailureEvidence && (summary.passLines > 0 || hasCompletionEvidence)) {
    return {
      status: 'PARTIAL',
      adjudication: 'TIMEOUT_AFTER_PASS_OUTPUT',
      reason: 'Command was terminated by the audit timeout after PASS output and without FAIL evidence.'
    };
  }
  return {
    status: result.status,
    adjudication: result.status === 'PASS' ? 'COMMAND_PASS' : 'COMMAND_FAIL',
    reason: result.status === 'PASS' ? 'Command exited successfully.' : 'Command failed or timed out with insufficient pass evidence.'
  };
}

export async function runExportConsistencyAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const commands = [
    { name: 'standalone-export-consistency', command: 'npm', args: ['run', 'test:standalone-export'], timeoutMs: 180000 },
    { name: 'state-transition-export-deep', command: 'npm', args: ['run', 'test:deep'], timeoutMs: 240000 },
    { name: 'preset-reset-export-state', command: 'npm', args: ['run', 'test:preset-state-reset'], timeoutMs: 120000 }
  ];
  const runs = [];
  for (const spec of commands) {
    const result = await runCommand(spec.command, spec.args, { timeoutMs: Number(options.timeoutMs || spec.timeoutMs) });
    await recordCommandResult(outDir, spec.name, result);
    const rawSummary = summarizeOutput(result);
    const adjudicated = adjudicateCommand(result, rawSummary);
    runs.push({ name: spec.name, command: result.commandLine, ...rawSummary, ...adjudicated });
    if (adjudicated.status === 'FAIL') break;
  }
  const failed = runs.filter(item => item.status === 'FAIL');
  const partial = runs.filter(item => item.status === 'PARTIAL');
  const summary = {
    status: failed.length ? 'FAIL' : partial.length ? 'PARTIAL' : 'PASS',
    checks: runs.length,
    failed_checks: failed.length,
    partial_checks: partial.length,
    runs
  };
  await writeJson(path.join(outDir, 'export-consistency-summary.json'), summary);
  await writeText(path.join(outDir, 'export-consistency-report.md'), [
    '# Export Consistency Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Check | Status |',
    '| --- | --- |',
    ...runs.map(item => `| ${item.name} | ${item.status} (${item.adjudication}) |`)
  ].join('\n'));
  process.stdout.write(`EXPORT_CONSISTENCY ${summary.status}: ${summary.checks} checks\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('export-consistency');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runExportConsistencyAudit(outDir, { timeoutMs: args.timeoutMs });
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
