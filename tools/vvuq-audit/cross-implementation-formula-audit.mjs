import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runRandomUiOracleFuzz } from './random-ui-oracle-fuzz.mjs';
import { ensureDir, parseArgs, repoRoot, sanitizeFilePart, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

export async function runCrossImplementationFormulaAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const cases = Math.max(1, Number(options.cases || 1000));
  const fuzz = await runRandomUiOracleFuzz(path.join(outDir, 'cross-oracle-fuzz'), {
    seconds: Math.max(60, Number(options.seconds || 1800)),
    seed: Number(options.seed || 20260629) >>> 0,
    maxSteps: cases,
    oracleEvery: 1,
    oracleBatchSize: Math.max(10, Number(options.oracleBatchSize || 50)),
    progressEvery: Math.max(100, Math.floor(cases / 10)),
    paceMs: 0
  });
  const summary = {
    status: fuzz.status === 'PASS' && fuzz.oracle_cases >= cases ? 'PASS' : 'FAIL',
    cases_requested: cases,
    oracle_cases: fuzz.oracle_cases,
    oracle_batches: fuzz.oracle_batches,
    oracle_failed_batches: fuzz.oracle_failed_batches,
    gui_deterministic_checks: fuzz.gui_deterministic_checks,
    max_deterministic: fuzz.max_deterministic,
    min_deterministic: fuzz.min_deterministic
  };
  await writeJson(path.join(outDir, 'cross-implementation-formula-summary.json'), summary);
  await writeText(path.join(outDir, 'cross-implementation-formula-report.md'), [
    '# Cross-Implementation Formula Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Cases requested: ${summary.cases_requested}`,
    `Oracle cases: ${summary.oracle_cases}`,
    `Oracle batches: ${summary.oracle_batches}`,
    `Oracle failed batches: ${summary.oracle_failed_batches}`
  ].join('\n'));
  process.stdout.write(`CROSS_IMPLEMENTATION_FORMULA ${summary.status}: ${summary.oracle_cases}/${cases} oracle cases\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('cross-implementation-formula');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runCrossImplementationFormulaAudit(outDir, {
    cases: args.cases,
    seconds: args.seconds,
    seed: args.seed,
    oracleBatchSize: args['oracle-batch-size'] || args.oracleBatchSize
  });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
