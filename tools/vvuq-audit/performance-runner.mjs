import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

export async function runPerformance(outDir, options = {}) {
  const seconds = Math.max(5, Number(options.seconds || 60));
  const deadline = Date.now() + seconds * 1000;
  const commands = [
    { name: 'syntax', command: 'npm', args: ['run', 'check:syntax'], timeoutMs: 60000 },
    { name: 'numerics', command: 'npm', args: ['run', 'test:numerics'], timeoutMs: 90000 },
    { name: 'universe-scale', command: 'npm', args: ['run', 'test:universe-scale'], timeoutMs: 90000 }
  ];
  const runs = [];
  let iteration = 0;

  while (Date.now() < deadline) {
    const spec = commands[iteration % commands.length];
    const result = await runCommand(spec.command, spec.args, { timeoutMs: spec.timeoutMs });
    runs.push({
      name: spec.name,
      command: result.commandLine,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut
    });
    iteration += 1;
    if (result.status !== 'PASS') break;
  }

  const failed = runs.filter(r => r.status !== 'PASS');
  const durations = runs.map(r => r.durationMs).filter(Number.isFinite);
  const summary = {
    status: failed.length ? 'FAIL' : 'PASS',
    seconds_requested: seconds,
    executions: runs.length,
    failed_executions: failed.length,
    max_duration_ms: durations.length ? Math.max(...durations) : null,
    average_duration_ms: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    runs
  };

  await writeJson(path.join(outDir, 'performance-summary.json'), summary);
  await writeText(path.join(outDir, 'performance-report.md'), [
    '# Performance And Memory Smoke',
    '',
    `Status: **${summary.status}**`,
    '',
    `Executions: ${summary.executions}`,
    `Failed executions: ${summary.failed_executions}`,
    `Max duration ms: ${summary.max_duration_ms}`,
    `Average duration ms: ${summary.average_duration_ms}`,
    '',
    '| Command | Status | Duration ms |',
    '| --- | --- | ---: |',
    ...runs.map(r => `| ${r.command} | ${r.status} | ${r.durationMs} |`)
  ].join('\n'));
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : process.cwd();
  const summary = await runPerformance(outDir, { seconds: args.seconds });
  process.stdout.write(`PERFORMANCE ${summary.status}: ${summary.executions} executions\n`);
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

