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

const parameterKeys = SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder;
const coreSource = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
const accessibilitySource = fs.readFileSync(path.join(root, 'src', 'accessibility.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function almostEqual(actual, expected, relTol = 1e-12, absTol = 1e-18) {
  return Math.abs(actual - expected) <= Math.max(absTol, Math.abs(expected) * relTol);
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : !!force;
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    return shouldAdd;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.value = '';
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.disabled = false;
    this.checked = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.attributes = {};
    this.children = [];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector() {
    return null;
  }

  remove() {}

  addEventListener() {}
}

function createHarness() {
  const elements = new Map();
  const presetButtons = Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets).map(key => {
    const el = new FakeElement(`preset-${key}`, 'button');
    el.dataset.preset = key;
    el.classList.add('preset-btn');
    return el;
  });

  function ensureElement(id, tagName = 'div') {
    if (!elements.has(id)) elements.set(id, new FakeElement(id, tagName));
    return elements.get(id);
  }

  for (const key of parameterKeys) {
    const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
    ensureElement(key, 'input').value = String(parameter.central);
    ensureElement(`${key}_min`, 'input').value = String(parameter.min);
    ensureElement(`${key}_max`, 'input').value = String(parameter.max);
    ensureElement(`card-${key}`);
  }

  [
    'bayes-pre',
    'bayes-post',
    'bayes-eta',
    'bayes-note',
    'eta-replaced-N_p_star',
    'eta-replaced-f_composition',
    'eta-replaced-f_orbit',
    'preset-description',
    'complex-life-toggle',
    'x-toggle',
    'H2O-toggle',
    'CHNOPS-toggle',
    'config-alerts',
    'config-alerts-body',
    'result-reality-check',
    'result-reality-copy',
    'monteCarloResult',
    'deterministicResult',
    'stats',
    'simulationModel',
    'distance',
    'whereAreTheyBtn',
    'loading',
    'convergence-box',
    'convergence-alert',
    'convergence-status',
    'convergence-chart',
    'convergence-meta',
    'robustEnvelopeResult',
    'adv-master-toggle',
    'adv-options',
    'adv_f_atm_ret',
    'adv_f_atm_ret_min',
    'adv_f_atm_ret_max',
    'adv_f_vol_del',
    'adv_f_vol_del_min',
    'adv_f_vol_del_max',
    'adv_f_wat_ret',
    'adv_f_wat_ret_min',
    'adv_f_wat_ret_max',
    'fermi-box',
    'fermi-summary',
    'fermi-content',
    'fermi-tail',
    'fermi-actions',
    'sobol-panel',
    'temporal-nt-panel',
    'detection-panel',
    'calculation-console',
    'model-radial',
    'model-2d',
    'model-3d-disk',
    'model-3d-sphere',
    'iterations',
    'sampling_uncertainty',
    'distribution',
    'simulation-engine',
    'correlation-model',
    'uncertainty-profile',
    'mc-basis-mode',
    'robust-bounds',
    'adv_scale_length',
    'adv_ghz_inner',
    'adv_ghz_outer',
    'adv_met_thresh',
    'adv_radial_bins',
    'adv_temporal_R'
  ].forEach(id => ensureElement(id));

  elements.get('iterations').value = '1000';
  elements.get('sampling_uncertainty').value = '50';
  elements.get('distribution').value = 'lognormal';
  elements.get('simulation-engine').value = 'standard';
  elements.get('correlation-model').value = 'independent';
  elements.get('uncertainty-profile').value = 'baseline';
  elements.get('mc-basis-mode').value = 'auto';
  elements.get('model-radial').checked = true;
  elements.get('model-2d').checked = true;
  elements.get('model-3d-disk').checked = true;
  elements.get('model-3d-sphere').checked = true;
  elements.get('adv_scale_length').value = '2.6';
  elements.get('adv_ghz_inner').value = '4.0';
  elements.get('adv_ghz_outer').value = '13.0';
  elements.get('adv_met_thresh').value = '-1.0';
  elements.get('adv_radial_bins').value = '100';
  elements.get('adv_temporal_R').value = '8.0';
  elements.get('adv_f_atm_ret').value = '0.50';
  elements.get('adv_f_atm_ret_min').value = '0.10';
  elements.get('adv_f_atm_ret_max').value = '0.80';
  elements.get('adv_f_vol_del').value = '0.40';
  elements.get('adv_f_vol_del_min').value = '0.15';
  elements.get('adv_f_vol_del_max').value = '0.70';
  elements.get('adv_f_wat_ret').value = '0.35';
  elements.get('adv_f_wat_ret_min').value = '0.10';
  elements.get('adv_f_wat_ret_max').value = '0.60';

  const document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.preset-btn[data-preset]') return presetButtons;
      if (selector === '.input-validation-warning') return [];
      if (selector === '.input-card.validation-warning') return [];
      return [];
    },
    createElement(tagName) {
      return new FakeElement('', tagName);
    }
  };

  const context = vm.createContext({
    console,
    document,
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    window: {
      addEventListener() {},
      innerWidth: 1280,
      innerHeight: 720
    },
    requestAnimationFrame() {},
    updateShareButtons() {},
    setTimeout(fn) {
      fn();
      return 1;
    }
  });

  vm.runInContext(coreSource, context, { filename: 'src/calculator-core.js' });
  vm.runInContext(accessibilitySource, context, { filename: 'src/accessibility.js' });
  vm.runInContext(appSource, context, { filename: 'src/app.js' });
  vm.runInContext(
    `
      globalThis.__PRESET_RESET_TEST_EXPORTS__ = {
        PRESETS,
        loadPreset,
        invalidateResults,
        getScenarioState,
        getMonteCarloBoundsDescriptor,
        getParamSamplingState,
        getActivePreset: () => activePreset,
        setValue(id, value) {
          const el = document.getElementById(id);
          if (!el) throw new Error('Unknown element: ' + id);
          el.value = String(value);
        },
        getValue(id) {
          const el = document.getElementById(id);
          return el ? String(el.value) : '';
        },
        getText(id) {
          const el = document.getElementById(id);
          return el ? String(el.textContent || el.innerHTML || '') : '';
        },
        captureAdvancedDefaults() {
          captureAdvancedControlDefaults();
        },
        dirtyOptionalStates() {
          isH2OEnabled = false;
          isCHNOPSEnabled = false;
          isComplexLifeEnabled = true;
          isXEnabled = true;
        },
        dirtyAdvancedState() {
          ADV.enabled = true;
          Object.keys(ADV.modules).forEach(key => {
            ADV.modules[key].enabled = true;
          });
          document.getElementById('adv_f_atm_ret').value = '0.25';
        },
        dirtyVolatileSplit() {
          ADV.enabled = true;
          ADV.modules.volatileSplit.enabled = true;
          document.getElementById('adv_f_vol_del').value = '0.08';
          document.getElementById('adv_f_wat_ret').value = '0.09';
        },
        currentDeterministic() {
          return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
        },
        advancedEnabled() {
          return ADV.enabled || Object.values(ADV.modules).some(m => m.enabled);
        }
      };
    `,
    context,
    { filename: 'preset-reset-test-harness.js' }
  );

  return {
    elements,
    ...context.__PRESET_RESET_TEST_EXPORTS__
  };
}

function defaultBounds(key) {
  const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
  return { min: parameter.min, max: parameter.max };
}

function assertDefaultVisibleBounds(label, harness, keys = parameterKeys) {
  for (const key of keys) {
    const expected = defaultBounds(key);
    const actualMin = Number(harness.getValue(`${key}_min`));
    const actualMax = Number(harness.getValue(`${key}_max`));

    if (!almostEqual(actualMin, expected.min)) {
      fail(`${label}: ${key}_min=${actualMin}, expected ${expected.min}.`);
    }

    if (!almostEqual(actualMax, expected.max)) {
      fail(`${label}: ${key}_max=${actualMax}, expected ${expected.max}.`);
    }
  }
}

function assertPresetCentralValues(label, harness, presetKey) {
  const preset = harness.PRESETS[presetKey];
  for (const key of parameterKeys) {
    const actual = Number(harness.getValue(key));
    const expected = Number(preset[key]);

    if (!almostEqual(actual, expected)) {
      fail(`${label}: ${key}=${actual}, expected ${expected}.`);
    }
  }
}

function assertPresetState(label, harness, presetKey) {
  const state = harness.getScenarioState();

  if (state.state === 'preset' && state.activePreset === presetKey && !state.isModified) {
    pass(`${label}: scenario state is clean preset ${presetKey}.`);
  } else {
    fail(`${label}: scenario state is ${JSON.stringify(state)}.`);
  }
}

function poisonNghzBounds(harness) {
  harness.setValue('N_GHZ', '50000000000');
  harness.setValue('N_GHZ_min', '50000000000');
  harness.setValue('N_GHZ_max', '400000000000');
}

function cleanPresetOutput(presetKey) {
  const harness = createHarness();
  harness.captureAdvancedDefaults();
  harness.loadPreset(presetKey);
  return harness.currentDeterministic();
}

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  harness.setValue('N_GHZ_min', '123456789');
  harness.setValue('N_GHZ_max', '987654321000');
  harness.invalidateResults();
  harness.loadPreset('consensus');

  assertPresetState('Stale bounds reset', harness, 'consensus');
  assertDefaultVisibleBounds('Stale bounds reset', harness, ['N_GHZ']);

  const sampling = harness.getParamSamplingState('N_GHZ');
  const central = Number(harness.getValue('N_GHZ'));
  if (
    sampling.basis === 'scenario-local' &&
    almostEqual(sampling.meanVal, central) &&
    sampling.lo < central &&
    sampling.hi > central
  ) {
    pass('Stale bounds reset: sampling state uses scenario-local N_GHZ bounds centered on the clean preset.');
  } else {
    fail(`Stale bounds reset: sampling used basis=${sampling.basis}, mean=${sampling.meanVal}, lo=${sampling.lo}, hi=${sampling.hi}.`);
  }
}

{
  const harness = createHarness();
  const sequence = ['pessimist', 'consensus', 'optimist', 'kepler', 'pessimist'];

  for (const presetKey of sequence) {
    poisonNghzBounds(harness);
    harness.loadPreset(presetKey);
    assertPresetState(`Cross-preset ${presetKey}`, harness, presetKey);
    assertPresetCentralValues(`Cross-preset ${presetKey}`, harness, presetKey);
    assertDefaultVisibleBounds(`Cross-preset ${presetKey}`, harness);
  }

  pass('Cross-preset switching resets central values and visible bounds for every named preset.');
}

{
  const expected = Object.fromEntries(
    Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets).map(key => [key, cleanPresetOutput(key)])
  );

  for (const presetKey of Object.keys(expected)) {
    const harness = createHarness();
    harness.captureAdvancedDefaults();
    harness.dirtyOptionalStates();
    harness.dirtyAdvancedState();
    harness.loadPreset(presetKey);
    const actual = harness.currentDeterministic();

    if (almostEqual(actual, expected[presetKey])) {
      pass(`${presetKey}: clean preset output is isolated from dirty H2O/CHNOPS and advanced module state.`);
    } else {
      fail(`${presetKey}: dirty optional/advanced state leaked into preset output (${actual} vs clean ${expected[presetKey]}).`);
    }

    if (!harness.advancedEnabled()) {
      pass(`${presetKey}: advanced module enable state resets to off.`);
    } else {
      fail(`${presetKey}: advanced module enable state remained active after preset load.`);
    }
  }
}

{
  const expected = Object.fromEntries(
    Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets).map(key => [key, cleanPresetOutput(key)])
  );

  for (const presetKey of Object.keys(expected)) {
    const harness = createHarness();
    harness.captureAdvancedDefaults();
    harness.dirtyVolatileSplit();
    harness.loadPreset(presetKey);
    const actual = harness.currentDeterministic();

    if (almostEqual(actual, expected[presetKey])) {
      pass(`${presetKey}: clean preset output is isolated from dirty volatile/water split state.`);
    } else {
      fail(`${presetKey}: dirty volatile split leaked into preset output (${actual} vs clean ${expected[presetKey]}).`);
    }
  }
}

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  harness.setValue('N_GHZ', '6000000000');
  harness.invalidateResults();

  const modifiedState = harness.getScenarioState();
  if (modifiedState.state === 'modified' && modifiedState.label === 'Modified Pessimist / Rare Earth') {
    pass('Modified preset isolation: manual edit creates Modified Pessimist / Rare Earth.');
  } else {
    fail(`Modified preset isolation: edit produced ${JSON.stringify(modifiedState)}.`);
  }

  harness.loadPreset('consensus');
  assertPresetState('Modified preset isolation after Consensus switch', harness, 'consensus');
  assertDefaultVisibleBounds('Modified preset isolation after Consensus switch', harness);
}

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  const central = Number(harness.getValue('N_GHZ'));
  const min = Number(harness.getValue('N_GHZ_min'));
  const descriptor = harness.getMonteCarloBoundsDescriptor();

  // Pessimist loads literature-informed registry default min/max. Its central
  // value happens to sit on the registry minimum (N_GHZ central = 5e9 = min),
  // so we still verify that the visible state reflects this edge anchoring.
  // The bounds descriptor uses the preset-specific Pessimist label.
  if (
    almostEqual(central, min) &&
    descriptor.label === 'Scenario-local preset uncertainty' &&
    descriptor.mode === 'presetLocal'
  ) {
    pass('Pessimist loads with scenario-local preset MC label.');
  } else {
    fail(`Pessimist state was central=${central}, min=${min}, descriptor=${JSON.stringify(descriptor)}.`);
  }
}

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  poisonNghzBounds(harness);
  harness.invalidateResults();
  harness.loadPreset('consensus');

  const min = Number(harness.getValue('N_GHZ_min'));
  const max = Number(harness.getValue('N_GHZ_max'));
  const expected = defaultBounds('N_GHZ');

  if (
    almostEqual(min, expected.min) &&
    almostEqual(max, expected.max) &&
    min !== 50000000000 &&
    max !== 400000000000
  ) {
    pass('Screenshot regression: Consensus does not keep modified Pessimist N_GHZ bounds.');
  } else {
    fail(`Screenshot regression: Consensus retained N_GHZ_min=${min}, N_GHZ_max=${max}.`);
  }
}

if (failures) {
  process.stderr.write(`Preset state reset test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Preset state reset regression test completed.');
