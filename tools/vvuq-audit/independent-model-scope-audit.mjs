import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, readJson, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

const MODEL_AREAS = [
  { area: 'deterministic base product', covered: true, evidence: 'Python snapshot oracle and random-state oracle' },
  { area: 'Bryson eta-Earth direct occurrence', covered: true, evidence: 'random-state oracle occurrence mode support' },
  { area: 'SETI/Fermi lambda and P>=1', covered: true, evidence: 'Python snapshot oracle' },
  { area: 'random GUI resolved-state deterministic checks', covered: true, evidence: 'cross-implementation random UI oracle' },
  { area: 'advanced modules deterministic effects', covered: false, evidence: 'Node-resolved state is checked; independent Python implementation is not complete' },
  { area: 'Monte Carlo quantile engine', covered: false, evidence: 'JS tests verify reproducibility; full independent Python quantile engine is not implemented' },
  { area: 'nearest-distance models', covered: false, evidence: 'JS tests verify distance models; Python full model oracle is not complete' },
  { area: 'universe scaling', covered: false, evidence: 'JS tests verify universe scaling; independent Python full model oracle is not complete' },
  { area: 'export JSON/Markdown/LaTeX parity', covered: false, evidence: 'JS export tests exist; independent Python/R export implementation is not applicable' },
  { area: 'UI state transitions', covered: false, evidence: 'random UI and state tests exist; independent Python/R UI implementation is not applicable' }
];

function statusFrom(command, summary) {
  if (command.status !== 'PASS') return 'FAIL';
  if (summary && summary.status && summary.status !== 'PASS') return summary.status;
  return 'PASS';
}

export async function runIndependentModelScopeAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const snapshotOut = path.join(outDir, 'snapshot-oracle');
  const crossOut = path.join(outDir, 'cross-oracle');
  const snapshot = await runCommand('node', ['tools/vvuq-audit/run-oracle.mjs', '--out', snapshotOut], { timeoutMs: 120000 });
  const crossCases = String(options.cases || 600);
  const cross = await runCommand('node', [
    'tools/vvuq-audit/cross-implementation-formula-audit.mjs',
    '--cases', crossCases,
    '--oracle-batch-size', '100',
    '--out', crossOut,
    '--seed', String(options.seed || 20260701)
  ], { timeoutMs: 300000 });

  const snapshotSummary = await readJson(path.join(snapshotOut, 'oracle-comparison-summary.json'), null);
  const crossSummary = await readJson(path.join(crossOut, 'cross-implementation-formula-summary.json'), null);
  const commandStatus = [statusFrom(snapshot, snapshotSummary), statusFrom(cross, crossSummary)];
  const independentCoverage = MODEL_AREAS.filter(item => item.covered).length / MODEL_AREAS.length;
  const blockingFailures = commandStatus.filter(status => status === 'FAIL').length;
  const summary = {
    status: blockingFailures ? 'FAIL' : 'PARTIAL',
    reason: 'A full independent Python/R reimplementation of the entire calculator model is not yet implemented.',
    independent_area_coverage: independentCoverage,
    covered_areas: MODEL_AREAS.filter(item => item.covered).length,
    total_areas: MODEL_AREAS.length,
    snapshot_oracle: {
      command_status: snapshot.status,
      summary_status: snapshotSummary?.status || null,
      checks: snapshotSummary?.check_count ?? null,
      failures: snapshotSummary?.failure_count ?? null
    },
    cross_oracle: {
      command_status: cross.status,
      summary_status: crossSummary?.status || null,
      cases: crossSummary?.oracle_cases ?? null,
      failed_batches: crossSummary?.oracle_failed_batches ?? null
    },
    model_areas: MODEL_AREAS
  };

  await writeJson(path.join(outDir, 'independent-model-scope-summary.json'), summary);
  await writeText(path.join(outDir, 'independent-model-scope-report.md'), [
    '# Independent Model Scope Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    summary.reason,
    '',
    `Covered areas: ${summary.covered_areas}/${summary.total_areas}`,
    `Snapshot oracle: ${summary.snapshot_oracle.summary_status}; checks: ${summary.snapshot_oracle.checks}; failures: ${summary.snapshot_oracle.failures}`,
    `Cross oracle: ${summary.cross_oracle.summary_status}; cases: ${summary.cross_oracle.cases}; failed batches: ${summary.cross_oracle.failed_batches}`,
    '',
    '| Area | Independent Python/R covered | Evidence |',
    '| --- | --- | --- |',
    ...MODEL_AREAS.map(item => `| ${item.area} | ${item.covered ? 'yes' : 'no'} | ${item.evidence} |`)
  ].join('\n'));

  process.stdout.write(`INDEPENDENT_MODEL_SCOPE ${summary.status}: covered=${summary.covered_areas}/${summary.total_areas}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `independent-model-${Date.now()}`);
  const summary = await runIndependentModelScopeAudit(outDir, { cases: args.cases, seed: args.seed });
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
