import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';
import { loadCalculatorHarness } from './lib/calculator-vm-harness.mjs';

const PRESETS = ['pessimist', 'consensus', 'kepler', 'optimist'];
const DEFAULT_SAMPLE_SIZES = [1000, 3000, 5000];

function parseSampleSizes(value) {
  if (!value) return DEFAULT_SAMPLE_SIZES;
  return String(value).split(',').map(item => Number(item.trim())).filter(Number.isFinite).map(Math.floor);
}

function topByTotal(indices) {
  return Object.entries(indices).sort((a, b) => Number(b[1].T || 0) - Number(a[1].T || 0))[0]?.[0] || null;
}

export async function runSensitivitySobolAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const sampleSizes = parseSampleSizes(options.samples);
  const { api } = loadCalculatorHarness();
  const rows = [];
  const failures = [];
  const warnings = [];

  for (const preset of PRESETS) {
    api.setPreset(preset);
    for (const n of sampleSizes) {
      const result = api.computeSobolIndices(n, api.createSeededRng(Number(options.seed || 20260701) + n));
      if (!result || !result.indices || !Object.keys(result.indices).length) {
        failures.push(`${preset} n=${n} did not produce Sobol indices`);
        continue;
      }
      const entries = Object.entries(result.indices);
      const invalid = entries.filter(([, value]) => (
        !Number.isFinite(Number(value.S)) ||
        !Number.isFinite(Number(value.T)) ||
        Number(value.S) < 0 ||
        Number(value.T) < 0
      ));
      if (invalid.length) failures.push(`${preset} n=${n} produced invalid indices: ${invalid.map(([key]) => key).join(', ')}`);
      rows.push({
        preset,
        n,
        active_ids: result.activeIds,
        active_count: result.activeIds.length,
        top_total_order: topByTotal(result.indices),
        total_order_sum: entries.reduce((sum, [, value]) => sum + Number(value.T || 0), 0),
        first_order_sum: entries.reduce((sum, [, value]) => sum + Number(value.S || 0), 0),
        varY: result.varY,
        occurrence_mode: result.occurrenceMode,
        bypassed_ids: result.bypassedIds || [],
        indices: result.indices
      });
    }
  }

  const stability = PRESETS.map(preset => {
    const presetRows = rows.filter(row => row.preset === preset);
    const topSet = [...new Set(presetRows.map(row => row.top_total_order))];
    return { preset, top_total_order_values: topSet, stable: topSet.length === 1 };
  });
  for (const item of stability) {
    if (!item.stable) warnings.push(`${item.preset} top total-order parameter changed across sample sizes: ${item.top_total_order_values.join(', ')}`);
  }

  const summary = {
    status: failures.length ? 'FAIL' : warnings.length ? 'PARTIAL' : 'PASS',
    generated_at: new Date().toISOString(),
    sample_sizes: sampleSizes,
    rows,
    stability,
    failures,
    warnings
  };

  await writeJson(path.join(outDir, 'sensitivity-sobol-summary.json'), summary);
  await writeText(path.join(outDir, 'sensitivity-sobol-report.md'), [
    '# Sensitivity / Sobol Validation Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Preset | n | Active params | Top total-order | Sum S | Sum T | Var(Y) |',
    '| --- | ---: | ---: | --- | ---: | ---: | ---: |',
    ...rows.map(row => `| ${row.preset} | ${row.n} | ${row.active_count} | ${row.top_total_order} | ${row.first_order_sum} | ${row.total_order_sum} | ${row.varY} |`),
    '',
    '## Top-Parameter Stability',
    '',
    '| Preset | Stable | Top values |',
    '| --- | --- | --- |',
    ...stability.map(row => `| ${row.preset} | ${row.stable ? 'yes' : 'no'} | ${row.top_total_order_values.join(', ')} |`),
    '',
    summary.failures.length ? `Failures: ${summary.failures.join('; ')}` : 'Failures: none',
    summary.warnings.length ? `Warnings: ${summary.warnings.join('; ')}` : 'Warnings: none'
  ].join('\n'));

  process.stdout.write(`SENSITIVITY_SOBOL ${summary.status}: rows=${rows.length}, failures=${failures.length}, warnings=${warnings.length}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `sensitivity-sobol-${Date.now()}`);
  const summary = await runSensitivitySobolAudit(outDir, { samples: args.samples, seed: args.seed });
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
