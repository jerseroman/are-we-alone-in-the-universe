import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runRandomUiOracleFuzz } from './random-ui-oracle-fuzz.mjs';
import {
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

const COMMANDS = [
  { name: 'state-transition-deep', command: 'npm', args: ['run', 'test:deep'], timeoutMs: 240000, minStartMs: 210000 },
  { name: 'preset-state-reset', command: 'npm', args: ['run', 'test:preset-state-reset'], timeoutMs: 120000, minStartMs: 60000 },
  { name: 'standalone-export-consistency', command: 'npm', args: ['run', 'test:standalone-export'], timeoutMs: 180000, minStartMs: 90000 }
];

export async function runStateTransitionSoak(outDir, options = {}) {
  await ensureDir(outDir);
  const seconds = Math.max(5, Number(options.seconds || 300));
  const deadline = Date.now() + seconds * 1000;
  const seed = Number(options.seed || 20260629) >>> 0;
  const runs = [];
  let iteration = 0;
  let failed = false;

  while (!failed && Date.now() < deadline) {
    iteration += 1;
    const remainingSeconds = Math.max(1, Math.floor((deadline - Date.now()) / 1000));
    const fuzzSteps = Math.max(24, Math.min(300, remainingSeconds * 8));
    const fuzzOut = path.join(outDir, `iteration-${String(iteration).padStart(4, '0')}-random-state`);
    const fuzzSummary = await runRandomUiOracleFuzz(fuzzOut, {
      seconds: remainingSeconds,
      seed: (seed + iteration * 7919) >>> 0,
      maxSteps: fuzzSteps,
      oracleEvery: 16,
      oracleBatchSize: 8,
      progressEvery: fuzzSteps + 1,
      paceMs: 0,
      edgeSweep: true
    });
    runs.push({
      iteration,
      name: 'random-ui-state-transition-edge-sweep',
      status: fuzzSummary.status,
      steps: fuzzSummary.steps,
      oracle_cases: fuzzSummary.oracle_cases,
      monte_carlo_runs: fuzzSummary.monte_carlo_runs
    });
    if (fuzzSummary.status !== 'PASS') {
      failed = true;
      break;
    }

    for (const spec of COMMANDS) {
      if (Date.now() >= deadline) break;
      const remainingMs = deadline - Date.now();
      if (remainingMs < spec.minStartMs) {
        runs.push({
          iteration,
          name: spec.name,
          status: 'SKIPPED',
          reason: `remaining time ${remainingMs}ms is below ${spec.minStartMs}ms start threshold`
        });
        continue;
      }
      const result = await runCommand(spec.command, spec.args, {
        timeoutMs: Math.min(spec.timeoutMs, Math.max(30000, remainingMs + 15000))
      });
      await recordCommandResult(outDir, `${String(iteration).padStart(4, '0')}-${spec.name}`, result);
      runs.push({
        iteration,
        name: spec.name,
        command: result.commandLine,
        ...summarizeOutput(result)
      });
      if (result.status !== 'PASS') {
        failed = true;
        break;
      }
    }
  }

  const failures = runs.filter(item => item.status !== 'PASS' && item.status !== 'SKIPPED');
  const summary = {
    status: failures.length ? 'FAIL' : 'PASS',
    seconds_requested: seconds,
    seed,
    iterations: iteration,
    checks: runs.length,
    failed_checks: failures.length,
    runs
  };

  await writeJson(path.join(outDir, 'state-transition-soak-summary.json'), summary);
  await writeText(path.join(outDir, 'state-transition-soak-report.md'), [
    '# State Transition Soak Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Seconds requested: ${summary.seconds_requested}`,
    `Iterations: ${summary.iterations}`,
    `Checks: ${summary.checks}`,
    `Failed checks: ${summary.failed_checks}`,
    '',
    '| Iteration | Check | Status | Evidence |',
    '| ---: | --- | --- | --- |',
    ...runs.map(item => {
      const evidence = item.command
        ? `${item.command}; duration=${item.durationMs}ms`
        : item.reason
          ? item.reason
        : `steps=${item.steps}; oracle=${item.oracle_cases}; mc=${item.monte_carlo_runs}`;
      return `| ${item.iteration} | ${item.name} | ${item.status} | ${evidence} |`;
    })
  ].join('\n'));

  process.stdout.write(`STATE_TRANSITION_SOAK ${summary.status}: ${summary.checks} checks\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('state-transition-soak');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runStateTransitionSoak(outDir, {
    seconds: args.seconds,
    seed: args.seed
  });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
