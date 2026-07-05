import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  ensureDir,
  parseArgs,
  repoRoot,
  runCommand,
  sanitizeFilePart,
  timestampId,
  writeJson,
  writeText
} from './lib/audit-utils.mjs';

const require = createRequire(import.meta.url);
const { SCIENTIFIC_PARAMETER_REGISTRY } = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));

const BASE_KEYS = SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder;
const OPTIONAL_FACTOR_KEYS = [
  '_f_atm_ret',
  '_f_longterm',
  '_f_xuv_quiet',
  '_f_uv',
  '_f_binary',
  '_f_rad'
];
const FRACTION_KEYS = new Set(BASE_KEYS.filter(key => key !== 'N_GHZ' && key !== 'N_p_star'));
const REL_TOL = 1e-11;
const ABS_TOL = 1e-14;

function loadCoreCalculator() {
  const corePath = path.join(repoRoot, 'src', 'calculator-core.js');
  const source = fs.readFileSync(corePath, 'utf8');
  const context = vm.createContext({ console });
  vm.runInContext(
    `${source}\n;globalThis.__RAW_CORE_FUZZ_EXPORTS__ = { computePlanetsAdvanced };`,
    context,
    { filename: corePath }
  );
  return context.__RAW_CORE_FUZZ_EXPORTS__;
}

function xorshift32(seed) {
  let state = Number(seed || 1) >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function rng() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    return (state >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length) % values.length];
}

function logUniform(rng, lo, hi) {
  const a = Math.log(lo);
  const b = Math.log(hi);
  return Math.exp(a + (b - a) * rng());
}

function randomFraction(rng) {
  const roll = rng();
  if (roll < 0.02) return 0;
  if (roll < 0.04) return 1;
  if (roll < 0.18) return logUniform(rng, 1e-12, 1);
  if (roll < 0.32) return 1 - logUniform(rng, 1e-12, 1);
  return rng();
}

function randomPositive(rng, lo = 1e-9, hi = 1e13) {
  const roll = rng();
  if (roll < 0.015) return 0;
  if (roll < 0.03) return 1;
  return logUniform(rng, lo, hi);
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function occurrenceTerm(inp) {
  if (inp._occurrence_mode === 'eta_earth_direct') {
    return Number.isFinite(inp._eta_earth_bryson) ? inp._eta_earth_bryson : 0;
  }
  return Math.max(0, inp.N_p_star || 0) *
    clamp01(inp.f_composition || 0) *
    clamp01(inp.f_orbit || 0);
}

function independentExpected(inp) {
  let product = Math.max(0, inp.N_GHZ || 0);
  product *= clamp01(inp.f_sun_type || 0);
  product *= clamp01(inp.f_sun_age || 0);
  product *= occurrenceTerm(inp);
  product *= clamp01(inp.f_stability || 0);
  product *= clamp01(inp.f_magnetosphere || 0);
  product *= clamp01(inp.f_lunar_stability || 0);
  product *= clamp01(inp.f_size || 0);
  product *= clamp01(inp.f_rotation || 0);
  product *= clamp01(inp.f_tilt || 0);
  product *= clamp01(inp.f_H2O || 0);
  product *= clamp01(inp.f_CHNOPS || 0);
  product *= clamp01(inp.f_complex_life || 0);
  product *= clamp01(inp.f_x || 0);
  for (const key of OPTIONAL_FACTOR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(inp, key)) product *= clamp01(inp[key]);
  }
  return Math.max(0, product);
}

function nearlyEqual(actual, expected) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.max(ABS_TOL, Math.abs(expected) * REL_TOL, Math.abs(actual) * REL_TOL);
  return diff <= tolerance;
}

function randomizeInput(inp, rng, counters) {
  inp.N_GHZ = randomPositive(rng, 1, 1e13);
  inp.N_p_star = randomPositive(rng, 1e-6, 8);

  for (const key of BASE_KEYS) {
    if (key === 'N_GHZ' || key === 'N_p_star') continue;
    if (FRACTION_KEYS.has(key)) inp[key] = randomFraction(rng);
  }

  const h2oEnabled = rng() > 0.12;
  const chnopsEnabled = rng() > 0.12;
  const complexEnabled = rng() > 0.35;
  const xEnabled = rng() > 0.55;
  if (!h2oEnabled) inp.f_H2O = 1;
  if (!chnopsEnabled) inp.f_CHNOPS = 1;
  if (!complexEnabled) inp.f_complex_life = 1;
  if (!xEnabled) inp.f_x = 1;

  if (rng() < 0.28) {
    inp._occurrence_mode = 'eta_earth_direct';
    inp._eta_earth_bryson = randomFraction(rng);
    counters.occurrence_direct_cases += 1;
  } else {
    delete inp._occurrence_mode;
    delete inp._eta_earth_bryson;
  }

  let hasAdvanced = false;
  for (const key of OPTIONAL_FACTOR_KEYS) {
    if (rng() < 0.42) {
      inp[key] = randomFraction(rng);
      hasAdvanced = true;
    } else {
      delete inp[key];
    }
  }
  if (rng() < 0.35) {
    inp._f_longterm = randomFraction(rng) * randomFraction(rng) * randomFraction(rng);
    hasAdvanced = true;
  }
  if (hasAdvanced) counters.advanced_cases += 1;

  counters.h2o_disabled_cases += h2oEnabled ? 0 : 1;
  counters.chnops_disabled_cases += chnopsEnabled ? 0 : 1;
  counters.complex_disabled_cases += complexEnabled ? 0 : 1;
  counters.x_disabled_cases += xEnabled ? 0 : 1;
}

function oracleCase(index, inp, actual) {
  const values = {};
  const parameterOrder = [...BASE_KEYS];
  for (const key of BASE_KEYS) values[key] = inp[key];
  for (const key of OPTIONAL_FACTOR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(inp, key)) {
      values[key] = inp[key];
      parameterOrder.push(key);
    }
  }
  if (inp._occurrence_mode === 'eta_earth_direct') {
    values._eta_earth_bryson = inp._eta_earth_bryson;
    parameterOrder.push('_eta_earth_bryson');
  }
  return {
    index,
    action: 'high-throughput-raw-core-fuzz',
    state: {
      parameter_order: parameterOrder,
      values,
      enable_complex: inp.f_complex_life !== 1,
      enable_x: inp.f_x !== 1,
      occurrence: {
        mode: inp._occurrence_mode || 'factorized',
        etaEarthBryson: inp._eta_earth_bryson ?? null
      }
    },
    actual: {
      deterministic: actual,
      sparse_probability: actual < 1 ? 1 - Math.exp(-Math.max(0, actual)) : null
    }
  };
}

async function runPythonOracle(sampleFile, outFile) {
  const oracleScript = path.join(repoRoot, 'tools', 'vvuq-audit', 'oracle', 'random_state_oracle.py');
  const commands = process.env.PYTHON
    ? [[process.env.PYTHON, [oracleScript, '--input', sampleFile, '--out', outFile]]]
    : [
        ['python', [oracleScript, '--input', sampleFile, '--out', outFile]],
        ['py', ['-3', oracleScript, '--input', sampleFile, '--out', outFile]]
      ];

  let last = null;
  for (const [command, args] of commands) {
    const result = await runCommand(command, args, { timeoutMs: 180000 });
    last = result;
    if (result.status === 'PASS') return result;
  }
  return last;
}

function writeProgress(progressFile, summary) {
  fs.mkdirSync(path.dirname(progressFile), { recursive: true });
  fs.writeFileSync(progressFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

export async function runHighThroughputRandomCoreFuzz(outDir, options = {}) {
  await ensureDir(outDir);
  const seconds = Math.max(1, Number(options.seconds || 300));
  const maxCases = options.maxCases ? Math.max(1, Number(options.maxCases)) : null;
  const progressEvery = Math.max(1000, Number(options.progressEvery || 1000000));
  const oracleEvery = Math.max(1, Number(options.oracleEvery || 10000));
  const oracleSampleLimit = Math.max(0, Number(options.oracleSampleLimit ?? 5000));
  const seed = Number(options.seed || 20260629) >>> 0;
  const rng = xorshift32(seed);
  const { computePlanetsAdvanced } = loadCoreCalculator();
  const startedAt = Date.now();
  const deadline = startedAt + seconds * 1000;
  const progressFile = path.join(outDir, 'high-throughput-random-core-fuzz-progress.json');
  const sampleFile = path.join(outDir, 'high-throughput-random-core-oracle-sample.jsonl');
  const oracleOut = path.join(outDir, 'high-throughput-random-core-python-oracle-summary.json');
  const inp = {};
  const failures = [];
  const samples = [];
  const counters = {
    calculations: 0,
    advanced_cases: 0,
    occurrence_direct_cases: 0,
    h2o_disabled_cases: 0,
    chnops_disabled_cases: 0,
    complex_disabled_cases: 0,
    x_disabled_cases: 0,
    zero_results: 0,
    nonzero_results: 0,
    min_result: null,
    max_result: null,
    max_abs_error: 0,
    max_rel_error: 0
  };

  while (Date.now() < deadline && (!maxCases || counters.calculations < maxCases)) {
    counters.calculations += 1;
    randomizeInput(inp, rng, counters);
    const actual = computePlanetsAdvanced(inp);
    const expected = independentExpected(inp);
    const absError = Math.abs(actual - expected);
    const relError = absError / Math.max(Math.abs(expected), Math.abs(actual), 1);
    counters.max_abs_error = Math.max(counters.max_abs_error, absError);
    counters.max_rel_error = Math.max(counters.max_rel_error, relError);

    if (!Number.isFinite(actual) || actual < 0 || !nearlyEqual(actual, expected)) {
      failures.push({
        index: counters.calculations,
        actual,
        expected,
        abs_error: absError,
        rel_error: relError,
        input: { ...inp }
      });
      if (failures.length >= 25) break;
    }

    if (actual === 0) counters.zero_results += 1;
    else counters.nonzero_results += 1;
    counters.min_result = counters.min_result === null ? actual : Math.min(counters.min_result, actual);
    counters.max_result = counters.max_result === null ? actual : Math.max(counters.max_result, actual);

    if (oracleSampleLimit > 0 && samples.length < oracleSampleLimit && counters.calculations % oracleEvery === 0) {
      samples.push(oracleCase(counters.calculations, inp, actual));
    }

    if (counters.calculations % progressEvery === 0) {
      const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
      const progress = {
        status: failures.length ? 'FAIL' : 'RUNNING',
        generated_at: new Date().toISOString(),
        calculations: counters.calculations,
        raw_random_calculations: counters.calculations,
        calculations_per_second: Math.round(counters.calculations / elapsedSeconds),
        python_oracle_sample_cases: samples.length,
        advanced_cases: counters.advanced_cases,
        occurrence_direct_cases: counters.occurrence_direct_cases,
        failures: failures.length
      };
      writeProgress(progressFile, progress);
      process.stdout.write(
        `RAW_CORE_FUZZ progress calculations=${progress.calculations} ` +
        `rate=${progress.calculations_per_second}/s oracleSamples=${samples.length}\n`
      );
    }
  }

  fs.writeFileSync(sampleFile, samples.map(item => JSON.stringify(item)).join('\n') + (samples.length ? '\n' : ''), 'utf8');
  const oracleResult = samples.length ? await runPythonOracle(sampleFile, oracleOut) : null;
  const oracleSummary = oracleResult && fs.existsSync(oracleOut)
    ? JSON.parse(fs.readFileSync(oracleOut, 'utf8'))
    : null;
  const durationMs = Date.now() - startedAt;
  const calculationsPerSecond = Math.round(counters.calculations / Math.max(0.001, durationMs / 1000));
  const oracleStatus = oracleSummary?.status || (oracleResult ? oracleResult.status : 'SKIPPED');
  const status = failures.length === 0 && (samples.length === 0 || oracleStatus === 'PASS') ? 'PASS' : 'FAIL';
  const summary = {
    status,
    seed,
    seconds_requested: seconds,
    duration_ms: durationMs,
    calculations: counters.calculations,
    raw_random_calculations: counters.calculations,
    calculations_per_second: calculationsPerSecond,
    advanced_cases: counters.advanced_cases,
    occurrence_direct_cases: counters.occurrence_direct_cases,
    h2o_disabled_cases: counters.h2o_disabled_cases,
    chnops_disabled_cases: counters.chnops_disabled_cases,
    complex_disabled_cases: counters.complex_disabled_cases,
    x_disabled_cases: counters.x_disabled_cases,
    zero_results: counters.zero_results,
    nonzero_results: counters.nonzero_results,
    min_result: counters.min_result,
    max_result: counters.max_result,
    max_abs_error: counters.max_abs_error,
    max_rel_error: counters.max_rel_error,
    rel_tol: REL_TOL,
    abs_tol: ABS_TOL,
    python_oracle_sample_cases: samples.length,
    python_oracle_status: oracleStatus,
    python_oracle_failures: oracleSummary?.failures ?? null,
    failures
  };

  writeProgress(progressFile, summary);
  await writeJson(path.join(outDir, 'high-throughput-random-core-fuzz-summary.json'), summary);
  await writeText(path.join(outDir, 'high-throughput-random-core-fuzz-report.md'), [
    '# High-Throughput Random Core Fuzz',
    '',
    `Status: **${summary.status}**`,
    '',
    `Raw random calculations: ${summary.raw_random_calculations}`,
    `Calculations per second: ${summary.calculations_per_second}`,
    `Advanced-factor cases: ${summary.advanced_cases}`,
    `Occurrence direct cases: ${summary.occurrence_direct_cases}`,
    `Python oracle sample cases: ${summary.python_oracle_sample_cases}`,
    `Python oracle status: ${summary.python_oracle_status}`,
    `Max abs error: ${summary.max_abs_error}`,
    `Max rel error: ${summary.max_rel_error}`,
    `Failures: ${summary.failures.length}`
  ].join('\n'));

  process.stdout.write(
    `HIGH_THROUGHPUT_RANDOM_CORE_FUZZ ${summary.status}: ` +
    `${summary.raw_random_calculations} calculations, ` +
    `${summary.calculations_per_second}/s, python=${summary.python_oracle_status}\n`
  );
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('high-throughput-random-core-fuzz');
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runHighThroughputRandomCoreFuzz(outDir, {
    seconds: args.seconds,
    maxCases: args['max-cases'] || args.maxCases,
    progressEvery: args['progress-every'] || args.progressEvery,
    oracleEvery: args['oracle-every'] || args.oracleEvery,
    oracleSampleLimit: args['oracle-sample-limit'] || args.oracleSampleLimit,
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
