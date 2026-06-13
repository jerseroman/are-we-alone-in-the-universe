#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const {
  SCIENTIFIC_PARAMETER_REGISTRY
} = require(path.join(root, 'src', 'scientific-parameters.js'));

const sampleCount = 2000;
const presetSampleCount = 1000;
let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function makeElement(value = '') {
  return {
    value: String(value),
    checked: false,
    style: {},
    disabled: false,
    innerHTML: '',
    textContent: ''
  };
}

function createDocumentStub() {
  const elements = new Map();
  const ensure = (id, value = '') => {
    if (!elements.has(id)) elements.set(id, makeElement(value));
    return elements.get(id);
  };

  for (const key of SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder) {
    const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
    ensure(key, parameter.central);
    ensure(`${key}_min`, parameter.min);
    ensure(`${key}_max`, parameter.max);
  }

  ensure('iterations', sampleCount);
  ensure('sampling_uncertainty', 50);
  ensure('distribution', 'lognormal');
  ensure('simulation-engine', 'standard');
  ensure('correlation-model', 'independent');
  ensure('uncertainty-profile', 'baseline');
  ensure('mc-basis-mode', 'auto');
  ensure('robust-bounds').checked = false;
  ensure('model-radial').checked = true;
  ensure('model-2d').checked = true;
  ensure('model-3d-disk').checked = true;
  ensure('model-3d-sphere').checked = true;
  ensure('adv_scale_length', 2.6);
  ensure('adv_ghz_inner', 4.0);
  ensure('adv_ghz_outer', 13.0);
  ensure('adv_met_thresh', -1.0);
  ensure('adv_radial_bins', 100);
  ensure('adv_temporal_R', 8.0);

  [
    'loading',
    'monteCarloResult',
    'stats',
    'distance',
    'whereAreTheyBtn'
  ].forEach(id => ensure(id));

  return {
    elements,
    document: {
      getElementById(id) {
        return elements.get(id) || null;
      }
    }
  };
}

function loadCalculator() {
  const { document } = createDocumentStub();
  const source = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
  const context = vm.createContext({
    console,
    document,
    setTimeout(fn) {
      fn();
      return 1;
    }
  });

  vm.runInContext(
    `${source}\n;globalThis.__MC_TEST_EXPORTS__ = {
      PRESETS,
      monteCarloCalculate,
      runMonteCarloSimulation,
      createSeededRng,
      sampleLogitNormalQuantile,
      sampleLogNormalQuantile,
      buildDistanceMetrics,
      getSimulationOptions,
      getMonteCarloBoundsDescriptor,
      loadPresetForTest(name) {
        const preset = PRESETS[name];
        if (!preset) throw new Error('Unknown preset: ' + name);
        setScenarioPreset(name);
        for (const [key, value] of Object.entries(preset)) {
          const el = document.getElementById(key);
          if (el) el.value = String(value);
        }
        isComplexLifeEnabled = !!preset.enableComplex;
        isXEnabled = !!preset.enableX;
        return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
      }
    };`,
    context,
    { filename: 'src/calculator-core.js' }
  );

  return context.__MC_TEST_EXPORTS__;
}

function summarizeSequence(summary) {
  return summary.results.map(value => Number(value).toPrecision(17)).join('|');
}

function assertValidSummary(label, summary, expectedN = sampleCount) {
  if (!summary || typeof summary !== 'object') {
    fail(`${label}: no summary object returned.`);
    return;
  }

  if (summary.n !== expectedN) {
    fail(`${label}: n=${summary.n}, expected ${expectedN}.`);
  }

  if (!Array.isArray(summary.results) || summary.results.length !== expectedN) {
    fail(`${label}: results length=${summary.results?.length}, expected ${expectedN}.`);
  }

  for (const [index, value] of (summary.results || []).entries()) {
    if (!Number.isFinite(value) || value < 0) {
      fail(`${label}: invalid sample at index ${index}: ${value}.`);
      break;
    }
  }

  for (const key of ['mean', 'p025', 'p975', 'stdDev']) {
    if (!Number.isFinite(summary[key]) || summary[key] < 0) {
      fail(`${label}: invalid ${key}: ${summary[key]}.`);
    }
  }

  // Allow a small floating-point tolerance: when every sample is identical
  // (degenerate preset, e.g. unmodified pessimist) the streaming mean can
  // differ from the sample value by ~ULP even though p025 = p975 = sample.
  const orderTol = Math.max(1e-15, Math.abs(summary.mean) * 1e-12);
  if (!(summary.p025 <= summary.mean + orderTol && summary.mean <= summary.p975 + orderTol)) {
    fail(`${label}: expected p025 <= mean <= p975, got ${summary.p025}, ${summary.mean}, ${summary.p975}.`);
  }

  if (!summary.boundsMode || !summary.boundsLabel) {
    fail(`${label}: missing Monte Carlo bounds label.`);
  }

  if (!summary.intervalComparison || typeof summary.intervalComparison !== 'object') {
    fail(`${label}: missing deterministic-vs-interval comparison.`);
  }
}

function assertSameSeedStable(label, options) {
  const calculator = loadCalculator();
  const a = calculator.monteCarloCalculate({ samples: sampleCount, seed: 12345, ...options });
  const b = calculator.monteCarloCalculate({ samples: sampleCount, seed: 12345, ...options });
  assertValidSummary(`${label} same-seed run A`, a);
  assertValidSummary(`${label} same-seed run B`, b);

  const aSeq = summarizeSequence(a);
  const bSeq = summarizeSequence(b);
  if (aSeq !== bSeq || a.mean !== b.mean || a.p025 !== b.p025 || a.p975 !== b.p975) {
    fail(`${label}: same seed did not reproduce exactly.`);
  } else {
    pass(`${label}: same seed reproduces exactly.`);
  }
}

function assertDifferentSeedChanges(label, options) {
  const calculator = loadCalculator();
  const a = calculator.monteCarloCalculate({ samples: sampleCount, seed: 12345, ...options });
  const b = calculator.monteCarloCalculate({ samples: sampleCount, seed: 54321, ...options });
  assertValidSummary(`${label} seed 12345`, a);
  assertValidSummary(`${label} seed 54321`, b);

  if (summarizeSequence(a) === summarizeSequence(b)) {
    fail(`${label}: different seeds produced the same sample sequence.`);
  } else {
    pass(`${label}: different seeds change the sample sequence.`);
  }
}

assertSameSeedStable('standard lognormal Monte Carlo', { distribution: 'lognormal', engine: 'standard', updateUi: false });
assertDifferentSeedChanges('standard lognormal Monte Carlo', { distribution: 'lognormal', engine: 'standard', updateUi: false });

assertSameSeedStable('standard uniform Monte Carlo', { distribution: 'uniform', engine: 'standard', updateUi: false });
assertDifferentSeedChanges('standard uniform Monte Carlo', { distribution: 'uniform', engine: 'standard', updateUi: false });

assertSameSeedStable('LHS lognormal Monte Carlo', { distribution: 'lognormal', engine: 'lhs', updateUi: false });
assertDifferentSeedChanges('LHS lognormal Monte Carlo', { distribution: 'lognormal', engine: 'lhs', updateUi: false });

const directApi = loadCalculator();
const directA = directApi.monteCarloCalculate({ samples: sampleCount, seed: 999 });
const directB = directApi.monteCarloCalculate({ samples: sampleCount, seed: 999 });
assertValidSummary('direct seeded monteCarloCalculate API run A', directA);
assertValidSummary('direct seeded monteCarloCalculate API run B', directB);
if (summarizeSequence(directA) === summarizeSequence(directB)) {
  pass('monteCarloCalculate({ samples, seed }) reproduces exactly through the public API.');
} else {
  fail('monteCarloCalculate({ samples, seed }) did not reproduce exactly through the public API.');
}

const defaultRun = loadCalculator().monteCarloCalculate({ samples: sampleCount, updateUi: false });
assertValidSummary('default unseeded Monte Carlo', defaultRun);
pass('Default unseeded Monte Carlo mode returns a valid summary.');

{
  const calculator = loadCalculator();
  const cases = [
    {
      label: 'logit-normal q50 near lower probability edge',
      actual: calculator.sampleLogitNormalQuantile(0.02, 0.01, 0.5, 0.5),
      expected: 0.02
    },
    {
      label: 'logit-normal q50 with broad asymmetric probability bounds',
      actual: calculator.sampleLogitNormalQuantile(0.05, 0.01, 0.9, 0.5),
      expected: 0.05
    },
    {
      label: 'log-normal q50 near upper positive bound',
      actual: calculator.sampleLogNormalQuantile(0.9, 0, 1, 0.5),
      expected: 0.9
    },
    {
      label: 'log-normal q50 for asymmetric N_GHZ global envelope',
      actual: calculator.sampleLogNormalQuantile(1e10, 5e9, 4e10, 0.5),
      expected: 1e10
    }
  ];

  for (const item of cases) {
    const tolerance = Math.max(1e-6, Math.abs(item.expected) * 1e-5);
    if (Math.abs(item.actual - item.expected) <= tolerance) {
      pass(`${item.label}: bounded adaptive median remains anchored at ${fmt(item.expected)}.`);
    } else {
      fail(`${item.label}: q50=${fmt(item.actual)}, expected ${fmt(item.expected)}.`);
    }
  }
}

const distanceHarness = loadCalculator();
const simulationOptions = distanceHarness.getSimulationOptions();
if (simulationOptions.correlation === 'independent') {
  pass('Default Monte Carlo correlation mode is independent factors.');
} else {
  fail(`Default Monte Carlo correlation mode is ${simulationOptions.correlation}, expected independent.`);
}

const distanceMetrics = distanceHarness.buildDistanceMetrics(10000, 5000, 15000);
if (
  distanceMetrics &&
  distanceMetrics.modelRadial &&
  Number.isFinite(distanceMetrics.modelRadial.distance) &&
  distanceMetrics.modelRadial.distance > 0 &&
  distanceMetrics.modelRadial.ciLow <= distanceMetrics.modelRadial.distance &&
  distanceMetrics.modelRadial.distance <= distanceMetrics.modelRadial.ciHigh
) {
  pass('Radial-density nearest-neighbour distance model returns a finite ordered sampled interval.');
} else {
  fail('Radial-density nearest-neighbour distance model did not return a finite ordered sampled interval.');
}

{
  const counts = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e8, 1e10];
  const radialDistances = counts.map(count => distanceHarness.buildDistanceMetrics(count).modelRadial.distance);
  const diskDistances = counts.map(count => distanceHarness.buildDistanceMetrics(count).model3dDisk.distance);
  let monotonic = true;
  for (let i = 1; i < radialDistances.length; i++) {
    if (!(radialDistances[i] < radialDistances[i - 1])) {
      monotonic = false;
      break;
    }
  }

  if (monotonic) {
    pass('Radial-density nearest-neighbour distance is strictly monotonic for counts 1 through 1e10.');
  } else {
    fail(
      'Radial-density nearest-neighbour distance is not strictly monotonic: ' +
      counts.map((count, i) => `${count}:${radialDistances[i]}`).join(', ')
    );
  }

  if (radialDistances.every(Number.isFinite) && diskDistances.every(Number.isFinite)) {
    pass('Radial and 3D disk distance models both return finite values across the monotonicity grid.');
  } else {
    fail('Radial or 3D disk distance model returned non-finite values across the monotonicity grid.');
  }
}

function fmt(value) {
  return Number.isFinite(value) ? value.toPrecision(12) : String(value);
}

function isGlobalEnvelopeWarning(summary) {
  return (
    summary.boundsMode === 'globalEnvelope' &&
    summary.intervalComparison &&
    summary.intervalComparison.outside &&
    !!summary.intervalComparison.warning
  );
}

function runPresetMonteCarloCase(name, label) {
  const calculator = loadCalculator();
  const deterministic = calculator.loadPresetForTest(name);
  const summary = calculator.monteCarloCalculate({
    samples: presetSampleCount,
    seed: 202613,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent',
    updateUi: false
  });

  assertValidSummary(`${label} seeded preset Monte Carlo`, summary, presetSampleCount);

  const comparison = summary.intervalComparison || {};
  const warningShown = !!comparison.warning;

  if (summary.boundsMode !== 'presetLocal' || summary.boundsLabel !== 'Scenario-local preset uncertainty') {
    fail(`${label}: expected presetLocal scenario-local uncertainty, got ${summary.boundsMode} / "${summary.boundsLabel}".`);
  }

  if (Math.abs(summary.deterministic - deterministic) > Math.max(1e-12, Math.abs(deterministic) * 1e-12)) {
    fail(`${label}: summary deterministic ${summary.deterministic} does not match preset point ${deterministic}.`);
  }

  if (comparison.outside && !warningShown) {
    fail(`${label}: deterministic point lies outside q2.5-q97.5 but no warning was produced.`);
  }

  pass(
    `${label} preset seeded Monte Carlo: deterministic=${fmt(deterministic)}; ` +
    `q50=${fmt(summary.p500)}; mean=${fmt(summary.mean)}; q2.5=${fmt(summary.p025)}; q97.5=${fmt(summary.p975)}; ` +
    `warning=${warningShown}; bounds=${summary.boundsLabel}.`
  );

  return { deterministic, summary };
}

const presetMonteCarloCases = {
  consensus: runPresetMonteCarloCase('consensus', 'Consensus'),
  kepler: runPresetMonteCarloCase('kepler', 'Kepler/Gaia'),
  optimist: runPresetMonteCarloCase('optimist', 'High-End / Optimist'),
  pessimist: runPresetMonteCarloCase('pessimist', 'Pessimist')
};

for (const [name, result] of Object.entries(presetMonteCarloCases)) {
  const medianRatio = result.summary.p500 / result.deterministic;
  const meanRatio = result.summary.mean / result.deterministic;
  const medianDex = Math.abs(Math.log10(medianRatio));

  if (medianDex <= 0.5) {
    pass(`${name}: presetLocal MC q50/deterministic ratio ${fmt(medianRatio)} is within 0.5 dex.`);
  } else {
    fail(`${name}: presetLocal MC q50/deterministic ratio ${fmt(medianRatio)} exceeds 0.5 dex.`);
  }

  if (Number.isFinite(meanRatio)) {
    pass(`${name}: MC arithmetic mean/deterministic ratio = ${fmt(meanRatio)}.`);
  }
}

const highEndCase = presetMonteCarloCases.optimist;
const highEndComparison = highEndCase.summary.intervalComparison || {};
const highEndInside =
  highEndCase.deterministic >= highEndCase.summary.p025 &&
  highEndCase.deterministic <= highEndCase.summary.p975;
if (highEndInside || highEndComparison.warning) {
  pass('High-End deterministic is either inside q2.5..q97.5 or flagged by interval-comparison warning.');
} else {
  fail(
    `High-End deterministic ${highEndCase.deterministic} is outside ` +
    `[${highEndCase.summary.p025}, ${highEndCase.summary.p975}] without any warning.`
  );
}

const pessimistCase = presetMonteCarloCases.pessimist;
const pessimistComparison = pessimistCase.summary.intervalComparison || {};
const pessimistInside =
  pessimistCase.deterministic >= pessimistCase.summary.p025 &&
  pessimistCase.deterministic <= pessimistCase.summary.p975;
if (pessimistInside || pessimistComparison.warning) {
  pass('Pessimist deterministic is either inside q2.5..q97.5 or flagged by interval-comparison warning.');
} else {
  fail(
    `Pessimist deterministic ${pessimistCase.deterministic} is outside ` +
    `[${pessimistCase.summary.p025}, ${pessimistCase.summary.p975}] without any warning.`
  );
}

if (
  Math.abs(pessimistCase.deterministic - 6.804e-6) <= 1e-18 &&
  pessimistCase.summary.p500 < 0.0001 &&
  pessimistCase.summary.mean < 0.001
) {
  pass('Pessimist presetLocal MC stays near the Rare Earth scenario and does not regress to the old high q50/mean values.');
} else {
  fail(
    `Pessimist presetLocal MC regressed: deterministic=${pessimistCase.deterministic}, ` +
    `p500=${pessimistCase.summary.p500}, mean=${pessimistCase.summary.mean}.`
  );
}

if (highEndCase.summary.p500 / highEndCase.deterministic > 0.316) {
  pass('High-End presetLocal MC q50 does not collapse far below the High-End deterministic scenario.');
} else {
  fail(`High-End presetLocal MC q50 collapsed: deterministic=${highEndCase.deterministic}, p500=${highEndCase.summary.p500}.`);
}

{
  const calculator = loadCalculator();
  calculator.loadPresetForTest('pessimist');
  const summary = calculator.monteCarloCalculate({
    samples: presetSampleCount,
    seed: 202613,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent',
    mcMode: 'globalEnvelope',
    updateUi: false
  });

  if (
    summary.boundsMode === 'globalEnvelope' &&
    summary.boundsLabel.includes('Global exploratory envelope') &&
    summary.uncertaintyBasisLabel.includes('not local preset uncertainty')
  ) {
    pass('Global envelope mode is explicitly labelled as non-local exploratory sampling.');
  } else {
    fail(`Global envelope mode label/schema mismatch: ${JSON.stringify({ mode: summary.boundsMode, label: summary.boundsLabel, basis: summary.uncertaintyBasisLabel })}.`);
  }
}

for (const [name, result] of Object.entries(presetMonteCarloCases)) {
  const comparison = result.summary.intervalComparison || {};
  if (comparison.outside && !comparison.warning) {
    fail(`${name}: deterministic result lies outside q2.5-q97.5 and no warning was provided.`);
  }
}

if (!failures) {
  pass('Deterministic-vs-Monte-Carlo interval warning checks passed for all named presets.');
}

if (failures) {
  process.stderr.write(`Seeded Monte Carlo test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Seeded Monte Carlo regression test completed.');
