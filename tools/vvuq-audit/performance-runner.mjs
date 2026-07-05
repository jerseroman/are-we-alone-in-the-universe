import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

function memorySnapshot() {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heap_total: mem.heapTotal,
    heap_used: mem.heapUsed,
    external: mem.external,
    array_buffers: mem.arrayBuffers,
    system_free: os.freemem(),
    system_total: os.totalmem()
  };
}

function average(values) {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

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
    const beforeMemory = memorySnapshot();
    const result = await runCommand(spec.command, spec.args, { timeoutMs: spec.timeoutMs });
    const afterMemory = memorySnapshot();
    runs.push({
      name: spec.name,
      command: result.commandLine,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      memory_before: beforeMemory,
      memory_after: afterMemory,
      rss_delta: afterMemory.rss - beforeMemory.rss,
      heap_used_delta: afterMemory.heap_used - beforeMemory.heap_used
    });
    iteration += 1;
    if (result.status !== 'PASS') break;
  }

  const failed = runs.filter(r => r.status !== 'PASS');
  const durations = runs.map(r => r.durationMs).filter(Number.isFinite);
  const rssValues = runs.flatMap(r => [r.memory_before?.rss, r.memory_after?.rss]).filter(Number.isFinite);
  const heapValues = runs.flatMap(r => [r.memory_before?.heap_used, r.memory_after?.heap_used]).filter(Number.isFinite);
  const rssDeltas = runs.map(r => r.rss_delta).filter(Number.isFinite);
  const heapDeltas = runs.map(r => r.heap_used_delta).filter(Number.isFinite);
  const summary = {
    status: failed.length ? 'FAIL' : 'PASS',
    seconds_requested: seconds,
    executions: runs.length,
    failed_executions: failed.length,
    max_duration_ms: durations.length ? Math.max(...durations) : null,
    average_duration_ms: average(durations),
    max_rss_bytes: rssValues.length ? Math.max(...rssValues) : null,
    average_rss_delta_bytes: average(rssDeltas),
    max_heap_used_bytes: heapValues.length ? Math.max(...heapValues) : null,
    average_heap_used_delta_bytes: average(heapDeltas),
    slowest_command: runs.length
      ? runs.reduce((max, item) => (item.durationMs > max.durationMs ? item : max), runs[0]).name
      : null,
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
    `Max RSS bytes: ${summary.max_rss_bytes}`,
    `Average RSS delta bytes: ${summary.average_rss_delta_bytes}`,
    `Max heap used bytes: ${summary.max_heap_used_bytes}`,
    `Average heap used delta bytes: ${summary.average_heap_used_delta_bytes}`,
    `Slowest command: ${summary.slowest_command}`,
    '',
    '| Command | Status | Duration ms | RSS delta | Heap delta |',
    '| --- | --- | ---: | ---: | ---: |',
    ...runs.map(r => `| ${r.command} | ${r.status} | ${r.durationMs} | ${r.rss_delta} | ${r.heap_used_delta} |`)
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
