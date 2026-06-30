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

  ensure('iterations', 1000);
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
  const { elements, document } = createDocumentStub();
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
    `${source}\n;globalThis.__UNIVERSE_TEST_EXPORTS__ = {
      PRESETS,
      runMonteCarloSimulation,
      computeUniverseScaleFromYield,
      getBoundIntervalWarnings,
      getConfigurationWarnings,
      deterministicCount() {
        return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
      },
      effectiveStars() {
        return applyAdvancedModules(getInputs()).N_GHZ;
      },
      setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Unknown element: ' + id);
        el.value = String(value);
      },
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

  return { api: context.__UNIVERSE_TEST_EXPORTS__, elements };
}

function deterministicUniverseScaleForStars(stars) {
  const { api } = loadCalculator();
  api.setValue('N_GHZ', stars);
  const count = api.deterministicCount();
  const effectiveStars = api.effectiveStars();
  const perStarYield = count / effectiveStars;
  return {
    count,
    effectiveStars,
    perStarYield,
    scale: api.computeUniverseScaleFromYield(perStarYield)
  };
}

const scale5e9 = deterministicUniverseScaleForStars(5e9);
const scale5e10 = deterministicUniverseScaleForStars(5e10);
const yieldRatio = scale5e10.perStarYield / scale5e9.perStarYield;
const lowerRatio = scale5e10.scale.min / scale5e9.scale.min;

{
  const { api } = loadCalculator();
  const unitYieldScale = api.computeUniverseScaleFromYield(1);
  if (unitYieldScale.minStars === 1e22 && unitYieldScale.maxStars === 1e24) {
    pass('Observable-universe star-count range remains anchored at 1e22..1e24.');
  } else {
    fail(`Observable-universe star-count range changed: min=${unitYieldScale.minStars}, max=${unitYieldScale.maxStars}.`);
  }
}

if (Math.abs(yieldRatio - 1) <= 1e-12 && Math.abs(lowerRatio - 1) <= 1e-12) {
  pass(
    `Universe per-star scaling is stable when only N_GHZ changes: ` +
    `5e9 lower=${fmt(scale5e9.scale.min)}, 5e10 lower=${fmt(scale5e10.scale.min)}.`
  );
} else {
  fail(
    `Universe per-star scaling changed when only N_GHZ changed: ` +
    `yield ratio=${yieldRatio}, lower ratio=${lowerRatio}.`
  );
}

if (scale5e10.scale.min < scale5e9.scale.min * 10) {
  pass('Universe-scale lower bound no longer jumps by orders of magnitude when N_GHZ gets one extra zero.');
} else {
  fail(
    `Universe-scale lower bound jumped from ${scale5e9.scale.min} to ${scale5e10.scale.min} ` +
    'when only N_GHZ changed.'
  );
}

{
  const { api } = loadCalculator();
  api.loadPresetForTest('consensus');
  const summary = api.runMonteCarloSimulation({
    samples: 600,
    seed: 202613,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent'
  });

  if (
    summary.yieldStats &&
    summary.yieldStats.basis === 'per-sample-yield' &&
    summary.yieldStats.n === summary.n &&
    Array.isArray(summary.yieldSamples) &&
    summary.yieldSamples.length === summary.n
  ) {
    pass('Monte Carlo universe scaling has per-sample yield data available.');
  } else {
    fail('Monte Carlo universe scaling is missing per-sample yield data.');
  }
}

{
  const { api } = loadCalculator();
  api.setValue('N_GHZ', 5e10);
  api.setValue('N_GHZ_min', 5e9);
  api.setValue('N_GHZ_max', 4e10);
  api.runMonteCarloSimulation({
    samples: 100,
    seed: 1234,
    distribution: 'normal',
    engine: 'standard',
    correlation: 'independent'
  });

  const boundWarnings = api.getBoundIntervalWarnings();
  const configurationWarnings = api.getConfigurationWarnings();
  const hasFieldWarning = boundWarnings.some(w => w.id === 'N_GHZ' && /sampler expands the interval/i.test(w.shortText));
  const hasConfigurationWarning = configurationWarnings.some(w => w.label === 'Monte Carlo interval expanded');

  if (hasFieldWarning && hasConfigurationWarning) {
    pass('Out-of-range central N_GHZ produces a visible Monte Carlo interval expansion warning.');
  } else {
    fail('Out-of-range central N_GHZ did not produce the required interval expansion warning.');
  }
}

const appJs = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
if (
  appJs.includes('N_i / N_GHZ_i') &&
  appJs.includes('Monte Carlo per-sample yield scaling')
) {
  pass('Universe-scale UI labels Monte Carlo scaling as per-sample yield scaling.');
} else {
  fail('Universe-scale UI does not clearly label Monte Carlo per-sample yield scaling.');
}

if (failures) {
  process.stderr.write(`Universe-scale coherence test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Universe-scale coherence regression test completed.');
