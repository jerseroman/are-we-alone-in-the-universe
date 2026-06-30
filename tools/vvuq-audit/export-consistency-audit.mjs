import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, recordCommandResult, repoRoot, runCommand, sanitizeFilePart, summarizeOutput, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

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
    runs.push({ name: spec.name, command: result.commandLine, ...summarizeOutput(result) });
    if (result.status !== 'PASS') break;
  }
  const failed = runs.filter(item => item.status !== 'PASS');
  const summary = {
    status: failed.length ? 'FAIL' : 'PASS',
    checks: runs.length,
    failed_checks: failed.length,
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
    ...runs.map(item => `| ${item.name} | ${item.status} |`)
  ].join('\n'));
  process.stdout.write(`EXPORT_CONSISTENCY ${summary.status}: ${summary.checks} checks\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('export-consistency');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runExportConsistencyAudit(outDir, { timeoutMs: args.timeoutMs });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
