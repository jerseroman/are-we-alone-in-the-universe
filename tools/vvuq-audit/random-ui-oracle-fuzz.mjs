import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  appendJsonl,
  ensureDir,
  parseArgs,
  readJson,
  repoRoot,
  runCommand,
  sanitizeFilePart,
  timestampId,
  writeJson,
  writeText
} from './lib/audit-utils.mjs';

const require = createRequire(import.meta.url);
const {
  SCIENTIFIC_PARAMETER_REGISTRY
} = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));

const PARAMETER_ORDER = SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder;
const PARAMETER_MAP = SCIENTIFIC_PARAMETER_REGISTRY.parameters;
const PRESET_NAMES = Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets);
const OCCURRENCE_MODES = [null, 'pre', 'post', 'bryson_eta_direct'];
const ADV_MODULE_KEYS = [
  'hostChannels',
  'atmRet',
  'volatileSplit',
  'longterm',
  'spinObliquity',
  'radiusValley',
  'radialGHZ',
  'spaceWeather',
  'prebioticUV',
  'binary',
  'radiation',
  'ard',
  'sensitivity',
  'temporal'
];
const RESULT_AFFECTING_ADV_MODULE_KEYS = [
  'hostChannels',
  'atmRet',
  'volatileSplit',
  'longterm',
  'spinObliquity',
  'radiusValley',
  'radialGHZ',
  'spaceWeather',
  'prebioticUV',
  'binary',
  'radiation'
];
const ADV_CONTROL_DEFAULTS = {
  adv_f_G: 0.076,
  adv_w_G_hz: 1.00,
  adv_w_G_act: 0.95,
  adv_f_K: 0.121,
  adv_w_K_hz: 1.15,
  adv_w_K_act: 0.85,
  adv_f_M: 0.703,
  adv_w_M_hz: 0.80,
  adv_w_M_act: 0.30,
  adv_w_M_lock: 0.55,
  adv_f_atm_ret: 0.50,
  adv_f_atm_ret_min: 0.10,
  adv_f_atm_ret_max: 0.80,
  adv_f_vol_del: 0.40,
  adv_f_vol_del_min: 0.15,
  adv_f_vol_del_max: 0.70,
  adv_f_wat_ret: 0.35,
  adv_f_wat_ret_min: 0.10,
  adv_f_wat_ret_max: 0.60,
  adv_f_tect: 0.15,
  adv_f_tect_min: 0.03,
  adv_f_tect_max: 0.35,
  adv_f_radio: 0.70,
  adv_f_radio_min: 0.40,
  adv_f_radio_max: 0.90,
  adv_f_clim: 0.50,
  adv_f_clim_min: 0.20,
  adv_f_clim_max: 0.75,
  adv_f_spin_G: 0.35,
  adv_f_spin_K: 0.25,
  adv_f_spin_M: 0.08,
  adv_moon_boost: 1.40,
  adv_P_rocky: 0.12,
  adv_P_rocky_min: 0.06,
  adv_P_rocky_max: 0.25,
  adv_N_total_stars: 200000000000,
  adv_scale_length: 2.6,
  adv_ghz_inner: 4.0,
  adv_ghz_outer: 13.0,
  adv_met_thresh: -1.0,
  adv_radial_bins: 100,
  adv_f_xuv: 0.60,
  adv_f_xuv_min: 0.15,
  adv_f_xuv_max: 0.90,
  adv_f_uv: 0.45,
  adv_f_uv_min: 0.10,
  adv_f_uv_max: 0.70,
  adv_f_binary: 0.65,
  adv_f_binary_min: 0.40,
  adv_f_binary_max: 0.80,
  adv_f_rad: 0.90,
  adv_f_rad_min: 0.75,
  adv_f_rad_max: 0.95,
  adv_ard_mass: 1.0,
  adv_ard_age: 4.6,
  adv_temporal_R: 8.0
};
const ADV_PROBABILITY_CONTROL_IDS = [
  'adv_f_G',
  'adv_w_G_act',
  'adv_f_K',
  'adv_w_K_act',
  'adv_f_M',
  'adv_w_M_act',
  'adv_w_M_lock',
  'adv_f_atm_ret',
  'adv_f_vol_del',
  'adv_f_wat_ret',
  'adv_f_tect',
  'adv_f_radio',
  'adv_f_clim',
  'adv_f_spin_G',
  'adv_f_spin_K',
  'adv_f_spin_M',
  'adv_P_rocky',
  'adv_f_xuv',
  'adv_f_uv',
  'adv_f_binary',
  'adv_f_rad'
];
const ADV_WEIGHT_CONTROL_IDS = ['adv_w_G_hz', 'adv_w_K_hz', 'adv_w_M_hz'];
const ADV_RANDOM_CONTROL_IDS = [
  ...Object.keys(ADV_CONTROL_DEFAULTS),
  'adv_ard_atm'
];
const ORACLE_EXTRA_FACTOR_KEYS = [
  '_f_atm_ret',
  '_f_longterm',
  '_f_xuv_quiet',
  '_f_uv',
  '_f_binary',
  '_f_rad'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mulberry32(seed) {
  let state = Number(seed) >>> 0;
  return function rng() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function weightedPick(rng, weights) {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * total;
  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }
  return weights[weights.length - 1].value;
}

function randomLogUniform(rng, min, max) {
  const lo = Math.log10(Math.max(min, Number.MIN_VALUE));
  const hi = Math.log10(Math.max(max, min));
  return 10 ** (lo + (hi - lo) * rng());
}

function randomCentralValue(rng, id) {
  if (id === 'N_GHZ') return randomLogUniform(rng, 1e7, 2e11);
  if (id === 'N_p_star') return rng() < 0.04 ? 0 : rng() * 5;

  const edge = weightedPick(rng, [
    { value: 'random', weight: 80 },
    { value: 0, weight: 4 },
    { value: 1, weight: 4 },
    { value: 1e-12, weight: 3 },
    { value: 1 - 1e-12, weight: 3 },
    { value: 1e-6, weight: 3 },
    { value: 0.999999, weight: 3 }
  ]);
  return edge === 'random' ? rng() : edge;
}

function randomBoundsForValue(rng, id, central) {
  const value = Math.max(0, Number(central) || 0);
  if (id === 'N_GHZ') {
    const lo = Math.max(1, value / (1 + rng() * 20));
    const hi = Math.max(value, value * (1 + rng() * 20));
    return { min: lo, max: hi };
  }
  if (id === 'N_p_star') {
    const lo = rng() * Math.min(value, 1);
    const hi = Math.max(value, value + rng() * 5);
    return { min: lo, max: hi };
  }
  const lo = rng() * Math.min(value, 1);
  const hi = Math.max(value, Math.min(1, value + rng() * (1 - value)));
  return { min: lo, max: hi };
}

function randomAdvancedValue(rng, id) {
  if (id === 'adv_ard_atm') return pick(rng, ['co2', 'n2']);
  if (ADV_PROBABILITY_CONTROL_IDS.includes(id) || /_(min|max)$/.test(id)) return rng();
  if (ADV_WEIGHT_CONTROL_IDS.includes(id)) return rng() * 2;
  if (id === 'adv_moon_boost') return 1 + rng() * 2;
  if (id === 'adv_N_total_stars') return randomLogUniform(rng, 1e8, 2e12);
  if (id === 'adv_scale_length') return 0.5 + rng() * 9.5;
  if (id === 'adv_ghz_inner') return rng() * 15;
  if (id === 'adv_ghz_outer') return 5 + rng() * 25;
  if (id === 'adv_met_thresh') return -3 + rng() * 4;
  if (id === 'adv_radial_bins') return Math.floor(20 + rng() * 480);
  if (id === 'adv_ard_mass') return 0.1 + rng() * 1.9;
  if (id === 'adv_ard_age') return 0.5 + rng() * 11.5;
  if (id === 'adv_temporal_R') return 1 + rng() * 19;
  return ADV_CONTROL_DEFAULTS[id] ?? rng();
}

function randomGalaxySettings(rng) {
  const mode = pick(rng, ['manual', 'simple', 'radial']);
  return {
    enabled: mode !== 'manual' || rng() > 0.7,
    mode,
    totalStars: randomLogUniform(rng, 1e8, 2e12),
    ghzFraction: rng(),
    diameter: randomLogUniform(rng, 5000, 250000),
    thickness: randomLogUniform(rng, 100, 10000),
    earthDistance: rng() > 0.6 ? 0 : randomLogUniform(rng, 1e3, 1e8)
  };
}

function makeElement(id, value = '', tagName = 'input') {
  return {
    id,
    tagName: String(tagName).toUpperCase(),
    nodeName: String(tagName).toUpperCase(),
    type: '',
    value: String(value ?? ''),
    checked: false,
    disabled: false,
    innerHTML: '',
    innerText: '',
    textContent: '',
    dataset: {},
    attributes: {},
    children: [],
    style: {
      display: '',
      setProperty(name, nextValue) {
        this[name] = nextValue;
      }
    },
    classList: {
      add() {},
      remove() {},
      toggle(name, force) {
        return !!force;
      },
      contains() {
        return false;
      }
    },
    setAttribute(name, nextValue) {
      this.attributes[name] = String(nextValue);
      if (name === 'id') this.id = String(nextValue);
      if (name === 'type') this.type = String(nextValue);
      if (name.startsWith('data-')) this.dataset[name.slice(5)] = String(nextValue);
    },
    getAttribute(name) {
      if (name === 'id') return this.id || null;
      if (name === 'type') return this.type || null;
      if (name === 'min') return this.attributes.min || null;
      if (name === 'max') return this.attributes.max || null;
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter(item => item !== child);
      return child;
    },
    remove() {},
    addEventListener() {},
    dispatchEvent() {},
    click() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createDocumentStub() {
  const elements = new Map();
  const ensure = (id, value = '', tagName = 'input') => {
    if (!elements.has(id)) elements.set(id, makeElement(id, value, tagName));
    return elements.get(id);
  };

  for (const id of PARAMETER_ORDER) {
    const parameter = PARAMETER_MAP[id];
    const isProbability = parameter.unit === 'fraction';
    const el = ensure(id, parameter.central, 'input');
    el.attributes.min = '0';
    if (isProbability) el.attributes.max = '1';
    ensure(`${id}_min`, parameter.min, 'input');
    ensure(`${id}_max`, parameter.max, 'input');
    ensure(`card-${id}`, '', 'div');
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
    'deterministicResult',
    'monteCarloResult',
    'monteCarloMedian',
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
    'monteCarloChart',
    'exceedanceChart',
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
    'galaxy-total-stars',
    'galaxy-ghz-fraction',
    'galaxy-scaling-manual',
    'galaxy-scaling-simple',
    'galaxy-scaling-radial',
    'adv-master-toggle',
    'adv-options',
    'iterations',
    'sampling_uncertainty',
    'distribution',
    'simulation-engine',
    'correlation-model',
    'uncertainty-profile',
    'mc-basis-mode',
    'robust-bounds',
    'monte-carlo-seed-mode',
    'monte-carlo-seed',
    'monte-carlo-seed-warning',
    'adv_scale_length',
    'adv_ghz_inner',
    'adv_ghz_outer',
    'adv_met_thresh',
    'adv_radial_bins',
    'adv_temporal_R'
  ].forEach(id => ensure(id));

  [
    'adv_f_G', 'adv_w_G_hz', 'adv_w_G_act',
    'adv_f_K', 'adv_w_K_hz', 'adv_w_K_act',
    'adv_f_M', 'adv_w_M_hz', 'adv_w_M_act', 'adv_w_M_lock',
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
    'adv_ard_mass', 'adv_ard_atm', 'adv_ard_age',
    'adv-temporal-timeline', 'adv-temporal-text'
  ].forEach(id => ensure(id));

  for (const key of ADV_MODULE_KEYS) {
    ensure(`toggle-${key}`, '', 'button');
    ensure(`body-${key}`, '', 'div');
  }

  elements.get('iterations').value = '1000';
  elements.get('sampling_uncertainty').value = '50';
  elements.get('distribution').value = 'lognormal';
  elements.get('simulation-engine').value = 'standard';
  elements.get('correlation-model').value = 'independent';
  elements.get('uncertainty-profile').value = 'baseline';
  elements.get('mc-basis-mode').value = 'auto';
  elements.get('monte-carlo-seed-mode').value = 'fixed';
  elements.get('monte-carlo-seed').value = '202620';
  elements.get('galaxy-preset').value = 'mw';
  elements.get('galaxy-diameter').value = '100000';
  elements.get('galaxy-thickness').value = '1000';
  elements.get('galaxy-earth-distance').value = '0';
  elements.get('galaxy-total-stars').value = '200000000000';
  elements.get('galaxy-ghz-fraction').value = '0.05';
  elements.get('galaxy-ghz-fraction').attributes.min = '0';
  elements.get('galaxy-ghz-fraction').attributes.max = '1';
  elements.get('galaxy-total-stars').attributes.min = '0';
  elements.get('galaxy-scaling-manual').checked = true;
  elements.get('galaxy-scaling-manual').value = 'manual';
  elements.get('galaxy-scaling-simple').value = 'simple';
  elements.get('galaxy-scaling-radial').value = 'radial';
  for (const [id, value] of Object.entries(ADV_CONTROL_DEFAULTS)) {
    const el = ensure(id, value);
    el.value = String(value);
    if (ADV_PROBABILITY_CONTROL_IDS.includes(id) || /_(min|max)$/.test(id)) {
      el.attributes.min = '0';
      el.attributes.max = '1';
    }
  }
  for (const id of ADV_WEIGHT_CONTROL_IDS) {
    elements.get(id).attributes.min = '0';
    elements.get(id).attributes.max = '2';
  }
  elements.get('adv_moon_boost').attributes.min = '1';
  elements.get('adv_moon_boost').attributes.max = '3';
  elements.get('adv_N_total_stars').attributes.min = '0';
  elements.get('adv_scale_length').attributes.min = '0.5';
  elements.get('adv_scale_length').attributes.max = '10';
  elements.get('adv_ghz_inner').attributes.min = '0';
  elements.get('adv_ghz_inner').attributes.max = '20';
  elements.get('adv_ghz_outer').attributes.min = '0';
  elements.get('adv_ghz_outer').attributes.max = '30';
  elements.get('adv_met_thresh').attributes.min = '-3';
  elements.get('adv_met_thresh').attributes.max = '1';
  elements.get('adv_radial_bins').attributes.min = '20';
  elements.get('adv_radial_bins').attributes.max = '500';
  elements.get('adv_ard_mass').attributes.min = '0.1';
  elements.get('adv_ard_mass').attributes.max = '2';
  elements.get('adv_ard_atm').value = 'co2';
  elements.get('adv_ard_age').attributes.min = '0.5';
  elements.get('adv_ard_age').attributes.max = '12';
  elements.get('adv_temporal_R').attributes.min = '1';
  elements.get('adv_temporal_R').attributes.max = '20';
  for (const id of ['model-radial', 'model-2d', 'model-3d-disk', 'model-3d-sphere']) {
    elements.get(id).checked = true;
  }

  const document = {
    body: {
      appendChild(child) {
        return child;
      },
      removeChild(child) {
        return child;
      }
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'input, select') {
        return [...elements.values()].filter(el => ['INPUT', 'SELECT'].includes(el.tagName));
      }
      if (/input\[id\],\s*select\[id\],\s*textarea\[id\]/.test(selector)) {
        return [...elements.values()].filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && el.id);
      }
      return [];
    },
    createElement(tagName) {
      return makeElement('', '', tagName);
    }
  };

  return { document, elements };
}

function loadCalculator() {
  const { document, elements } = createDocumentStub();
  const source = fs.readFileSync(path.join(repoRoot, 'src', 'calculator-core.js'), 'utf8');
  const context = vm.createContext({
    console,
    document,
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    location: { href: 'https://example.test/index.html' },
    window: {
      addEventListener() {},
      localStorage: {
        getItem() { return null; },
        setItem() {},
        removeItem() {}
      }
    },
    Blob,
    URL: {
      createObjectURL() { return 'blob:random-fuzz'; },
      revokeObjectURL() {}
    },
    requestAnimationFrame(fn) {
      if (typeof fn === 'function') fn();
      return 1;
    },
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 1;
    },
    clearTimeout() {},
    renderConfigurationWarnings() {},
    renderResultRealityCheck() {},
    renderCalculationConsole() {},
    updateShareButtons() {},
    invalidateResults() {},
    invalidateScenarioResults() {},
    invalidateResultsOnly() {},
    invalidateDisplayOrDistanceOnly() {},
    renderActiveMonteCarloConfig() {},
    renderConvergenceSummary() {},
    renderSimulationMethodSummary() {},
    renderTemporalNtPanel() {},
    renderDetectionPanel() {},
    rebuildCharts() {},
    clearMonteCarloExportWarning() {},
    saveHistoryEntry() {},
    renderFermiBox() {},
    runSobolAnalysis() {}
  });
  context.window = { ...context.window, document };
  context.globalThis = context;

  vm.runInContext(
    `${source}\n;globalThis.__RANDOM_FUZZ_EXPORTS__ = {
      PRESETS,
      ADV,
      getInputs,
      getEffectiveNGHZ,
      getNGHZSource,
      resolveInputsForCalculation,
      applyAdvancedModules,
      computePlanetsAdvanced,
      calculateDeterministic,
      fmtN,
      buildDistanceMetrics,
      buildResolvedModelState,
      monteCarloCalculate,
      getInputValidationWarnings,
      getBoundValidationWarnings,
      setScenarioPreset,
      resetAdvancedModules() {
        ADV.enabled = false;
        for (const item of Object.values(ADV.modules)) item.enabled = false;
      },
      setAdvancedModule(key, enabled) {
        if (!ADV.modules[key]) throw new Error('Unknown advanced module: ' + key);
        ADV.modules[key].enabled = !!enabled;
        ADV.enabled = Object.values(ADV.modules).some(item => item.enabled);
      },
      activeAdvancedModules() {
        return Object.fromEntries(Object.entries(ADV.modules).map(([key, module]) => [key, !!module.enabled]));
      },
      setOccurrenceModeForFuzz(mode) {
        const normalized = mode || null;
        if (normalized && !BAYES[normalized]) throw new Error('Unknown occurrence mode: ' + normalized);
        astronomyOverrideMode = normalized;
        if (normalized && BAYES[normalized].occurrence_mode === 'eta_earth_direct') {
          etaEarthBrysonValue = Number.isFinite(Number(BAYES[normalized].eta_earth_bryson))
            ? Number(BAYES[normalized].eta_earth_bryson)
            : ETA_EARTH_BRYSON_DEFAULT;
        }
        if (normalized) applyAstronomyPriorModel(normalized);
        [
          ['bayes-pre', 'pre'],
          ['bayes-post', 'post'],
          ['bayes-eta', 'bryson_eta_direct']
        ].forEach(([id, key]) => {
          const el = document.getElementById(id);
          if (el) el.setAttribute('aria-pressed', normalized === key ? 'true' : 'false');
        });
      },
      getOccurrenceState() {
        const state = buildResolvedModelState();
        return {
          overlay: state.occurrenceOverlayMode || null,
          mode: state.occurrenceMode || null,
          etaEarthBryson: state.etaEarth_used ?? null,
          occurrenceTerm: state.occurrenceTerm_used ?? null,
          replacedTerms: state.replacedTerms || []
        };
      },
      setGalaxySettings(settings) {
        isGalaxySettingsEnabled = !!settings.enabled;
        galaxyScalingMode = settings.mode || 'manual';
        galaxyName = isGalaxySettingsEnabled ? 'Custom Galaxy X' : 'Milky Way (MW)';
        galaxyGhzFractionTouched = true;
        const total = document.getElementById('galaxy-total-stars');
        const fraction = document.getElementById('galaxy-ghz-fraction');
        const diameter = document.getElementById('galaxy-diameter');
        const thickness = document.getElementById('galaxy-thickness');
        const earthDistance = document.getElementById('galaxy-earth-distance');
        if (total) total.value = String(settings.totalStars);
        if (fraction) fraction.value = String(settings.ghzFraction);
        if (diameter) diameter.value = String(settings.diameter);
        if (thickness) thickness.value = String(settings.thickness);
        if (earthDistance) earthDistance.value = String(settings.earthDistance);
        ['manual', 'simple', 'radial'].forEach(mode => {
          const radio = document.getElementById('galaxy-scaling-' + mode);
          if (radio) radio.checked = mode === galaxyScalingMode;
        });
      },
      getGalaxySettings() {
        return {
          enabled: isGalaxySettingsEnabled,
          mode: galaxyScalingMode,
          source: getNGHZSource(),
          effective: getEffectiveNGHZ()
        };
      },
      setFeatureFlags(flags) {
        isH2OEnabled = !!flags.h2o;
        isCHNOPSEnabled = !!flags.chnops;
        isComplexLifeEnabled = !!flags.complex;
        isXEnabled = !!flags.x;
        const h2o = document.getElementById('H2O-toggle');
        const chnops = document.getElementById('CHNOPS-toggle');
        const complex = document.getElementById('complex-life-toggle');
        const x = document.getElementById('x-toggle');
        if (h2o) h2o.checked = isH2OEnabled;
        if (chnops) chnops.checked = isCHNOPSEnabled;
        if (complex) complex.checked = isComplexLifeEnabled;
        if (x) x.checked = isXEnabled;
      },
      getFeatureFlags() {
        return { h2o: isH2OEnabled, chnops: isCHNOPSEnabled, complex: isComplexLifeEnabled, x: isXEnabled };
      },
      loadPresetForFuzz(name) {
        const preset = PRESETS[name];
        if (!preset) throw new Error('Unknown preset: ' + name);
        astronomyOverrideMode = null;
        setScenarioPreset(name);
        for (const [key, value] of Object.entries(preset)) {
          const el = document.getElementById(key);
          if (el) el.value = String(value);
        }
        isH2OEnabled = preset.enableH2O !== false;
        isCHNOPSEnabled = preset.enableCHNOPS !== false;
        isComplexLifeEnabled = !!preset.enableComplex;
        isXEnabled = !!preset.enableX;
      },
      setValue(id, value) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Unknown element: ' + id);
        el.value = String(value);
        if (['N_p_star', 'f_composition', 'f_orbit'].includes(id)) {
          astronomyOverrideMode = null;
        }
      },
      getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : null;
      },
      getChecked(id) {
        const el = document.getElementById(id);
        return el ? !!el.checked : false;
      },
      setChecked(id, value) {
        const el = document.getElementById(id);
        if (!el) throw new Error('Unknown element: ' + id);
        el.checked = !!value;
      },
      renderDeterministicGui(expectedDeterministic = null) {
        calculateDeterministic();
        const el = document.getElementById('deterministicResult');
        const deterministic = Number.isFinite(expectedDeterministic)
          ? expectedDeterministic
          : computePlanetsAdvanced(applyAdvancedModules(resolveInputsForCalculation()));
        const formatted = fmtN(deterministic);
        const html = el ? String(el.innerHTML || '') : '';
        const text = el ? String(el.textContent || el.innerText || '') : '';
        return {
          deterministic,
          formatted,
          html,
          text,
          containsFormatted: html.includes(formatted) || text.includes(formatted),
          containsLabel: /DETERMINISTIC/i.test(html) || /DETERMINISTIC/i.test(text)
        };
      },
      runMonteCarloGuiCheck(seed) {
        const summary = monteCarloCalculate({
          samples: 1000,
          seed,
          distribution: 'lognormal',
          engine: 'standard',
          correlation: 'independent',
          mcMode: 'globalEnvelope',
          robustBounds: false,
          updateUi: true
        });
        const result = document.getElementById('monteCarloResult');
        const median = document.getElementById('monteCarloMedian');
        const stats = document.getElementById('stats');
        return {
          summary,
          resultHtml: result ? String(result.innerHTML || '') : '',
          medianHtml: median ? String(median.innerHTML || '') : '',
          statsHtml: stats ? String(stats.innerHTML || '') : '',
          expectedMedian: summary && Number.isFinite(summary.median) ? fmtN(summary.median) : null,
          expectedMean: summary && Number.isFinite(summary.mean) ? fmtN(summary.mean) : null,
          expectedLow: summary && Number.isFinite(summary.p025) ? fmtN(summary.p025) : null,
          expectedHigh: summary && Number.isFinite(summary.p975) ? fmtN(summary.p975) : null
        };
      },
      resolvedCase() {
        const inputs = resolveInputsForCalculation();
        const advancedInputs = applyAdvancedModules(inputs);
        const deterministic = computePlanetsAdvanced(advancedInputs);
        const activeModules = this.activeAdvancedModules();
        const gui = this.renderDeterministicGui(deterministic);
        const modelState = buildResolvedModelState();
        return {
          inputs: advancedInputs,
          deterministic,
          gui,
          modelState,
          activeAdvancedModules: activeModules,
          resultAffectingAdvancedActive: Object.entries(activeModules).some(([key, enabled]) => enabled && ${JSON.stringify(RESULT_AFFECTING_ADV_MODULE_KEYS)}.includes(key)),
          occurrence: {
            overlay: modelState.occurrenceOverlayMode || null,
            mode: modelState.occurrenceMode || null,
            etaEarthBryson: modelState.etaEarth_used ?? null,
            occurrenceTerm: modelState.occurrenceTerm_used ?? null,
            replacedTerms: modelState.replacedTerms || []
          },
          galaxy: this.getGalaxySettings(),
          flags: this.getFeatureFlags(),
          inputWarnings: getInputValidationWarnings(),
          boundWarnings: getBoundValidationWarnings()
        };
      }
    };`,
    context,
    { filename: 'src/calculator-core.js' }
  );

  return { api: context.__RANDOM_FUZZ_EXPORTS__, elements };
}

function setSaneBounds(api, id, central, rng) {
  const bounds = randomBoundsForValue(rng, id, central);
  api.setValue(`${id}_min`, bounds.min);
  api.setValue(`${id}_max`, bounds.max);
  return bounds;
}

function setCenteredBounds(api, id, options = {}) {
  const central = Number(api.getValue(id));
  if (!Number.isFinite(central)) return;
  const probability = !!options.probability;
  const positive = !!options.positive || probability;
  const spread = Math.max(Math.abs(central) * 0.5, probability ? 0.05 : 1e-12);
  let lo = central - spread;
  let hi = central + spread;
  if (positive) lo = Math.max(0, lo);
  if (probability) hi = Math.min(1, hi);
  if (lo > central) lo = central;
  if (hi < central) hi = central;
  api.setValue(`${id}_min`, lo);
  api.setValue(`${id}_max`, hi);
}

function makeMonteCarloBoundsSafe(api) {
  for (const id of PARAMETER_ORDER) {
    const parameter = PARAMETER_MAP[id] || {};
    setCenteredBounds(api, id, {
      probability: parameter.unit === 'fraction',
      positive: id === 'N_GHZ' || id === 'N_p_star'
    });
  }
  for (const id of [
    'adv_f_atm_ret',
    'adv_f_vol_del',
    'adv_f_wat_ret',
    'adv_f_tect',
    'adv_f_radio',
    'adv_f_clim',
    'adv_P_rocky',
    'adv_f_xuv',
    'adv_f_uv',
    'adv_f_binary',
    'adv_f_rad'
  ]) {
    setCenteredBounds(api, id, { probability: true });
  }
}

function applyRandomAction(api, rng, step) {
  const type = weightedPick(rng, [
    { value: 'random-central-value', weight: 26 },
    { value: 'random-bounds', weight: 10 },
    { value: 'feature-toggle-click', weight: 10 },
    { value: 'preset-click', weight: 8 },
    { value: 'occurrence-overlay-click', weight: 8 },
    { value: 'monte-carlo-control-click', weight: 8 },
    { value: 'distance-model-click', weight: 6 },
    { value: 'advanced-module-toggle', weight: 14 },
    { value: 'advanced-control-randomize', weight: 12 },
    { value: 'galaxy-settings-randomize', weight: 6 }
  ]);

  if (type === 'preset-click') {
    const preset = pick(rng, PRESET_NAMES);
    api.loadPresetForFuzz(preset);
    return { type, preset };
  }

  if (type === 'feature-toggle-click') {
    const flags = api.getFeatureFlags();
    const flag = pick(rng, ['h2o', 'chnops', 'complex', 'x']);
    flags[flag] = !flags[flag];
    api.setFeatureFlags(flags);
    return { type, flag, value: flags[flag] };
  }

  if (type === 'occurrence-overlay-click') {
    const mode = pick(rng, OCCURRENCE_MODES);
    api.setOccurrenceModeForFuzz(mode);
    return { type, mode: mode || 'none', occurrence: api.getOccurrenceState() };
  }

  if (type === 'monte-carlo-control-click') {
    const control = pick(rng, ['distribution', 'simulation-engine', 'correlation-model', 'mc-basis-mode', 'robust-bounds', 'iterations']);
    if (control === 'distribution') api.setValue(control, pick(rng, ['lognormal', 'uniform', 'normal']));
    else if (control === 'simulation-engine') api.setValue(control, pick(rng, ['standard', 'lhs']));
    else if (control === 'correlation-model') api.setValue(control, pick(rng, ['independent', 'heuristic']));
    else if (control === 'mc-basis-mode') api.setValue(control, pick(rng, ['auto', 'customInput', 'globalEnvelope']));
    else if (control === 'robust-bounds') api.setChecked(control, rng() > 0.5);
    else api.setValue(control, pick(rng, [1000, 1500, 2000, 3000, 5000]));
    return { type, control, value: control === 'robust-bounds' ? null : api.getValue(control) };
  }

  if (type === 'distance-model-click') {
    const ids = ['model-radial', 'model-2d', 'model-3d-disk', 'model-3d-sphere'];
    const id = pick(rng, ids);
    const next = rng() > 0.35;
    api.setChecked(id, next);
    if (!ids.some(item => api.getChecked(item))) api.setChecked('model-radial', true);
    return { type, id, checked: next };
  }

  if (type === 'advanced-module-toggle') {
    const module = pick(rng, ADV_MODULE_KEYS);
    const enabled = rng() > 0.35;
    api.setAdvancedModule(module, enabled);
    return { type, module, enabled };
  }

  if (type === 'advanced-control-randomize') {
    const id = pick(rng, ADV_RANDOM_CONTROL_IDS);
    const value = randomAdvancedValue(rng, id);
    api.setValue(id, value);
    return { type, id, value };
  }

  if (type === 'galaxy-settings-randomize') {
    const settings = randomGalaxySettings(rng);
    api.setGalaxySettings(settings);
    return { type, ...settings };
  }

  const id = pick(rng, PARAMETER_ORDER);
  if (type === 'random-bounds') {
    const central = Number(api.getValue(id));
    const bounds = setSaneBounds(api, id, central, rng);
    return { type, id, ...bounds };
  }

  const value = randomCentralValue(rng, id);
  api.setValue(id, value);
  const bounds = setSaneBounds(api, id, value, rng);
  return { type, id, value, ...bounds };
}

function applyScriptedEdgeAction(api, step) {
  const ids = PARAMETER_ORDER;
  const id = ids[(step - 1) % ids.length];
  const cycle = Math.floor((step - 1) / ids.length) % 8;
  const edgeValues = ['0', '1', '1e-12', '0.999999999999', '', 'NaN', '-1', id === 'N_GHZ' ? '1e13' : '2'];
  const value = edgeValues[cycle];

  if (cycle <= 7) {
    api.setValue(id, value);
    if (cycle === 5) {
      api.setValue(`${id}_min`, '0.9');
      api.setValue(`${id}_max`, '0.1');
      return { type: 'boundary-reversed-bounds', id, value, min: '0.9', max: '0.1' };
    }
    if (cycle === 6) {
      api.setValue(`${id}_min`, '');
      api.setValue(`${id}_max`, 'NaN');
      return { type: 'boundary-corrupt-bounds', id, value, min: '', max: 'NaN' };
    }
    setCenteredBounds(api, id, {
      probability: PARAMETER_MAP[id]?.unit === 'fraction',
      positive: id === 'N_GHZ' || id === 'N_p_star'
    });
    return { type: 'boundary-central-edge', id, value };
  }

  return { type: 'boundary-noop', id };
}

function applyScriptedAuditAction(api, rng, step, options = {}) {
  if (options.edgeSweep) {
    const mod = step % 20;
    if (mod === 0) {
      const settings = {
        enabled: true,
        mode: pick(rng, ['simple', 'radial']),
        totalStars: step % 40 === 0 ? 0 : randomLogUniform(rng, 1e8, 2e12),
        ghzFraction: pick(rng, [0, 1, 1e-12, 0.05, 0.999999999999]),
        diameter: pick(rng, [0, 1000, 100000, 250000]),
        thickness: pick(rng, [0, 1, 1000, 10000]),
        earthDistance: pick(rng, [0, 1, 1e6, 1e9])
      };
      api.setGalaxySettings(settings);
      return { type: 'boundary-galaxy-edge', ...settings };
    }
    if (mod === 5) {
      const mode = pick(rng, OCCURRENCE_MODES);
      api.setOccurrenceModeForFuzz(mode);
      return { type: 'boundary-occurrence-edge', mode: mode || 'none', occurrence: api.getOccurrenceState() };
    }
    if (mod === 10) {
      const module = pick(rng, RESULT_AFFECTING_ADV_MODULE_KEYS);
      const enabled = true;
      api.setAdvancedModule(module, enabled);
      const control = pick(rng, ADV_RANDOM_CONTROL_IDS);
      const value = pick(rng, ['0', '1', '1e-12', 'NaN', '']);
      api.setValue(control, value);
      return { type: 'boundary-advanced-edge', module, enabled, control, value };
    }
    return applyScriptedEdgeAction(api, step);
  }
  return applyRandomAction(api, rng, step);
}

async function findPython() {
  for (const candidate of [
    { command: 'python', args: ['--version'] },
    { command: 'py', args: ['-3', '--version'] },
    { command: 'python3', args: ['--version'] }
  ]) {
    const result = await runCommand(candidate.command, candidate.args, { timeoutMs: 15000 });
    if (result.status === 'PASS') {
      return candidate.command === 'py'
        ? { command: 'py', prefixArgs: ['-3'] }
        : { command: candidate.command, prefixArgs: [] };
    }
  }
  return null;
}

async function runOracleBatch(runDir, cases, batchIndex, python) {
  const batchName = `oracle-batch-${String(batchIndex).padStart(5, '0')}`;
  const batchDir = path.join(runDir, 'oracle-batches');
  const inputFile = path.join(batchDir, `${batchName}.jsonl`);
  const summaryFile = path.join(batchDir, `${batchName}-summary.json`);
  await ensureDir(batchDir);
  await writeText(inputFile, cases.map(item => JSON.stringify(item)).join('\n'));

  if (!python) {
    const summary = {
      status: 'SKIPPED',
      reason: 'No python/python3/py -3 executable found.',
      cases: cases.length,
      input: inputFile
    };
    await writeJson(summaryFile, summary);
    return summary;
  }

  const script = path.join(repoRoot, 'tools', 'vvuq-audit', 'oracle', 'random_state_oracle.py');
  const result = await runCommand(
    python.command,
    [...python.prefixArgs, script, '--input', inputFile, '--out', summaryFile],
    { timeoutMs: 120000 }
  );
  const summary = await readJson(summaryFile, {
    status: result.status,
    cases: cases.length,
    failures: result.status === 'PASS' ? 0 : cases.length,
    stdout: result.stdout,
    stderr: result.stderr
  });
  return {
    ...summary,
    command_status: result.status,
    command: result.commandLine,
    duration_ms: result.durationMs,
    exit_code: result.exitCode,
    stdout_tail: (result.stdout || '').slice(-2000),
    stderr_tail: (result.stderr || '').slice(-2000)
  };
}

function buildOracleCase(step, action, resolved) {
  const values = {};
  for (const id of PARAMETER_ORDER) values[id] = Number(resolved.inputs[id]);
  const parameterOrder = [...PARAMETER_ORDER];
  for (const id of ORACLE_EXTRA_FACTOR_KEYS) {
    const value = Number(resolved.inputs[id]);
    if (Number.isFinite(value)) {
      values[id] = value;
      parameterOrder.push(id);
    }
  }
  return {
    index: step,
    action,
    state: {
      parameter_order: parameterOrder,
      values,
      enable_complex: resolved.flags.complex,
      enable_x: resolved.flags.x,
      enable_h2o: resolved.flags.h2o,
      enable_chnops: resolved.flags.chnops,
      advanced_modules: resolved.activeAdvancedModules,
      occurrence: resolved.occurrence,
      galaxy: resolved.galaxy
    },
    actual: {
      deterministic: resolved.deterministic,
      sparse_probability: resolved.deterministic < 1 ? 1 - Math.exp(-Math.max(0, resolved.deterministic)) : null,
      gui_formatted: resolved.gui.formatted,
      gui_html: resolved.gui.html
    }
  };
}

export async function runRandomUiOracleFuzz(outDir, options = {}) {
  await ensureDir(outDir);
  const seconds = Math.max(1, Number(options.seconds || 300));
  const deadline = Date.now() + seconds * 1000;
  const seed = Number(options.seed || 20260629) >>> 0;
  const rng = mulberry32(seed);
  const oracleEvery = Math.max(1, Number(options.oracleEvery || 25));
  const oracleBatchSize = Math.max(1, Number(options.oracleBatchSize || 10));
  const progressEvery = Math.max(1, Number(options.progressEvery || 100));
  const paceMs = Math.max(0, Number(options.paceMs ?? 20));
  const maxSteps = options.maxSteps ? Math.max(1, Number(options.maxSteps)) : null;
  const live = !!options.live;
  const eventsFile = path.join(outDir, 'random-ui-fuzz-events.jsonl');
  const oracleCasesFile = path.join(outDir, 'random-ui-oracle-cases.jsonl');
  const replayTraceFile = path.join(outDir, 'random-ui-replay-trace.jsonl');
  const startedAt = new Date();
  const python = await findPython();
  const { api } = loadCalculator();
  api.resetAdvancedModules();

  const counters = {
    steps: 0,
    deterministic_checks: 0,
    gui_deterministic_checks: 0,
    gui_deterministic_failures: 0,
    full_gui_checks: 0,
    advanced_state_checks: 0,
    occurrence_state_checks: 0,
    galaxy_state_checks: 0,
    distance_checks: 0,
    monte_carlo_runs: 0,
    monte_carlo_gui_checks: 0,
    monte_carlo_gui_failures: 0,
    monte_carlo_blocked: 0,
    monte_carlo_invalid: 0,
    oracle_cases: 0,
    oracle_skipped_advanced_cases: 0,
    oracle_batches: 0,
    oracle_failed_batches: 0,
    action_counts: {},
    min_deterministic: null,
    max_deterministic: null
  };
  const failures = [];
  const pendingOracleCases = [];
  const oracleSummaries = [];

  await appendJsonl(eventsFile, {
    at: new Date().toISOString(),
    type: 'random_fuzz_start',
    seconds,
    seed,
    oracle_every: oracleEvery,
    oracle_batch_size: oracleBatchSize,
    pace_ms: paceMs,
    edge_sweep: !!options.edgeSweep,
    python: python ? python.command : null
  });

  while (Date.now() < deadline && (!maxSteps || counters.steps < maxSteps)) {
    counters.steps += 1;
    let action;
    try {
      action = applyScriptedAuditAction(api, rng, counters.steps, { edgeSweep: !!options.edgeSweep });
      counters.action_counts[action.type] = (counters.action_counts[action.type] || 0) + 1;

      const resolved = api.resolvedCase();
      counters.deterministic_checks += 1;
      counters.gui_deterministic_checks += 1;
      counters.full_gui_checks += 1;
      if (resolved.resultAffectingAdvancedActive) counters.advanced_state_checks += 1;
      if (resolved.occurrence?.overlay || resolved.occurrence?.mode === 'eta_earth_direct') counters.occurrence_state_checks += 1;
      if (resolved.galaxy?.enabled) counters.galaxy_state_checks += 1;
      if (!Number.isFinite(resolved.deterministic) || resolved.deterministic < 0) {
        throw new Error(`Deterministic result is invalid at step ${counters.steps}: ${resolved.deterministic}`);
      }
      if (!resolved.gui.containsLabel || !resolved.gui.containsFormatted) {
        counters.gui_deterministic_failures += 1;
        throw new Error(
          `Deterministic GUI mismatch at step ${counters.steps}: ` +
          JSON.stringify({
            expectedFormatted: resolved.gui.formatted,
            html: resolved.gui.html,
            text: resolved.gui.text
          })
        );
      }
      counters.min_deterministic = counters.min_deterministic === null
        ? resolved.deterministic
        : Math.min(counters.min_deterministic, resolved.deterministic);
      counters.max_deterministic = counters.max_deterministic === null
        ? resolved.deterministic
        : Math.max(counters.max_deterministic, resolved.deterministic);

      await appendJsonl(replayTraceFile, {
        step: counters.steps,
        action,
        deterministic: resolved.deterministic,
        gui_formatted: resolved.gui.formatted,
        gui_html: resolved.gui.html,
        activeAdvancedModules: resolved.activeAdvancedModules,
        occurrence: resolved.occurrence,
        galaxy: resolved.galaxy,
        flags: resolved.flags
      });

      if (counters.steps % 7 === 0) {
        const metrics = api.buildDistanceMetrics(Math.max(0, resolved.deterministic));
        counters.distance_checks += 1;
        if (!metrics || typeof metrics !== 'object') {
          throw new Error('buildDistanceMetrics did not return an object.');
        }
      }

      if (counters.steps % 31 === 0) {
        makeMonteCarloBoundsSafe(api);
        const mcGui = api.runMonteCarloGuiCheck((seed + counters.steps) >>> 0);
        const summary = mcGui.summary;
        if (!summary) {
          counters.monte_carlo_blocked += 1;
          await appendJsonl(eventsFile, {
            at: new Date().toISOString(),
            type: 'monte_carlo_blocked',
            step: counters.steps,
            action
          });
        } else if (summary.status === 'FAIL' || summary.n <= 0 || !Number.isFinite(summary.mean)) {
          counters.monte_carlo_invalid += 1;
          throw new Error(
            `Monte Carlo returned invalid summary at step ${counters.steps}: ` +
            JSON.stringify({
              n: summary.n,
              mean: summary.mean,
              error: summary.error,
              warnings: summary.warnings
            })
          );
        } else {
          counters.monte_carlo_runs += 1;
          counters.monte_carlo_gui_checks += 1;
          const mcGuiOk =
            mcGui.expectedMedian &&
            mcGui.expectedMean &&
            mcGui.expectedLow &&
            mcGui.expectedHigh &&
            mcGui.resultHtml.includes(mcGui.expectedMedian) &&
            mcGui.medianHtml.includes(mcGui.expectedMean) &&
            mcGui.statsHtml.includes(mcGui.expectedLow) &&
            mcGui.statsHtml.includes(mcGui.expectedHigh);
          if (!mcGuiOk) {
            counters.monte_carlo_gui_failures += 1;
            throw new Error(
              `Monte Carlo GUI mismatch at step ${counters.steps}: ` +
              JSON.stringify({
                expectedMedian: mcGui.expectedMedian,
                expectedMean: mcGui.expectedMean,
                expectedLow: mcGui.expectedLow,
                expectedHigh: mcGui.expectedHigh,
                resultHtml: mcGui.resultHtml,
                medianHtml: mcGui.medianHtml,
                statsHtml: mcGui.statsHtml
              })
            );
          }
        }
      }

      if (counters.steps % oracleEvery === 0) {
        const oracleCase = buildOracleCase(counters.steps, action, resolved);
        pendingOracleCases.push(oracleCase);
        counters.oracle_cases += 1;
        await appendJsonl(oracleCasesFile, oracleCase);
      }

      if (pendingOracleCases.length >= oracleBatchSize) {
        counters.oracle_batches += 1;
        const cases = pendingOracleCases.splice(0, pendingOracleCases.length);
        const oracleSummary = await runOracleBatch(outDir, cases, counters.oracle_batches, python);
        oracleSummaries.push(oracleSummary);
        await appendJsonl(eventsFile, {
          at: new Date().toISOString(),
          type: 'oracle_batch',
          batch: counters.oracle_batches,
          status: oracleSummary.status,
          cases: oracleSummary.cases,
          failures: oracleSummary.failures || 0
        });
        if (oracleSummary.status === 'FAIL') {
          counters.oracle_failed_batches += 1;
          failures.push({ type: 'oracle_batch', batch: counters.oracle_batches, summary: oracleSummary });
          break;
        }
      }

      if (counters.steps % progressEvery === 0 || live) {
        const line = `[RANDOM-FUZZ] step=${counters.steps} action=${action.type} ` +
          `dt=${resolved.deterministic.toPrecision(8)} oracleCases=${counters.oracle_cases} ` +
          `gui=${counters.gui_deterministic_checks} advanced=${counters.advanced_state_checks} occurrence=${counters.occurrence_state_checks} ` +
          `galaxy=${counters.galaxy_state_checks} mc=${counters.monte_carlo_runs} mcBlocked=${counters.monte_carlo_blocked}`;
        process.stdout.write(`${line}\n`);
      }

      if (counters.steps % Math.max(1, Math.floor(progressEvery / 2)) === 0) {
        await appendJsonl(eventsFile, {
          at: new Date().toISOString(),
          type: 'progress',
          step: counters.steps,
          action,
          deterministic: resolved.deterministic,
          guiFormatted: resolved.gui.formatted,
          guiHtml: resolved.gui.html,
          activeAdvancedModules: resolved.activeAdvancedModules,
          occurrence: resolved.occurrence,
          galaxy: resolved.galaxy,
          oracle_cases: counters.oracle_cases,
          monte_carlo_runs: counters.monte_carlo_runs
        });
      }
    } catch (error) {
      const failure = {
        type: 'exception',
        step: counters.steps,
        action,
        message: error.message,
        stack: error.stack
      };
      failures.push(failure);
      await appendJsonl(eventsFile, { at: new Date().toISOString(), ...failure });
      break;
    }

    if (paceMs) await sleep(paceMs);
  }

  if (!failures.length && pendingOracleCases.length) {
    counters.oracle_batches += 1;
    const oracleSummary = await runOracleBatch(outDir, pendingOracleCases.splice(0, pendingOracleCases.length), counters.oracle_batches, python);
    oracleSummaries.push(oracleSummary);
    if (oracleSummary.status === 'FAIL') {
      counters.oracle_failed_batches += 1;
      failures.push({ type: 'oracle_batch', batch: counters.oracle_batches, summary: oracleSummary });
    }
  }

  const summary = {
    status: failures.length ? 'FAIL' : 'PASS',
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    seconds_requested: seconds,
    seed,
    oracle_every: oracleEvery,
    oracle_batch_size: oracleBatchSize,
    pace_ms: paceMs,
    edge_sweep: !!options.edgeSweep,
    python_status: python ? 'AVAILABLE' : 'SKIPPED',
    ...counters,
    failures,
    oracle_summaries: oracleSummaries.map(item => ({
      status: item.status,
      cases: item.cases,
      failures: item.failures || 0,
      max_abs_error: item.max_abs_error,
      max_rel_error: item.max_rel_error,
      command_status: item.command_status
    }))
  };

  await writeJson(path.join(outDir, 'random-ui-fuzz-summary.json'), summary);
  await writeText(path.join(outDir, 'random-ui-fuzz-report.md'), [
    '# Random UI Oracle Fuzz',
    '',
    `Status: **${summary.status}**`,
    '',
    `Seconds requested: ${summary.seconds_requested}`,
    `Seed: ${summary.seed}`,
    `Edge sweep: ${summary.edge_sweep}`,
    `Steps: ${summary.steps}`,
    `Deterministic checks: ${summary.deterministic_checks}`,
    `GUI deterministic checks: ${summary.gui_deterministic_checks}`,
    `GUI deterministic failures: ${summary.gui_deterministic_failures}`,
    `Full GUI checks: ${summary.full_gui_checks}`,
    `Advanced state checks: ${summary.advanced_state_checks}`,
    `Occurrence state checks: ${summary.occurrence_state_checks}`,
    `Galaxy state checks: ${summary.galaxy_state_checks}`,
    `Distance checks: ${summary.distance_checks}`,
    `Monte Carlo runs: ${summary.monte_carlo_runs}`,
    `Monte Carlo GUI checks: ${summary.monte_carlo_gui_checks}`,
    `Monte Carlo GUI failures: ${summary.monte_carlo_gui_failures}`,
    `Monte Carlo blocked: ${summary.monte_carlo_blocked}`,
    `Monte Carlo invalid: ${summary.monte_carlo_invalid}`,
    `Oracle cases: ${summary.oracle_cases}`,
    `Oracle skipped advanced cases: ${summary.oracle_skipped_advanced_cases}`,
    `Oracle batches: ${summary.oracle_batches}`,
    `Oracle failed batches: ${summary.oracle_failed_batches}`,
    '',
    '| Action | Count |',
    '| --- | ---: |',
    ...Object.entries(summary.action_counts).map(([name, count]) => `| ${name} | ${count} |`),
    '',
    failures.length
      ? `Failures: ${failures.map(item => item.message || item.type).join('; ')}`
      : 'Failures: none'
  ].join('\n'));

  process.stdout.write(`RANDOM_UI_ORACLE_FUZZ ${summary.status}: ${summary.steps} steps, ${summary.oracle_cases} oracle cases\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || timestampId('random-ui-oracle-fuzz');
  const outDir = args.out
    ? path.resolve(repoRoot, args.out)
    : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const summary = await runRandomUiOracleFuzz(outDir, {
    seconds: args.seconds,
    seed: args.seed,
    oracleEvery: args['oracle-every'] || args.oracleEvery,
    oracleBatchSize: args['oracle-batch-size'] || args.oracleBatchSize,
    progressEvery: args['progress-every'] || args.progressEvery,
    paceMs: args['pace-ms'] ?? args.paceMs,
    maxSteps: args['max-steps'] || args.maxSteps,
    edgeSweep: !!args['edge-sweep'] || !!args.edgeSweep,
    live: args.live
  });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
