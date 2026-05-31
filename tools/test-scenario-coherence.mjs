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

const sampleCount = 1200;
// All presets share the same unified Kepler/Gaia-style Monte Carlo bounds
// label. Differences between preset outputs come only from input central
// values, not from the Monte Carlo method.
const validBoundsLabels = new Set([
  'Scenario-local preset uncertainty',
  'Modified preset-local uncertainty · Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields',
  'Custom input uncertainty · Uses visible input bounds',
  'Global exploratory envelope · Not local preset uncertainty'
]);

const presets = [
  ['consensus', 'Consensus'],
  ['kepler', 'Kepler/Gaia'],
  ['optimist', 'High-End / Optimist'],
  ['pessimist', 'Pessimist / Rare Earth']
];

const distributions = [
  ['lognormal', 'adaptive log/logit-normal'],
  ['normal', 'bounded normal'],
  ['uniform', 'uniform interval sampling']
];

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function fmt(value) {
  return Number.isFinite(value) ? value.toPrecision(12) : String(value);
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
    `${source}\n;globalThis.__SCENARIO_TEST_EXPORTS__ = {
      PRESETS,
      runMonteCarloSimulation,
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

  return context.__SCENARIO_TEST_EXPORTS__;
}

function deterministicInsideInterval(summary) {
  const deterministic = summary.deterministic;
  const tolerance = Math.max(
    1e-12,
    Math.abs(deterministic) * 1e-12,
    Math.abs(summary.p975 - summary.p025) * 1e-12
  );
  return deterministic >= summary.p025 - tolerance && deterministic <= summary.p975 + tolerance;
}

function hasRequiredDisclosure(summary) {
  const comparison = summary.intervalComparison || {};
  return !!comparison.warning || summary.boundsMode === 'globalEnvelope';
}

function assertSummary(label, summary) {
  if (!summary || typeof summary !== 'object') {
    fail(`${label}: no Monte Carlo summary returned.`);
    return;
  }

  if (summary.n !== sampleCount) {
    fail(`${label}: n=${summary.n}, expected ${sampleCount}.`);
  }

  for (const key of ['deterministic', 'mean', 'p025', 'p975']) {
    if (!Number.isFinite(summary[key]) || summary[key] < 0) {
      fail(`${label}: invalid ${key}: ${summary[key]}.`);
    }
  }

    if (!validBoundsLabels.has(summary.boundsLabel)) {
      fail(`${label}: invalid or missing bounds label "${summary.boundsLabel}".`);
    }

    const expectedBoundsLabel = 'Scenario-local preset uncertainty';
    if (summary.boundsLabel !== expectedBoundsLabel) {
      fail(`${label}: named preset should use "${expectedBoundsLabel}", got "${summary.boundsLabel}".`);
    }
    if (summary.boundsMode !== 'presetLocal') {
      fail(`${label}: named preset should use presetLocal mode, got "${summary.boundsMode}".`);
    }

  if (!summary.intervalComparison || typeof summary.intervalComparison !== 'object') {
    fail(`${label}: missing deterministic-vs-interval comparison.`);
  }
}

const appJs = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
if (
  appJs.includes('Monte Carlo basis check') &&
  appJs.includes('monteCarloIntervalComparison.warning')
) {
  pass('UI has a visible Monte Carlo interval/basis warning path.');
} else {
  fail('UI is missing the visible Monte Carlo interval/basis warning path.');
}

for (const [presetKey, presetLabel] of presets) {
  for (const [distribution, distributionLabel] of distributions) {
    const calculator = loadCalculator();
    const deterministic = calculator.loadPresetForTest(presetKey);
    const summary = calculator.runMonteCarloSimulation({
      samples: sampleCount,
      seed: 202613 + presetKey.length * 17 + distribution.length * 101,
      distribution,
      engine: 'standard',
      correlation: 'independent'
    });
    const label = `${presetLabel} / ${distributionLabel}`;
    assertSummary(label, summary);

    if (Math.abs(summary.deterministic - deterministic) > Math.max(1e-12, Math.abs(deterministic) * 1e-12)) {
      fail(`${label}: summary deterministic ${summary.deterministic} does not match preset point ${deterministic}.`);
    }

    const inside = deterministicInsideInterval(summary);
    const warningShown = !!(summary.intervalComparison && summary.intervalComparison.warning);
    const disclosureOk = inside || hasRequiredDisclosure(summary);

    if (!disclosureOk) {
      fail(`${label}: deterministic result lies outside q2.5-q97.5 without warning or global-envelope label.`);
    }

    // Under median-anchored Monte Carlo, the deterministic chain is compared
    // against the MC MEDIAN (q50), not the MC arithmetic mean. The mean can
    // legitimately drift far above (Pessimist) or below (High-End) the
    // deterministic value due to Jensen's inequality on skewed factors,
    // independently of any preset-specific bug. Use median + interval-
    // containment as the disclosure invariant instead.
    const mcMedian = Number.isFinite(summary.median) ? summary.median : summary.p500;

    if (
      presetKey === 'optimist' &&
      deterministic > 0 &&
      Number.isFinite(mcMedian) &&
      mcMedian < deterministic / 3 &&
      deterministic > summary.p975 &&
      !hasRequiredDisclosure(summary)
    ) {
      fail(`${label}: High-End median ${mcMedian} is less than one-third of deterministic ${deterministic} and deterministic exceeds q97.5 without disclosure.`);
    }

    if (
      presetKey === 'pessimist' &&
      deterministic > 0 &&
      Number.isFinite(mcMedian) &&
      mcMedian > deterministic * 3 &&
      deterministic < summary.p025 &&
      !hasRequiredDisclosure(summary)
    ) {
      fail(`${label}: Pessimist median ${mcMedian} exceeds deterministic ${deterministic} by more than 3x and deterministic falls below q2.5 without disclosure.`);
    }

    pass(
      `${label}: deterministic=${fmt(deterministic)}; mean=${fmt(summary.mean)}; ` +
      `q2.5=${fmt(summary.p025)}; q97.5=${fmt(summary.p975)}; ` +
      `inside=${inside}; warning=${warningShown}; bounds=${summary.boundsLabel}.`
    );
  }
}

if (failures) {
  process.stderr.write(`Scenario-coherence test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Scenario-coherence regression test completed.');
