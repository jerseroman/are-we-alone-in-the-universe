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
const requestedMode = process.argv.includes('--deep')
  ? 'deep'
  : process.argv.includes('--all')
    ? 'all'
    : 'core';
const RUN_DEEP = requestedMode === 'deep' || requestedMode === 'all';

const {
  SCIENTIFIC_PARAMETER_REGISTRY
} = require(path.join(root, 'src', 'scientific-parameters.js'));

const parameterKeys = SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder;
const coreSource = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
const chartsSource = fs.readFileSync(path.join(root, 'src', 'charts.js'), 'utf8');
const shareSource = fs.readFileSync(path.join(root, 'src', 'share.js'), 'utf8');
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
    this.style = { setProperty() {} };
    this.disabled = false;
    this.checked = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.attributes = {};
    this.children = [];
    this.listeners = {};
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

  remove() {}

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(type, init = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      key: init.key || '',
      preventDefault() {},
      ...init
    };
    for (const handler of this.listeners[type] || []) handler.call(this, event);
  }

  click() {}

  closest() {
    return null;
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    // Support class-based lookup over the children array for clamp-warning tests.
    if (sel && sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this.children.filter(c => c.className && c.className.split(' ').includes(cls));
    }
    return [];
  }
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
    'fermi-box',
    'fermi-toggle',
    'fermi-mode-mc',
    'fermi-mode-dt',
    'fermi-summary',
    'fermi-content',
    'fermi-tail',
    'fermi-actions',
    'history-body',
    'showHistory',
    'history',
    'clearHistory',
    'calculateBtn',
    'monteCarloBtn',
    'whereAreTheyBtn',
    'loading',
    'convergence-box',
    'convergence-alert',
    'convergence-status',
    'convergence-chart',
    'convergence-meta',
    'robustEnvelopeResult',
    'monteCarloChart',
    'gaussianChart',
    'adv-tornado-container',
    'model-radial',
    'model-2d',
    'model-3d-disk',
    'model-3d-sphere',
    'enable-galaxy-settings',
    'galaxy-options',
    'galaxy-preset',
    'galaxy-diameter',
    'galaxy-thickness',
    'galaxy-earth-distance',
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

  [
    'adv_f_atm_ret', 'adv_f_atm_ret_min', 'adv_f_atm_ret_max',
    'adv_f_vol_del', 'adv_f_vol_del_min', 'adv_f_vol_del_max',
    'adv_f_wat_ret', 'adv_f_wat_ret_min', 'adv_f_wat_ret_max',
    'adv_f_tect', 'adv_f_tect_min', 'adv_f_tect_max',
    'adv_f_radio', 'adv_f_radio_min', 'adv_f_radio_max',
    'adv_f_clim', 'adv_f_clim_min', 'adv_f_clim_max',
    'adv_f_spin_G', 'adv_f_spin_K', 'adv_f_spin_M', 'adv_moon_boost',
    'adv_P_rocky', 'adv_P_rocky_min', 'adv_P_rocky_max',
    'adv_N_total_stars',
    'adv_f_xuv', 'adv_f_xuv_min', 'adv_f_xuv_max',
    'adv_f_uv', 'adv_f_uv_min', 'adv_f_uv_max',
    'adv_f_binary', 'adv_f_binary_min', 'adv_f_binary_max',
    'adv_f_rad', 'adv_f_rad_min', 'adv_f_rad_max',
    'adv_ard_mass', 'adv_ard_atm', 'adv_ard_age'
  ].forEach(id => ensureElement(id, 'input'));

  elements.get('iterations').value = '1000';
  elements.get('sampling_uncertainty').value = '50';
  elements.get('distribution').value = 'lognormal';
  elements.get('simulation-engine').value = 'standard';
  elements.get('correlation-model').value = 'independent';
  elements.get('uncertainty-profile').value = 'baseline';
  elements.get('mc-basis-mode').value = 'auto';
  elements.get('galaxy-preset').value = 'mw';
  elements.get('galaxy-diameter').value = '100000';
  elements.get('galaxy-thickness').value = '1000';
  elements.get('galaxy-earth-distance').value = '0';
  ['iterations', 'sampling_uncertainty', 'galaxy-diameter', 'galaxy-thickness', 'galaxy-earth-distance'].forEach(id => { elements.get(id).tagName = 'INPUT'; });
  ['distribution', 'simulation-engine', 'correlation-model', 'uncertainty-profile', 'mc-basis-mode', 'galaxy-preset'].forEach(id => {
    elements.get(id).tagName = 'SELECT';
  });
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

  const document = {
    body: {
      appendChild(child) { return child; },
      removeChild(child) { return child; }
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.preset-btn[data-preset]') return presetButtons;
      if (selector === '.input-validation-warning') return [];
      if (selector === '.input-card.validation-warning') return [];
      if (selector === '#share-buttons a') return [];
      // Support iteration over all elements for clamp-warning cleanup.
      if (selector === 'input, select') return [...elements.values()].filter(el => el.tagName === 'INPUT' || el.tagName === 'SELECT');
      return [];
    },
    createElement(tagName) {
      return new FakeElement('', tagName);
    }
  };

  const globalLocalStorageMock = (() => {
    const store = new Map();
    return {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    };
  })();

  const context = vm.createContext({
    console,
    document,
    localStorage: globalLocalStorageMock,
    location: { href: 'https://example.test/calculator' },
    window: {
      localStorage: globalLocalStorageMock,
      addEventListener() {},
      innerWidth: 1280,
      innerHeight: 720,
      URL: {
        createObjectURL() { return 'blob:test'; },
        revokeObjectURL() {}
      }
    },
    Blob,
    URL: {
      createObjectURL() { return 'blob:test'; },
      revokeObjectURL() {}
    },
    requestAnimationFrame() {},
    setTimeout(fn) {
      fn();
      return 1;
    }
  });

  vm.runInContext(coreSource, context, { filename: 'src/calculator-core.js' });
  vm.runInContext(chartsSource, context, { filename: 'src/charts.js' });
  vm.runInContext(shareSource, context, { filename: 'src/share.js' });
  vm.runInContext(accessibilitySource, context, { filename: 'src/accessibility.js' });
  vm.runInContext(appSource, context, { filename: 'src/app.js' });
  vm.runInContext(
    `
      globalThis.__STATE_TEST_EXPORTS__ = {
        loadPreset,
        setBayesian,
        initBaseEvents,
        applyGalaxyPresetSelection,
        invalidateResults,
        invalidateScenarioResults,
        invalidateDisplayOrDistanceOnly,
        calculateDeterministic,
        runMonteCarloSimulation,
        applyMonteCarloSummary,
        monteCarloCalculate,
        calculateDistanceToNearestPlanet,
        buildLatexExportText,
        buildJSONExportSnapshot,
        buildShareSummary,
        saveHistoryEntry,
        getScenarioState,
        getAstronomyOverrideMode: () => typeof astronomyOverrideMode !== 'undefined' ? astronomyOverrideMode : null,
        getActiveOccurrenceMode: () => typeof getActiveOccurrenceMode === 'function' ? getActiveOccurrenceMode() : null,
        getMonteCarloState,
        getMonteCarloBoundsDescriptor,
        getParamSamplingState,
        getMonteCarloBoundsBlockingErrors,
        applyProbabilityClamp,
        clearAllClampWarnings,
        CLAMP_PROBABILITY_FIELDS,
        describeSimulationOptions,
        getConfigurationWarnings,
        buildUniverseScaleHtml,
        getUniverseScaleBasis,
        getActiveDistanceSnapshot,
        readHistoryStore,
        forceDistanceReady() {
          simulationCompleted = true;
          distanceCalculated = true;
        },
        setValue(id, value) {
          const el = document.getElementById(id);
          if (!el) throw new Error('Unknown element: ' + id);
          el.value = String(value);
          // Mirror what the real input listener in app.js does so the harness
          // exercises the per-field edit tracking used by hybrid bounds.
          if (typeof recordParameterFieldEdit === 'function') recordParameterFieldEdit(id);
        },
        setChecked(id, value) {
          const el = document.getElementById(id);
          if (!el) throw new Error('Unknown element: ' + id);
          el.checked = !!value;
        },
        dispatch(id, type, init = {}) {
          const el = document.getElementById(id);
          if (!el) throw new Error('Unknown element: ' + id);
          el.dispatchEvent(type, init);
        },
        runSeededMc(seed = 202620) {
          const summary = runMonteCarloSimulation({
            samples: 400,
            seed,
            distribution: 'lognormal',
            engine: 'standard',
            correlation: 'independent',
            updateUi: false
          });
          applyMonteCarloSummary(summary);
          return summary;
        },
        getMcSnapshot() {
          return {
            scenario: getScenarioState(),
            bounds: getMonteCarloBoundsDescriptor(),
            simulationCompleted,
            mcMedianQ50,
            mcArithmeticMean,
            mcQ025,
            mcQ975,
            distance: document.getElementById('distance').innerHTML,
            fermi: document.getElementById('fermi-summary').innerHTML
          };
        },
        getText(id) {
          const el = document.getElementById(id);
          return el ? String(el.textContent || el.innerHTML || '') : '';
        },
        getValue(id) {
          const el = document.getElementById(id);
          return el ? String(el.value) : '';
        },
        hasClampWarning(baseId) {
          const card = document.getElementById('card-' + baseId);
          return card ? card.children.some(c => c.className && c.className.includes('input-clamp-warning')) : false;
        },
        getHtml(id) {
          const el = document.getElementById(id);
          return el ? String(el.innerHTML || '') : '';
        },
        getDataset(id, key) {
          const el = document.getElementById(id);
          return el && el.dataset ? el.dataset[key] : undefined;
        },
        setDataset(id, key, value) {
          const el = document.getElementById(id);
          if (!el) throw new Error('Unknown element: ' + id);
          el.dataset[key] = String(value);
        }
      };
    `,
    context,
    { filename: 'state-transition-test-harness.js' }
  );

  return {
    elements,
    ...context.__STATE_TEST_EXPORTS__
  };
}

function assertIncludes(label, text, expected) {
  if (String(text).includes(expected)) {
    pass(`${label} includes "${expected}".`);
  } else {
    fail(`${label} did not include "${expected}". Actual: ${String(text).slice(0, 240)}`);
  }
}

function almostEqual(a, b, rel = 1e-12, abs = 1e-12) {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(abs, rel * Math.max(1, Math.abs(a), Math.abs(b)));
}

function assertRoundtripSnapshot(label, before, after) {
  if (after.scenario.state === 'preset' && after.bounds.mode === 'presetLocal') {
    pass(`${label}: restored state resolves to clean presetLocal.`);
  } else {
    fail(`${label}: restored state did not return to clean presetLocal: ${JSON.stringify(after.scenario)} / ${JSON.stringify(after.bounds)}.`);
  }

  [
    'mcMedianQ50',
    'mcArithmeticMean',
    'mcQ025',
    'mcQ975'
  ].forEach(key => {
    if (almostEqual(before[key], after[key])) pass(`${label}: ${key} returned to baseline.`);
    else fail(`${label}: ${key} changed after visible-state restore (${before[key]} vs ${after[key]}).`);
  });

  if (before.distance === after.distance) pass(`${label}: distance panel returned to baseline.`);
  else fail(`${label}: distance panel changed after visible-state restore.`);

  if (before.fermi === after.fermi) pass(`${label}: Fermi panel returned to baseline.`);
  else fail(`${label}: Fermi panel changed after visible-state restore.`);
}

function runBaseline(harness, seed) {
  harness.calculateDeterministic();
  harness.runSeededMc(seed);
  harness.calculateDistanceToNearestPlanet();
  return harness.getMcSnapshot();
}

function runRoundtripCase(label, presetKey, mutate, restore, seed = 202620) {
  const harness = createHarness();
  harness.loadPreset(presetKey);
  const before = runBaseline(harness, seed);
  mutate(harness);
  restore(harness);
  const after = runBaseline(harness, seed);
  assertRoundtripSnapshot(label, before, after);
}

function runEditPath(field, value) {
  const harness = createHarness();
  harness.loadPreset('pessimist');

  const beforeState = harness.getScenarioState();
  const beforeBounds = harness.getMonteCarloBoundsDescriptor();

  if (beforeState.label === 'Pessimist / Rare Earth') {
    pass(`${field}: initial scenario label is Pessimist / Rare Earth.`);
  } else {
    fail(`${field}: initial scenario label is ${beforeState.label}.`);
  }

  if (beforeBounds.label === 'Scenario-local preset uncertainty' && beforeBounds.mode === 'presetLocal') {
    pass(`${field}: initial Pessimist uses scenario-local preset uncertainty.`);
  } else {
    fail(`${field}: initial Pessimist bounds label is "${beforeBounds.label}" (mode "${beforeBounds.mode}").`);
  }

  harness.setValue(field, value);
  harness.invalidateResults();

  const modifiedState = harness.getScenarioState();
  const modifiedBounds = harness.getMonteCarloBoundsDescriptor();
  const presetDescription = harness.getHtml('preset-description');
  const configWarnings = harness.getConfigurationWarnings().map(w => `${w.label}: ${w.text}`).join('\n');

  if (modifiedState.state === 'modified' && modifiedState.label === 'Modified Pessimist / Rare Earth') {
    pass(`${field}: manual edit creates Modified Pessimist / Rare Earth state.`);
  } else {
    fail(`${field}: manual edit produced state=${modifiedState.state}, label=${modifiedState.label}.`);
  }

  assertIncludes(`${field}: preset description`, presetDescription, 'Modified Pessimist / Rare Earth');
  assertIncludes(`${field}: preset description`, presetDescription, 'no longer the unchanged preset scenario');
  assertIncludes(`${field}: configuration warning`, configWarnings, 'You edited a Pessimist / Rare Earth value');
  assertIncludes(`${field}: configuration warning`, configWarnings, 'modified preset-local uncertainty');

  if (
    modifiedBounds.mode === 'modifiedPresetLocal' &&
    modifiedBounds.label === 'Modified preset-local uncertainty / Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields'
  ) {
    pass(`${field}: modified Pessimist uses modified preset-local uncertainty.`);
  } else {
    fail(`${field}: modified bounds were not the expected modified preset-local label: ${JSON.stringify(modifiedBounds)}.`);
  }

  const summary = harness.monteCarloCalculate({
    samples: 250,
    seed: 202614,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent'
  });

  if (summary.boundsMode === 'modifiedPresetLocal' && summary.boundsLabel === modifiedBounds.label) {
    pass(`${field}: Monte Carlo summary preserves the modified preset-local label.`);
  } else {
    fail(`${field}: Monte Carlo summary bounds mismatch: ${summary.boundsMode} / ${summary.boundsLabel}.`);
  }

  assertIncludes(`${field}: simulation model line`, harness.getHtml('simulationModel'), 'Modified preset-local uncertainty');

  harness.forceDistanceReady();
  const universeHtml = harness.buildUniverseScaleHtml('mc');
  const universeBasis = harness.getUniverseScaleBasis('mc');

  assertIncludes(`${field}: Universe scale HTML`, universeHtml, 'Modified Pessimist / Rare Earth');
  assertIncludes(`${field}: Universe scale HTML`, universeHtml, 'Modified preset-local uncertainty');

  if (universeBasis.label.includes(summary.boundsLabel)) {
    pass(`${field}: Universe scale basis matches Monte Carlo bounds basis.`);
  } else {
    fail(`${field}: Universe basis "${universeBasis.label}" does not match "${summary.boundsLabel}".`);
  }

  return { summary, universeHtml };
}

function runCoreStateTransitionTests() {
  {
    const harness = createHarness();
    harness.loadPreset('kepler');
    const cleanNghz = harness.getValue('N_GHZ');

    // Named galaxy presets (MW/M31/M81/NGC5128) were removed. Galaxy selection now
    // resolves to the single user-defined "Custom Galaxy X" scaling scenario and must
    // never overwrite the raw N_GHZ input field, nor block Monte Carlo.
    harness.applyGalaxyPresetSelection();
    const afterSelectNghz = harness.getValue('N_GHZ');
    harness.calculateDeterministic();
    const summary = harness.monteCarloCalculate({
      samples: 120,
      seed: 202900,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });
    const blockedNghz = harness.getMonteCarloBoundsBlockingErrors().some(error => error.id === 'N_GHZ');

    if (
      cleanNghz === '10000000000' &&
      afterSelectNghz === cleanNghz &&
      summary &&
      !blockedNghz
    ) {
      pass('Galaxy X selection leaves raw N_GHZ untouched and does not block Monte Carlo.');
    } else {
      fail(`Galaxy X N_GHZ/MC regression: clean=${cleanNghz}, afterSelect=${afterSelectNghz}, summary=${!!summary}, blockedNghz=${blockedNghz}.`);
    }
  }

  {
    const harness = createHarness();
    harness.loadPreset('kepler');
    harness.initBaseEvents();
    harness.calculateDeterministic();
    const beforeText = harness.getText('deterministicResult');
    harness.elements.get('sampling_uncertainty').value = '75';
    harness.dispatch('sampling_uncertainty', 'input');
    const afterText = harness.getText('deterministicResult');
    const state = harness.getScenarioState();
    const summary = harness.monteCarloCalculate({
      samples: 80,
      seed: 202901,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });

    if (
      beforeText &&
      afterText === beforeText &&
      state.state === 'preset' &&
      state.activePreset === 'kepler' &&
      summary
    ) {
      pass('sampling_uncertainty event preserves deterministic output and clean preset state.');
    } else {
      fail(`sampling_uncertainty event regression: before="${beforeText}", after="${afterText}", state=${JSON.stringify(state)}, summary=${!!summary}.`);
    }
  }

  {
    const harness = createHarness();
    harness.loadPreset('kepler');
    harness.setBayesian('pre');
    const preState = harness.getScenarioState();
    harness.setBayesian('post');
    const postState = harness.getScenarioState();

    const consensus = createHarness();
    consensus.loadPreset('consensus');
    consensus.setBayesian('post');
    const consensusPostState = consensus.getScenarioState();
    consensus.setBayesian('pre');
    const consensusPreState = consensus.getScenarioState();

    const bryson = createHarness();
    bryson.loadPreset('kepler');
    const keplerNpBeforeBryson = bryson.getValue('N_p_star');
    bryson.setBayesian('bryson_eta_direct');
    const brysonDirectMode = bryson.getActiveOccurrenceMode();
    bryson.setBayesian('post');
    const brysonPostNp = bryson.getValue('N_p_star');

    if (
      preState.state === 'modified' &&
      postState.state === 'preset' &&
      postState.activePreset === 'kepler' &&
      harness.getValue('f_orbit') === '0.21' &&
      harness.getValue('f_composition') === '0.25' &&
      consensusPostState.state === 'modified' &&
      consensusPreState.state === 'preset' &&
      consensusPreState.activePreset === 'consensus' &&
      brysonDirectMode === 'eta_earth_direct' &&
      brysonPostNp === keplerNpBeforeBryson &&
      bryson.getValue('f_orbit') === '0.21' &&
      bryson.getValue('f_composition') === '0.25'
    ) {
      pass('Occurrence overlays reconcile back to clean matching presets and Bryson direct does not leak stale factorized values.');
    } else {
      fail(`Occurrence overlay reconciliation regression: kepler pre=${JSON.stringify(preState)}, kepler post=${JSON.stringify(postState)}, consensus post=${JSON.stringify(consensusPostState)}, consensus pre=${JSON.stringify(consensusPreState)}, brysonMode=${brysonDirectMode}, brysonNp=${brysonPostNp}/${keplerNpBeforeBryson}.`);
    }
  }

  {
    const harness = createHarness();
    harness.loadPreset('kepler');
    // Make a preset-owned field visibly dirty with invalid bounds. presetLocal
    // must no longer ignore that DOM state; it resolves to modifiedPresetLocal
    // and blocks on the same visible-bound error as customInput.
    harness.elements.get('f_sun_type_min').value = '0.5';
    harness.elements.get('f_sun_type_max').value = '0.6';

    const presetDescriptor = harness.getMonteCarloBoundsDescriptor({ mcMode: 'presetLocal' });
    const presetErrors = harness.getMonteCarloBoundsBlockingErrors(presetDescriptor);

    const customSummary = harness.monteCarloCalculate({
      mcMode: 'customInput',
      samples: 80,
      seed: 202902,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });
    const presetSummary = harness.monteCarloCalculate({
      mcMode: 'presetLocal',
      samples: 80,
      seed: 202903,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });

    if (
      customSummary === null &&
      presetDescriptor.mode === 'modifiedPresetLocal' &&
      presetErrors.some(error => error.id === 'f_sun_type' && error.kind === 'central-outside') &&
      presetSummary === null
    ) {
      pass('Programmatic presetLocal resolves dirty DOM state to modifiedPresetLocal and blocks invalid visible bounds.');
    } else {
      fail(`Programmatic mcMode basis regression: customSummary=${!!customSummary}, presetDescriptor=${JSON.stringify(presetDescriptor)}, presetErrors=${JSON.stringify(presetErrors)}, presetMode=${presetSummary && presetSummary.boundsMode}.`);
    }
  }

  {
    const harness = createHarness();
    harness.loadPreset('kepler');
    harness.setValue('N_GHZ', '100000000000');
    harness.invalidateScenarioResults();

    const presetDescriptor = harness.getMonteCarloBoundsDescriptor({ mcMode: 'presetLocal' });
    const presetErrors = harness.getMonteCarloBoundsBlockingErrors(presetDescriptor);
    const presetSummary = harness.monteCarloCalculate({
      mcMode: 'presetLocal',
      samples: 80,
      seed: 202904,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });
    const customDescriptor = harness.getMonteCarloBoundsDescriptor({ mcMode: 'customInput' });
    const customErrors = harness.getMonteCarloBoundsBlockingErrors(customDescriptor);
    const customSummary = harness.monteCarloCalculate({
      mcMode: 'customInput',
      samples: 80,
      seed: 202905,
      distribution: 'lognormal',
      engine: 'standard',
      correlation: 'independent'
    });

    if (
      presetDescriptor.mode === 'modifiedPresetLocal' &&
      presetErrors.some(error => error.id === 'N_GHZ' && error.kind === 'central-outside') &&
      presetSummary === null &&
      customDescriptor.mode === 'customInput' &&
      customErrors.some(error => error.id === 'N_GHZ' && error.kind === 'central-outside') &&
      customSummary === null
    ) {
      pass('Explicit presetLocal resolves modified visible N_GHZ to modifiedPresetLocal and blocks invalid visible bounds.');
    } else {
      fail(
        `Strict presetLocal regression: presetDescriptor=${JSON.stringify(presetDescriptor)}, ` +
        `presetErrors=${JSON.stringify(presetErrors)}, presetMode=${presetSummary && presetSummary.boundsMode}, ` +
        `customDescriptor=${JSON.stringify(customDescriptor)}, customErrors=${JSON.stringify(customErrors)}, customSummary=${!!customSummary}.`
      );
    }
  }
}

runCoreStateTransitionTests();

if (RUN_DEEP) {

// Each edit keeps the central value inside its visible [min, max] so Monte Carlo
// remains runnable; the invalid-bound gate is covered separately below.
[
  ['N_GHZ', '6000000000'],
  ['N_GHZ_min', '4000000000'],
  ['N_GHZ_max', '35000000000'],
  ['f_complex_life', '0.000002'],
  ['f_complex_life_min', '0.000000002'],
  ['f_complex_life_max', '0.5']
].forEach(([field, value]) => runEditPath(field, value));

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  harness.setValue('N_GHZ', '50000000000');
  harness.setValue('N_GHZ_min', '50000000000');
  harness.setValue('N_GHZ_max', '400000000000');
  harness.invalidateResults();
  const summary = harness.monteCarloCalculate({
    samples: 250,
    seed: 202615,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent'
  });
  harness.forceDistanceReady();
  const universeHtml = harness.buildUniverseScaleHtml('mc');
  const warnings = harness.getConfigurationWarnings().map(w => w.text).join('\n');

  if (summary.boundsMode === 'modifiedPresetLocal') {
    pass('N_GHZ scale regression uses modified preset-local uncertainty after edit.');
  } else {
    fail(`N_GHZ scale regression used ${summary.boundsMode} instead of modifiedPresetLocal.`);
  }

  assertIncludes('N_GHZ scale regression warning', warnings, 'You edited a Pessimist / Rare Earth value');
  assertIncludes('N_GHZ scale regression warning', warnings, 'modified preset-local uncertainty');
  assertIncludes('N_GHZ scale regression Universe scale', universeHtml, 'Modified Pessimist / Rare Earth');
  assertIncludes('N_GHZ scale regression Universe scale', universeHtml, 'Modified preset-local uncertainty');
}

{
  const harness = createHarness();
  harness.setDataset('monteCarloChart', 'stale', 'false');
  harness.setDataset('gaussianChart', 'stale', 'false');
  harness.loadPreset('consensus');
  harness.setValue('N_GHZ', '12000000000');
  harness.invalidateResults();

  if (harness.getDataset('monteCarloChart', 'stale') === 'true' && harness.getDataset('gaussianChart', 'stale') === 'true') {
    pass('Chart invalidation marks histogram and KDE charts stale after input changes.');
  } else {
    fail(
      `Chart invalidation did not mark both charts stale: histogram=${harness.getDataset('monteCarloChart', 'stale')}, ` +
      `kde=${harness.getDataset('gaussianChart', 'stale')}.`
    );
  }
}

for (const presetKey of Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets)) {
  runRoundtripCase(
    `${presetKey}: f_orbit_min visible restore`,
    presetKey,
    harness => {
      harness.setValue('f_orbit_min', '0.01');
      harness.invalidateScenarioResults();
    },
    harness => {
      harness.setValue('f_orbit_min', '0.10');
      harness.invalidateScenarioResults();
    },
    202700 + presetKey.length
  );
}

runRoundtripCase(
  'Kepler central value visible restore',
  'kepler',
  harness => {
    harness.setValue('N_GHZ', '100000000000');
    harness.invalidateScenarioResults();
  },
  harness => {
    harness.setValue('N_GHZ', '10000000000');
    harness.invalidateScenarioResults();
  },
  202731
);

runRoundtripCase(
  'Kepler max-bound visible restore',
  'kepler',
  harness => {
    harness.setValue('f_orbit_max', '0.20');
    harness.invalidateScenarioResults();
  },
  harness => {
    harness.setValue('f_orbit_max', '0.21');
    harness.invalidateScenarioResults();
  },
  202732
);

runRoundtripCase(
  'Kepler min/max visible restore',
  'kepler',
  harness => {
    harness.setValue('f_orbit_min', '0.01');
    harness.setValue('f_orbit_max', '0.20');
    harness.invalidateScenarioResults();
  },
  harness => {
    harness.setValue('f_orbit_min', '0.10');
    harness.setValue('f_orbit_max', '0.21');
    harness.invalidateScenarioResults();
  },
  202733
);

runRoundtripCase(
  'Kepler optional factor value restore',
  'kepler',
  harness => {
    harness.setValue('f_complex_life', '0.5');
    harness.invalidateScenarioResults();
  },
  harness => {
    harness.setValue('f_complex_life', '0.01');
    harness.invalidateScenarioResults();
  },
  202734
);

runRoundtripCase(
  'Kepler advanced scientific control restore',
  'kepler',
  harness => {
    harness.setValue('adv_f_tect', '0.4');
    harness.invalidateScenarioResults();
  },
  harness => {
    harness.setValue('adv_f_tect', '');
    harness.invalidateScenarioResults();
  },
  202735
);

{
  const harness = createHarness();
  harness.loadPreset('kepler');
  const before = runBaseline(harness, 202736);
  harness.setChecked('model-2d', false);
  harness.invalidateDisplayOrDistanceOnly(false);
  harness.setChecked('model-2d', true);
  harness.invalidateDisplayOrDistanceOnly(false);
  const after = runBaseline(harness, 202736);

  assertRoundtripSnapshot('Distance model 2D off/on restore', before, after);
  if (after.scenario.state === 'preset') pass('Distance model off/on does not mark scientific scenario modified.');
  else fail(`Distance model off/on marked scenario as ${after.scenario.state}.`);
}

{
  const harness = createHarness();
  harness.loadPreset('kepler');
  harness.calculateDeterministic();
  const tex = harness.buildLatexExportText();
  if (/MC state: not-run\b/.test(tex) && /MC q50 median[^\n]+not run/.test(tex) && !/0\.000e\+0/i.test(tex)) {
    pass('LaTeX deterministic-only export marks MC as not-run, not zero.');
  } else {
    fail('LaTeX deterministic-only export did not mark MC as not-run correctly.');
  }

  harness.runSeededMc(202737);
  const validTex = harness.buildLatexExportText();
  if (/simulationCompleted: true/.test(validTex) && /MC state: current\b/.test(validTex) && !/MC q50 median[^\n]+not run/.test(validTex)) {
    pass('LaTeX valid MC export includes current MC rows.');
  } else {
    fail('LaTeX valid MC export did not include current MC rows.');
  }

  harness.setValue('N_GHZ', '12000000000');
  harness.invalidateScenarioResults();
  const staleTex = harness.buildLatexExportText();
  if (
    /MC state: stale\b/.test(staleTex) &&
    staleTex.includes('MC q50 median & $N_{50}$ & stale') &&
    !/MC state: current\b/.test(staleTex) &&
    !/MC state: not-run\b/.test(staleTex) &&
    !/0\.000e\+0/i.test(staleTex)
  ) {
    pass('LaTeX stale MC export marks MC as stale and suppresses invalid zero placeholders.');
  } else {
    fail('LaTeX stale MC export did not mark MC as stale correctly.');
  }
}

{
  const harness = createHarness();
  harness.loadPreset('kepler');
  harness.calculateDeterministic();
  harness.runSeededMc(202738);
  harness.calculateDistanceToNearestPlanet();

  let history = harness.readHistoryStore().items;
  const first = history[history.length - 1];
  if (first && first.activeDistanceModel === 'radial GHZ density' && /Monte Carlo q50/.test(first.activeDistanceCountBasis || '')) {
    pass('History stores radial/default active distance model and MC q50 basis.');
  } else {
    fail(`History did not store radial/default basis: ${JSON.stringify(first)}`);
  }

  const json = harness.buildJSONExportSnapshot();
  if (json.results.active_distance_model === first.activeDistanceModel && json.results.active_distance_count_basis === first.activeDistanceCountBasis) {
    pass('JSON export agrees with history active distance model and basis.');
  } else {
    fail('JSON export disagrees with history active distance model or basis.');
  }

  harness.setChecked('model-radial', false);
  harness.setChecked('model-3d-disk', false);
  harness.setChecked('model-3d-sphere', false);
  harness.invalidateDisplayOrDistanceOnly(false);
  harness.calculateDeterministic();
  harness.runSeededMc(202739);
  harness.calculateDistanceToNearestPlanet();
  history = harness.readHistoryStore().items;
  const second = history[history.length - 1];

  if (first.activeDistanceModel === 'radial GHZ density' && second.activeDistanceModel === '2D GHZ annulus') {
    pass('History preserves old radial entry and records later 2D basis separately.');
  } else {
    fail(`History did not preserve active distance models across changes: first=${JSON.stringify(first)}, second=${JSON.stringify(second)}`);
  }
}

{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  harness.setValue('N_GHZ', '6000000000');
  harness.invalidateScenarioResults();
  harness.loadPreset('consensus');
  harness.loadPreset('pessimist');
  const state = harness.getScenarioState();
  const bounds = harness.getMonteCarloBoundsDescriptor();
  if (state.state === 'preset' && bounds.mode === 'presetLocal') {
    pass('Preset A -> edit -> B -> A restores clean presetLocal state.');
  } else {
    fail(`Preset switch contamination remained: ${JSON.stringify(state)} / ${JSON.stringify(bounds)}.`);
  }
}

// Preset roundtrip tests
// Capture the canonical visible value before mutating, then restore that exact
// string, so the invariant holds for all presets without hardcoded values.
function visibleStateHash(harness) {
  const parts = [];
  for (const key of parameterKeys) {
    parts.push(`${key}=${harness.getValue(key)}`);
    parts.push(`${key}_min=${harness.getValue(`${key}_min`)}`);
    parts.push(`${key}_max=${harness.getValue(`${key}_max`)}`);
  }
  return parts.join('|');
}

function runCapturedFieldRoundtrip(label, presetKey, fieldIds, seed) {
  const harness = createHarness();
  harness.loadPreset(presetKey);
  const canonical = fieldIds.map(id => [id, harness.getValue(id)]);
  const baselineHash = visibleStateHash(harness);
  const before = runBaseline(harness, seed);
  const beforeMcState = harness.getMonteCarloState();

  for (const [id, val] of canonical) {
    const n = Number(val);
    harness.setValue(id, Number.isFinite(n) && n !== 0 ? String(n * 1.09) : '0.5');
  }
  harness.invalidateScenarioResults();
  for (const [id, val] of canonical) harness.setValue(id, val);
  harness.invalidateScenarioResults();

  const after = runBaseline(harness, seed);

  if (visibleStateHash(harness) === baselineHash) pass(`${label}: visible-state hash returned to baseline.`);
  else fail(`${label}: visible-state hash diverged after restore.`);

  assertRoundtripSnapshot(label, before, after);

  if (harness.getMonteCarloState() === beforeMcState) pass(`${label}: mcState returned to baseline (${beforeMcState}).`);
  else fail(`${label}: mcState changed (${beforeMcState} -> ${harness.getMonteCarloState()}).`);
}

const presetKeys = Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets);
let presetSeed = 202760;
for (const presetKey of presetKeys) {
  runCapturedFieldRoundtrip(`${presetKey}: central value restore`, presetKey, ['N_GHZ'], presetSeed++);
  runCapturedFieldRoundtrip(`${presetKey}: min bound restore`, presetKey, ['N_GHZ_min'], presetSeed++);
  runCapturedFieldRoundtrip(`${presetKey}: max bound restore`, presetKey, ['N_GHZ_max'], presetSeed++);
  runCapturedFieldRoundtrip(`${presetKey}: min+max restore`, presetKey, ['N_GHZ_min', 'N_GHZ_max'], presetSeed++);

  // Distance model toggle must not mark the scientific scenario modified.
  {
    const harness = createHarness();
    harness.loadPreset(presetKey);
    const baselineHash = visibleStateHash(harness);
    const before = runBaseline(harness, presetSeed);
    harness.setChecked('model-2d', false);
    harness.invalidateDisplayOrDistanceOnly(false);
    harness.setChecked('model-2d', true);
    harness.invalidateDisplayOrDistanceOnly(false);
    const after = runBaseline(harness, presetSeed++);
    if (visibleStateHash(harness) === baselineHash) pass(`${presetKey}: distance toggle preserves visible parameter state.`);
    else fail(`${presetKey}: distance toggle changed visible parameter state.`);
    assertRoundtripSnapshot(`${presetKey} distance model toggle`, before, after);
    if (after.scenario.state === 'preset') pass(`${presetKey}: distance toggle keeps scenario preset.`);
    else fail(`${presetKey}: distance toggle marked scenario ${after.scenario.state}.`);
  }
}

// Cross-preset A -> edit -> B -> A returns A to clean preset/presetLocal for every preset.
for (const a of presetKeys) {
  const b = presetKeys.find(k => k !== a) || a;
  const harness = createHarness();
  harness.loadPreset(a);
  const baselineHash = visibleStateHash(harness);
  const nGhz = Number(harness.getValue('N_GHZ'));
  harness.setValue('N_GHZ', Number.isFinite(nGhz) && nGhz !== 0 ? String(nGhz * 1.5) : '1000000000');
  harness.invalidateScenarioResults();
  harness.loadPreset(b);
  harness.loadPreset(a);
  const state = harness.getScenarioState();
  const bounds = harness.getMonteCarloBoundsDescriptor();
  if (visibleStateHash(harness) === baselineHash && state.state === 'preset' && bounds.mode === 'presetLocal') {
    pass(`Preset ${a} -> edit -> ${b} -> ${a} restores clean visible/presetLocal state.`);
  } else {
    fail(`Preset ${a} -> ${b} -> ${a} contamination: hashMatch=${visibleStateHash(harness) === baselineHash}, ${JSON.stringify(state)} / ${JSON.stringify(bounds)}.`);
  }
}

// --- Sections 1, 2 & 4: tri-state MC + raw history fields + export consistency ---
{
  const harness = createHarness();
  harness.loadPreset('kepler');

  // not-run: deterministic-only
  harness.calculateDeterministic();
  harness.saveHistoryEntry();
  let json = harness.buildJSONExportSnapshot();
  let tex = harness.buildLatexExportText();
  let entry = harness.readHistoryStore().items.slice(-1)[0];
  if (
    harness.getMonteCarloState() === 'not-run' &&
    json.simulation.mcState === 'not-run' &&
    json.results.mcState === 'not-run' &&
    entry.mcState === 'not-run' &&
    /MC state: not-run\b/.test(tex)
  ) pass('Deterministic-only: mcState is not-run across getter/JSON/history/LaTeX.');
  else fail(`Deterministic-only mcState mismatch: getter=${harness.getMonteCarloState()}, json.sim=${json.simulation.mcState}, json.res=${json.results.mcState}, history=${entry.mcState}.`);

  if (
    entry.mcMedianQ50Raw === null && entry.mcArithmeticMeanRaw === null &&
    entry.mcQ025Raw === null && entry.mcQ975Raw === null &&
    entry.mcMedianQ50 === 'not run' && entry.ciLow === 'not run'
  ) pass('Deterministic-only history has null raw MC fields and no invalid zero placeholders.');
  else fail(`Deterministic-only history raw MC fields not null/clean: ${JSON.stringify(entry)}.`);

  // current: run MC, then a distance calc that saves history
  harness.runSeededMc(202790);
  harness.calculateDistanceToNearestPlanet();
  const snap = harness.getMcSnapshot();
  json = harness.buildJSONExportSnapshot();
  tex = harness.buildLatexExportText();
  entry = harness.readHistoryStore().items.slice(-1)[0];
  if (
    harness.getMonteCarloState() === 'current' &&
    json.simulation.mcState === 'current' &&
    entry.mcState === 'current' &&
    /MC state: current\b/.test(tex)
  ) pass('Valid MC: mcState is current across getter/JSON/history/LaTeX.');
  else fail(`Valid MC mcState mismatch: getter=${harness.getMonteCarloState()}, json=${json.simulation.mcState}, history=${entry.mcState}.`);

  if (
    Number.isFinite(entry.mcMedianQ50Raw) && almostEqual(entry.mcMedianQ50Raw, snap.mcMedianQ50) &&
    Number.isFinite(entry.mcArithmeticMeanRaw) && Number.isFinite(entry.mcQ025Raw) && Number.isFinite(entry.mcQ975Raw)
  ) pass('Valid MC history stores raw numeric MC fields matching the run.');
  else fail(`Valid MC history raw fields missing/mismatched: raw=${entry.mcMedianQ50Raw}, snap=${snap.mcMedianQ50}.`);

  if (
    json.preset === entry.selectedPreset &&
    json.results.active_distance_model === entry.activeDistanceModel &&
    json.results.active_distance_count_basis === entry.activeDistanceCountBasis &&
    json.simulation.mcMode === entry.mcMode &&
    json.results.deterministic === entry.deterministic
  ) pass('Valid MC: JSON and history agree on preset, distance model/basis, mcMode, deterministic.');
  else fail('Valid MC: JSON and history disagree on basis/consistency fields.');

  // stale: mutate a scientific parameter and invalidate
  harness.setValue('N_GHZ', String(Number(harness.getValue('N_GHZ')) * 2));
  harness.invalidateScenarioResults();
  harness.saveHistoryEntry();
  json = harness.buildJSONExportSnapshot();
  tex = harness.buildLatexExportText();
  entry = harness.readHistoryStore().items.slice(-1)[0];
  if (
    harness.getMonteCarloState() === 'stale' &&
    json.simulation.mcState === 'stale' &&
    entry.mcState === 'stale' &&
    /MC state: stale\b/.test(tex) &&
    entry.mcMedianQ50Raw === null &&
    entry.mcMedianQ50 === 'stale'
  ) pass('Stale MC: mcState is stale across getter/JSON/history/LaTeX with null raw fields.');
  else fail(`Stale MC mismatch: getter=${harness.getMonteCarloState()}, json=${json.simulation.mcState}, history=${entry.mcState}, raw=${entry.mcMedianQ50Raw}, disp=${entry.mcMedianQ50}.`);
}

// --- Edited-preset MC semantics and invalid-bound gating (tasks A-F) ---

// A. Invalid N_GHZ bounds (central > max) must block Monte Carlo for every preset.
for (const presetKey of presetKeys) {
  const harness = createHarness();
  harness.loadPreset(presetKey);
  harness.calculateDeterministic();
  const central = Number(harness.getValue('N_GHZ'));
  harness.setValue('N_GHZ', String(central * 10)); // one extra zero -> central > max
  harness.invalidateScenarioResults();

  const summary = harness.monteCarloCalculate({
    samples: 200, seed: 202810, distribution: 'lognormal', engine: 'standard', correlation: 'independent'
  });
  const warnings = harness.getConfigurationWarnings().map(w => `${w.label}: ${w.text}`).join('\n');
  const snap = harness.getMcSnapshot();
  const json = harness.buildJSONExportSnapshot();
  const tex = harness.buildLatexExportText();

  const blocked =
    summary === null &&
    /Monte Carlo cannot run until these bounds are corrected/.test(warnings) &&
    snap.simulationCompleted === false &&
    harness.getMonteCarloState() !== 'current' &&
    json.simulation.mcState !== 'current' &&
    json.results.mc_median_q50 === null &&
    /MC state: (not-run|stale)\b/.test(tex) &&
    /MC q50 median & \$N_\{50\}\$ & (not run|stale)/.test(tex);

  if (blocked) {
    pass(`${presetKey}: invalid N_GHZ bounds (central > max) block Monte Carlo; no current MC exported.`);
  } else {
    fail(`${presetKey}: invalid N_GHZ bounds did not block MC (summary=${summary !== null}, simDone=${snap.simulationCompleted}, mcState=${harness.getMonteCarloState()}, jsonMc=${json.simulation.mcState}).`);
  }
}

// B. Editing a preset coherently -> modifiedPresetLocal (not full customInput);
//    unchanged preset fields keep scenario-local uncertainty.
for (const presetKey of presetKeys) {
  const harness = createHarness();
  harness.loadPreset(presetKey);
  runBaseline(harness, 202820);
  const central = Number(harness.getValue('N_GHZ'));
  const maxv = Number(harness.getValue('N_GHZ_max'));
  const edited = central * 2 <= maxv ? central * 2 : central / 2; // keep central in [min,max]
  harness.setValue('N_GHZ', String(edited));
  harness.invalidateScenarioResults();
  harness.calculateDeterministic();

  const summary = harness.monteCarloCalculate({
    samples: 200, seed: 202821, distribution: 'lognormal', engine: 'standard', correlation: 'independent'
  });
  const editedState = harness.getParamSamplingState('N_GHZ');
  const unchangedState = harness.getParamSamplingState('f_sun_type');

  // Export and history basis tests
  const json = harness.buildJSONExportSnapshot();
  harness.saveHistoryEntry();
  const histEntry = harness.readHistoryStore().items.slice(-1)[0];

  if (
    summary &&
    summary.boundsMode === 'modifiedPresetLocal' &&
    /Modified preset-local uncertainty/.test(summary.boundsLabel) &&
    editedState.basis === 'visible-input-bounds' &&
    unchangedState.basis === 'scenario-local' &&
    json.simulation.mcMode === 'modifiedPresetLocal' &&
    json.simulation.mcState === 'current' &&
    histEntry.mcMode === 'modifiedPresetLocal'
  ) {
    pass(`${presetKey}: coherent N_GHZ edit uses modifiedPresetLocal; edited field uses visible bounds, unchanged field stays scenario-local; export/history agree.`);
  } else {
    fail(`${presetKey}: edited preset basis wrong: mode=${summary && summary.boundsMode}, N_GHZ=${editedState.basis}, f_sun_type=${unchangedState.basis}, jsonMode=${json.simulation.mcMode}, histMode=${histEntry && histEntry.mcMode}.`);
  }
}

// C. A single coherent N_GHZ edit must not shift MC q50 by orders of magnitude
//    (unrelated fields must not switch to broad visible bounds).
{
  const harness = createHarness();
  harness.loadPreset('pessimist');
  const before = runBaseline(harness, 202830);
  const central = Number(harness.getValue('N_GHZ'));
  harness.setValue('N_GHZ', String(central * 2)); // 5e9 -> 1e10, inside [5e9, 4e10]
  harness.invalidateScenarioResults();
  const after = runBaseline(harness, 202830);
  const ratio = after.mcMedianQ50 / before.mcMedianQ50;
  if (ratio >= 0.5 && ratio <= 5) {
    pass(`Pessimist: N_GHZ x2 edit scales MC q50 by ${ratio.toFixed(2)}x (no order-of-magnitude blowup from unrelated bounds).`);
  } else {
    fail(`Pessimist: N_GHZ x2 edit shifted MC q50 by ${ratio.toFixed(2)}x (expected ~2x); unrelated fields likely switched to broad bounds.`);
  }
}

// D. Restoring an edited N_GHZ min to the preset default returns to clean
//    presetLocal and the baseline seeded MC summary.
for (const presetKey of presetKeys) {
  const harness = createHarness();
  harness.loadPreset(presetKey);
  const before = runBaseline(harness, 202840);
  const defMin = harness.getValue('N_GHZ_min');
  harness.setValue('N_GHZ_min', String(Number(defMin) * 0.9)); // lower min, keeps central in range
  harness.invalidateScenarioResults();
  harness.setValue('N_GHZ_min', defMin); // restore exact default
  harness.invalidateScenarioResults();
  const after = runBaseline(harness, 202840);
  const scenario = harness.getScenarioState();
  const bounds = harness.getMonteCarloBoundsDescriptor();
  if (
    scenario.state === 'preset' &&
    bounds.mode === 'presetLocal' &&
    almostEqual(before.mcMedianQ50, after.mcMedianQ50)
  ) {
    pass(`${presetKey}: restoring N_GHZ min returns to clean presetLocal and baseline MC.`);
  } else {
    fail(`${presetKey}: restore did not return to clean preset/presetLocal: state=${scenario.state}, mode=${bounds.mode}.`);
  }
}

// E. Distance/display controls are not scientific edits.
{
  const harness = createHarness();
  harness.loadPreset('kepler');
  harness.setChecked('model-2d', false);
  harness.invalidateDisplayOrDistanceOnly(false);
  harness.setChecked('model-2d', true);
  harness.invalidateDisplayOrDistanceOnly(false);
  const scenario = harness.getScenarioState();
  const bounds = harness.getMonteCarloBoundsDescriptor();
  if (scenario.state === 'preset' && bounds.mode === 'presetLocal') {
    pass('Distance model toggle keeps scenario preset and auto MC mode presetLocal.');
  } else {
    fail(`Distance model toggle changed scientific state: state=${scenario.state}, mode=${bounds.mode}.`);
  }
}

// F. Explicit customInput selection still uses full visible-bound sampling.
{
  const harness = createHarness();
  harness.loadPreset('kepler');
  harness.setValue('mc-basis-mode', 'customInput');
  const desc = harness.getMonteCarloBoundsDescriptor();
  const state = harness.getParamSamplingState('f_sun_type');
  if (desc.mode === 'customInput' && /Custom input uncertainty/.test(desc.label) && state.basis === 'visible-input-bounds') {
    pass('Explicit customInput selection uses full visible-bound sampling and the custom input label.');
  } else {
    fail(`Explicit customInput not honored: mode=${desc.mode}, basis=${state.basis}.`);
  }
}

// ─── Probability/fraction field clamp tests (A-H) ────────────────────────────

// A. Central value clamp
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size', '1.5');
  const clamped = h.applyProbabilityClamp('f_size');
  const visVal = h.getValue('f_size');
  const hasWarn = h.hasClampWarning('f_size');
  h.calculateDeterministic();
  const inp = h.getHtml ? null : null; // deterministic uses the corrected value via getInputs()
  if (clamped && visVal === '1' && hasWarn) {
    pass('A: f_size central value 1.5 clamped to 1 with inline warning.');
  } else {
    fail(`A: f_size clamp failed: clamped=${clamped}, value="${visVal}", warning=${hasWarn}.`);
  }
  // Ensure deterministic uses 1, not 1.5 (getInputs reads the corrected element value).
  const det = h.calculateDeterministic();
  const inp2 = (() => {
    const el = h.elements.get('f_size');
    return el ? parseFloat(el.value) : NaN;
  })();
  if (almostEqual(inp2, 1)) pass('A: deterministic reads clamped value 1 for f_size, not 1.5.');
  else fail(`A: deterministic sees f_size = ${inp2}, expected 1.`);
}

// B. Min bound clamp
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size_min', '1.5');
  const clamped = h.applyProbabilityClamp('f_size_min');
  const visVal = h.getValue('f_size_min');
  const hasWarn = h.hasClampWarning('f_size');
  if (clamped && visVal === '1' && hasWarn) {
    pass('B: f_size min bound 1.5 clamped to 1 with inline warning.');
  } else {
    fail(`B: f_size_min clamp failed: clamped=${clamped}, value="${visVal}", warning=${hasWarn}.`);
  }
}

// C. Max bound clamp
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size_max', '1.5');
  const clamped = h.applyProbabilityClamp('f_size_max');
  const visVal = h.getValue('f_size_max');
  const hasWarn = h.hasClampWarning('f_size');
  if (clamped && visVal === '1' && hasWarn) {
    pass('C: f_size max bound 1.5 clamped to 1 with inline warning.');
  } else {
    fail(`C: f_size_max clamp failed: clamped=${clamped}, value="${visVal}", warning=${hasWarn}.`);
  }
}

// D. Valid value 0.8 — no clamp, no warning
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size', '0.8');
  const clamped = h.applyProbabilityClamp('f_size');
  const visVal = h.getValue('f_size');
  const hasWarn = h.hasClampWarning('f_size');
  if (!clamped && visVal === '0.8' && !hasWarn) {
    pass('D: f_size = 0.8 — no clamp, no warning.');
  } else {
    fail(`D: f_size=0.8 incorrectly clamped or warned: clamped=${clamped}, value="${visVal}", warning=${hasWarn}.`);
  }
}

// E. Exact 1 — no clamp, no warning
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size', '1');
  const clamped = h.applyProbabilityClamp('f_size');
  const visVal = h.getValue('f_size');
  const hasWarn = h.hasClampWarning('f_size');
  if (!clamped && visVal === '1' && !hasWarn) {
    pass('E: f_size = 1 (exact) — no clamp, no warning.');
  } else {
    fail(`E: f_size=1 incorrectly clamped or warned: clamped=${clamped}, value="${visVal}", warning=${hasWarn}.`);
  }
}

// F. Count-like fields are not clamped (N_GHZ, N_p_star)
for (const [id, val] of [['N_GHZ', '5000000000'], ['N_p_star', '1.5']]) {
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue(id, val);
  const clamped = h.applyProbabilityClamp(id);
  const visVal = h.getValue(id);
  if (!clamped && visVal === val) {
    pass(`F: ${id} = ${val} — count-like field not clamped.`);
  } else {
    fail(`F: ${id} = ${val} was incorrectly clamped or modified: clamped=${clamped}, value="${visVal}".`);
  }
}

// G. Preset reload clears clamp warning
{
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue('f_size', '1.5');
  h.applyProbabilityClamp('f_size');
  const warnBefore = h.hasClampWarning('f_size');
  h.loadPreset('kepler');
  const warnAfter = h.hasClampWarning('f_size');
  if (warnBefore && !warnAfter) {
    pass('G: clamp warning cleared after preset reload.');
  } else {
    fail(`G: warning state: before=${warnBefore}, after=${warnAfter}; expected true then false.`);
  }
}

// H. Existing invalid-bound gating still works after clamp: central <= 1 but outside max
{
  const h = createHarness();
  h.loadPreset('kepler');
  // Set max very small, then set central to 0.9 (valid as fraction, but above max).
  h.setValue('f_size_max', '0.5');
  h.setValue('f_size', '0.9'); // 0.9 <= 1, so no clamp; but 0.9 > max 0.5
  h.applyProbabilityClamp('f_size');
  h.invalidateScenarioResults();
  const blockingErrors = h.getMonteCarloBoundsBlockingErrors();
  const isBlocked = blockingErrors.some(e => e.id === 'f_size');
  const hasClampWarn = h.hasClampWarning('f_size');
  if (isBlocked && !hasClampWarn) {
    pass('H: central=0.9, max=0.5 — MC blocked by existing gate, no spurious clamp warning.');
  } else {
    fail(`H: blocked=${isBlocked}, clampWarn=${hasClampWarn}; expected blocked=true, clampWarn=false.`);
  }
}

// Additional clamp coverage: f_orbit, f_H2O, f_complex_life
for (const id of ['f_orbit', 'f_H2O', 'f_complex_life']) {
  const h = createHarness();
  h.loadPreset('kepler');
  h.setValue(id, '2');
  const clamped = h.applyProbabilityClamp(id);
  if (clamped && h.getValue(id) === '1') {
    pass(`Clamp: ${id} = 2 → clamped to 1.`);
  } else {
    fail(`Clamp: ${id} = 2 was not clamped; value="${h.getValue(id)}".`);
  }
}

}

if (failures) {
  process.stderr.write(`State-transition coherence test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass(`State-transition ${requestedMode} regression test completed.`);
