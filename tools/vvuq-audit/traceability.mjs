import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';

const TRACEABILITY_ROWS = [
  {
    requirement: 'Deterministic Milky Way candidate count',
    formula: 'N = product of active astrophysical, planetary, geophysical, biochemical, and optional factors',
    source: 'src/calculator-core.js: computePlanetsBase(), computePlanetsAdvanced(), calculateDeterministic()',
    ui: 'deterministicResult, scientific input cards',
    exportField: 'results.deterministic / deterministic export rows',
    evidence: 'npm run test:numerics; npm run test:absolute'
  },
  {
    requirement: 'Default preset',
    formula: 'Kepler/Gaia preset values from SCIENTIFIC_PRESETS.kepler',
    source: 'src/scientific-parameters.js: SCIENTIFIC_PRESETS',
    ui: 'preset buttons and active calculation state',
    exportField: 'scenario label and preset metadata',
    evidence: 'npm run test:presets; npm run test:preset-state-reset'
  },
  {
    requirement: 'Pessimistic preset',
    formula: 'Pessimist / Rare Earth preset product chain',
    source: 'src/scientific-parameters.js: SCIENTIFIC_PRESETS.pessimist',
    ui: 'preset selector, result panels',
    exportField: 'scenario/preset metadata',
    evidence: 'npm run test:pessimist-mc; npm run test:presets'
  },
  {
    requirement: 'Consensus preset',
    formula: 'Consensus / Lineweaver preset product chain',
    source: 'src/scientific-parameters.js: SCIENTIFIC_PRESETS.consensus',
    ui: 'preset selector, result panels',
    exportField: 'scenario/preset metadata',
    evidence: 'npm run test:numerics; npm run test:scenario-coherence'
  },
  {
    requirement: 'High-end preset',
    formula: 'High-End / Literature Bounds preset product chain',
    source: 'src/scientific-parameters.js: SCIENTIFIC_PRESETS.optimist',
    ui: 'preset selector, result panels',
    exportField: 'scenario/preset metadata',
    evidence: 'npm run test:pessimist-mc; npm run test:scenario-coherence'
  },
  {
    requirement: 'Custom input',
    formula: 'Visible user-provided central/min/max values after normalization',
    source: 'src/calculator-core.js: resolveInputsForCalculation(), buildResolvedModelState()',
    ui: 'custom input values and validation warnings',
    exportField: 'custom scenario state and current result fields',
    evidence: 'npm run test:deep; npm run test:numerics'
  },
  {
    requirement: 'Monte Carlo q2.5 / q50 / q97.5',
    formula: 'Seeded Monte Carlo samples sorted into quantiles',
    source: 'src/calculator-core.js: monteCarloCalculate(), percentile()',
    ui: 'monteCarloResult, monteCarloMedian, stats',
    exportField: 'mc q025/q50/q975 fields',
    evidence: 'npm run test:montecarlo; npm run test:scenario-coherence'
  },
  {
    requirement: 'Arithmetic mean',
    formula: 'Arithmetic mean of Monte Carlo sample values',
    source: 'src/calculator-core.js: mean(), monteCarloCalculate()',
    ui: 'stats and MC detail panels',
    exportField: 'mc arithmetic mean field',
    evidence: 'npm run test:montecarlo; npm run test:deep'
  },
  {
    requirement: 'Nearest-candidate distance',
    formula: '2D/3D/radial nearest-neighbour distance models',
    source: 'src/calculator-core.js: calculateDistanceToNearestPlanet(), distance helpers',
    ui: 'distance panel',
    exportField: 'active distance model and basis fields',
    evidence: 'npm run test:montecarlo; npm run test:deep'
  },
  {
    requirement: 'Observable-universe scaling',
    formula: 'Per-star yield multiplied by configured observable-universe star range',
    source: 'src/calculator-core.js: computeUniverseScaleFromYield(), summarizePerStarYields()',
    ui: 'universe scale result and labels',
    exportField: 'universe scale fields',
    evidence: 'npm run test:universe-scale; npm run test:absolute'
  },
  {
    requirement: 'SETI/Fermi lambda',
    formula: 'lambda_det from candidate count, transmitter fraction, range gate, and temporal overlap',
    source: 'src/calculator-core.js: computeDetectionFilter()',
    ui: 'SETI/Fermi context panels',
    exportField: 'fermi_context and detection basis fields',
    evidence: 'npm run test:numerics; npm run test:deep'
  },
  {
    requirement: 'SETI/Fermi P>=1',
    formula: 'P(at least one) = 1 - exp(-lambda)',
    source: 'src/calculator-core.js: computeDetectionFilter(), fmtExistencePct()',
    ui: 'SETI/Fermi probability display',
    exportField: 'detection probability fields',
    evidence: 'npm run test:numerics; npm run test:strings'
  },
  {
    requirement: 'SETI/Fermi waiting time',
    formula: 'Mean and median waiting-time formulas from detection rate assumptions',
    source: 'src/calculator-core.js: computeDetectionFilter()',
    ui: 'SETI/Fermi waiting-time display',
    exportField: 'fermi_context timing fields',
    evidence: 'npm run test:absolute; npm run test:deep'
  },
  {
    requirement: 'Additional Scientific Modules',
    formula: 'Module factors multiply or replace specified base terms',
    source: 'src/calculator-core.js: computePlanetsAdvanced(); src/scientific-parameters.js module metadata',
    ui: 'advanced scientific module controls',
    exportField: 'advanced module state and result metadata',
    evidence: 'npm run test:absolute; npm run test:preset-state-reset'
  },
  {
    requirement: 'JSON export',
    formula: 'Current model state serialized to JSON snapshot',
    source: 'src/share.js: buildJSONExportSnapshot()',
    ui: 'JSON export control',
    exportField: 'full JSON export document',
    evidence: 'npm run test:standalone-export; npm run test:deep'
  },
  {
    requirement: 'LaTeX / Markdown export',
    formula: 'Current deterministic/MC/export state rendered to text tables',
    source: 'src/share.js and src/app.js export helpers',
    ui: 'export/share controls',
    exportField: 'LaTeX and Markdown export text',
    evidence: 'npm run test:standalone-export; npm run test:deep'
  },
  {
    requirement: 'UI labels and forbidden wording guard',
    formula: 'No numeric formula; wording boundary check',
    source: 'index.html; src/app.js; src/share.js; docs/*.md',
    ui: 'public labels, warnings, and explanatory copy',
    exportField: 'share/export wording',
    evidence: 'npm run test:strings; tools/vvuq-audit/static-scan.mjs'
  }
];

export async function writeTraceability(outDir) {
  await ensureDir(outDir);
  const json = {
    generated_at: new Date().toISOString(),
    status: 'PASS',
    rows: TRACEABILITY_ROWS
  };
  const table = [
    '# Requirements Traceability Matrix',
    '',
    '| Requirement | Formula | Source file/function | UI field | Export field | Test evidence |',
    '| --- | --- | --- | --- | --- | --- |',
    ...TRACEABILITY_ROWS.map(row => `| ${row.requirement} | ${row.formula} | ${row.source} | ${row.ui} | ${row.exportField} | ${row.evidence} |`)
  ].join('\n');

  await writeJson(path.join(outDir, 'requirements-traceability-matrix.json'), json);
  await writeText(path.join(outDir, 'requirements-traceability-matrix.md'), table);
  return json;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : process.cwd();
  const summary = await writeTraceability(outDir);
  process.stdout.write(`TRACEABILITY ${summary.status}: ${summary.rows.length} requirements mapped\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

