import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runRandomUiOracleFuzz } from './random-ui-oracle-fuzz.mjs';
import { ensureDir, parseArgs, recordCommandResult, repoRoot, runCommand, sanitizeFilePart, summarizeOutput, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

export async function runBoundaryExtremeAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const steps = Math.max(32, Number(options.steps || 256));
  const fuzzOut = path.join(outDir, 'edge-sweep-fuzz');
  const fuzz = await runRandomUiOracleFuzz(fuzzOut, {
    seconds: Math.max(60, Number(options.seconds || 600)),
    seed: Number(options.seed || 20260629) >>> 0,
    maxSteps: steps,
    oracleEvery: 4,
    oracleBatchSize: 8,
    progressEvery: steps + 1,
    paceMs: 0,
    edgeSweep: true
  });
  const commands = [
    { name: 'numerics-boundaries', command: 'npm', args: ['run', 'test:numerics'], timeoutMs: 120000 },
    { name: 'absolute-boundaries', command: 'npm', args: ['run', 'test:absolute'], timeoutMs: 180000 },
    { name: 'monte-carlo-boundaries', command: 'npm', args: ['run', 'test:montecarlo'], timeoutMs: 180000 }
  ];
  const commandResults = [];
  for (const spec of commands) {
    const result = await runCommand(spec.command, spec.args, { timeoutMs: spec.timeoutMs });
    await recordCommandResult(outDir, spec.name, result);
    commandResults.push({ name: spec.name, command: result.commandLine, ...summarizeOutput(result) });
    if (result.status !== 'PASS') break;
  }
  const failed = commandResults.filter(item => item.status !== 'PASS');
  const summary = {
    status: fuzz.status === 'PASS' && failed.length === 0 ? 'PASS' : 'FAIL',
    steps,
    fuzz_status: fuzz.status,
    gui_deterministic_checks: fuzz.gui_deterministic_checks,
    oracle_cases: fuzz.oracle_cases,
    monte_carlo_gui_checks: fuzz.monte_carlo_gui_checks,
    command_results: commandResults
  };
  await writeJson(path.join(outDir, 'boundary-extreme-summary.json'), summary);
  await writeText(path.join(outDir, 'boundary-extreme-report.md'), [
    '# Boundary And Extreme Value Fuzz',
    '',
    `Status: **${summary.status}**`,
    '',
    `Steps: ${summary.steps}`,
    `GUI deterministic checks: ${summary.gui_deterministic_checks}`,
    `Oracle cases: ${summary.oracle_cases}`,
    `Monte Carlo GUI checks: ${summary.monte_carlo_gui_checks}`,
    '',
    '| Command | Status |',
    '| --- | --- |',
    ...commandResults.map(item => `| ${item.command} | ${item.status} |`)
  ].join('\n'));
  process.stdout.write(`BOUNDARY_EXTREME ${summary.status}: ${summary.steps} edge steps\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('boundary-extreme');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runBoundaryExtremeAudit(outDir, { steps: args.steps, seconds: args.seconds, seed: args.seed });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
