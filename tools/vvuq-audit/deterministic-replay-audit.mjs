import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runRandomUiOracleFuzz } from './random-ui-oracle-fuzz.mjs';
import { ensureDir, parseArgs, repoRoot, sanitizeFilePart, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function traceSignature(row) {
  return JSON.stringify({
    step: row.step,
    action: row.action,
    deterministic: row.deterministic,
    gui_formatted: row.gui_formatted,
    activeAdvancedModules: row.activeAdvancedModules,
    occurrence: row.occurrence,
    galaxy: row.galaxy,
    flags: row.flags
  });
}

export async function runDeterministicReplayAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const seed = Number(options.seed || 20260629) >>> 0;
  const steps = Math.max(1, Number(options.steps || 240));
  const runA = path.join(outDir, 'replay-a');
  const runB = path.join(outDir, 'replay-b');

  const common = {
    seconds: Math.max(60, Number(options.seconds || 600)),
    seed,
    maxSteps: steps,
    oracleEvery: Math.max(1, Number(options.oracleEvery || 25)),
    oracleBatchSize: Math.max(1, Number(options.oracleBatchSize || 10)),
    progressEvery: steps + 1,
    paceMs: 0,
    edgeSweep: !!options.edgeSweep
  };
  const summaryA = await runRandomUiOracleFuzz(runA, common);
  const summaryB = await runRandomUiOracleFuzz(runB, common);
  const traceA = await readJsonl(path.join(runA, 'random-ui-replay-trace.jsonl'));
  const traceB = await readJsonl(path.join(runB, 'random-ui-replay-trace.jsonl'));
  const mismatches = [];
  const length = Math.max(traceA.length, traceB.length);
  for (let i = 0; i < length; i += 1) {
    const a = traceA[i] ? traceSignature(traceA[i]) : null;
    const b = traceB[i] ? traceSignature(traceB[i]) : null;
    if (a !== b) {
      mismatches.push({ index: i, a: traceA[i] || null, b: traceB[i] || null });
      if (mismatches.length >= 20) break;
    }
  }
  const summary = {
    status: summaryA.status === 'PASS' && summaryB.status === 'PASS' && mismatches.length === 0 ? 'PASS' : 'FAIL',
    seed,
    steps_requested: steps,
    edge_sweep: !!options.edgeSweep,
    run_a_status: summaryA.status,
    run_b_status: summaryB.status,
    trace_a_rows: traceA.length,
    trace_b_rows: traceB.length,
    mismatch_count: mismatches.length,
    mismatch_examples: mismatches
  };
  await writeJson(path.join(outDir, 'deterministic-replay-summary.json'), summary);
  await writeText(path.join(outDir, 'deterministic-replay-report.md'), [
    '# Deterministic Replay Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Seed: ${summary.seed}`,
    `Steps requested: ${summary.steps_requested}`,
    `Trace A rows: ${summary.trace_a_rows}`,
    `Trace B rows: ${summary.trace_b_rows}`,
    `Mismatches: ${summary.mismatch_count}`
  ].join('\n'));
  process.stdout.write(`DETERMINISTIC_REPLAY ${summary.status}: ${summary.trace_a_rows}/${summary.trace_b_rows} rows\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('deterministic-replay');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runDeterministicReplayAudit(outDir, {
    seed: args.seed,
    steps: args.steps,
    seconds: args.seconds,
    edgeSweep: !!args['edge-sweep'] || !!args.edgeSweep
  });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
