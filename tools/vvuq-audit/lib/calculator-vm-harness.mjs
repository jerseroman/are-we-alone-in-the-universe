import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { repoRoot } from './audit-utils.mjs';

const require = createRequire(import.meta.url);
const { SCIENTIFIC_PARAMETER_REGISTRY } = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));

const PARAMETER_ORDER = SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder;
const PARAMETER_MAP = SCIENTIFIC_PARAMETER_REGISTRY.parameters;
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

function makeElement(id, value = '', tagName = 'input') {
  return {
    id,
    tagName: String(tagName).toUpperCase(),
    value: String(value ?? ''),
    checked: false,
    disabled: false,
    style: {},
    attributes: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {},
    innerHTML: '',
    textContent: '',
    innerText: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; },
    removeAttribute(name) { delete this.attributes[name]; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter(item => item !== child); return child; },
    addEventListener() {},
    dispatchEvent() {},
    click() { this.checked = !this.checked; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {}
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
    'bayes-pre', 'bayes-post', 'bayes-eta', 'bayes-note',
    'eta-replaced-N_p_star', 'eta-replaced-f_composition', 'eta-replaced-f_orbit',
    'preset-description', 'complex-life-toggle', 'x-toggle', 'H2O-toggle', 'CHNOPS-toggle',
    'config-alerts', 'config-alerts-body', 'result-reality-check', 'result-reality-copy',
    'deterministicResult', 'monteCarloResult', 'monteCarloMedian', 'stats',
    'simulationModel', 'distance', 'whereAreTheyBtn', 'loading',
    'convergence-box', 'convergence-alert', 'convergence-status', 'convergence-chart', 'convergence-meta',
    'robustEnvelopeResult', 'monteCarloChart', 'exceedanceChart',
    'model-radial', 'model-2d', 'model-3d-disk', 'model-3d-sphere',
    'enable-galaxy-settings', 'galaxy-options', 'galaxy-preset', 'galaxy-diameter',
    'galaxy-thickness', 'galaxy-earth-distance', 'galaxy-total-stars', 'galaxy-ghz-fraction',
    'galaxy-scaling-manual', 'galaxy-scaling-simple', 'galaxy-scaling-radial',
    'adv-master-toggle', 'adv-options', 'iterations', 'sampling_uncertainty',
    'distribution', 'simulation-engine', 'correlation-model', 'uncertainty-profile',
    'mc-basis-mode', 'robust-bounds', 'monte-carlo-seed-mode', 'monte-carlo-seed',
    'monte-carlo-seed-warning', 'adv_scale_length', 'adv_ghz_inner', 'adv_ghz_outer',
    'adv_met_thresh', 'adv_radial_bins', 'adv_temporal_R', 'sobol-panel', 'sobol-bars'
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
  elements.get('galaxy-scaling-manual').checked = true;
  for (const [id, value] of Object.entries(ADV_CONTROL_DEFAULTS)) {
    ensure(id).value = String(value);
  }
  elements.get('adv_ard_atm').value = 'co2';
  for (const id of ['model-radial', 'model-2d', 'model-3d-disk', 'model-3d-sphere']) {
    elements.get(id).checked = true;
  }

  const document = {
    body: { appendChild(child) { return child; }, removeChild(child) { return child; } },
    getElementById(id) { return elements.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === 'input, select') {
        return [...elements.values()].filter(el => ['INPUT', 'SELECT'].includes(el.tagName));
      }
      if (/input\[id\],\s*select\[id\],\s*textarea\[id\]/.test(selector)) {
        return [...elements.values()].filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && el.id);
      }
      return [];
    },
    createElement(tagName) { return makeElement('', '', tagName); }
  };

  return { document, elements };
}

export function loadCalculatorHarness(extraExports = '') {
  const { document, elements } = createDocumentStub();
  const source = fs.readFileSync(path.join(repoRoot, 'src', 'calculator-core.js'), 'utf8');
  const context = vm.createContext({
    console,
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: { href: 'https://example.test/index.html' },
    window: { addEventListener() {}, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } },
    Blob,
    URL: { createObjectURL() { return 'blob:vvuq'; }, revokeObjectURL() {} },
    requestAnimationFrame(fn) { if (typeof fn === 'function') fn(); return 1; },
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
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
    renderFermiBox() {}
  });
  context.window = { ...context.window, document };
  context.globalThis = context;

  vm.runInContext(
    `${source}
;globalThis.__VVUQ_HARNESS_EXPORTS__ = {
  PRESETS,
  ADV,
  computePlanetsAdvanced,
  applyAdvancedModules,
  resolveInputsForCalculation,
  calculateDeterministic,
  monteCarloCalculate,
  computeSobolIndices,
  createSeededRng,
  setScenarioPreset,
  buildResolvedModelState,
  buildDistanceMetrics,
  fmtN,
  setPreset(name) {
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
  setAdvancedModule(key, enabled) {
    if (!ADV.modules[key]) throw new Error('Unknown advanced module: ' + key);
    ADV.modules[key].enabled = !!enabled;
    ADV.enabled = Object.values(ADV.modules).some(item => item.enabled);
  },
  resetAdvancedModules() {
    ADV.enabled = false;
    for (const item of Object.values(ADV.modules)) item.enabled = false;
  },
  ${extraExports}
};`,
    context,
    { filename: path.join(repoRoot, 'src', 'calculator-core.js') }
  );

  return { context, document, elements, api: context.__VVUQ_HARNESS_EXPORTS__ };
}
