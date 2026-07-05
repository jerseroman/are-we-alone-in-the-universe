import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson } from '../lib/audit-utils.mjs';

const require = createRequire(import.meta.url);
const {
  SCIENTIFIC_PARAMETER_ORDER,
  SCIENTIFIC_PRESETS
} = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function deterministicFromPreset(preset) {
  const values = preset.values;
  let product = Number(values.N_GHZ || 0);
  for (const id of SCIENTIFIC_PARAMETER_ORDER) {
    if (id === 'N_GHZ') continue;
    if (id === 'f_complex_life' && !preset.enableComplex) continue;
    if (id === 'f_x' && !preset.enableX) continue;
    const raw = Number(values[id]);
    const factor = id === 'N_p_star' ? Math.max(0, raw) : clamp01(raw);
    product *= factor;
  }
  return Math.max(0, product);
}

function setiCase(name, count, fTx, rangeGate, lifetimeYears, galaxyYears = 1e10) {
  const lambda = Math.max(0, count) * clamp01(fTx) * clamp01(rangeGate) * Math.max(0, lifetimeYears) / galaxyYears;
  return {
    name,
    count,
    f_tx: fTx,
    range_gate: rangeGate,
    lifetime_years: lifetimeYears,
    galaxy_years: galaxyYears,
    lambda_det: lambda,
    p_at_least_one: 1 - Math.exp(-lambda),
    mean_wait_years: lambda > 0 ? lifetimeYears / lambda : null,
    median_wait_years: lambda > 0 ? Math.log(2) * lifetimeYears / lambda : null
  };
}

export async function writeOracleSnapshot(outDir) {
  await ensureDir(outDir);
  const presets = Object.entries(SCIENTIFIC_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    values: { ...preset.values },
    enable_complex: !!preset.enableComplex,
    enable_x: !!preset.enableX,
    deterministic_candidate_estimate: deterministicFromPreset(preset)
  }));

  const snapshot = {
    generated_at: new Date().toISOString(),
    source: 'src/scientific-parameters.js registry snapshot',
    parameter_order: [...SCIENTIFIC_PARAMETER_ORDER],
    presets,
    seti_cases: [
      setiCase('zero-lambda', 0, 0.1, 1, 10000),
      setiCase('small-lambda', 1000, 0.001, 1, 1000),
      setiCase('unit-ish-lambda', 10000000, 0.001, 1, 1000000),
      setiCase('range-gated-zero', 10000000, 0.001, 0, 1000000)
    ],
    constants: {
      kpc_to_light_year: 3261.5637769,
      universe_star_min: 1e22,
      universe_star_max: 1e24
    }
  };

  const file = path.join(outDir, 'oracle-snapshot.json');
  await writeJson(file, snapshot);
  return file;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : process.cwd();
  const file = await writeOracleSnapshot(outDir);
  process.stdout.write(`ORACLE_SNAPSHOT PASS: ${file}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

