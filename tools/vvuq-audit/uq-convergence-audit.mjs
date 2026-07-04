import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';
import { loadCalculatorHarness } from './lib/calculator-vm-harness.mjs';

const DEFAULT_SAMPLE_SIZES = [1000, 3000, 10000, 30000, 100000];
const PRESETS = ['pessimist', 'consensus', 'kepler', 'optimist'];

function relDrift(value, reference) {
  if (!Number.isFinite(value) || !Number.isFinite(reference)) return null;
  return Math.abs(value - reference) / Math.max(Math.abs(reference), 1e-12);
}

function pct(value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(3)}%`;
}

function parseSampleSizes(value) {
  if (!value) return DEFAULT_SAMPLE_SIZES;
  return String(value)
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item > 0)
    .map(item => Math.floor(item));
}

export async function runUqConvergenceAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const sampleSizes = parseSampleSizes(options.samples);
  const referenceSize = Math.max(...sampleSizes);
  const rows = [];
  const failures = [];
  const { api } = loadCalculatorHarness();

  for (const preset of PRESETS) {
    api.setPreset(preset);
    const presetRows = [];
    for (const n of sampleSizes) {
      const summary = api.monteCarloCalculate({
        samples: n,
        seed: Number(options.seed || 424242),
        seedMode: 'fixed',
        distribution: 'lognormal',
        engine: 'standard',
        correlation: 'independent',
        mcMode: 'presetLocal',
        robustBounds: false,
        updateUi: false
      });
      if (!summary || summary.n <= 0 || !Number.isFinite(summary.mean)) {
        failures.push(`${preset} n=${n} returned invalid Monte Carlo summary`);
        continue;
      }
      presetRows.push({
        preset,
        n,
        mean: summary.mean,
        q025: summary.p025,
        q50: summary.p500,
        q975: summary.p975,
        stdDev: summary.stdDev,
        standard_error: summary.stdDev / Math.sqrt(summary.n),
        convergence_stable_at: summary.convergence?.stableAt ?? null,
        tail_drift_pct: summary.convergence?.tailDriftPct ?? null
      });
    }

    const reference = presetRows.find(row => row.n === referenceSize) || presetRows[presetRows.length - 1];
    for (const row of presetRows) {
      rows.push({
        ...row,
        reference_n: reference?.n ?? null,
        mean_rel_drift_vs_reference: reference ? relDrift(row.mean, reference.mean) : null,
        q025_rel_drift_vs_reference: reference ? relDrift(row.q025, reference.q025) : null,
        q50_rel_drift_vs_reference: reference ? relDrift(row.q50, reference.q50) : null,
        q975_rel_drift_vs_reference: reference ? relDrift(row.q975, reference.q975) : null
      });
    }
  }

  const worstMeanDrift = Math.max(0, ...rows
    .filter(row => row.n !== row.reference_n && row.mean_rel_drift_vs_reference !== null)
    .map(row => row.mean_rel_drift_vs_reference));
  const status = failures.length ? 'FAIL' : 'PASS';
  const summary = {
    status,
    generated_at: new Date().toISOString(),
    sample_sizes: sampleSizes,
    reference_size: referenceSize,
    preset_count: PRESETS.length,
    row_count: rows.length,
    worst_mean_drift_vs_reference: worstMeanDrift,
    failures,
    rows
  };

  await writeJson(path.join(outDir, 'uq-convergence-summary.json'), summary);
  await writeText(path.join(outDir, 'uq-convergence-report.md'), [
    '# UQ Convergence Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Sample sizes: ${sampleSizes.join(', ')}`,
    `Reference size: ${referenceSize}`,
    `Worst mean drift vs reference: ${pct(worstMeanDrift)}`,
    '',
    '| Preset | nSim | Mean | q2.5 | q50 | q97.5 | Std. error | Mean drift vs ref | q50 drift vs ref | Stable at | Tail drift % |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(row => `| ${row.preset} | ${row.n} | ${row.mean} | ${row.q025} | ${row.q50} | ${row.q975} | ${row.standard_error} | ${pct(row.mean_rel_drift_vs_reference)} | ${pct(row.q50_rel_drift_vs_reference)} | ${row.convergence_stable_at ?? ''} | ${row.tail_drift_pct ?? ''} |`)
  ].join('\n'));

  process.stdout.write(`UQ_CONVERGENCE ${summary.status}: rows=${summary.row_count}, reference=${referenceSize}, worstMeanDrift=${pct(worstMeanDrift)}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `uq-convergence-${Date.now()}`);
  const summary = await runUqConvergenceAudit(outDir, { samples: args.samples, seed: args.seed });
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
