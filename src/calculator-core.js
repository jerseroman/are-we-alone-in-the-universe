function byId(id) {
  return document.getElementById(id);
}

function rawNumber(id, fallback = NaN) {
  const el = byId(id);
  if (!el) return fallback;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : fallback;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function pf(id, fallback = 0) {
  const v = rawNumber(id, fallback);
  return Number.isFinite(v) ? v : fallback;
}

function serializeControlTree(rootId) {
  const root = byId(rootId);
  const out = {};
  if (!root) return out;

  root.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.type === 'radio' && !el.checked) return;
    out[el.id] = el.type === 'checkbox' ? !!el.checked : el.value;
  });

  return out;
}

function fmtN(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n === 0) return '0';
  const a = Math.abs(n);
  if (a > 0 && a < 0.00001) return n.toExponential(2);
  if (a < 1) {
    return parseFloat(n.toPrecision(4)).toString();
  }
  if (a < 1000) {
    return n
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
  }
  return Math.round(n).toLocaleString();
}

function fmtHuman(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n === 0) return '0';
  if (n < 0) return '−' + fmtHuman(-n);
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + ' trillion';
  if (n >= 1e9)  return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' billion';
  if (n >= 1e6)  return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' million';
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 1)    return n.toFixed(3).replace(/\.?0+$/, '');
  if (n >= 0.001) return n.toFixed(6).replace(/\.?0+$/, '');
  
  const inv = 1 / n;
  if (inv >= 1e12) return '1 in ' + (inv / 1e12).toFixed(1) + ' trillion';
  if (inv >= 1e9)  return '1 in ' + (inv / 1e9).toFixed(1) + ' billion';
  if (inv >= 1e6)  return '1 in ' + (inv / 1e6).toFixed(1) + ' million';
  if (inv >= 1000) return '1 in ' + Math.round(inv / 1000) + ',000';
  return '1 in ' + Math.round(inv).toLocaleString();
}

function fmtPct(p) {
  if (!Number.isFinite(p)) return '∞%';
  if (p >= 1)     return p.toFixed(2).replace(/\.?0+$/, '') + '%';
  if (p >= 0.01)  return p.toFixed(4).replace(/\.?0+$/, '') + '%';
  if (p >= 0.0001) return p.toFixed(8).replace(/\.?0+$/, '') + '%';
  
  const inv = 100 / p;
  if (inv >= 1e12) return '1 in ' + (inv / 1e12).toFixed(1) + ' trillion';
  if (inv >= 1e9)  return '1 in ' + (inv / 1e9).toFixed(1) + ' billion';
  if (inv >= 1e6)  return '1 in ' + (inv / 1e6).toFixed(1) + ' million';
  return '1 in ' + Math.round(inv).toLocaleString();
}

// Format a Poisson existence probability (value in [0, 1]).
// For very small but nonzero probabilities (< 0.01 %) the plain .toFixed(1/2)
// formatters would display "0.0%" or "0.00%", which looks like exactly zero.
// This function always shows the actual nonzero value and, below the 0.01%
// threshold, also appends the "1 in X" odds for readability.
// plain=true returns ASCII-only text (for HTML title/tooltip attributes).
function fmtExistencePct(prob, plain = false) {
  if (!Number.isFinite(prob) || prob <= 0) return '0%';
  if (prob >= 1) return '100%';

  const pct = prob * 100;

  // Normal range (>= 0.01 %): delegate to the standard fmtPct which already
  // handles precision well down to 0.0001 % before switching to "1 in X".
  if (pct >= 0.01) return fmtPct(pct);

  // Sub-0.01 % range: always show the numeric percentage AND the odds.
  const pctStr = pct >= 1e-6
    ? '≈ ' + pct.toFixed(8).replace(/\.?0+$/, '') + '%'
    : '≈ ' + pct.toExponential(2) + '%';

  const inv = 1 / prob;
  let odds;
  if (inv >= 1e12)      odds = 'about 1 in ' + (inv / 1e12).toFixed(1) + ' trillion';
  else if (inv >= 1e9)  odds = 'about 1 in ' + (inv / 1e9).toFixed(1) + ' billion';
  else if (inv >= 1e6)  odds = 'about 1 in ' + (inv / 1e6).toFixed(1) + ' million';
  else                  odds = 'about 1 in ' + Math.round(inv).toLocaleString();

  const sep = plain ? ' / ' : ' · ';
  return pctStr + sep + odds;
}

globalThis.fmtExistencePct = fmtExistencePct;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr, m = null) {
  if (arr.length < 2) return 0;
  const mu = m === null ? mean(arr) : m;
  const variance =
    arr.reduce((acc, x) => acc + (x - mu) * (x - mu), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

const UNIVERSE_STAR_RANGE = {
  min: 1e22,
  max: 1e24
};

function computeUniverseScaleFromYield(perStarYield, starRange = UNIVERSE_STAR_RANGE) {
  const yieldValue = Number.isFinite(perStarYield) ? Math.max(0, perStarYield) : 0;
  const minStars = Number.isFinite(starRange.min) ? Math.max(0, starRange.min) : UNIVERSE_STAR_RANGE.min;
  const maxStars = Number.isFinite(starRange.max) ? Math.max(minStars, starRange.max) : UNIVERSE_STAR_RANGE.max;

  return {
    perStarYield: yieldValue,
    minStars,
    maxStars,
    min: yieldValue * minStars,
    max: yieldValue * maxStars
  };
}

function summarizePerStarYields(samples) {
  const valid = (samples || [])
    .filter(value => Number.isFinite(value) && value >= 0)
    .slice()
    .sort((a, b) => a - b);

  if (!valid.length) {
    return {
      n: 0,
      mean: 0,
      p025: 0,
      p975: 0,
      scaleMean: computeUniverseScaleFromYield(0),
      scaleP025: computeUniverseScaleFromYield(0),
      scaleP975: computeUniverseScaleFromYield(0),
      basis: 'none'
    };
  }

  const yieldMean = mean(valid);
  const yieldP025 = percentile(valid, 0.025);
  const yieldP500 = percentile(valid, 0.500);
  const yieldP975 = percentile(valid, 0.975);

  return {
    n: valid.length,
    mean: yieldMean,
    median: yieldP500,
    p025: yieldP025,
    p500: yieldP500,
    p975: yieldP975,
    scaleMean: computeUniverseScaleFromYield(yieldMean),
    scaleMedian: computeUniverseScaleFromYield(yieldP500),
    scaleP025: computeUniverseScaleFromYield(yieldP025),
    scaleP975: computeUniverseScaleFromYield(yieldP975),
    basis: 'per-sample-yield'
  };
}

function lifeLabel() {
  if (isComplexLifeEnabled && isXEnabled) return ' (incl. complex life + f_x)';
  if (isComplexLifeEnabled) return ' (incl. complex life)';
  if (isXEnabled) return ' (incl. f_x)';
  return '';
}

function sanitizeProbability(v, fallback = 0) {
  return clamp01(Number.isFinite(v) ? v : fallback);
}

function sanitizePositive(v, fallback = 0) {
  return Math.max(0, Number.isFinite(v) ? v : fallback);
}

let deterministicPlanets = 0;

// Primary Monte Carlo point estimate: the q50 median of the sample
// distribution. The arithmetic mean is tracked separately so exports and UI
// never label the median as an average.
let mcMedianQ50 = 0;

let mcArithmeticMean = 0;

let mcQ025 = 0;

let mcQ975 = 0;

let mostFrequent = 0;

let stdDev = 0;

let distance2D = Infinity;

let minDistance2D = Infinity;

let maxDistance2D = Infinity;

let distance3DDisk = Infinity;

let minDistance3DDisk = Infinity;

let maxDistance3DDisk = Infinity;

let distance3DSphere = Infinity;

let minDistance3DSphere = Infinity;

let maxDistance3DSphere = Infinity;

let distanceRadial = Infinity;

let minDistanceRadial = Infinity;

let maxDistanceRadial = Infinity;

let activeDistanceModel = null;

let activeDistanceBasis = 'not calculated';

let activeDistanceCountBasis = 'not calculated';

let displayedDistanceValue = null;

let displayedDistanceLabel = 'not calculated';

let areaGHZ = 0;

let volumeGHZDisk = 0;

let volumeGHZSphere = 0;

let simulationCompleted = false;

// Tri-state Monte Carlo lifecycle, distinct from the boolean simulationCompleted:
//   'not-run' - MC has never completed for the current scenario/session state
//   'current' - MC completed and still matches the current input state
//   'stale'   - MC completed previously but was invalidated by a state change
let monteCarloState = 'not-run';

let distanceCalculated = false;

let isComplexLifeEnabled = false;

let isXEnabled = false;

let isH2OEnabled = true;

let isCHNOPSEnabled = true;

let isGalaxySettingsEnabled = false;

let galaxyName = 'Milky Way (MW)';

let galaxySettingsBaseline = null;

let bayesianMode = 'post';

// Default Interpretation & Fermi Context view uses the DETERMINISTIC result.
// For scenario-based presets, the deterministic chain product represents the
// scenario's point answer; the MC distribution propagates full literature-
// informed uncertainty and is best treated as a secondary informational view
// available via the MC RESULT toggle in the Fermi panel.
let fermiMode = 'dt';

let fermiContexts = { mc: null, dt: null };

let currentScale = 'log';

let activePreset = '';

let scenarioState = 'custom';

let modifiedPresetOrigin = '';

// Backwards-compatible no-ops: the per-field edit tracking that powered the
// hybrid modified-Pessimist mode has been removed. The functions remain so
// callers in app.js continue to work without conditional checks.
function clearParameterFieldEdits() {}
function recordParameterFieldEdit() {}
function isParameterFieldEdited() {
  return false;
}

let intervalsVisible = false;

let lastResults = [];

let lastSampleYields = [];

let monteCarloYieldStats = null;

let convergenceSummary = null;

let simulationEnvelope = null;

let monteCarloBoundsMode = '';

let monteCarloBoundsLabel = '';

let monteCarloUncertaintyBasisLabel = '';

let monteCarloIntervalComparison = null;

let hasDeterministicCalculation = false;

let inputValidationWarnings = [];

let boundIntervalWarnings = [];

let boundValidationWarnings = [];

const DETECTION_PRESETS = {
  pessimistic: { L: 3000, f_tx: 0.0001 },
  optimistic: { L: 30000, f_tx: 0.01 }
};

const SENS_LABELS = {
  N_GHZ: 'Stars in GHZ',
  f_sun_type: 'Host-star fraction',
  f_sun_age: 'Age-qualified stars',
  N_p_star: 'Planets per star',
  f_composition: 'Rocky composition',
  f_orbit: 'Habitable-zone fraction',
  f_stability: 'Orbital stability',
  f_magnetosphere: 'Magnetosphere retention',
  f_lunar_stability: 'Moon / stabilizer',
  f_size: 'Earth-size window',
  f_rotation: 'Rotation suitability',
  f_tilt: 'Obliquity suitability',
  f_H2O: 'Surface water',
  f_CHNOPS: 'CHNOPS availability',
  f_complex_life: 'Complex-life prior',
  f_x: 'Wildcard factor',
  _f_atm_ret: 'Atmospheric retention',
  _f_longterm: 'Long-term geodynamics',
  _f_xuv_quiet: 'Space weather',
  _f_uv: 'Prebiotic UV',
  _f_binary: 'Binary filter',
  _f_rad: 'Radiation survival'
};

const galaxyDistances = {
  'Milky Way (MW)': 0,
  'Andromeda (M31)': 2537000,
  "Bode's (M81)": 12000000,
  'Centaurus A (NGC 5128)': 13000000,
  'Custom Galaxy X': null
};

const GALAXY_PRESET_MAP = {
  mw: { d: 100000, t: 1000, n: 100000000000, name: 'Milky Way (MW)', earthDist: 0 },
  m31: { d: 220000, t: 1000, n: 55000000000, name: 'Andromeda (M31)', earthDist: 2537000 },
  m81: { d: 96000, t: 2000, n: 20000000000, name: "Bode's (M81)", earthDist: 12000000 },
  ngc5128: { d: 120000, t: 15000, n: 30000000000, name: 'Centaurus A (NGC 5128)', earthDist: 13000000 },
  custom: { name: 'Custom Galaxy X', earthDist: 0 }
};

const PROBABILITY_FIELDS = new Set([
  'f_sun_type',
  'f_sun_age',
  'f_composition',
  'f_orbit',
  'f_stability',
  'f_magnetosphere',
  'f_lunar_stability',
  'f_size',
  'f_rotation',
  'f_tilt',
  'f_H2O',
  'f_CHNOPS',
  'f_complex_life',
  'f_x',
  'adv_f_atm_ret',
  'adv_f_vol_del',
  'adv_f_wat_ret',
  'adv_f_tect',
  'adv_f_radio',
  'adv_f_clim',
  'adv_f_xuv',
  'adv_f_uv',
  'adv_f_binary',
  'adv_f_rad',
  'adv_P_rocky'
]);

const POSITIVE_FIELDS = new Set([
  'N_GHZ',
  'N_p_star',
  'adv_N_total_stars'
]);

// Export so app.js (and tests) can use the canonical set without duplication.
globalThis.PROBABILITY_FIELDS_GLOBAL = PROBABILITY_FIELDS;

const BASE_SAMPLE_IDS = [
  'N_GHZ',
  'f_sun_type',
  'f_sun_age',
  'N_p_star',
  'f_composition',
  'f_orbit',
  'f_stability',
  'f_magnetosphere',
  'f_lunar_stability',
  'f_size',
  'f_rotation',
  'f_tilt',
  'f_H2O',
  'f_CHNOPS',
  'f_complex_life',
  'f_x'
];

const DEFAULT_PARAMETER_BOUNDS = Object.freeze({
  N_GHZ: Object.freeze({ min: 5000000000, max: 40000000000 }),
  f_sun_type: Object.freeze({ min: 0.07, max: 0.20 }),
  f_sun_age: Object.freeze({ min: 0.60, max: 0.80 }),
  N_p_star: Object.freeze({ min: 1.0, max: 2.5 }),
  f_composition: Object.freeze({ min: 0.15, max: 0.35 }),
  f_orbit: Object.freeze({ min: 0.10, max: 0.21 }),
  f_stability: Object.freeze({ min: 0.30, max: 0.70 }),
  f_magnetosphere: Object.freeze({ min: 0.20, max: 0.70 }),
  f_lunar_stability: Object.freeze({ min: 0.20, max: 0.80 }),
  f_size: Object.freeze({ min: 0.30, max: 0.65 }),
  f_rotation: Object.freeze({ min: 0.15, max: 0.35 }),
  f_tilt: Object.freeze({ min: 0.30, max: 0.65 }),
  f_H2O: Object.freeze({ min: 0.05, max: 0.30 }),
  f_CHNOPS: Object.freeze({ min: 0.05, max: 0.50 }),
  f_complex_life: Object.freeze({ min: 0.000000001, max: 1.0 }),
  f_x: Object.freeze({ min: 0.5, max: 1.0 })
});

const ADV_SAMPLE_IDS = [
  'adv_f_atm_ret',
  'adv_f_vol_del',
  'adv_f_wat_ret',
  'adv_f_tect',
  'adv_f_radio',
  'adv_f_clim',
  'adv_f_xuv',
  'adv_f_uv',
  'adv_f_binary',
  'adv_f_rad',
  'adv_P_rocky'
];

const ADV_SOBOL_CONFIG = {
  adv_f_atm_ret: { module: 'atmRet', key: '_f_atm_ret' },
  adv_f_vol_del: { module: 'volatileSplit', key: 'f_H2O' },
  adv_f_wat_ret: { module: 'volatileSplit', key: 'f_H2O_ret' },
  adv_f_tect: { module: 'longterm', key: '_f_tect' },
  adv_f_radio: { module: 'longterm', key: '_f_radio' },
  adv_f_clim: { module: 'longterm', key: '_f_clim' },
  adv_f_xuv: { module: 'spaceWeather', key: '_f_xuv_quiet' },
  adv_f_uv: { module: 'prebioticUV', key: '_f_uv' },
  adv_f_binary: { module: 'binary', key: '_f_binary' },
  adv_f_rad: { module: 'radiation', key: '_f_rad' },
  adv_P_rocky: { module: 'radiusValley', key: 'f_composition' }
};

function getControlBound(el, attrName, fallback) {
  if (!el) return fallback;
  const raw =
    typeof el.getAttribute === 'function'
      ? el.getAttribute(attrName)
      : el[attrName];
  if (raw === null || raw === undefined || String(raw).trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatValidationValue(value) {
  if (value === '') return 'empty';
  if (value === null || value === undefined) return 'missing';
  return String(value);
}

function getValidationLabel(id) {
  return (typeof SENS_LABELS !== 'undefined' && SENS_LABELS[id]) || id;
}

function beginInputValidationPass() {
  inputValidationWarnings = [];
}

function clearInputValidationWarnings() {
  inputValidationWarnings = [];
  clearBoundIntervalWarnings();
}

function getInputValidationWarnings() {
  return inputValidationWarnings.slice();
}

function clearBoundIntervalWarnings() {
  boundIntervalWarnings = [];
  boundValidationWarnings = [];
}

function getBoundIntervalWarnings() {
  return boundIntervalWarnings.slice();
}

function getBoundValidationWarnings() {
  return boundValidationWarnings.slice();
}

function recordBoundIntervalWarning(id, centralValue, min, max) {
  const existingIndex = boundIntervalWarnings.findIndex(w => w.id === id);
  const label = getValidationLabel(id);
  const warning = {
    id,
    label,
    centralValue,
    min,
    max,
    text:
      `${label}: central value ${formatValidationValue(centralValue)} lies outside the configured ` +
      `Monte Carlo interval [${formatValidationValue(min)}, ${formatValidationValue(max)}]. ` +
      'The sampler expands the interval to include the central value.',
    shortText:
      'Central value lies outside the configured Monte Carlo interval; the sampler expands the interval to include the central value.'
  };

  if (existingIndex >= 0) boundIntervalWarnings[existingIndex] = warning;
  else boundIntervalWarnings.push(warning);
}

function recordBoundValidationWarning(id, originalValue, normalizedValue, reason) {
  const existingIndex = boundValidationWarnings.findIndex(w => w.id === id && w.reason === reason);
  const label = getValidationLabel(id.replace(/_(min|max)$/, ''));
  const warning = {
    id,
    label,
    originalValue: formatValidationValue(originalValue),
    normalizedValue,
    reason,
    text:
      `${label}: Monte Carlo bound ${id} was ${formatValidationValue(originalValue)} and ` +
      `was normalized to ${normalizedValue}. ${reason}`,
    shortText: 'Monte Carlo bounds were normalized before sampling.'
  };

  if (existingIndex >= 0) boundValidationWarnings[existingIndex] = warning;
  else boundValidationWarnings.push(warning);
}

function recordInputValidationWarning(id, originalValue, normalizedValue, min, max) {
  const existingIndex = inputValidationWarnings.findIndex(w => w.id === id);
  const label = getValidationLabel(id);
  const hasMax = Number.isFinite(max);
  const rangeText = hasMax ? `${min} to ${max}` : `${min} or greater`;
  const warning = {
    id,
    label,
    originalValue: formatValidationValue(originalValue),
    normalizedValue,
    min,
    max: hasMax ? max : null,
    text:
      `${label}: input was outside the allowed range or was not numeric and ` +
      `was normalized to ${normalizedValue}. Allowed range: ${rangeText}.`,
    shortText: 'Input was outside the allowed range and was clamped to the nearest valid value.'
  };

  if (existingIndex >= 0) inputValidationWarnings[existingIndex] = warning;
  else inputValidationWarnings.push(warning);
}

function sanitizeNumberInput(id, fallback = 0, kind = 'number') {
  const el = byId(id);
  if (!el) return fallback;

  const originalValue = el.value;
  const trimmed = String(originalValue ?? '').trim();
  let parsed = Number(trimmed);
  let normalized = parsed;
  let changed = false;

  if (trimmed === '' || !Number.isFinite(parsed)) {
    normalized = fallback;
    changed = true;
  }

  let min = getControlBound(el, 'min', kind === 'positive' || kind === 'probability' ? 0 : -Infinity);
  let max = getControlBound(el, 'max', kind === 'probability' ? 1 : Infinity);

  if (kind === 'probability') {
    min = Math.max(0, min);
    max = Math.min(1, max);
  }

  if (kind === 'positive') {
    min = Math.max(0, min);
  }

  if (normalized < min) {
    normalized = min;
    changed = true;
  }

  if (normalized > max) {
    normalized = max;
    changed = true;
  }

  if (changed) {
    recordInputValidationWarning(id, originalValue, normalized, min, max);
    el.value = String(normalized);
  }

  return normalized;
}

function sanitizeProbabilityInput(id, fallback = 0) {
  return sanitizeNumberInput(id, fallback, 'probability');
}

function sanitizePositiveInput(id, fallback = 0) {
  return sanitizeNumberInput(id, fallback, 'positive');
}

const SAMPLABLE_PARAM_IDS = [...new Set([...BASE_SAMPLE_IDS, ...ADV_SAMPLE_IDS])];

const SIM_ENGINE_LABELS = {
  standard: 'Standard Monte Carlo',
  lhs: 'Latin Hypercube'
};

const SIM_CORRELATION_LABELS = {
  heuristic: 'Heuristic correlation scaffold',
  independent: 'Independent factors'
};

const MONTE_CARLO_BOUNDS_LABELS = {
  presetLocal: 'Scenario-local preset uncertainty',
  modifiedPresetLocal: 'Modified preset-local uncertainty · Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields',
  customInput: 'Custom input uncertainty · Uses visible input bounds',
  globalEnvelope: 'Global exploratory envelope · Not local preset uncertainty'
};

const PRESET_PUBLIC_LABELS = {
  pessimist: 'Pessimist / Rare Earth',
  consensus: 'Consensus',
  optimist: 'High-End / Optimist',
  kepler: 'Kepler/Gaia'
};

const MONTE_CARLO_BASIS_MODES = {
  presetLocal: 'presetLocal',
  modifiedPresetLocal: 'modifiedPresetLocal',
  customInput: 'customInput',
  globalEnvelope: 'globalEnvelope'
};

const PRESET_LOCAL_WIDTH_PROFILES = {
  narrow: Object.freeze({
    positiveLogHalfWidth: Math.log(1.35),
    probabilityLogitHalfWidth: Math.log(1.35)
  }),
  medium: Object.freeze({
    positiveLogHalfWidth: Math.log(2),
    probabilityLogitHalfWidth: Math.log(2)
  }),
  broad: Object.freeze({
    positiveLogHalfWidth: Math.log(3),
    probabilityLogitHalfWidth: Math.log(3)
  }),
  ultraBroad: Object.freeze({
    positiveLogHalfWidth: Math.log(10),
    probabilityLogitHalfWidth: Math.log(10)
  })
};

const PRESET_LOCAL_PARAM_WIDTHS = Object.freeze({
  N_GHZ: 'medium',
  N_p_star: 'medium',
  f_sun_type: 'medium',
  f_sun_age: 'narrow',
  f_composition: 'medium',
  f_orbit: 'medium',
  f_stability: 'medium',
  f_magnetosphere: 'medium',
  f_lunar_stability: 'medium',
  f_size: 'medium',
  f_rotation: 'medium',
  f_tilt: 'medium',
  f_H2O: 'medium',
  f_CHNOPS: 'medium',
  f_complex_life: 'broad',
  f_x: 'broad',
  adv_f_atm_ret: 'medium',
  adv_f_vol_del: 'medium',
  adv_f_wat_ret: 'medium',
  adv_f_tect: 'medium',
  adv_f_radio: 'medium',
  adv_f_clim: 'medium',
  adv_f_xuv: 'medium',
  adv_f_uv: 'medium',
  adv_f_binary: 'medium',
  adv_f_rad: 'medium',
  adv_P_rocky: 'medium'
});

const PRESET_LOCAL_UNCERTAINTY_BASIS =
  'Scenario-local transformed-space bands centered on the selected preset central values; not observational confidence intervals.';

const MODIFIED_PRESET_LOCAL_BASIS =
  'Modified preset-local uncertainty: edited fields use their visible min/max bounds, while unchanged preset fields keep scenario-local preset uncertainty. Not an observational confidence interval.';

const GLOBAL_ENVELOPE_BASIS =
  'Global exploratory envelope using visible registry/user min/max bounds; not local preset uncertainty.';

const CUSTOM_INPUT_BASIS =
  'Custom input uncertainty using the visible central values and visible min/max bounds.';

const PRESET_BOUND_PROFILES = {
  pessimist: 'presetLocal',
  consensus: 'presetLocal',
  optimist: 'presetLocal',
  kepler: 'presetLocal'
};

const ADV = {
  enabled: false,
  modules: {
    hostChannels: { enabled: false, label: 'G/K/M Host Star Channels' },
    atmRet: { enabled: false, label: 'Atmospheric Retention' },
    volatileSplit: { enabled: false, label: 'Volatile Delivery + Water Retention' },
    longterm: { enabled: false, label: 'Long-term Geodynamics' },
    spinObliquity: { enabled: false, label: 'Spin~Obliquity~Tide' },
    radiusValley: { enabled: false, label: 'Radius-Valley Rocky Prior' },
    radialGHZ: { enabled: false, label: 'Radial GHZ Integrator' },
    spaceWeather: { enabled: false, label: 'Space Weather' },
    prebioticUV: { enabled: false, label: 'Prebiotic UV' },
    binary: { enabled: false, label: 'Binary Star Filter' },
    radiation: { enabled: false, label: 'Radiation Survival' },
    ard: { enabled: false, label: 'ARD' },
    sensitivity: { enabled: false, label: 'Sensitivity' },
    temporal: { enabled: false, label: 'Temporal Habitability' }
  }
};

const PRESETS = {
  pessimist: {
    label: 'Pessimist · Rare Earth Stress Test',
    source: 'Rare Earth / Hart 1975 / Hanson 1998',
    description:
      'An illustrative restrictive stress-test: Hart motivates the Fermi-absence tension, Rare Earth motivates strong biological/geophysical filters, and Hanson motivates the Great Filter framing. The numeric chain is not a Hart point-estimate table.',
    N_GHZ: 5000000000,
    f_sun_type: 0.07,
    f_sun_age: 0.60,
    N_p_star: 1.0,
    f_composition: 0.15,
    f_orbit: 0.10,
    f_stability: 0.30,
    f_magnetosphere: 0.20,
    f_lunar_stability: 0.20,
    f_size: 0.30,
    f_rotation: 0.15,
    f_tilt: 0.30,
    f_H2O: 0.05,
    f_CHNOPS: 0.05,
    f_complex_life: 0.000001,
    f_x: 1,
    enableComplex: true,
    enableX: false
  },
  consensus: {
    label: 'Consensus · Lineweaver',
    source: 'Lineweaver 2004',
    description:
      'Lineweaver anchors the Galactic Habitable Zone and age terms; N_GHZ is a balanced conservative GHZ star-count prior, not directly quoted by Lineweaver.',
    N_GHZ: 10000000000,
    f_sun_type: 0.08,
    f_sun_age: 0.75,
    N_p_star: 1.5,
    f_composition: 0.20,
    f_orbit: 0.18,
    f_stability: 0.50,
    f_magnetosphere: 0.50,
    f_lunar_stability: 0.50,
    f_size: 0.50,
    f_rotation: 0.27,
    f_tilt: 0.50,
    f_H2O: 0.10,
    f_CHNOPS: 0.10,
    f_complex_life: 0.01,
    f_x: 1,
    enableComplex: false,
    enableX: false
  },
  optimist: {
    label: 'High-End · Literature Bounds',
    source: 'Illustrative upper-range stress test',
    description:
      'High-end values drawn from the upper side of the displayed literature-informed ranges. N_GHZ is an upper Lineweaver-style GHZ prior, not a direct star-count reported by Lineweaver.',
    N_GHZ: 40000000000,
    f_sun_type: 0.20,
    f_sun_age: 0.75,
    N_p_star: 2.0,
    f_composition: 0.35,
    f_orbit: 0.21,
    f_stability: 0.70,
    f_magnetosphere: 0.70,
    f_lunar_stability: 0.80,
    f_size: 0.65,
    f_rotation: 0.35,
    f_tilt: 0.65,
    f_H2O: 0.30,
    f_CHNOPS: 0.50,
    f_complex_life: 1.0,
    f_x: 1,
    enableComplex: true,
    enableX: false
  },
  kepler: {
    label: 'Kepler/Gaia · Bryson',
    source: 'Bryson et al. 2021',
    description:
      'Updates the observational rocky/HZ priors using Kepler DR25 plus Gaia-era occurrence-rate constraints. Bryson reports eta-Earth as a combined occurrence metric, so this split into factors is a model approximation; N_GHZ remains the balanced Lineweaver-informed GHZ prior.',
    N_GHZ: 10000000000,
    f_sun_type: 0.08,
    f_sun_age: 0.75,
    N_p_star: 1.6,
    f_composition: 0.25,
    f_orbit: 0.21,
    f_stability: 0.50,
    f_magnetosphere: 0.50,
    f_lunar_stability: 0.50,
    f_size: 0.55,
    f_rotation: 0.27,
    f_tilt: 0.50,
    f_H2O: 0.15,
    f_CHNOPS: 0.15,
    f_complex_life: 0.01,
    f_x: 1,
    enableComplex: false,
    enableX: false
  }
};

function getPresetPublicLabel(key) {
  if (!key) return 'Custom scenario';
  return PRESET_PUBLIC_LABELS[key] || (PRESETS[key] && PRESETS[key].label) || key;
}

function setScenarioPreset(key) {
  activePreset = key;
  scenarioState = 'preset';
  modifiedPresetOrigin = '';
}

function setScenarioCustom() {
  activePreset = 'custom';
  scenarioState = 'custom';
  modifiedPresetOrigin = '';
}

function markScenarioModified() {
  if (scenarioState === 'modified' && modifiedPresetOrigin && PRESETS[modifiedPresetOrigin]) {
    return;
  }

  if (activePreset && activePreset !== 'custom' && PRESETS[activePreset]) {
    modifiedPresetOrigin = activePreset;
    scenarioState = 'modified';
    return;
  }

  setScenarioCustom();
}

function numericControlMatches(id, expected) {
  const el = byId(id);
  if (!el) return true;
  const actual = Number(String(el.value ?? '').trim());
  const target = Number(expected);
  if (!Number.isFinite(actual) || !Number.isFinite(target)) return false;
  const tolerance = Math.max(1e-12, Math.abs(target) * 1e-12);
  return Math.abs(actual - target) <= tolerance;
}

function isAdvancedScenarioAtPresetDefault() {
  if (ADV.enabled) return false;
  if (Object.values(ADV.modules).some(module => module.enabled)) return false;
  if (typeof areAdvancedControlsAtDefaults === 'function') {
    return areAdvancedControlsAtDefaults();
  }
  return true;
}

function isVisibleStateEquivalentToPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return false;

  for (const id of BASE_SAMPLE_IDS) {
    if (preset[id] !== undefined && !numericControlMatches(id, preset[id])) return false;

    const bounds = getPresetVisibleBounds(preset, id);
    if (bounds) {
      if (!numericControlMatches(id + '_min', bounds.min)) return false;
      if (!numericControlMatches(id + '_max', bounds.max)) return false;
    }
  }

  if (isH2OEnabled !== (preset.enableH2O !== false)) return false;
  if (isCHNOPSEnabled !== (preset.enableCHNOPS !== false)) return false;
  if (isComplexLifeEnabled !== !!preset.enableComplex) return false;
  if (isXEnabled !== !!preset.enableX) return false;

  return isAdvancedScenarioAtPresetDefault();
}

// The preset key a modified scenario was derived from (or the active clean
// preset). Null for a true custom scenario with no preset baseline.
function getScenarioOriginPreset() {
  if (scenarioState === 'modified' && modifiedPresetOrigin && PRESETS[modifiedPresetOrigin]) return modifiedPresetOrigin;
  if (scenarioState === 'preset' && activePreset && activePreset !== 'custom' && PRESETS[activePreset]) return activePreset;
  return null;
}

// A preset-owned parameter is "edited" when its visible central value or either
// visible bound differs from the preset default. Derived from visible state, so
// restoring a field exactly to the default automatically clears its edited flag.
function isParameterEditedFromPreset(id, presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return true;
  if (preset[id] !== undefined && !numericControlMatches(id, preset[id])) return true;
  const bounds = getPresetVisibleBounds(preset, id);
  if (bounds) {
    if (!numericControlMatches(id + '_min', bounds.min)) return true;
    if (!numericControlMatches(id + '_max', bounds.max)) return true;
  }
  return false;
}

function reconcileScenarioStateWithVisiblePreset() {
  const origin =
    scenarioState === 'modified' && modifiedPresetOrigin && PRESETS[modifiedPresetOrigin]
      ? modifiedPresetOrigin
      : activePreset && activePreset !== 'custom' && PRESETS[activePreset]
        ? activePreset
        : null;

  if (!origin) return false;
  if (!isVisibleStateEquivalentToPreset(origin)) return false;

  setScenarioPreset(origin);
  return true;
}

function getScenarioState() {
  const isModified = scenarioState === 'modified' && modifiedPresetOrigin && PRESETS[modifiedPresetOrigin];
  const isPreset = scenarioState === 'preset' && activePreset && PRESETS[activePreset];

  if (isModified) {
    const originLabel = getPresetPublicLabel(modifiedPresetOrigin);
    return {
      state: 'modified',
      activePreset,
      originPreset: modifiedPresetOrigin,
      originLabel,
      label: `Modified ${originLabel}`,
      isModified: true,
      isPreset: false,
      isCustom: false
    };
  }

  if (isPreset) {
    const label = getPresetPublicLabel(activePreset);
    return {
      state: 'preset',
      activePreset,
      originPreset: activePreset,
      originLabel: label,
      label,
      isModified: false,
      isPreset: true,
      isCustom: false
    };
  }

  return {
    state: 'custom',
    activePreset: 'custom',
    originPreset: '',
    originLabel: '',
    label: 'Custom scenario',
    isModified: false,
    isPreset: false,
    isCustom: true
  };
}

function getScenarioExportLabel() {
  return getScenarioState().label;
}

function getModifiedPresetWarningText() {
  const scenario = getScenarioState();
  if (!scenario.isModified) return '';

  return (
    `You edited a ${scenario.originLabel} value. Monte Carlo now uses modified preset-local uncertainty: ` +
    `edited fields use their visible central values and min/max bounds, while unchanged preset fields keep ` +
    `clean scenario-local preset uncertainty.`
  );
}

function getDefaultParameterBounds(id) {
  const registryParameter =
    typeof SCIENTIFIC_PARAMETER_REGISTRY !== 'undefined' &&
    SCIENTIFIC_PARAMETER_REGISTRY.parameters
      ? SCIENTIFIC_PARAMETER_REGISTRY.parameters[id]
      : null;
  const fallback = DEFAULT_PARAMETER_BOUNDS[id];

  if (!registryParameter && !fallback) return null;

  const min = Number(registryParameter?.min ?? fallback?.min);
  const max = Number(registryParameter?.max ?? fallback?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return { min, max };
}

function getPresetVisibleBounds(preset, id) {
  const boundsSpec = preset?.bounds?.[id];
  if (Array.isArray(boundsSpec) && boundsSpec.length >= 2) {
    const min = Number(boundsSpec[0]);
    const max = Number(boundsSpec[1]);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }

  if (boundsSpec && typeof boundsSpec === 'object') {
    const min = Number(boundsSpec.min);
    const max = Number(boundsSpec.max);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }

  // Fall back to the registry's literature-informed default min/max. These are
  // the values the per-card UI citations (Henry 2006, Bryson 2021, etc.)
  // explicitly anchor; we must NOT silently overwrite them with a generic
  // ±0.3 dex convention, because that would make the visible field values
  // inconsistent with the cited literature-informed ranges shown below.
  // Per-preset preset.bounds[id] still wins when explicitly provided.
  return getDefaultParameterBounds(id);
}

function resetPresetParameterBounds(preset, ids = BASE_SAMPLE_IDS) {
  ids.forEach(id => {
    const bounds = getPresetVisibleBounds(preset, id);
    if (!bounds) return;

    const minEl = byId(id + '_min');
    const maxEl = byId(id + '_max');
    if (minEl) minEl.value = String(bounds.min);
    if (maxEl) maxEl.value = String(bounds.max);
  });
}

function applyPresetParameterState(preset, ids = BASE_SAMPLE_IDS) {
  resetPresetParameterBounds(preset, ids);

  ids.forEach(id => {
    const el = byId(id);
    if (el && preset && preset[id] !== undefined) {
      el.value = preset[id];
    }
  });
}

const BAYES = {
  pre: {
    f_orbit: 0.18,
    f_composition: 0.20,
    note: 'Conservative Kepler-era literature values for f_HZ and f_rocky. Historical baseline (pre-Gaia stellar-radius corrections), retained for comparison, not recommended as the default.'
  },
  post: {
    f_orbit: 0.21,
    f_composition: 0.25,
    note: 'Default. Updated Kepler/Gaia occurrence priors for f_HZ and f_rocky, anchored in Bryson et al. 2021 using the Kepler DR25 planet-candidate catalog and Gaia-based stellar properties. Later Gaia releases further refine stellar radii but are not part of the original Bryson 2021 analysis. Not a direct atmospheric-spectroscopy occurrence-rate measurement.'
  }
};

const ARD_DATA = [
  { mass: 0.1, co2: 0.028, n2: 0.042, hz_i: 0.025, hz_o: 0.048 },
  { mass: 0.3, co2: 0.110, n2: 0.160, hz_i: 0.110, hz_o: 0.210 },
  { mass: 0.5, co2: 0.170, n2: 0.240, hz_i: 0.240, hz_o: 0.450 },
  { mass: 0.7, co2: 0.210, n2: 0.290, hz_i: 0.440, hz_o: 0.820 },
  { mass: 1.0, co2: 0.270, n2: 0.350, hz_i: 0.950, hz_o: 1.670 },
  { mass: 1.2, co2: 0.310, n2: 0.400, hz_i: 1.290, hz_o: 2.260 },
  { mass: 1.5, co2: 0.380, n2: 0.480, hz_i: 2.000, hz_o: 3.500 }
];

const simbad = ident =>
  `https://simbad.u-strasbg.fr/simbad/sim-id?Ident=${encodeURIComponent(ident)}`;

const cat = ident => ({
  catalogLabel: "Check in catalogue",
  catalogLink: simbad(ident)
});

const noCat = {
  catalogLabel: "No single catalog object",
  catalogLink: null
};

const STAR_DB = [

  { d: 4.24, name: "Proxima Centauri", note: "the closest known star to the Sun, a red dwarf with 2 confirmed exoplanets, including Proxima b in the temperate zone", ...cat("Proxima Centauri") },
  { d: 4.37, name: "Alpha Centauri A/B", note: "the nearest Sun-like stellar system, a bright binary pair that anchors our immediate interstellar neighbourhood", ...cat("alf Cen") },
  { d: 5.96, name: "Barnard's Star", note: "the star with the largest known proper motion in the sky, an old nearby red dwarf with 4 confirmed exoplanets", ...cat("Barnard's star") },
  { d: 7.86, name: "Wolf 359", note: "one of the faintest nearby stars visible only with a telescope, a very low-mass red dwarf", ...cat("Wolf 359") },
  { d: 8.31, name: "Lalande 21185", note: "a nearby red dwarf and one of the closest stellar systems beyond Alpha Centauri and Barnard's Star", ...cat("Lalande 21185") },
  { d: 8.73, name: "Luyten 726-8", note: "a binary red-dwarf system, also known as UV Ceti, famous for strong stellar flare activity", ...cat("UV Ceti") },
  { d: 9.68, name: "Ross 154", note: "a nearby flare star and active red dwarf, likely a harsh environment for close-in planets", ...cat("Ross 154") },
  { d: 10.32, name: "Ross 248", note: "a red dwarf moving toward the Sun that is expected to become our nearest stellar neighbour for a time in the distant future", ...cat("Ross 248") },
  { d: 10.5, name: "Epsilon Eridani", note: "one of the nearest Sun-like stars, surrounded by a debris disk and hosting 1 confirmed exoplanet", ...cat("eps Eri") },
  { d: 10.74, name: "Lacaille 9352", note: "a nearby red dwarf with very high proper motion in the southern sky", ...cat("Lacaille 9352") },
  { d: 11.0, name: "Ross 128", note: "a relatively quiet nearby red dwarf with 1 confirmed exoplanet, often discussed in habitability studies because of its comparatively low flare activity", ...cat("Ross 128") },
  { d: 11.3, name: "EZ Aquarii", note: "a compact triple red-dwarf system bound in a tight gravitational configuration", ...cat("EZ Aqr") },
  { d: 11.4, name: "61 Cygni", note: "the first star system whose distance was measured by stellar parallax, a landmark in 19th-century astronomy", ...cat("61 Cyg") },
  { d: 11.46, name: "Procyon", note: "a bright nearby binary consisting of a subgiant primary and a white dwarf companion", ...cat("Procyon") },
  { d: 11.5, name: "Struve 2398", note: "a nearby binary red-dwarf system, intrinsically faint but close to the Sun", ...cat("Struve 2398") },
  { d: 11.6, name: "Groombridge 34", note: "a nearby binary of red dwarfs notable for high proper motion", ...cat("Groombridge 34") },
  { d: 11.87, name: "Epsilon Indi", note: "a nearby K-dwarf system with brown-dwarf companions and 1 confirmed exoplanet", ...cat("eps Ind") },
  { d: 11.75, name: "Tau Ceti", note: "one of the nearest Sun-like stars, with 3 current archive-listed radial-velocity exoplanets inferred from tiny stellar wobbles rather than direct imaging", ...cat("tau Cet") },
  { d: 12.0, name: "GJ 1061", note: "a nearby red dwarf with 3 confirmed exoplanets in a compact system including temperate-orbit candidates", ...cat("GJ 1061") },
  { d: 12.1, name: "YZ Ceti", note: "a red dwarf with 3 confirmed exoplanets in a tightly packed ultra-compact system", ...cat("YZ Cet") },
  { d: 12.35, name: "Luyten's Star", note: "a nearby red dwarf with 2 confirmed exoplanets, including GJ 273 b in the broader temperate-zone discussion", ...cat("GJ 273") },
  { d: 12.83, name: "Kapteyn's Star", note: "a very old nearby halo star with 1 archive-listed but controversial exoplanet claim, often cited in discussions of ancient planetary systems", ...cat("Kapteyn's star") },
  { d: 12.9, name: "AX Microscopii", note: "also known as Lacaille 8760, a nearby red dwarf visible to the naked eye from dark southern skies", ...cat("Lacaille 8760") },
  { d: 13.15, name: "Kruger 60", note: "a nearby binary red-dwarf system, one component being an active flare star", ...cat("Kruger 60") },
  { d: 13.42, name: "Ross 614", note: "a nearby binary red-dwarf system, historically important in astrometric studies of unseen companions", ...cat("Ross 614") },
  { d: 14.05, name: "Wolf 1061", note: "a nearby red dwarf with 3 confirmed exoplanets, including one often discussed near the habitable zone", ...cat("Wolf 1061") },
  { d: 15.2, name: "Gliese 876", note: "a nearby red dwarf with 4 confirmed exoplanets in one of the best-known resonant multiplanet systems", ...cat("GJ 876") },
  { d: 15.3, name: "Gliese 687", note: "a nearby red dwarf with 2 confirmed exoplanets", ...cat("GJ 687") },
  { d: 16.2, name: "Gliese 832", note: "a nearby red dwarf with 1 confirmed exoplanet; the formerly discussed GJ 832 c is now treated as a false positive in the archive", ...cat("GJ 832") },
  { d: 16.3, name: "40 Eridani", note: "a nearby triple system including a famous white dwarf, long known in the history of stellar astrophysics", ...cat("40 Eri") },
  { d: 16.7, name: "Altair", note: "a nearby bright star rotating so rapidly that it is measurably flattened", ...cat("Altair") },
  { d: 19.6, name: "82 Eridani", note: "a nearby Sun-like star, also catalogued as HD 20794, with 3 confirmed exoplanets in a compact system", ...cat("HD 20794") },
  { d: 19.9, name: "Delta Pavonis", note: "one of the most Sun-like nearby stars and a frequent target in discussions of nearby habitable systems", ...cat("del Pav") },
  { d: 22.7, name: "Gliese 667 C", note: "the M-dwarf component of a triple system hosting 5 archive-listed exoplanets in a historically complex and debated system", ...cat("GJ 667 C") },
  { d: 24.3, name: "Beta Hydri", note: "a nearby solar-type subgiant often used as a glimpse of the Sun's future evolutionary state", ...cat("bet Hyi") },
  { d: 25.0, name: "Vega", note: "one of the brightest stars in the northern sky and historically important as a photometric reference star", ...cat("Vega") },
  { d: 25.1, name: "Fomalhaut", note: "a nearby bright star with a famous debris ring; the once-claimed planet Fomalhaut b is now treated as refuted", ...cat("Fomalhaut") },
  { d: 27.8, name: "61 Virginis", note: "a nearby G-type star with 3 confirmed exoplanets in a compact low-mass multiplanet system", ...cat("61 Vir") },
  { d: 35.7, name: "Beta Virginis", note: "a nearby F-type star slightly hotter and more massive than the Sun", ...cat("bet Vir") },
  { d: 36.0, name: "Denebola", note: "the star marking the tail of Leo, a nearby A-type main-sequence star", ...cat("Denebola") },
  { d: 36.7, name: "Arcturus", note: "the brightest star in the northern celestial hemisphere, a nearby red giant", ...cat("Arcturus") },
  { d: 38.1, name: "Gamma Virginis (Porrima)", note: "a binary of two very similar Sun-like stars orbiting each other on a timescale of centuries", ...cat("gam Vir") },
  { d: 41.0, name: "55 Cancri", note: "a nearby multiplanet system with 5 confirmed exoplanets around the primary star, including the famous transiting super-Earth 55 Cnc e", ...cat("55 Cnc") },
  { d: 42.0, name: "HD 40307", note: "an orange dwarf with 6 archive-listed exoplanets, including the widely discussed HD 40307 g", ...cat("HD 40307") },
  { d: 44.0, name: "Upsilon Andromedae", note: "one of the first Sun-like stars found to host a confirmed multiplanet system, with 4 confirmed exoplanets around the primary star", ...cat("ups And") },
  { d: 45.0, name: "18 Scorpii", note: "one of the closest and best-known solar twins", ...cat("18 Sco") },
  { d: 45.3, name: "47 Ursae Majoris", note: "a nearby solar-type star with 3 confirmed giant exoplanets in relatively wide orbits", ...cat("47 UMa") },
  { d: 49.0, name: "Gliese 163", note: "a red dwarf with 3 confirmed exoplanets in a compact system", ...cat("GJ 163") },
  { d: 50.9, name: "Mu Arae", note: "a nearby Sun-like star with 4 confirmed exoplanets in a well-studied multiplanet system", ...cat("mu Ara") },
  { d: 51.6, name: "Castor", note: "visually a bright single star but in reality a complex multiple-star system", ...cat("Castor") },
  { d: 56.5, name: "Iota Horologii", note: "a young Sun-like star with 1 confirmed giant exoplanet, often discussed as an analogue of a younger solar system", ...cat("iot Hor") },
  { d: 635.0, name: "Kepler-22", note: "the host star of Kepler-22b, with 1 confirmed exoplanet and one of the first famous habitable-zone transiting planets around a Sun-like star", ...cat("Kepler-22") },
  { d: 65.0, name: "Aldebaran", note: "a bright orange giant, offering a preview of the Sun's far-future red-giant phase", ...cat("Aldebaran") },
  { d: 77.0, name: "Regulus", note: "a rapidly rotating bright star in Leo, visibly oblate and much hotter than the Sun", ...cat("Regulus") },
  { d: 78.0, name: "Mizar", note: "historically famous as an early telescopic double star, now known to be part of a multiple system", ...cat("Mizar") },
  { d: 79.0, name: "Merak", note: "one of the Big Dipper's pointer stars, used with Dubhe to locate the North Star", ...cat("Merak") },
  { d: 81.0, name: "Alioth", note: "the brightest star in the Big Dipper, chemically peculiar and relatively nearby", ...cat("Alioth") },
  { d: 93.0, name: "Algol", note: "the classic eclipsing binary whose brightness visibly changes as one star passes in front of the other", ...cat("Algol") },
  { d: 124.0, name: "Dubhe", note: "the brighter of the Big Dipper's two pointer stars, a multiple-star system rather than a simple single star", ...cat("Dubhe") },
  { d: 127.0, name: "HD 10180", note: "a Sun-like star with 6 confirmed exoplanets in the current archive, making it one of the richer nearby radial-velocity systems", ...cat("HD 10180") },
  { d: 129.0, name: "HR 8799", note: "a young star with 4 confirmed directly imaged giant exoplanets, one of the showpieces of exoplanet imaging", ...cat("HR 8799") },
  { d: 1799.0, name: "Kepler-452", note: "the host star of Kepler-452b, with 1 archive-listed but controversial exoplanet often nicknamed an 'Earth cousin' in early popular coverage", ...cat("Kepler-452") },
  { d: 250.0, name: "Spica", note: "a luminous close binary of hot stars and the brightest star in Virgo", ...cat("Spica") },
  { d: 310.0, name: "Canopus", note: "the second-brightest star in Earth's night sky and a long-used reference in spacecraft navigation", ...cat("Canopus") },
  { d: 315.97, name: "HD 73526", note: "a G-type planet-host star with 2 confirmed giant exoplanets whose roughly 188-day and 379-day orbits make a classic near-2:1 resonant pair", ...cat("HD 73526") },
  { d: 350.0, name: "Mimosa (Beta Crucis)", note: "a bright blue star in the Southern Cross, hot and intrinsically very luminous", ...cat("bet Cru") },
  { d: 430.0, name: "Polaris (North Star)", note: "the current pole star, a Cepheid variable in a multiple-star system", ...cat("Polaris") },
  { d: 550.0, name: "Betelgeuse", note: "a nearby red supergiant nearing the end of its life, though not expected to explode on human timescales", ...cat("Betelgeuse") },
  { d: 590.0, name: "Mirfak (Alpha Persei)", note: "the bright central star of the Alpha Persei association", ...cat("Mirfak") },
  { d: 600.0, name: "Antares", note: "a huge red supergiant whose size and colour made it the 'rival of Mars' in ancient sky lore", ...cat("Antares") },
  { d: 770.0, name: "Rigel", note: "a blue supergiant in Orion, far more luminous than the Sun", ...cat("Rigel") },
  { d: 817.0, name: "Alnitak", note: "the eastern star of Orion's Belt, part of a multiple system associated with the Flame Nebula region", ...cat("Alnitak") },
  { d: 981.0, name: "Kepler-62", note: "the host star of a 5-planet confirmed system, including the landmark habitable-zone planets Kepler-62e and Kepler-62f", ...cat("Kepler-62") },
  { d: 1194.0, name: "Kepler-442", note: "the host star of Kepler-442b, with 1 confirmed exoplanet and one of the best-known potentially habitable super-Earth cases", ...cat("Kepler-442") },
  { d: 1340.0, name: "Alnilam", note: "the middle star of Orion's Belt, a very luminous blue supergiant", ...cat("Alnilam") },
  { d: 1500.0, name: "Deneb", note: "one of the most luminous first-magnitude stars in the sky, with distance estimates still somewhat uncertain", ...cat("Deneb") },
  { d: 7500.0, name: "Eta Carinae", note: "an extremely massive unstable stellar system expected to end violently on astronomical timescales", ...cat("eta Car") },
  { d: 25000.0, name: "the Pistol Star", note: "an extremely luminous massive star embedded in the dusty central regions of the Milky Way", ...cat("Pistol Star") },
  { d: 26000.0, name: "the Sagittarius A* region", note: "the neighbourhood of the Milky Way's central supermassive black hole", ...cat("Sgr A*") },
  { d: 26000.0, name: "the Galactic Centre", note: "the rotational hub of the Milky Way, where stellar density is vastly higher than in our local neighbourhood", ...cat("Galactic Center") },
  { d: 74000.0, name: "the far side of the Milky Way disk", note: "an approximate line-of-sight scale toward the opposite outer side of a galaxy roughly 100,000 light-years across", ...noCat },
  { d: 160000.0, name: "the Large Magellanic Cloud", note: "a major satellite galaxy of the Milky Way and home of the Tarantula Nebula", ...cat("LMC") },
  { d: 200000.0, name: "the Small Magellanic Cloud", note: "an irregular dwarf companion galaxy of the Milky Way interacting with both the LMC and our Galaxy", ...cat("SMC") },
  { d: 2537000.0, name: "the Andromeda Galaxy (M31)", note: "the nearest large spiral galaxy, expected to merge with the Milky Way in the distant future", ...cat("M 31") },
  { d: 2730000.0, name: "the Triangulum Galaxy (M33)", note: "the third-largest major member of the Local Group", ...cat("M 33") },
  { d: 4300000.0, name: "NGC 3109", note: "a small nearby dwarf galaxy near the outskirts of the Local Group environment", ...cat("NGC 3109") },
  { d: 10000000.0, name: "the edge of the Local Group", note: "an approximate scale for the gravitational domain of our home galaxy group", ...noCat },
  { d: 54000000.0, name: "the Virgo Cluster", note: "the nearest major galaxy cluster, a key mass concentration in our local cosmic web", ...cat("Virgo Cluster") },
  { d: 150000000.0, name: "the Great Attractor region", note: "a large-scale gravitational concentration influencing the motion of many nearby galaxy groups", ...cat("Great Attractor") },
  { d: 250000000.0, name: "the Laniakea Supercluster scale", note: "the rough distance scale associated with the broader supercluster structure in which the Local Group resides", ...cat("Laniakea Supercluster") },
  { d: 250000000.0, name: "the Pisces-Perseus supercluster filament", note: "one of the major nearby large-scale galaxy filaments in the cosmic web", ...cat("Pisces-Perseus Supercluster") },
  { d: 46500000000.0, name: "the radius of the observable universe", note: "the present-day comoving distance to the edge of the observable universe, not the simple light-travel time since the Big Bang", ...noCat }
];

const HISTORY_DB = [
    {y:-10000, text:"the end of the last Ice Age   glaciers were retreating across the northern hemisphere, sea levels were rising, and the first permanent human settlements were just beginning to appear in the Levant"},
    {y:-9900, text:"the very dawn of the Neolithic revolution   wild grasses were beginning to be harvested in the Fertile Crescent and the first proto-agricultural communities were experimenting with settled life"},
    {y:-9800, text:"when Jericho was among the earliest known permanent settlements on Earth, housing a few hundred people beside a perennial spring in the Jordan Valley"},
    {y:-9700, text:"when the Younger Dryas cold reversal had just ended and a warmer, wetter climate was enabling the spread of wild cereal grasses across the Near East"},
    {y:-9600, text:"when Göbekli Tepe in southeastern Turkey was being constructed   the world's oldest known monumental stone structure, built by hunter-gatherers before farming existed"},
    {y:-9500, text:"when the first domesticated dogs were living alongside humans across Eurasia and the Near East   humanity's oldest partnership with another species"},
    {y:-9400, text:"when early Natufian communities in the Levant were storing surplus wild grain   the first tentative steps toward food storage and sedentary life"},
    {y:-9300, text:"when figs may have been the first deliberately cultivated plant, grown in early settlements in the Jordan Valley centuries before wheat or barley"},
    {y:-9200, text:"when humans were beginning to manage wild sheep and goat herds across the Zagros Mountains of what is now Iran"},
    {y:-9100, text:"when the last land bridge between Britain and continental Europe still existed, and hunter-gatherers roamed what would become the floor of the North Sea"},
    {y:-9000, text:"when farming was independently beginning in multiple regions   the Fertile Crescent, China, and possibly New Guinea   one of the most consequential transitions in human history"},
    {y:-8900, text:"when the first mudbrick buildings were appearing in the Levant and Anatolia, replacing temporary shelters with permanent structures"},
    {y:-8800, text:"when cattle were being domesticated in the Near East from wild aurochs   large, dangerous animals tamed over generations of selective herding"},
    {y:-8700, text:"when emmer wheat and einkorn wheat were being deliberately cultivated in the Fertile Crescent, marking the definitive beginning of agriculture"},
    {y:-8600, text:"when the earliest known pottery was being made in East Asia   among the first human-made containers for storing and cooking food"},
    {y:-8500, text:"when pigs were being domesticated independently in the Near East and China, and the human population of Earth was perhaps 5 million people"},
    {y:-8400, text:"when early farming villages were spreading across Anatolia and the Levant, each housing dozens to hundreds of people in a new way of living"},
    {y:-8300, text:"when increasingly organised water management was beginning to support farming communities in Mesopotamia and nearby regions   humans were starting to reshape landscapes more deliberately"},
    {y:-8200, text:"the 8.2 kiloyear climate event   a sudden cold snap lasting about 150 years disrupted early farming communities across the Near East and may have triggered population movements"},
    {y:-8100, text:"when large Pre-Pottery Neolithic communities were expanding across Anatolia and the Levant, with dense mud-brick settlements becoming a new social form"},
    {y:-8000, text:"when early farming villages across southwest Asia were growing denser and more permanent, prefiguring later large Neolithic settlements"},
    {y:-7900, text:"when farming communities were spreading into Europe along the Danube River corridor, bringing agriculture to populations who had been hunter-gatherers for tens of thousands of years"},
    {y:-7800, text:"when obsidian from volcanic sources in Anatolia was being traded across hundreds of kilometres   evidence of the first long-distance exchange networks"},
    {y:-7700, text:"when the Black Sea basin may have been flooded catastrophically as Mediterranean waters broke through the Bosporus   a possible origin of ancient flood myths"},
    {y:-7600, text:"when linen textiles were being woven in the Near East   among the earliest known woven fabrics, made from cultivated flax"},
    {y:-7500, text:"when native copper was beginning to be worked into small ornaments in parts of southwest Asia and southeastern Europe   long before full metallurgy transformed society"},
    {y:-7400, text:"when farming had reached southeastern Europe and Çatalhöyük in central Anatolia was emerging as one of the earliest and largest Neolithic settlements"},
    {y:-7300, text:"when the first known temples dedicated to ritual worship were being built in the Near East, suggesting organised religious practice"},
    {y:-7200, text:"when herding societies were expanding across southwest Asia and the Eurasian steppe was still millennia away from true horse domestication"},
    {y:-7100, text:"when rice cultivation was beginning in the Yangtze River valley of China   an independent agricultural revolution that would sustain billions of people"},
    {y:-7000, text:"when Çatalhöyük was among the great Neolithic settlements of Anatolia, while the first proto-urban communities were developing in Mesopotamia"},
    {y:-6900, text:"when the Ubaid culture was emerging in southern Mesopotamia   the foundation on which Sumerian civilization would eventually be built"},
    {y:-6800, text:"when millet farming was beginning in northern China and Africa, extending the agricultural revolution to new regions and crops"},
    {y:-6700, text:"when the first known evidence of wine production appears in Georgia   grapes were being fermented in clay jars as early as 6,700 BC"},
    {y:-6600, text:"when irrigation canals were being dug in Mesopotamia to bring water to fields far from rivers   the beginnings of large-scale landscape engineering"},
    {y:-6500, text:"when megalithic tomb construction was beginning in Europe   massive stone monuments that required coordinated labour and reflected complex beliefs about death"},
    {y:-6400, text:"when the Vinča culture in the Balkans was producing some of the earliest known symbolic writing-like markings   possibly proto-script"},
    {y:-6300, text:"when sailing vessels were first being used in the Persian Gulf and Mediterranean   humanity was beginning to use the sea as a highway"},
    {y:-6200, text:"when Eridu in Mesopotamia was among the earliest known temple settlements in the southern alluvium   a community that would later become central to Sumerian tradition"},
    {y:-6100, text:"when the Sahara was still green and fertile, supporting large populations of pastoralists and hunter-gatherers across what is now barren desert"},
    {y:-6000, text:"when copper smelting was beginning to appear in southeastern Europe and Anatolia, and the earliest known cheese-making was occurring in Poland"},
    {y:-5900, text:"when the megalithic monument of Carnac in Brittany, France was being constructed   thousands of standing stones aligned across the landscape"},
    {y:-5800, text:"when the first known writing-like symbols were being incised on clay tokens in Mesopotamia to track goods and transactions"},
    {y:-5700, text:"when agriculture was spreading into the Nile Valley and the foundations of what would become Egyptian civilisation were being laid"},
    {y:-5600, text:"when the first known beer was being brewed in Mesopotamia   fermented grain drinks became central to ancient urban life"},
    {y:-5500, text:"when the Cucuteni-Trypillia culture in Eastern Europe was building some of the largest settlements in the world at that time   proto-urban villages of up to 15,000 people"},
    {y:-5400, text:"when late Neolithic societies across Eurasia were expanding exchange networks and experimenting with new technologies, though wheeled vehicles still lay in the future"},
    {y:-5300, text:"when Ötzi the Iceman's ancestors were living in the Alps and the Bronze Age was still two millennia away"},
    {y:-5200, text:"when the earliest known hieroglyphic precursors were appearing in Egypt and complex societies were emerging in the Nile Valley"},
    {y:-5100, text:"when Uruk in Mesopotamia was becoming the world's first true city, with a population that may have reached 50,000 people"},
    {y:-5000, text:"when the earliest wheel and wheeled-vehicle traditions were still in the future, while the Sahara was beginning its long transition toward the desert we know today"},
    {y:-4900, text:"when the Uruk period in Mesopotamia was transforming city life   temples, administrators, and early bureaucracy were emerging"},
    {y:-4800, text:"when megalithic culture was spreading across Atlantic Europe and massive stone tombs were being built from Portugal to Scandinavia"},
    {y:-4700, text:"when increasingly intensive agriculture was spreading across Mesopotamia and other early farming regions, setting the stage for later plough-based cultivation"},
    {y:-4600, text:"when gold was first being worked in the Balkans and trade networks were connecting communities across thousands of kilometres"},
    {y:-4500, text:"when ceremonial earthworks and monument building were spreading in prehistoric Britain, long before Stonehenge reached its famous stone phases"},
    {y:-4400, text:"when steppe pastoral societies were expanding across the Pontic-Caspian world, centuries before horse domestication transformed Eurasia"},
    {y:-4300, text:"when the first pictographic writing was developing in Mesopotamia   symbols pressed into clay to record grain, livestock, and labour"},
    {y:-4200, text:"when the Uruk expansion was spreading Mesopotamian culture across the Near East through trade and colonisation"},
    {y:-4100, text:"when the earliest known wheeled carts were in use and bronze was beginning to be alloyed from copper and tin"},
    {y:-4000, text:"when the wheel and the ox-drawn plough were transforming agriculture across Eurasia and the first bronze tools were appearing"},
    {y:-3900, text:"when proto-cuneiform writing was developing in Uruk   humans were on the verge of recording language itself, not just quantities"},
    {y:-3800, text:"when Skara Brae, a remarkably preserved stone village in Orkney, Scotland, was being inhabited   complete with stone furniture and drainage systems"},
    {y:-3700, text:"when the first Egyptian hieroglyphs were being inscribed and the two kingdoms of Upper and Lower Egypt were about to be unified"},
    {y:-3600, text:"when megalithic passage-tomb traditions were flourishing in Atlantic Europe, aligned with the sky and embedded in elaborate ritual landscapes"},
    {y:-3500, text:"when Sumerian city-states were flourishing, the first true writing systems were in use, and the Bronze Age was fully underway in the Near East"},
    {y:-3400, text:"when the first dynasty of Egypt was being established and long-distance trade was connecting the Near East, Egypt, and the Indus Valley"},
    {y:-3300, text:"when Ötzi the Iceman was alive in the Alps   his frozen body, discovered in 1991, gives us a vivid snapshot of late Neolithic European life"},
    {y:-3200, text:"when Newgrange in Ireland was being constructed and the Indus Valley civilisation was beginning to emerge in what is now Pakistan   two remarkable worlds far apart in space but close in time"},
    {y:-3100, text:"when the first pharaoh Narmer unified Upper and Lower Egypt   the beginning of one of history's longest-lasting civilisations"},

    {y:-3000, text:"the dawn of recorded history   Sumerian city-states flourished in Mesopotamia, cuneiform writing was invented, and the Bronze Age had just begun"},
    {y:-2900, text:"the Early Dynastic Period in Egypt, when the first pharaohs unified the Nile valley and proto-hieroglyphic writing spread"},
    {y:-2800, text:"the beginning of Stonehenge construction in Britain and the height of the early Sumerian city-states"},
    {y:-2700, text:"the Old Kingdom of Egypt, when Pharaoh Djoser commissioned the first stepped pyramid at Saqqara"},
    {y:-2600, text:"the construction of the Great Pyramid of Giza and the peak of the Indus Valley civilization at Mohenjo-daro"},
    {y:-2500, text:"when the Sphinx was built, copper tools were widespread, and the Indus Valley cities reached their greatest extent"},
    {y:-2400, text:"the rise of the Akkadian Empire in Mesopotamia under Sargon of Akkad   the world's first true empire"},
    {y:-2300, text:"the Akkadian Empire at its height, when Sargon's armies controlled territory from the Persian Gulf to the Mediterranean"},
    {y:-2200, text:"a period of dramatic collapse   prolonged drought destabilized the Old Kingdom of Egypt and several Bronze Age civilizations simultaneously"},
    {y:-2100, text:"the Third Dynasty of Ur in Mesopotamia, when the earliest known formal law code, attributed to Ur-Nammu, was written"},
    {y:-2000, text:"the Middle Bronze Age   Minoan civilization on Crete was flourishing and Babylon was rising as a major city"},
    {y:-1900, text:"the completion of Stonehenge and the beginning of Babylon's dominance over Mesopotamian city-states"},
    {y:-1800, text:"the era of Hammurabi's famous law code and the earliest fully alphabetic writing systems"},
    {y:-1700, text:"the Hyksos invasion of Egypt, which introduced horse-drawn chariots and transformed Bronze Age warfare"},
    {y:-1600, text:"the emergence of Mycenaean civilization in Greece and the massive Thera volcanic eruption, possibly linked to the decline of Minoan Crete"},
    {y:-1500, text:"the New Kingdom of Egypt at its height, with Pharaoh Tuthmosis III commanding the largest Egyptian empire in history"},
    {y:-1400, text:"the Amarna Period in Egypt, when Akhenaten briefly introduced a form of monotheism centred on the sun disk"},
    {y:-1300, text:"the Battle of Kadesh between Egypt and the Hittites   the earliest known peace treaty was signed shortly after"},
    {y:-1200, text:"the Late Bronze Age Collapse, when nearly every major civilization around the Mediterranean simultaneously fell   one of history's great unsolved mysteries"},
    {y:-1100, text:"the beginning of the Iron Age and the spread of the Phoenician alphabet, which would become the ancestor of nearly all modern scripts"},
    {y:-1000, text:"when King David unified the Kingdom of Israel and the Zhou Dynasty governed China   an era of parallel civilizations across Eurasia"},
    {y:-900, text:"the expansion of the Assyrian Empire and the founding of Carthage by Phoenician settlers in North Africa"},
    {y:-800, text:"when Homer composed the Iliad and Odyssey and the first Olympic Games were held in Greece in 776 BC"},
    {y:-700, text:"the Assyrian Empire at its peak and the introduction of the first metal coins in Lydia in western Anatolia"},
    {y:-600, text:"when Babylon destroyed Jerusalem, and within a few decades, both the Buddha and Confucius were born on opposite sides of Asia"},
    {y:-500, text:"the height of the Persian Empire and Athenian democracy, when Greek philosophy began reshaping how humans understood the world"},
    {y:-400, text:"when Plato was writing his dialogues, Alexander the Great was born, and Celtic cultures spread across Europe"},
    {y:-300, text:"when Alexander the Great had already conquered from Greece to India, and Euclid was laying the foundations of geometry"},
    {y:-200, text:"the Roman Republic's rapid expansion and the beginning of construction on the Great Wall of China"},
    {y:-100, text:"when Julius Caesar was born, the Roman Republic neared its end, and the Silk Road began connecting East and West"},
    {y:0, text:"the beginning of the Common Era   the Roman Empire dominated the Mediterranean world, the population of Earth was roughly 300 million, and major civilizations across Eurasia were linked by trade and empire"},
    {y:100, text:"the height of the Roman Empire under Trajan, when the Colosseum stood complete and early Christianity was spreading across the Mediterranean"},
    {y:200, text:"when the Roman Empire began to fragment and China was divided in the Three Kingdoms period"},
    {y:300, text:"when Emperor Constantine legalised Christianity and founded Constantinople, reshaping the future of European civilisation"},
    {y:400, text:"the collapse of the Western Roman Empire   Alaric sacked Rome in 410, Huns swept across Europe, and Augustine of Hippo wrote his Confessions"},
    {y:500, text:"just after the fall of the Western Roman Empire in 476, when the Byzantine Empire thrived and the Maya Classic Period reached its peak"},
    {y:600, text:"when Muhammad founded Islam and the Tang Dynasty began in China, opening two of the most transformative centuries in world history"},
    {y:700, text:"the beginning of the Islamic Golden Age and Arab armies reaching as far as Spain and India within a single generation"},
    {y:800, text:"when Charlemagne was crowned Holy Roman Emperor and the Viking Age began   Europe was being reshaped from both north and south"},
    {y:900, text:"when Vikings reached North America centuries before Columbus and the classic Maya civilisation was mysteriously collapsing"},
    {y:1000, text:"when Leif Eriksson reached Vinland, the Song Dynasty flourished in China, and the global human population stood at roughly 300 million"},
    {y:1100, text:"the era of the First Crusade, the construction of Notre-Dame cathedral, and the spread of the magnetic compass to Europe"},
    {y:1200, text:"when Genghis Khan united the Mongol tribes and went on to create the largest contiguous empire in human history"},
    {y:1300, text:"when the Black Death killed 30 to 60 percent of Europe's population and the Little Ice Age began cooling the northern hemisphere"},
    {y:1400, text:"the peak of the Renaissance, the invention of Gutenberg's printing press, and the height of the Aztec Empire"},
    {y:1500, text:"when Columbus reached the Americas, Copernicus proposed the heliocentric model, and the world was suddenly much larger and smaller at once"},
    {y:1600, text:"when Galileo first turned a telescope to the sky, Kepler discovered the laws of planetary motion, and global trade networks were transforming human society"},
    {y:1700, text:"when Newton's Principia Mathematica had already transformed science and the Industrial Revolution was just beginning in Britain"},
    {y:1800, text:"the age of Napoleon, the steam engine, and the first billion-person milestone in global human population"},
    {y:1900, text:"when the Wright Brothers achieved powered flight, Einstein published his theory of relativity, and the first human-made radio signals began radiating outward into space"},
    {y:2000, text:"the dawn of the internet age, when the human genome draft had just been announced, the International Space Station had become continuously inhabited, and the global population reached six billion"},

    {y:1e6, text:"roughly 1 million years ago, when Homo erectus was spreading across Africa and Asia and the first controlled use of fire was beginning"},
    {y:2e6, text:"roughly 2 million years ago, when Homo habilis was using the first stone tools and the Pleistocene glaciations had just begun"},
    {y:3e6, text:"roughly 3 million years ago, when Australopithecus afarensis   the species of the famous fossil Lucy   was walking upright across the African savanna"},
    {y:4e6, text:"roughly 4 million years ago, when the earliest bipedal hominins roamed Africa and the Pliocene climate was warmer than today"},
    {y:5e6, text:"roughly 5 million years ago, when hominins and chimpanzees diverged from their last common ancestor and grasslands were spreading across Africa"},
    {y:6e6, text:"roughly 6 million years ago, when Sahelanthropus tchadensis   possibly the oldest known hominin   was living in what is now Chad"},
    {y:7e6, text:"roughly 7 million years ago, when great apes were still diversifying and the African continent's landscapes were undergoing major ecological shifts"},
    {y:8e6, text:"roughly 8 million years ago, during the late Miocene, when ape species were widespread across Eurasia and Africa"},
    {y:9e6, text:"roughly 9 million years ago, when Sivapithecus   a possible ancestor of orangutans   was foraging in the forests of Asia"},
    {y:10e6, text:"roughly 10 million years ago, at the start of the late Miocene global cooling that would drive grassland expansion and ultimately favour bipedal hominins"},

    {y:20e6, text:"roughly 20 million years ago, in the early Miocene, when whales had become fully aquatic, kelp forests appeared, and apes were rapidly diversifying"},
    {y:30e6, text:"roughly 30 million years ago, in the Oligocene, when Antarctica had become fully glaciated and the first grasses were beginning to spread globally"},
    {y:40e6, text:"roughly 40 million years ago, in the Eocene, when early horses were the size of dogs, the climate was much warmer than today, and primates were diversifying across the northern continents"},
    {y:50e6, text:"roughly 50 million years ago, when India collided with Asia and the Himalayas began to rise, and the earliest whales were still semi-terrestrial creatures"},
    {y:60e6, text:"roughly 60 million years ago, in the Paleocene, when mammals were rapidly diversifying into the ecological roles left vacant by the extinction of non-avian dinosaurs"},
    {y:65e6, text:"roughly 65 million years ago, when the Chicxulub asteroid impact ended the reign of non-avian dinosaurs and eliminated roughly 75 percent of all species on Earth"},
    {y:70e6, text:"roughly 70 million years ago, in the late Cretaceous, when Tyrannosaurus rex was the apex predator of North America and flowering plants were dominating terrestrial ecosystems"},
    {y:80e6, text:"roughly 80 million years ago, in the Cretaceous, when mosasaurs ruled the seas, the first snakes were evolving, and giant pterosaurs soared above a very different Earth"},
    {y:90e6, text:"roughly 90 million years ago, when warm shallow seas covered much of what is now North America and massive marine reptiles patrolled the depths"},
    {y:100e6, text:"roughly 100 million years ago, in the mid-Cretaceous, when flowering plants were diversifying explosively and the first bees were evolving alongside them"},

    {y:200e6, text:"roughly 200 million years ago, in the early Jurassic, when Pangaea was beginning to break apart and the first mammals   tiny, shrew-like creatures   were appearing alongside the dominant dinosaurs"},
    {y:300e6, text:"roughly 300 million years ago, in the Carboniferous, when vast coal forests covered the continents, giant dragonflies with 70-centimetre wingspans filled the air, and the first reptiles were evolving"},
    {y:400e6, text:"roughly 400 million years ago, in the Devonian, when the first land vertebrates were hauling themselves onto shore, forests appeared for the first time, and the first seeds evolved"},
    {y:500e6, text:"roughly 500 million years ago, just after the Cambrian explosion   the most dramatic burst of animal diversification in Earth's history   when the first vertebrates, jawless fish, were just appearing"},
    {y:600e6, text:"roughly 600 million years ago, in the Ediacaran period, when the first multicellular animals were leaving their soft impressions in seafloor sediments"},
    {y:700e6, text:"roughly 700 million years ago, during the Snowball Earth episodes, when the entire planet may have been covered in ice and only hardy cyanobacteria kept the biosphere alive"},
    {y:800e6, text:"roughly 800 million years ago, when eukaryotes were diversifying and sexual reproduction evolved   one of the most consequential innovations in the history of life"},
    {y:900e6, text:"roughly 900 million years ago, when the first multicellular organisms were appearing and atmospheric oxygen was slowly accumulating to levels that would eventually make complex life possible"},
    {y:1000e6, text:"roughly 1 billion years ago, when the supercontinent Rodinia existed, simple algae dominated the oceans, and Earth's atmosphere still contained far less oxygen than today"},
    {y:1100e6, text:"roughly 1.1 billion years ago, in the Proterozoic, when stromatolites   layered microbial mats   dominated Earth's shallow seas and the continents were bare and lifeless"}
];

function getNearestStar(dist) {
  let best = STAR_DB[0];
  let bestDiff = Math.abs(dist - best.d);

  for (const s of STAR_DB) {
    const diff = Math.abs(dist - s.d);
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }

  return best;
}

function getHistoricalContext(years) {
  const currentYear = new Date().getFullYear();
  let best = HISTORY_DB[0];
  let bestDiff = Infinity;

  for (const h of HISTORY_DB) {
    let yearsAgo;
    if (h.y < 0) yearsAgo = currentYear + Math.abs(h.y);
    else if (h.y <= currentYear) yearsAgo = currentYear - h.y;
    else yearsAgo = h.y;

    const diff = Math.abs(years - yearsAgo);
    if (diff < bestDiff) {
      best = h;
      bestDiff = diff;
    }
  }

  return best;
}

function getConfigurationWarnings() {
  const warnings = [];
  const validationWarnings = getInputValidationWarnings();
  const intervalWarnings = getBoundIntervalWarnings();
  const normalizedBounds = getBoundValidationWarnings();
  const scenario = getScenarioState();

  if (scenario.isModified) {
    warnings.push({
      label: 'Modified preset',
      text: getModifiedPresetWarningText()
    });
  }

  const mcBlockingErrors = getMonteCarloBoundsBlockingErrors();
  if (mcBlockingErrors.length) {
    warnings.push({
      label: 'Monte Carlo blocked',
      text: getMonteCarloBlockingWarningText(mcBlockingErrors)
    });
  }

  if (validationWarnings.length) {
    warnings.push({
      label: 'Input validation',
      text:
        'Input was outside the allowed range and was clamped to the nearest valid value. ' +
        validationWarnings.map(w => `${w.label}: ${w.originalValue} -> ${w.normalizedValue}`).join('; ')
    });
  }

  if (intervalWarnings.length) {
    warnings.push({
      label: 'Monte Carlo interval expanded',
      text:
        'Central value lies outside the configured Monte Carlo interval; the sampler expands the interval to include the central value. ' +
        intervalWarnings.map(w => `${w.label}: ${w.centralValue} outside [${w.min}, ${w.max}]`).join('; ')
    });
  }

  if (normalizedBounds.length) {
    warnings.push({
      label: 'Monte Carlo bounds normalized',
      text:
        'Monte Carlo min/max fields were outside their allowed domain or had min greater than max, and were normalized before sampling. ' +
        normalizedBounds.map(w => `${w.id}: ${w.originalValue} -> ${w.normalizedValue}`).join('; ')
    });
  }

  if (ADV.enabled && ADV.modules.hostChannels.enabled) {
    const rawSum =
      clamp01(rawNumber('adv_f_G', 0)) +
      clamp01(rawNumber('adv_f_K', 0)) +
      clamp01(rawNumber('adv_f_M', 0));

    if (rawSum > 1 + 1e-9) {
      warnings.push({
        label: 'Host fractions normalized',
        text:
          `G + K + M host fractions currently sum to ${rawSum.toFixed(2)}, ` +
          'so the calculator renormalizes them back to 1.00 before applying channel weights.'
      });
    }
  }

  if (isGalaxySettingsEnabled && galaxyName === 'Custom Galaxy X' && getGalaxyEarthDistance() <= 0) {
    warnings.push({
      label: 'Custom galaxy reference empty',
      text:
        'Custom galaxy settings are enabled but Distance from Earth is empty. Nearest-neighbour estimates inside the galaxy still work, but Earth-reference distance and Fermi-style contextualisation remain unavailable.'
    });
  }

  if (typeof allDistanceModelsDisabled === 'function' && allDistanceModelsDisabled()) {
    warnings.push({
      label: 'Distance models disabled',
      text:
        'All geometric distance models are currently switched off. The distance panel cannot derive a nearest-neighbour estimate until at least one model is enabled.'
    });
  }

  if (isComplexLifeEnabled && pf('f_complex_life', 1) > 0 && pf('f_complex_life', 1) <= 1e-6) {
    warnings.push({
      label: 'Ultra-low complex-life prior',
      text:
        `Complex life is enabled with f_life = ${pf('f_complex_life', 0).toExponential(2)}. ` +
        'This single term will strongly dominate the final result and can suppress otherwise optimistic astrophysical settings.'
    });
  }

  if (ADV.enabled) {
    const isSuppressive = (id, threshold) => pf(id, 1) > 0 && pf(id, 1) <= threshold;
    const moduleOn = key => ADV.modules[key] && ADV.modules[key].enabled;

    const atmRelatedActive = [
      moduleOn('atmRet') && isSuppressive('adv_f_atm_ret', 0.5),
      moduleOn('spaceWeather') && isSuppressive('adv_f_xuv', 0.5),
      moduleOn('radiation') && isSuppressive('adv_f_rad', 0.5),
      moduleOn('volatileSplit') &&
        (isSuppressive('adv_f_vol_del', 0.4) || isSuppressive('adv_f_wat_ret', 0.4))
    ].filter(Boolean).length;
    const baseMagLow = pf('f_magnetosphere', 1) <= 0.4;
    const baseH2OLow = isH2OEnabled && pf('f_H2O', 1) <= 0.1;

    if (atmRelatedActive >= 2 || (atmRelatedActive >= 1 && (baseMagLow || baseH2OLow))) {
      warnings.push({
        label: 'Compound atmosphere/shielding stack',
        text:
          'Several atmospheric, water-retention, radiation, or shielding filters are enabled together. ' +
          'These factors are intentionally multiplicative, but they may represent overlapping physical constraints. ' +
          'Interpret strongly suppressed outputs as a compound-stress scenario, not a direct independent probability.'
      });
    }

    if (moduleOn('binary') && isSuppressive('adv_f_binary', 0.6) && pf('f_stability', 1) <= 0.5) {
      warnings.push({
        label: 'Binary + stability stack',
        text:
          'The binary-star filter multiplies on top of the base orbital-stability factor. ' +
          'If both are restrictive, the model may represent a deliberately conservative dynamical-stability scenario.'
      });
    }

    const radiationShieldingActive = [
      moduleOn('spaceWeather') && isSuppressive('adv_f_xuv', 0.6),
      moduleOn('radiation') && isSuppressive('adv_f_rad', 0.85)
    ].filter(Boolean).length;
    if (radiationShieldingActive >= 2 || (radiationShieldingActive >= 1 && baseMagLow)) {
      warnings.push({
        label: 'Radiation/shielding stack',
        text:
          'Space-weather, radiation-survival, and magnetosphere terms can overlap conceptually through atmospheric shielding and high-energy radiation exposure. ' +
          'Their product should be interpreted as a conservative compound filter.'
      });
    }
  }

  return warnings;
}

function summarizeConvergence(checkpoints, finalMean) {
  if (!checkpoints.length) return null;

  const relTol = 0.02;
  const scale = Math.max(Math.abs(finalMean), 1e-12);
  const absTol = Math.max(scale * relTol, 1e-12);
  let stableAt = null;

  for (let i = 0; i < checkpoints.length; i++) {
    const tail = checkpoints.slice(i);
    const within = tail.every(p => Math.abs(p.mean - finalMean) <= absTol);
    if (within) {
      stableAt = checkpoints[i].n;
      break;
    }
  }

  const last = checkpoints[checkpoints.length - 1];
  const prev = checkpoints[Math.max(0, checkpoints.length - 2)] || last;
  const tailDriftPct =
    scale > 0 ? (Math.abs(last.mean - prev.mean) / Math.max(scale, 1e-12)) * 100 : 0;

  return {
    checkpoints,
    relTolPct: relTol * 100,
    stableAt,
    finalMean,
    tailDriftPct
  };
}

function getConvergenceAlert(summary) {
  if (!summary || !summary.checkpoints.length) return null;

  const total = summary.checkpoints[summary.checkpoints.length - 1].n;
  const suggestedIterations = total < 20000 ? Math.min(20000, Math.max(total + 1000, total * 2)) : null;

  if (summary.stableAt === null) {
    return {
      level: 'warning',
      text:
        suggestedIterations !== null
          ? `This run has <strong>not converged cleanly</strong>. Increase the iteration count to about <strong>${suggestedIterations.toLocaleString()}</strong> and run Monte Carlo again before trusting the mean too much.`
          : 'This run has <strong>not converged cleanly</strong> even at the current iteration cap. Re-run cautiously and treat the Monte Carlo arithmetic mean as provisional.'
    };
  }

  if (summary.stableAt >= total) {
    return {
      level: 'caution',
      text:
        suggestedIterations !== null
          ? `The mean only settled at the <strong>final checkpoint</strong>. A rerun with about <strong>${suggestedIterations.toLocaleString()}</strong> iterations would make the result more stable.`
          : 'The mean only settled at the <strong>final checkpoint</strong>. The result is usable, but it is still worth rerunning and treating the estimate with caution.'
    };
  }

  return null;
}

function getInputs() {
  beginInputValidationPass();
  return {
    N_GHZ: sanitizePositiveInput('N_GHZ'),
    f_sun_type: sanitizeProbabilityInput('f_sun_type'),
    f_sun_age: sanitizeProbabilityInput('f_sun_age'),
    N_p_star: sanitizePositiveInput('N_p_star'),
    f_composition: sanitizeProbabilityInput('f_composition'),
    f_orbit: sanitizeProbabilityInput('f_orbit'),
    f_stability: sanitizeProbabilityInput('f_stability'),
    f_magnetosphere: sanitizeProbabilityInput('f_magnetosphere'),
    f_lunar_stability: sanitizeProbabilityInput('f_lunar_stability'),
    f_size: sanitizeProbabilityInput('f_size'),
    f_rotation: sanitizeProbabilityInput('f_rotation'),
    f_tilt: sanitizeProbabilityInput('f_tilt'),
    f_H2O: isH2OEnabled ? sanitizeProbabilityInput('f_H2O') : 1,
    f_CHNOPS: isCHNOPSEnabled ? sanitizeProbabilityInput('f_CHNOPS') : 1,
    f_complex_life: isComplexLifeEnabled
      ? sanitizeProbabilityInput('f_complex_life')
      : 1,
    f_x: isXEnabled ? sanitizeProbabilityInput('f_x') : 1
  };
}

function computePlanetsBase(inp) {
  return (
    inp.N_GHZ *
    inp.f_sun_type *
    inp.f_sun_age *
    inp.N_p_star *
    inp.f_composition *
    inp.f_orbit *
    inp.f_stability *
    inp.f_magnetosphere *
    inp.f_lunar_stability *
    inp.f_size *
    inp.f_rotation *
    inp.f_tilt *
    inp.f_H2O *
    inp.f_CHNOPS *
    inp.f_complex_life *
    inp.f_x
  );
}

function computePlanetsAdvanced(inp) {
  let N = computePlanetsBase(inp);
  N *= inp._f_atm_ret ?? 1;
  N *= inp._f_longterm ?? 1;
  N *= inp._f_xuv_quiet ?? 1;
  N *= inp._f_uv ?? 1;
  N *= inp._f_binary ?? 1;
  N *= inp._f_rad ?? 1;
  return Math.max(0, N);
}

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function logit(p) {
  const q = clamp(p, 1e-9, 1 - 1e-9);
  return Math.log(q / (1 - q));
}

function hashSeed(seed) {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seed) {
  let state = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : hashSeed(seed);
  return function seededRng() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveRng(options = {}) {
  if (typeof options.rng === 'function') return options.rng;
  if (Object.prototype.hasOwnProperty.call(options, 'seed')) return createSeededRng(options.seed);
  return Math.random;
}

function boxMuller(rng = Math.random) {
  const u1 = Math.max(1e-12, rng());
  const u2 = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function getSamplingUncertaintyFraction() {
  return clamp(rawNumber('sampling_uncertainty', 50), 1, 100) / 100;
}

function getSimulationOptions() {
  return {
    engine: ((byId('simulation-engine') || {}).value || 'standard').toLowerCase(),
    correlation: ((byId('correlation-model') || {}).value || 'independent').toLowerCase(),
    robustBounds: !!((byId('robust-bounds') || {}).checked),
    mcMode: ((byId('mc-basis-mode') || {}).value || 'auto')
  };
}

function getSamplingDistributionLabels(dist = ((byId('distribution') || {}).value || 'lognormal')) {
  if (dist === 'uniform') {
    return {
      short: 'Uniform',
      long: 'uniform interval sampling'
    };
  }

  if (dist === 'normal') {
    return {
      short: 'Normal',
      long: 'bounded normal sampling'
    };
  }

  return {
    short: 'Log-normal',
    long: 'probability-aware logit/log sampling'
  };
}

function describeSimulationOptions(options = getSimulationOptions(), dist = ((byId('distribution') || {}).value || 'lognormal')) {
  const distLabels = getSamplingDistributionLabels(dist);
  const bounds = getMonteCarloBoundsDescriptor(options);

  return {
    engineLabel: SIM_ENGINE_LABELS[options.engine] || SIM_ENGINE_LABELS.standard,
    correlationLabel: SIM_CORRELATION_LABELS[options.correlation] || SIM_CORRELATION_LABELS.heuristic,
    distributionShort: distLabels.short,
    distributionLong: distLabels.long,
    boundsMode: bounds.mode,
    boundsLabel: bounds.label,
    uncertaintyBasisLabel: bounds.uncertaintyBasisLabel
  };
}

function shuffleInPlace(values, rng = Math.random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function getActivePresetKeyForBounds() {
  return scenarioState === 'preset' && activePreset && activePreset !== 'custom' && PRESETS[activePreset]
    ? activePreset
    : null;
}

function getPresetLocalSourcePreset() {
  const origin = getScenarioOriginPreset();
  if (origin) return origin;
  if (activePreset && activePreset !== 'custom' && PRESETS[activePreset]) return activePreset;
  return null;
}

function normalizeMonteCarloBasisMode(mode) {
  const value = String(mode || 'auto').trim();
  if (/^presetlocal$/i.test(value)) return MONTE_CARLO_BASIS_MODES.presetLocal;
  if (/^modifiedpresetlocal$/i.test(value)) return MONTE_CARLO_BASIS_MODES.modifiedPresetLocal;
  if (/^custominput$/i.test(value)) return MONTE_CARLO_BASIS_MODES.customInput;
  if (/^globalenvelope$/i.test(value)) return MONTE_CARLO_BASIS_MODES.globalEnvelope;
  return 'auto';
}

function resolveMonteCarloBasisMode(options = getSimulationOptions()) {
  const requested = normalizeMonteCarloBasisMode(options.mcMode);
  const scenario = getScenarioState();

  // Explicit user-selected modes are honored.
  if (requested === MONTE_CARLO_BASIS_MODES.globalEnvelope) return requested;
  if (requested === MONTE_CARLO_BASIS_MODES.customInput) return requested;
  if (requested === MONTE_CARLO_BASIS_MODES.modifiedPresetLocal) return requested;
  if (requested === MONTE_CARLO_BASIS_MODES.presetLocal) return requested;

  // Auto resolution: a clean preset stays preset-local; an EDITED preset uses
  // modified preset-local (not full customInput) so unchanged preset fields keep
  // scenario-local uncertainty; a true custom scenario uses customInput.
  if (scenario.isPreset) return MONTE_CARLO_BASIS_MODES.presetLocal;
  if (scenario.isModified) return MONTE_CARLO_BASIS_MODES.modifiedPresetLocal;
  return MONTE_CARLO_BASIS_MODES.customInput;
}

function getMonteCarloBoundsDescriptor(options = getSimulationOptions()) {
  const scenario = getScenarioState();
  const mode = resolveMonteCarloBasisMode(options);
  const sourcePreset = getPresetLocalSourcePreset();

  if (mode === MONTE_CARLO_BASIS_MODES.presetLocal) {
    return {
      mode,
      label: MONTE_CARLO_BOUNDS_LABELS.presetLocal,
      sourcePreset,
      scenarioLabel: scenario.label,
      uncertaintyBasisLabel: PRESET_LOCAL_UNCERTAINTY_BASIS
    };
  }

  if (mode === MONTE_CARLO_BASIS_MODES.modifiedPresetLocal) {
    return {
      mode,
      label: MONTE_CARLO_BOUNDS_LABELS.modifiedPresetLocal,
      sourcePreset,
      scenarioLabel: scenario.label,
      uncertaintyBasisLabel: MODIFIED_PRESET_LOCAL_BASIS
    };
  }

  if (mode === MONTE_CARLO_BASIS_MODES.globalEnvelope) {
    return {
      mode,
      label: MONTE_CARLO_BOUNDS_LABELS.globalEnvelope,
      scenarioLabel: scenario.label,
      uncertaintyBasisLabel: GLOBAL_ENVELOPE_BASIS
    };
  }

  return {
    mode: MONTE_CARLO_BASIS_MODES.customInput,
    label: MONTE_CARLO_BOUNDS_LABELS.customInput,
    scenarioLabel: scenario.label,
    uncertaintyBasisLabel: CUSTOM_INPUT_BASIS
  };
}

// Parameters that participate in the current Monte Carlo computation: base
// non-optional factors always, optional factors only when enabled, advanced
// sampled factors only when their module is enabled.
function parameterEnabledForBoundsDescriptor(id, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const sourcePreset =
    boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.presetLocal
      ? boundsDescriptor.sourcePreset
      : null;
  const preset = sourcePreset && PRESETS[sourcePreset] ? PRESETS[sourcePreset] : null;

  if (id === 'f_H2O') return preset ? preset.enableH2O !== false : isH2OEnabled;
  if (id === 'f_CHNOPS') return preset ? preset.enableCHNOPS !== false : isCHNOPSEnabled;
  if (id === 'f_complex_life') return preset ? !!preset.enableComplex : isComplexLifeEnabled;
  if (id === 'f_x') return preset ? !!preset.enableX : isXEnabled;
  return true;
}

function getMonteCarloSampledParameterIds(boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const ids = [
    'N_GHZ', 'f_sun_type', 'f_sun_age', 'N_p_star', 'f_composition', 'f_orbit',
    'f_stability', 'f_magnetosphere', 'f_lunar_stability', 'f_size', 'f_rotation', 'f_tilt'
  ];
  if (parameterEnabledForBoundsDescriptor('f_H2O', boundsDescriptor)) ids.push('f_H2O');
  if (parameterEnabledForBoundsDescriptor('f_CHNOPS', boundsDescriptor)) ids.push('f_CHNOPS');
  if (parameterEnabledForBoundsDescriptor('f_complex_life', boundsDescriptor)) ids.push('f_complex_life');
  if (parameterEnabledForBoundsDescriptor('f_x', boundsDescriptor)) ids.push('f_x');
  if (ADV.enabled && typeof ADV_SOBOL_CONFIG !== 'undefined') {
    for (const id of ADV_SAMPLE_IDS) {
      const cfg = ADV_SOBOL_CONFIG[id];
      if (cfg && ADV.modules[cfg.module] && ADV.modules[cfg.module].enabled) ids.push(id);
    }
  }
  return ids;
}

// A parameter is sampled from its visible min/max only in customInput,
// globalEnvelope, or (for edited fields) modifiedPresetLocal. In presetLocal —
// and for unedited fields under modifiedPresetLocal — the sampler uses
// scenario-local bounds and ignores the visible min/max, so inconsistent visible
// bounds there are not a blocking error.
function parameterUsesVisibleBoundsForSampling(id, mode, origin) {
  if (mode === MONTE_CARLO_BASIS_MODES.customInput) return true;
  if (mode === MONTE_CARLO_BASIS_MODES.globalEnvelope) return true;
  if (mode === MONTE_CARLO_BASIS_MODES.modifiedPresetLocal) {
    return origin ? isParameterEditedFromPreset(id, origin) : true;
  }
  return false;
}

// Returns the set of visible-bound inconsistencies that must block Monte Carlo:
// a sampled-from-visible-bounds parameter whose min > max, or whose central
// value lies outside [min, max].
function getMonteCarloBoundsBlockingErrors(boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const mode = boundsDescriptor.mode;
  const origin = getScenarioOriginPreset();
  const errors = [];

  for (const id of getMonteCarloSampledParameterIds(boundsDescriptor)) {
    if (!parameterUsesVisibleBoundsForSampling(id, mode, origin)) continue;
    const minEl = byId(id + '_min');
    const maxEl = byId(id + '_max');
    if (!minEl || !maxEl) continue;

    const central = rawNumber(id, NaN);
    const lo = rawNumber(id + '_min', NaN);
    const hi = rawNumber(id + '_max', NaN);
    if (!Number.isFinite(central) || !Number.isFinite(lo) || !Number.isFinite(hi)) continue;

    const label = getValidationLabel(id);
    if (lo > hi) {
      errors.push({
        id,
        kind: 'min-gt-max',
        text: `${label}: minimum ${formatValidationValue(lo)} is greater than maximum ${formatValidationValue(hi)}.`
      });
    } else if (central < lo || central > hi) {
      errors.push({
        id,
        kind: 'central-outside',
        text: `${label}: central value ${formatValidationValue(central)} is outside its min/max range [${formatValidationValue(lo)}, ${formatValidationValue(hi)}].`
      });
    }
  }

  return errors;
}

function getMonteCarloBlockingWarningText(errors) {
  return (
    'Monte Carlo cannot run until these bounds are corrected: ' +
    errors.map(e => e.text).join(' ') +
    ' Deterministic output is still shown.'
  );
}

function getPresetLocalWidth(id) {
  const key = PRESET_LOCAL_PARAM_WIDTHS[id] || 'medium';
  return PRESET_LOCAL_WIDTH_PROFILES[key] || PRESET_LOCAL_WIDTH_PROFILES.medium;
}

function buildPresetLocalBounds(id, meanVal, isProbability, isPositive) {
  const width = getPresetLocalWidth(id);

  if (isProbability) {
    const m = clamp01(meanVal);
    if (m <= 0 || m >= 1) return { lo: m, hi: m, basis: 'scenario-local' };

    const halfWidth = width.probabilityLogitHalfWidth;
    const center = logit(m);
    return {
      lo: logistic(center - halfWidth),
      hi: logistic(center + halfWidth),
      basis: 'scenario-local'
    };
  }

  if (isPositive) {
    const m = Math.max(0, meanVal);
    if (m <= 0) return { lo: 0, hi: 0, basis: 'scenario-local' };
    const halfWidth = width.positiveLogHalfWidth;
    return {
      lo: m / Math.exp(halfWidth),
      hi: m * Math.exp(halfWidth),
      basis: 'scenario-local'
    };
  }

  return { lo: meanVal, hi: meanVal, basis: 'fixed' };
}

function getPresetLocalCentralValue(id, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  if (boundsDescriptor.mode !== MONTE_CARLO_BASIS_MODES.presetLocal) return NaN;
  const sourcePreset = boundsDescriptor.sourcePreset || getPresetLocalSourcePreset();
  const preset = sourcePreset && PRESETS[sourcePreset] ? PRESETS[sourcePreset] : null;
  if (!preset || !Object.prototype.hasOwnProperty.call(preset, id)) return NaN;
  const value = Number(preset[id]);
  return Number.isFinite(value) ? value : NaN;
}

function getInputsForBoundsDescriptor(boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const sourcePreset =
    boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.presetLocal
      ? boundsDescriptor.sourcePreset || getPresetLocalSourcePreset()
      : null;
  const preset = sourcePreset && PRESETS[sourcePreset] ? PRESETS[sourcePreset] : null;

  if (!preset) return getInputs();

  return {
    N_GHZ: Number(preset.N_GHZ),
    f_sun_type: Number(preset.f_sun_type),
    f_sun_age: Number(preset.f_sun_age),
    N_p_star: Number(preset.N_p_star),
    f_composition: Number(preset.f_composition),
    f_orbit: Number(preset.f_orbit),
    f_stability: Number(preset.f_stability),
    f_magnetosphere: Number(preset.f_magnetosphere),
    f_lunar_stability: Number(preset.f_lunar_stability),
    f_size: Number(preset.f_size),
    f_rotation: Number(preset.f_rotation),
    f_tilt: Number(preset.f_tilt),
    f_H2O: preset.enableH2O !== false ? Number(preset.f_H2O) : 1,
    f_CHNOPS: preset.enableCHNOPS !== false ? Number(preset.f_CHNOPS) : 1,
    f_complex_life: preset.enableComplex ? Number(preset.f_complex_life) : 1,
    f_x: preset.enableX ? Number(preset.f_x) : 1
  };
}

function normalizeSamplingControlValue(controlId, value, fallback, isProbability, isPositive) {
  const el = byId(controlId);
  const original = el ? el.value : value;
  let normalized = Number.isFinite(value) ? value : fallback;
  let changed = !Number.isFinite(value);
  let reason = changed ? 'Non-numeric input was replaced by the fallback value.' : '';

  if (isProbability && normalized < 0) {
    normalized = 0;
    changed = true;
    reason = 'Probability-like bounds must remain in [0, 1].';
  }
  if (isProbability && normalized > 1) {
    normalized = 1;
    changed = true;
    reason = 'Probability-like bounds must remain in [0, 1].';
  }
  if (isPositive && normalized < 0) {
    normalized = 0;
    changed = true;
    reason = 'Count-like bounds must remain non-negative.';
  }

  if (changed) {
    recordBoundValidationWarning(controlId, original, normalized, reason);
    if (el) el.value = String(normalized);
  }

  return normalized;
}

function getParamSamplingState(id, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const isProbability = PROBABILITY_FIELDS.has(id);
  const isPositive = POSITIVE_FIELDS.has(id);
  const presetLocalCentralValue = getPresetLocalCentralValue(id, boundsDescriptor);

  if (Number.isFinite(presetLocalCentralValue)) {
    const meanVal = isProbability
      ? clamp01(presetLocalCentralValue)
      : isPositive
        ? Math.max(0, presetLocalCentralValue)
        : presetLocalCentralValue;
    const local = buildPresetLocalBounds(id, meanVal, isProbability, isPositive);
    return {
      meanVal,
      lo: local.lo,
      hi: local.hi,
      isProbability,
      isPositive,
      hasBounds: true,
      basis: local.basis || 'scenario-local'
    };
  }

  let meanVal = rawNumber(id, NaN);
  const minEl = byId(id + '_min');
  const maxEl = byId(id + '_max');

  if (!Number.isFinite(meanVal)) meanVal = 0;

  if (!minEl || !maxEl) {
    meanVal = normalizeSamplingControlValue(id, meanVal, 0, isProbability, isPositive);
    return {
      meanVal,
      lo: meanVal,
      hi: meanVal,
      isProbability,
      isPositive,
      hasBounds: false,
      basis: 'fixed'
    };
  }

  meanVal = normalizeSamplingControlValue(id, meanVal, 0, isProbability, isPositive);
  let lo = normalizeSamplingControlValue(id + '_min', rawNumber(id + '_min', meanVal), meanVal, isProbability, isPositive);
  let hi = normalizeSamplingControlValue(id + '_max', rawNumber(id + '_max', meanVal), meanVal, isProbability, isPositive);

  if (lo > hi) {
    recordBoundValidationWarning(
      id,
      `${lo} > ${hi}`,
      `${hi}..${lo}`,
      'Minimum was greater than maximum; the interval endpoints were swapped before sampling.'
    );
    [lo, hi] = [hi, lo];
    minEl.value = String(lo);
    maxEl.value = String(hi);
  }

  const configuredLo = lo;
  const configuredHi = hi;
  if (meanVal < lo) {
    recordBoundIntervalWarning(id, meanVal, configuredLo, configuredHi);
    lo = meanVal;
  }
  if (meanVal > hi) {
    recordBoundIntervalWarning(id, meanVal, configuredLo, configuredHi);
    hi = meanVal;
  }

  let basis = 'visible-input-bounds';
  if (boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.presetLocal) {
    const local = buildPresetLocalBounds(id, meanVal, isProbability, isPositive);
    lo = local.lo;
    hi = local.hi;
    basis = local.basis || 'scenario-local';
  } else if (boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.modifiedPresetLocal) {
    // Edited fields use their visible bounds; unchanged preset fields keep
    // scenario-local preset uncertainty (so one edit cannot widen unrelated fields).
    const origin = getScenarioOriginPreset();
    if (origin && !isParameterEditedFromPreset(id, origin)) {
      const local = buildPresetLocalBounds(id, meanVal, isProbability, isPositive);
      lo = local.lo;
      hi = local.hi;
      basis = local.basis || 'scenario-local';
    } else {
      basis = 'visible-input-bounds';
    }
  } else if (boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.globalEnvelope) {
    basis = 'global-envelope';
  }

  if (lo > hi) [lo, hi] = [hi, lo];

  return {
    meanVal,
    lo,
    hi,
    isProbability,
    isPositive,
    hasBounds: true,
    basis
  };
}

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t);
  return sign * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(x) {
  return 0.5 * (1 + erfApprox(x / Math.SQRT2));
}

function inverseNormalCdf(p) {
  const q = clamp(p, 1e-12, 1 - 1e-12);
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (q < plow) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (
      (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1)
    );
  }

  if (q > phigh) {
    const r = Math.sqrt(-2 * Math.log(1 - q));
    return -(
      (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1)
    );
  }

  const r = q - 0.5;
  const s = r * r;
  return (
    (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) *
    r /
    (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1)
  );
}

function sampleNormalBounded(meanVal, lo, hi, rng = Math.random) {
  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, 1e-12);
  for (let i = 0; i < 14; i++) {
    const v = meanVal + sd * boxMuller(rng);
    if (v >= lo && v <= hi) return v;
  }
  return clamp(meanVal, lo, hi);
}

function sampleLogNormalBounded(meanVal, lo, hi, rng = Math.random) {
  if (meanVal <= 0) return 0;

  // Median-anchored log-normal: the preset central value is interpreted as the
  // MEDIAN of the factor's distribution, not as its arithmetic expectation.
  // For independent log-normal factors this is the mathematically clean
  // convention because median(prod Xi) = prod median(Xi). The arithmetic mean
  // of the product naturally exceeds the median (Jensen's inequality); that
  // drift is a real propagated-uncertainty effect, not a sampling artifact.
  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, meanVal * 0.1, 1e-12);
  const variance = sd * sd;
  const mu = Math.log(meanVal);
  const sigma = Math.sqrt(Math.log(1 + variance / (meanVal * meanVal)));

  for (let i = 0; i < 14; i++) {
    const v = Math.exp(mu + sigma * boxMuller(rng));
    if (v >= lo && v <= hi) return v;
  }
  return clamp(meanVal, lo, hi);
}

function sampleLogitNormalBounded(meanVal, lo, hi, rng = Math.random) {
  // Median-anchored logit-normal: the preset central value m is interpreted as
  // the MEDIAN of the probability factor. Then median(logistic(Z)) =
  // logistic(logit(m)) = m, so MC median for the factor matches the preset
  // value regardless of how asymmetric the bounds are around m. The previous
  // moments-correction multiplier on the center pushed E[logistic(Z)] toward
  // m, which broke down when m sat near the registry edges (Pessimist).
  const m = clamp(meanVal, Math.max(lo, 1e-9), Math.min(hi, 1 - 1e-9));
  const lo2 = clamp(lo, 1e-9, 1 - 1e-9);
  const hi2 = clamp(hi, 1e-9, 1 - 1e-9);
  const uncertaintyFraction = getSamplingUncertaintyFraction();

  const spread = Math.max((logit(hi2) - logit(lo2)) * uncertaintyFraction / 2, 1e-6);
  const center = logit(m);

  for (let i = 0; i < 14; i++) {
    const z = center + spread * boxMuller(rng);
    const v = logistic(z);
    if (v >= lo && v <= hi) return v;
  }
  return clamp(m, lo, hi);
}

function sampleNormalQuantile(meanVal, lo, hi, u) {
  if (hi <= lo) return clamp(meanVal, lo, hi);

  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, 1e-12);
  const cdfLo = normalCdf((lo - meanVal) / sd);
  const cdfHi = normalCdf((hi - meanVal) / sd);
  const p = cdfLo + u * Math.max(cdfHi - cdfLo, 1e-12);
  return clamp(meanVal + sd * inverseNormalCdf(p), lo, hi);
}

function sampleLogNormalQuantile(meanVal, lo, hi, u) {
  if (meanVal <= 0) return 0;
  if (hi <= lo) return clamp(meanVal, lo, hi);

  // Median-anchored — see sampleLogNormalBounded for the rationale.
  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, meanVal * 0.1, 1e-12);
  const variance = sd * sd;
  const mu = Math.log(meanVal);
  const sigma = Math.sqrt(Math.log(1 + variance / (meanVal * meanVal)));
  const cdfLo = lo <= 0 ? 0 : normalCdf((Math.log(Math.max(lo, 1e-12)) - mu) / sigma);
  const cdfHi = normalCdf((Math.log(Math.max(hi, 1e-12)) - mu) / sigma);
  const p = cdfLo + u * Math.max(cdfHi - cdfLo, 1e-12);
  return clamp(Math.exp(mu + sigma * inverseNormalCdf(p)), lo, hi);
}

function sampleLogitNormalQuantile(meanVal, lo, hi, u) {
  // Median-anchored — see sampleLogitNormalBounded for the rationale.
  const m = clamp(meanVal, Math.max(lo, 1e-9), Math.min(hi, 1 - 1e-9));
  const lo2 = clamp(lo, 1e-9, 1 - 1e-9);
  const hi2 = clamp(hi, 1e-9, 1 - 1e-9);
  const uncertaintyFraction = getSamplingUncertaintyFraction();

  const spread = Math.max((logit(hi2) - logit(lo2)) * uncertaintyFraction / 2, 1e-6);
  const center = logit(m);
  const cdfLo = normalCdf((logit(lo2) - center) / spread);
  const cdfHi = normalCdf((logit(hi2) - center) / spread);
  const p = cdfLo + u * Math.max(cdfHi - cdfLo, 1e-12);
  return clamp(logistic(center + spread * inverseNormalCdf(p)), lo2, hi2);
}

function sampleUniformCentered(meanVal, lo, hi, isProbability, isPositive, u) {
  if (isProbability && lo > 0 && hi < 1) {
    const center = logit(clamp(meanVal, lo, hi));
    const loZ = logit(lo);
    const hiZ = logit(hi);
    const spanLo = Math.abs(center - loZ);
    const spanHi = Math.abs(hiZ - center);
    const halfWidth = Math.min(spanLo, spanHi);
    if (halfWidth > 0) {
      return logistic(center - halfWidth + u * 2 * halfWidth);
    }
  }

  if (isPositive && meanVal > 0 && lo > 0 && hi > lo) {
    const center = Math.log(meanVal);
    const loZ = Math.log(lo);
    const hiZ = Math.log(hi);
    const spanLo = Math.abs(center - loZ);
    const spanHi = Math.abs(hiZ - center);
    const halfWidth = Math.min(spanLo, spanHi);
    if (halfWidth > 0) {
      return Math.exp(center - halfWidth + u * 2 * halfWidth);
    }
  }

  return lo + u * (hi - lo);
}

function sampleParam(id, dist, rng = Math.random, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const { meanVal, lo, hi, isProbability, isPositive, hasBounds, basis } = getParamSamplingState(id, boundsDescriptor);

  if (!hasBounds) return meanVal;
  if (hi <= lo) return clamp(meanVal, lo, hi);

  if (dist === 'uniform') {
    if (basis === 'scenario-local') return sampleUniformCentered(meanVal, lo, hi, isProbability, isPositive, rng());
    return lo + rng() * (hi - lo);
  }

  if (isProbability) {
    if (dist === 'lognormal') return sampleLogitNormalBounded(meanVal, lo, hi, rng);
    return sampleNormalBounded(meanVal, lo, hi, rng);
  }

  if (dist === 'lognormal' && lo >= 0) {
    return sampleLogNormalBounded(meanVal, lo, hi, rng);
  }

  return sampleNormalBounded(meanVal, lo, hi, rng);
}

function sampleParamFromQuantile(id, dist, u, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const { meanVal, lo, hi, isProbability, isPositive, hasBounds, basis } = getParamSamplingState(id, boundsDescriptor);

  if (!hasBounds) return meanVal;
  if (hi <= lo) return clamp(meanVal, lo, hi);

  if (dist === 'uniform') {
    if (basis === 'scenario-local') return sampleUniformCentered(meanVal, lo, hi, isProbability, isPositive, u);
    return lo + u * (hi - lo);
  }

  if (isProbability) {
    if (dist === 'lognormal') return sampleLogitNormalQuantile(meanVal, lo, hi, u);
    return sampleNormalQuantile(meanVal, lo, hi, u);
  }

  if (dist === 'lognormal' && lo >= 0) {
    return sampleLogNormalQuantile(meanVal, lo, hi, u);
  }

  return sampleNormalQuantile(meanVal, lo, hi, u);
}

function buildLatinHypercubeSequence(iterations, rng = Math.random) {
  return shuffleInPlace(
    Array.from({ length: iterations }, (_, idx) => (idx + rng()) / iterations),
    rng
  );
}

function createParameterSampler(engine, dist, iterations, rng = Math.random, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  if (engine !== 'lhs') {
    return {
      startIteration() {},
      sample(id) {
        return sampleParam(id, dist, rng, boundsDescriptor);
      }
    };
  }

  const plans = {};
  SAMPLABLE_PARAM_IDS.forEach(id => {
    plans[id] = buildLatinHypercubeSequence(iterations, rng);
  });

  let iterationIndex = 0;

  return {
    startIteration(index) {
      iterationIndex = index;
    },
    sample(id) {
      const plan = plans[id];
      const u = plan && Number.isFinite(plan[iterationIndex]) ? plan[iterationIndex] : rng();
      return sampleParamFromQuantile(id, dist, u, boundsDescriptor);
    }
  };
}

function getParamBoundValue(id, side, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const { lo, hi } = getParamSamplingState(id, boundsDescriptor);
  return side === 'low' ? lo : hi;
}

function getGalaxyEarthDistance() {
  return Math.max(0, rawNumber('galaxy-earth-distance', 0));
}

function applyBaseCorrelationModel(sampledInputs, meanInp, correlationModel = 'independent') {
  const s = { ...sampledInputs };
  s.f_magnetosphere = clamp01(s.f_magnetosphere);
  s.f_tilt = clamp01(s.f_tilt);

  if (correlationModel === 'independent') {
    return s;
  }

  s.f_magnetosphere = clamp01(
    s.f_magnetosphere + (s.f_size - meanInp.f_size) * 0.1
  );
  s.f_tilt = clamp01(
    s.f_tilt + (s.f_lunar_stability - meanInp.f_lunar_stability) * 0.2
  );

  return s;
}

function sampleBaseInputs(dist, sampler = null, correlationModel = 'independent', boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const meanInp = getInputsForBoundsDescriptor(boundsDescriptor);
  const draw = id => (sampler ? sampler.sample(id) : sampleParam(id, dist, Math.random, boundsDescriptor));

  const s = {
    N_GHZ: draw('N_GHZ'),
    f_sun_type: draw('f_sun_type'),
    f_sun_age: draw('f_sun_age'),
    N_p_star: draw('N_p_star'),
    f_composition: draw('f_composition'),
    f_orbit: draw('f_orbit'),
    f_stability: draw('f_stability'),
    f_magnetosphere: draw('f_magnetosphere'),
    f_size: draw('f_size'),
    f_lunar_stability: draw('f_lunar_stability'),
    f_rotation: draw('f_rotation'),
    f_tilt: draw('f_tilt'),
    f_H2O: parameterEnabledForBoundsDescriptor('f_H2O', boundsDescriptor) ? draw('f_H2O') : 1,
    f_CHNOPS: parameterEnabledForBoundsDescriptor('f_CHNOPS', boundsDescriptor) ? draw('f_CHNOPS') : 1,
    f_complex_life: parameterEnabledForBoundsDescriptor('f_complex_life', boundsDescriptor)
      ? draw('f_complex_life')
      : 1,
    f_x: parameterEnabledForBoundsDescriptor('f_x', boundsDescriptor) ? draw('f_x') : 1
  };

  return applyBaseCorrelationModel(s, meanInp, correlationModel);
}

function sampleAdvanced(dist, sampler = null, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const s = {};
  const draw = id => (sampler ? sampler.sample(id) : sampleParam(id, dist, Math.random, boundsDescriptor));

  if (ADV.modules.atmRet.enabled) s._f_atm_ret = draw('adv_f_atm_ret');

  if (ADV.modules.volatileSplit.enabled && parameterEnabledForBoundsDescriptor('f_H2O', boundsDescriptor)) {
    s.f_H2O = draw('adv_f_vol_del');
    s.f_H2O_ret = draw('adv_f_wat_ret');
  }

  if (ADV.modules.longterm.enabled) {
    s._f_tect = draw('adv_f_tect');
    s._f_radio = draw('adv_f_radio');
    s._f_clim = draw('adv_f_clim');
  }

  if (ADV.modules.spaceWeather.enabled) s._f_xuv_quiet = draw('adv_f_xuv');
  if (ADV.modules.prebioticUV.enabled) s._f_uv = draw('adv_f_uv');
  if (ADV.modules.binary.enabled) s._f_binary = draw('adv_f_binary');
  if (ADV.modules.radiation.enabled) s._f_rad = draw('adv_f_rad');
  if (ADV.modules.radiusValley.enabled) s.f_composition = draw('adv_P_rocky');

  return s;
}

function buildEnvelopeBaseInputs(side, correlationModel = 'independent', boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const meanInp = getInputsForBoundsDescriptor(boundsDescriptor);
  const draw = id => getParamBoundValue(id, side, boundsDescriptor);

  const s = {
    N_GHZ: draw('N_GHZ'),
    f_sun_type: draw('f_sun_type'),
    f_sun_age: draw('f_sun_age'),
    N_p_star: draw('N_p_star'),
    f_composition: draw('f_composition'),
    f_orbit: draw('f_orbit'),
    f_stability: draw('f_stability'),
    f_magnetosphere: draw('f_magnetosphere'),
    f_size: draw('f_size'),
    f_lunar_stability: draw('f_lunar_stability'),
    f_rotation: draw('f_rotation'),
    f_tilt: draw('f_tilt'),
    f_H2O: parameterEnabledForBoundsDescriptor('f_H2O', boundsDescriptor) ? draw('f_H2O') : 1,
    f_CHNOPS: parameterEnabledForBoundsDescriptor('f_CHNOPS', boundsDescriptor) ? draw('f_CHNOPS') : 1,
    f_complex_life: parameterEnabledForBoundsDescriptor('f_complex_life', boundsDescriptor) ? draw('f_complex_life') : 1,
    f_x: parameterEnabledForBoundsDescriptor('f_x', boundsDescriptor) ? draw('f_x') : 1
  };

  return applyBaseCorrelationModel(s, meanInp, correlationModel);
}

function buildEnvelopeAdvancedInputs(side, boundsDescriptor = getMonteCarloBoundsDescriptor()) {
  const draw = id => getParamBoundValue(id, side, boundsDescriptor);
  const s = {};

  if (ADV.modules.atmRet.enabled) s._f_atm_ret = draw('adv_f_atm_ret');

  if (ADV.modules.volatileSplit.enabled && parameterEnabledForBoundsDescriptor('f_H2O', boundsDescriptor)) {
    s.f_H2O = draw('adv_f_vol_del');
    s.f_H2O_ret = draw('adv_f_wat_ret');
  }

  if (ADV.modules.longterm.enabled) {
    s._f_tect = draw('adv_f_tect');
    s._f_radio = draw('adv_f_radio');
    s._f_clim = draw('adv_f_clim');
  }

  if (ADV.modules.spaceWeather.enabled) s._f_xuv_quiet = draw('adv_f_xuv');
  if (ADV.modules.prebioticUV.enabled) s._f_uv = draw('adv_f_uv');
  if (ADV.modules.binary.enabled) s._f_binary = draw('adv_f_binary');
  if (ADV.modules.radiation.enabled) s._f_rad = draw('adv_f_rad');
  if (ADV.modules.radiusValley.enabled) s.f_composition = draw('adv_P_rocky');

  return s;
}

function computeSimulationEnvelope(options = getSimulationOptions()) {
  const descriptor = getMonteCarloBoundsDescriptor(options);
  const lowBase = buildEnvelopeBaseInputs('low', options.correlation, descriptor);
  const highBase = buildEnvelopeBaseInputs('high', options.correlation, descriptor);
  const lowAdv = buildEnvelopeAdvancedInputs('low', descriptor);
  const highAdv = buildEnvelopeAdvancedInputs('high', descriptor);

  const low = computePlanetsAdvanced(applyAdvancedModules(lowBase, lowAdv));
  const high = computePlanetsAdvanced(applyAdvancedModules(highBase, highAdv));

  return {
    low: Math.min(low, high),
    high: Math.max(low, high)
  };
}

function getHostChannelFractions() {
  let fG = clamp01(pf('adv_f_G'));
  let fK = clamp01(pf('adv_f_K'));
  let fM = clamp01(pf('adv_f_M'));

  const sum = fG + fK + fM;

  
  if (sum > 1 && sum > 0) {
    fG /= sum;
    fK /= sum;
    fM /= sum;
  }

  return { fG, fK, fM };
}

function computeHostChannels(omitMLock = false) {
  const { fG, fK, fM } = getHostChannelFractions();

  const sG = clamp(pf('adv_w_G_hz') * pf('adv_w_G_act'), 0, 1);
  const sK = clamp(pf('adv_w_K_hz') * pf('adv_w_K_act'), 0, 1);
  const sM = clamp(
    pf('adv_w_M_hz') * pf('adv_w_M_act') * (omitMLock ? 1 : pf('adv_w_M_lock')),
    0,
    1
  );

  return {
    G: fG * sG,
    K: fK * sK,
    M: fM * sM,
    total: clamp01(fG * sG + fK * sK + fM * sM),
    fractions: { fG, fK, fM }
  };
}

function computeRadialGHZDetails(sampled = null) {
  const Ntot = Math.max(0, sampled?.adv_N_total_stars ?? pf('adv_N_total_stars'));
  const Rd = Math.max(0.1, sampled?.adv_scale_length ?? pf('adv_scale_length'));
  let Rinner = Math.max(0, sampled?.adv_ghz_inner ?? pf('adv_ghz_inner'));
  let Router = Math.max(0, sampled?.adv_ghz_outer ?? pf('adv_ghz_outer'));
  const metThresh = sampled?.adv_met_thresh ?? pf('adv_met_thresh');
  const bins = Math.max(20, Math.floor(sampled?.adv_radial_bins ?? pf('adv_radial_bins')));

  if (Rinner > Router) [Rinner, Router] = [Router, Rinner];

  const Rmax = Math.max(20, Router + 5 * Rd);
  const dr = Rmax / bins;

  let normSum = 0;
  for (let i = 0; i < bins; i++) {
    const R = (i + 0.5) * dr;
    normSum += Math.exp(-R / Rd) * 2 * Math.PI * R * dr;
  }

  let N_GHZ_calc = 0;
  for (let i = 0; i < bins; i++) {
    const R = (i + 0.5) * dr;
    if (R < Rinner || R > Router) continue;

    const annulusWeight = Math.exp(-R / Rd) * 2 * Math.PI * R * dr;
    const starsInRing = normSum > 0 ? (Ntot * annulusWeight) / normSum : 0;

    
    const feH = 0.5 - 0.07 * R;
    if (feH < metThresh) continue;

    const snSurvival = 1 / (1 + Math.exp(-0.8 * (R - 4)));
    N_GHZ_calc += starsInRing * snSurvival;
  }

  return {
    N_GHZ: Math.round(Math.min(Ntot, Math.max(0, N_GHZ_calc))),
    innerKpc: Rinner,
    outerKpc: Router,
    N_total: Ntot
  };
}

function applyAdvancedModules(baseInputs, sampledAdv = {}) {
  if (!ADV.enabled) return { ...baseInputs };

  const inp = { ...baseInputs };

  const getAdv = (key, id, kind = 'number') => {
    const v = sampledAdv[key];
    if (Number.isFinite(v)) return v;
    if (kind === 'probability') return sanitizeProbabilityInput(id);
    if (kind === 'positive') return sanitizePositiveInput(id);
    return pf(id);
  };

  if (ADV.modules.hostChannels.enabled) {
    const ch = computeHostChannels(ADV.modules.spinObliquity.enabled);
    inp.f_sun_type = ch.total;
  }

  if (ADV.modules.atmRet.enabled) {
    inp._f_atm_ret = clamp01(getAdv('_f_atm_ret', 'adv_f_atm_ret', 'probability'));
  }

  if (ADV.modules.volatileSplit.enabled) {
    if (isH2OEnabled) {
      const delivery = clamp01(getAdv('f_H2O', 'adv_f_vol_del', 'probability'));
      const retention = clamp01(getAdv('f_H2O_ret', 'adv_f_wat_ret', 'probability'));
      inp.f_H2O = delivery * retention;
    } else {
      inp.f_H2O = 1;
    }
  }

  if (ADV.modules.longterm.enabled) {
    const tect = clamp01(getAdv('_f_tect', 'adv_f_tect', 'probability'));
    const radio = clamp01(getAdv('_f_radio', 'adv_f_radio', 'probability'));
    const clim = clamp01(getAdv('_f_clim', 'adv_f_clim', 'probability'));
    inp._f_longterm = tect * radio * clim;
  }

  if (ADV.modules.spinObliquity.enabled) {
    let fSpin = clamp01(pf('adv_f_spin_G'));

    if (ADV.modules.hostChannels.enabled) {
      const { fractions } = computeHostChannels(true);
      const denom = Math.max(1e-12, fractions.fG + fractions.fK + fractions.fM);

      fSpin =
        (fractions.fG * clamp01(pf('adv_f_spin_G')) +
          fractions.fK * clamp01(pf('adv_f_spin_K')) +
          fractions.fM * clamp01(pf('adv_f_spin_M'))) /
        denom;
    }

    const moon = clamp01(inp.f_lunar_stability || 0);
    const moonBoost = Math.max(1, pf('adv_moon_boost'));
    const boosted = clamp01(fSpin * (1 + (moonBoost - 1) * moon));

    
    inp.f_rotation = 1;
    inp.f_tilt = boosted;
    inp.f_lunar_stability = 1;
  }

  if (ADV.modules.radiusValley.enabled) {
    inp.f_composition = clamp01(getAdv('f_composition', 'adv_P_rocky', 'probability'));
    inp.f_size = 1;
  }

  if (ADV.modules.radialGHZ.enabled) {
    inp.N_GHZ = computeRadialGHZDetails().N_GHZ;
  }

  if (ADV.modules.spaceWeather.enabled) {
    inp._f_xuv_quiet = clamp01(getAdv('_f_xuv_quiet', 'adv_f_xuv', 'probability'));
  }

  if (ADV.modules.prebioticUV.enabled) {
    inp._f_uv = clamp01(getAdv('_f_uv', 'adv_f_uv', 'probability'));
  }

  if (ADV.modules.binary.enabled) {
    inp._f_binary = clamp01(getAdv('_f_binary', 'adv_f_binary', 'probability'));
  }

  if (ADV.modules.radiation.enabled) {
    inp._f_rad = clamp01(getAdv('_f_rad', 'adv_f_rad', 'probability'));
  }

  return inp;
}

const KPC_TO_LY = 3261.56;

const GHZ_INNER_FRAC = 0.26;
const GHZ_OUTER_FRAC = 0.85;

function getGHZGeometryLy() {
  const thickness = isGalaxySettingsEnabled ? Math.max(1, pf('galaxy-thickness')) : 1000;

  let innerLy, outerLy;

  if (ADV.enabled && ADV.modules.radialGHZ.enabled) {
    const ghz = computeRadialGHZDetails();
    innerLy = ghz.innerKpc * KPC_TO_LY;
    outerLy = ghz.outerKpc * KPC_TO_LY;
  } else {
    let diameter;
    if (isGalaxySettingsEnabled) {
      diameter = Math.max(1000, pf('galaxy-diameter'));
      
      if (diameter === 100000 && galaxyName !== 'Milky Way (MW)' && galaxyName !== 'Custom Galaxy X') {
        const matchedPreset = Object.values(GALAXY_PRESET_MAP).find(p => p.name === galaxyName);
        if (matchedPreset && matchedPreset.d) diameter = Math.max(1000, matchedPreset.d);
      }
    } else {
      diameter = 100000;
    }
    const radius = diameter / 2;


    innerLy = GHZ_INNER_FRAC * radius;
    outerLy = GHZ_OUTER_FRAC * radius;
  }

  innerLy = Math.max(0, innerLy);
  outerLy = Math.max(innerLy + 1, outerLy);

  const area = Math.PI * (outerLy * outerLy - innerLy * innerLy);
  const volumeDisk = area * thickness;
  const volumeSphere =
    (4 / 3) * Math.PI * (Math.pow(outerLy, 3) - Math.pow(innerLy, 3));

  return {
    innerLy,
    outerLy,
    thickness,
    area,
    volumeDisk,
    volumeSphere
  };
}

function gamma(x) {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;

  let a = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) a += p[i] / (x + i + 1);

  const t = x + p.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

function E_from(lambda, d) {
  if (!Number.isFinite(lambda) || lambda <= 0) return Infinity;
  const vd = d === 2 ? Math.PI : (4 * Math.PI) / 3;
  return gamma(1 + 1 / d) / Math.pow(lambda * vd, 1 / d);
}

function radialGHZWeight(R, Rd, metThresh) {
  const feH = 0.5 - 0.07 * R;
  if (feH < metThresh) return 0;
  const snSurvival = 1 / (1 + Math.exp(-0.8 * (R - 4)));
  return Math.exp(-R / Rd) * snSurvival;
}

function buildRadialGHZDensityProfile() {
  const Rd = Math.max(0.1, pf('adv_scale_length', 2.6));
  let Rinner = Math.max(0, pf('adv_ghz_inner', 4.0));
  let Router = Math.max(0, pf('adv_ghz_outer', 13.0));
  const metThresh = pf('adv_met_thresh', -1.0);
  const R0 = Math.max(0.1, pf('adv_temporal_R', 8.0));
  const bins = Math.max(120, Math.floor(pf('adv_radial_bins', 100) * 2));

  if (Rinner > Router) [Rinner, Router] = [Router, Rinner];

  const Rmax = Math.max(20, Router + 5 * Rd);
  const dr = Rmax / bins;
  const rings = [];
  let totalWeight = 0;

  for (let i = 0; i < bins; i++) {
    const R = (i + 0.5) * dr;
    if (R < Rinner || R > Router) continue;

    const radialWeight = radialGHZWeight(R, Rd, metThresh);
    if (radialWeight <= 0) continue;

    const annulusWeight = radialWeight * 2 * Math.PI * R * dr;
    rings.push({ R, weight: annulusWeight });
    totalWeight += annulusWeight;
  }

  if (totalWeight <= 0 || !rings.length) return null;

  return {
    rings,
    totalWeight,
    R0,
    Rinner,
    Router,
    Rd,
    metThresh,
    Rmax,
    dr,
    localWeight: R0 >= Rinner && R0 <= Router ? radialGHZWeight(R0, Rd, metThresh) : 0
  };
}

function ringFractionInsideObserverCircle(R, R0, d) {
  if (d <= 0) return 0;
  if (R0 <= 1e-9) return R <= d ? 1 : 0;
  if (R <= 1e-9) return d >= R0 ? 1 : 0;
  if (d >= R + R0) return 1;
  if (d <= Math.abs(R - R0)) return 0;

  const cosTheta = clamp((R * R + R0 * R0 - d * d) / (2 * R * R0), -1, 1);
  return Math.acos(cosTheta) / Math.PI;
}

function radialMeanWithinDistance(count, profile, dKpc) {
  if (!profile || count <= 0 || dKpc <= 0) return 0;

  if (profile.localWeight > 0 && dKpc <= profile.dr) {
    return count * Math.min(profile.totalWeight, profile.localWeight * Math.PI * dKpc * dKpc) / profile.totalWeight;
  }

  let coveredWeight = 0;
  for (const ring of profile.rings) {
    coveredWeight += ring.weight * ringFractionInsideObserverCircle(ring.R, profile.R0, dKpc);
  }

  return count * coveredWeight / profile.totalWeight;
}

function expectedRadialNearestDistanceLy(count) {
  if (!Number.isFinite(count) || count <= 0) return Infinity;

  const profile = buildRadialGHZDensityProfile();
  if (!profile) return Infinity;

  const maxDistanceKpc = Math.max(0.1, profile.R0 + profile.Router);
  const steps = 1800;
  const minDistanceKpc = 1e-9;
  let integralKpc = 0;
  let prevSurvival = 1;
  let prevD = 0;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const d = minDistanceKpc * Math.pow(maxDistanceKpc / minDistanceKpc, t);
    const lambda = radialMeanWithinDistance(count, profile, d);
    const survival = Math.exp(-Math.max(0, lambda));
    const dd = d - prevD;
    integralKpc += 0.5 * (prevSurvival + survival) * dd;
    prevSurvival = survival;
    prevD = d;
  }

  return integralKpc * KPC_TO_LY;
}

function buildRadialDistanceModel(count, ciLowCount = null, ciHighCount = null) {
  const profile = buildRadialGHZDensityProfile();
  if (!profile || !Number.isFinite(count) || count <= 0) return null;

  const hasCi = Number.isFinite(ciLowCount) && Number.isFinite(ciHighCount);

  return {
    htmlLabel: 'RADIAL GHZ DENSITY',
    modelLabel: 'radial GHZ density',
    isRadial: true,
    distance: expectedRadialNearestDistanceLy(count),
    ciLow: hasCi ? expectedRadialNearestDistanceLy(ciHighCount) : null,
    ciHigh: hasCi ? expectedRadialNearestDistanceLy(ciLowCount) : null,
    geometryLabel: 'nonuniform GHZ intensity',
    geometryValue: profile.totalWeight,
    densityValue: count / profile.totalWeight,
    densityUnits: 'weighted kpc<sup>-2</sup>',
    densityFormula: '&Lambda;(r) = integral over the observer-centred circle of lambda(R)dA',
    distanceFormula: 'E[D] = integral_0^infinity exp[-Lambda(r)] dr',
    rSunKpc: profile.R0,
    innerKpc: profile.Rinner,
    outerKpc: profile.Router,
    scaleLengthKpc: profile.Rd
  };
}

function calculateDeterministic() {
  const inp = getInputs();
  const advInp = applyAdvancedModules(inp);
  renderConfigurationWarnings();
  const N = computePlanetsAdvanced(advInp);

  invalidateResults(false, false);
  deterministicPlanets = N;
  hasDeterministicCalculation = true;

  byId('deterministicResult').innerHTML =
    `<span class="result-label">DETERMINISTIC ·</span> ${fmtN(N)} modelled Earth-like candidates in ${galaxyName}${lifeLabel()}`;
  if (byId('whereAreTheyBtn')) byId('whereAreTheyBtn').disabled = false;
  renderResultRealityCheck();
  renderCalculationConsole();
  updateShareButtons();
}

function resolveMonteCarloIterations(options = {}) {
  if (Number.isFinite(Number(options.samples))) {
    return Math.max(1, Math.floor(Number(options.samples)));
  }
  return clamp(parseInt((byId('iterations') || {}).value || '2000', 10), 1000, 20000);
}

function getMonteCarloOptions(options = {}) {
  const domOptions = getSimulationOptions();
  return {
    engine: (options.engine || domOptions.engine || 'standard').toLowerCase(),
    correlation: (options.correlation || domOptions.correlation || 'independent').toLowerCase(),
    robustBounds: Object.prototype.hasOwnProperty.call(options, 'robustBounds')
      ? !!options.robustBounds
      : !!domOptions.robustBounds,
    mcMode: Object.prototype.hasOwnProperty.call(options, 'mcMode')
      ? options.mcMode
      : domOptions.mcMode
  };
}

const MC_MEDIAN_DIVERGENCE_LOG10_THRESHOLD = 1;

function buildMonteCarloIntervalComparison(
  deterministicValue,
  p025,
  p975,
  boundsDescriptor = getMonteCarloBoundsDescriptor(),
  p500 = null
) {
  const finite =
    Number.isFinite(deterministicValue) &&
    Number.isFinite(p025) &&
    Number.isFinite(p975);

  const tolerance = finite
    ? Math.max(1e-12, Math.abs(deterministicValue) * 1e-12, Math.abs(p975 - p025) * 1e-12)
    : 0;
  const below = finite && deterministicValue < p025 - tolerance;
  const above = finite && deterministicValue > p975 + tolerance;
  const outside = below || above;
  const finiteMedian = Number.isFinite(p500);
  const tiny = 1e-300;
  const medianLog10Delta =
    finite && finiteMedian
      ? Math.abs(Math.log10(Math.max(Math.abs(deterministicValue), tiny)) - Math.log10(Math.max(Math.abs(p500), tiny)))
      : 0;
  const medianDiverges = finite && finiteMedian && medianLog10Delta > MC_MEDIAN_DIVERGENCE_LOG10_THRESHOLD;
  const warnings = [];

  if (outside) {
    warnings.push('The deterministic scenario point lies outside the sampled Monte Carlo interval. This indicates that the selected scenario is near the edge of the configured uncertainty bounds, or that Monte Carlo is sampling a broader global envelope rather than a local uncertainty range around this preset.');
  }

  if (medianDiverges) {
    const basisNote =
      boundsDescriptor.mode === MONTE_CARLO_BASIS_MODES.presetLocal
        ? 'This should be investigated because preset-local uncertainty is expected to remain centered on the selected scenario.'
        : 'Treat this as broad exploratory/global-envelope sampling unless the scenario and sampling bounds are deliberately aligned.';
    warnings.push(
      `The deterministic central result and Monte Carlo q50 median differ by ${medianLog10Delta.toFixed(2)} log10 units. ${basisNote}`
    );
  }

  return {
    deterministic: deterministicValue,
    p025,
    p500,
    p975,
    below,
    above,
    outside,
    medianLog10Delta,
    medianDiverges,
    medianDivergenceLog10Threshold: MC_MEDIAN_DIVERGENCE_LOG10_THRESHOLD,
    boundsMode: boundsDescriptor.mode,
    boundsLabel: boundsDescriptor.label,
    warning: warnings.join(' ')
  };
}

function runMonteCarloSimulation(options = {}) {
  const iterations = resolveMonteCarloIterations(options);
  const dist = (options.distribution || (byId('distribution') || {}).value || 'lognormal').toLowerCase();
  const simulationOptions = options.simulationOptions || getMonteCarloOptions(options);
  const boundsDescriptor = options.boundsDescriptor || getMonteCarloBoundsDescriptor(simulationOptions);
  const rng = resolveRng(options);
  clearBoundIntervalWarnings();
  const deterministicInputs = getInputsForBoundsDescriptor(boundsDescriptor);
  const deterministicAtRun = computePlanetsAdvanced(applyAdvancedModules(deterministicInputs));
  const initialValidationWarnings = getInputValidationWarnings();
  const sampler = createParameterSampler(simulationOptions.engine, dist, iterations, rng, boundsDescriptor);

  const sensKeys = [
    'N_GHZ',
    'f_sun_type',
    'f_sun_age',
    'N_p_star',
    'f_composition',
    'f_orbit',
    'f_stability',
    'f_magnetosphere',
    'f_lunar_stability',
    'f_size',
    'f_rotation',
    'f_tilt',
    'f_H2O',
    'f_CHNOPS',
    'f_complex_life',
    'f_x',
    '_f_atm_ret',
    '_f_longterm',
    '_f_xuv_quiet',
    '_f_uv',
    '_f_binary',
    '_f_rad'
  ];

  if (ADV.enabled && ADV.modules.sensitivity.enabled && typeof SENS !== 'undefined') {
    SENS.init(sensKeys);
  }

  const results = [];
  const sampleYields = [];
  const sampledStarCounts = [];
  const checkpoints = [];
  let runningSum = 0;
  const checkpointEvery = Math.max(25, Math.ceil(iterations / 40));

  for (let i = 0; i < iterations; i++) {
    sampler.startIteration(i);
    const baseS = sampleBaseInputs(dist, sampler, simulationOptions.correlation, boundsDescriptor);
    const advS = sampleAdvanced(dist, sampler, boundsDescriptor);
    const full = applyAdvancedModules(baseS, advS);
    const N = computePlanetsAdvanced(full);

    if (Number.isFinite(N) && N >= 0) {
      results.push(N);
      runningSum += N;

      const sampledStars = Number.isFinite(full.N_GHZ) ? Math.max(0, full.N_GHZ) : 0;
      if (sampledStars > 0) {
        sampledStarCounts.push(sampledStars);
        sampleYields.push(N / sampledStars);
      }

      const n = results.length;
      if (n === 1 || n % checkpointEvery === 0) {
        checkpoints.push({ n, mean: runningSum / n });
      }

      if (ADV.enabled && ADV.modules.sensitivity.enabled && typeof SENS !== 'undefined') {
        const sensRecord = {
          N_GHZ: full.N_GHZ,
          f_sun_type: full.f_sun_type,
          f_sun_age: full.f_sun_age,
          N_p_star: full.N_p_star,
          f_composition: full.f_composition,
          f_orbit: full.f_orbit,
          f_stability: full.f_stability,
          f_magnetosphere: full.f_magnetosphere,
          f_lunar_stability: full.f_lunar_stability,
          f_size: full.f_size,
          f_rotation: full.f_rotation,
          f_tilt: full.f_tilt,
          f_H2O: full.f_H2O,
          f_CHNOPS: full.f_CHNOPS,
          f_complex_life: full.f_complex_life,
          f_x: full.f_x,
          _f_atm_ret: full._f_atm_ret ?? 1,
          _f_longterm: full._f_longterm ?? 1,
          _f_xuv_quiet: full._f_xuv_quiet ?? 1,
          _f_uv: full._f_uv ?? 1,
          _f_binary: full._f_binary ?? 1,
          _f_rad: full._f_rad ?? 1
        };
        SENS.record(sensRecord, N);
      }
    }
  }

  if (results.length && (!checkpoints.length || checkpoints[checkpoints.length - 1].n !== results.length)) {
    checkpoints.push({ n: results.length, mean: runningSum / results.length });
  }

  if (initialValidationWarnings.length) {
    inputValidationWarnings = initialValidationWarnings.slice();
  }

  results.sort((a, b) => a - b);

  const mcMean = mean(results);
  const p025 = percentile(results, 0.025);
  const p500 = percentile(results, 0.500);
  const p975 = percentile(results, 0.975);
  const mcStdDev = stdev(results, mcMean);
  const canUseLog = currentScale === 'log' && results.every(v => v > 0);
  const modeEstimate = typeof getModeEstimate === 'function'
    ? getModeEstimate(results, canUseLog)
    : 0;
  const convergence = summarizeConvergence(checkpoints, mcMean);
  const envelope = simulationOptions.robustBounds
    ? computeSimulationEnvelope(simulationOptions)
    : null;
  const yieldStats = summarizePerStarYields(sampleYields);
  const intervalComparison = buildMonteCarloIntervalComparison(
    deterministicAtRun,
    p025,
    p975,
    boundsDescriptor,
    p500
  );

  return {
    n: results.length,
    requestedSamples: iterations,
    results,
    mean: mcMean,
    median: p500,
    p025,
    p500,
    p975,
    stdDev: mcStdDev,
    mode: modeEstimate,
    checkpoints,
    convergence,
    envelope,
    sampledN_GHZ: sampledStarCounts,
    yieldSamples: sampleYields,
    yieldStats,
    deterministic: deterministicAtRun,
    intervalComparison,
    boundsMode: boundsDescriptor.mode,
    boundsLabel: boundsDescriptor.label,
    uncertaintyBasisLabel: boundsDescriptor.uncertaintyBasisLabel,
    distribution: dist,
    simulationOptions,
    seed: Object.prototype.hasOwnProperty.call(options, 'seed') ? options.seed : null
  };
}

function applyMonteCarloSummary(summary) {
  if (typeof renderConfigurationWarnings === 'function') renderConfigurationWarnings();

  if (!summary.results.length) {
    lastSampleYields = [];
    monteCarloYieldStats = null;
    convergenceSummary = null;
    simulationEnvelope = null;
    monteCarloBoundsMode = '';
    monteCarloBoundsLabel = '';
    monteCarloUncertaintyBasisLabel = '';
    monteCarloIntervalComparison = null;
    if (typeof renderConvergenceSummary === 'function') renderConvergenceSummary();
    if (typeof renderSimulationMethodSummary === 'function') renderSimulationMethodSummary();
    if (typeof updateShareButtons === 'function') updateShareButtons();
    return;
  }

  lastResults = summary.results.slice();
  lastSampleYields = Array.isArray(summary.yieldSamples) ? summary.yieldSamples.slice() : [];
  monteCarloYieldStats = summary.yieldStats || null;
  mcMedianQ50 = Number.isFinite(summary.median) ? summary.median : summary.mean;
  mcArithmeticMean = summary.mean;
  mcQ025 = summary.p025;
  mcQ975 = summary.p975;
  stdDev = summary.stdDev;
  mostFrequent = summary.mode;
  convergenceSummary = summary.convergence;
  simulationEnvelope = summary.envelope;
  monteCarloBoundsMode = summary.boundsMode || '';
  monteCarloBoundsLabel = summary.boundsLabel || '';
  monteCarloUncertaintyBasisLabel = summary.uncertaintyBasisLabel || '';
  monteCarloIntervalComparison = summary.intervalComparison || null;

  if (byId('monteCarloResult')) {
    byId('monteCarloResult').innerHTML =
      `<span class="result-label">MONTE CARLO Q50 MEDIAN ·</span> ${fmtN(mcMedianQ50)} modelled Earth-like candidates in ${galaxyName}${lifeLabel()} <span style="font-size:10px;color:var(--text-dim)">(sample median; methodological primary)</span>`;
  }

  if (byId('monteCarloMedian')) {
    byId('monteCarloMedian').innerHTML =
      `<span class="result-label">MC ARITHMETIC MEAN ·</span> ${fmtN(mcArithmeticMean)} modelled Earth-like candidates in ${galaxyName}${lifeLabel()} <span style="font-size:10px;color:var(--text-dim)">(reference only; drifts above median for multiplicative chains due to Jensen's inequality)</span>`;
  }

  if (byId('stats')) {
    byId('stats').innerHTML =
      `<span class="result-label">95% SAMPLED MODEL INTERVAL ·</span> [${fmtN(mcQ025)}, ${fmtN(mcQ975)}] <span style="font-size:10px;color:var(--text-dim)">(q2.5–q97.5; not an observational confidence interval)</span>`;
  }

  if (typeof renderResultRealityCheck === 'function') renderResultRealityCheck();
  if (byId('distance')) byId('distance').textContent = '';
  if (byId('whereAreTheyBtn')) byId('whereAreTheyBtn').disabled = false;
  if (typeof rebuildCharts === 'function') rebuildCharts(summary.results);
  if (typeof renderConvergenceSummary === 'function') renderConvergenceSummary();
  simulationCompleted = true;
  monteCarloState = 'current';
  if (typeof renderSimulationMethodSummary === 'function') renderSimulationMethodSummary();

  if (ADV.enabled && ADV.modules.sensitivity.enabled && typeof SENS !== 'undefined') SENS.render('adv-tornado-container');
  if (ADV.enabled && ADV.modules.ard.enabled && typeof computeARD === 'function') computeARD();
  if (ADV.enabled && ADV.modules.temporal.enabled && typeof computeTemporal === 'function') computeTemporal();

  if (typeof renderTemporalNtPanel === 'function') renderTemporalNtPanel();
  if (typeof renderDetectionPanel === 'function') renderDetectionPanel();

  if (typeof renderCalculationConsole === 'function') renderCalculationConsole();
  if (typeof updateShareButtons === 'function') updateShareButtons();
}

function monteCarloCalculate(options = {}) {
  const hasProgrammaticOptions = !!options && Object.keys(options).length > 0;
  const simulationOptions = getMonteCarloOptions(options);
  const boundsDescriptor = getMonteCarloBoundsDescriptor(simulationOptions);
  const loading = byId('loading');
  if (typeof renderConfigurationWarnings === 'function') renderConfigurationWarnings();

  // Gate: never run Monte Carlo when a parameter sampled from its visible bounds
  // has inconsistent bounds (min > max, or central outside [min, max]). Blocking
  // here means simulationCompleted/mcState stay not-run/stale and no invalid MC
  // values are produced or exported. Deterministic output is left untouched.
  const blockingErrors = getMonteCarloBoundsBlockingErrors(boundsDescriptor);
  if (blockingErrors.length) {
    if (loading) loading.style.display = 'none';
    if (typeof renderConfigurationWarnings === 'function') renderConfigurationWarnings();
    if (typeof renderSimulationMethodSummary === 'function') renderSimulationMethodSummary();
    // Deterministic output is still valid — re-enable the distance button so
    // the user is not left with a permanently disabled "Where is Everyone?" button.
    if (hasDeterministicCalculation && byId('whereAreTheyBtn')) byId('whereAreTheyBtn').disabled = false;
    return null;
  }

  if (loading) loading.style.display = 'block';

  const execute = () => {
    const summary = runMonteCarloSimulation({ ...options, simulationOptions, boundsDescriptor });
    if (options.updateUi !== false) applyMonteCarloSummary(summary);
    if (loading) loading.style.display = 'none';
    return summary;
  };

  if (hasProgrammaticOptions) {
    return execute();
  }

  setTimeout(execute, 30);
  return null;
}

function getCurrentDeterministicPlanets() {
  const inp = getInputs();
  const advInp = applyAdvancedModules(inp);
  return computePlanetsAdvanced(advInp);
}

function getDistanceModelSelection() {
  return {
    modelRadial: !!((byId('model-radial') || {}).checked),
    model2d: !!((byId('model-2d') || {}).checked),
    model3dDisk: !!((byId('model-3d-disk') || {}).checked),
    model3dSphere: !!((byId('model-3d-sphere') || {}).checked)
  };
}

function buildDistanceMetrics(count, ciLowCount = null, ciHighCount = null) {
  const geom = getGHZGeometryLy();
  const models = getDistanceModelSelection();
  const hasCi = Number.isFinite(ciLowCount) && Number.isFinite(ciHighCount);

  const metrics = {
    geom,
    modelRadial: null,
    model2d: null,
    model3dDisk: null,
    model3dSphere: null
  };

  if (models.modelRadial) {
    metrics.modelRadial = buildRadialDistanceModel(count, ciLowCount, ciHighCount);
  }

  if (models.model2d) {
    metrics.model2d = {
      htmlLabel: '2D GHZ ANNULUS',
      modelLabel: '2D GHZ annulus',
      distance: E_from(count / geom.area, 2),
      ciLow: hasCi ? E_from(ciHighCount / geom.area, 2) : null,
      ciHigh: hasCi ? E_from(ciLowCount / geom.area, 2) : null,
      geometryLabel: 'A_GHZ',
      geometryValue: geom.area,
      densityValue: count / geom.area,
      densityUnits: 'ly<sup>-2</sup>',
      densityFormula: '&lambda; = N / A_GHZ',
      distanceFormula: 'd = &Gamma;(1 + 1/2) / (&lambda;&pi;)<sup>1/2</sup>'
    };
  }

  if (models.model3dDisk) {
    metrics.model3dDisk = {
      htmlLabel: '3D GHZ DISK',
      modelLabel: '3D GHZ disk',
      distance: E_from(count / geom.volumeDisk, 3),
      ciLow: hasCi ? E_from(ciHighCount / geom.volumeDisk, 3) : null,
      ciHigh: hasCi ? E_from(ciLowCount / geom.volumeDisk, 3) : null,
      geometryLabel: 'V_GHZ,disk',
      geometryValue: geom.volumeDisk,
      densityValue: count / geom.volumeDisk,
      densityUnits: 'ly<sup>-3</sup>',
      densityFormula: '&lambda; = N / V_GHZ,disk',
      distanceFormula: 'd = &Gamma;(1 + 1/3) / (&lambda;4&pi;/3)<sup>1/3</sup>'
    };
  }

  if (models.model3dSphere) {
    metrics.model3dSphere = {
      htmlLabel: '3D GHZ SHELL',
      modelLabel: '3D GHZ shell',
      distance: E_from(count / geom.volumeSphere, 3),
      ciLow: hasCi ? E_from(ciHighCount / geom.volumeSphere, 3) : null,
      ciHigh: hasCi ? E_from(ciLowCount / geom.volumeSphere, 3) : null,
      geometryLabel: 'V_GHZ,shell',
      geometryValue: geom.volumeSphere,
      densityValue: count / geom.volumeSphere,
      densityUnits: 'ly<sup>-3</sup>',
      densityFormula: '&lambda; = N / V_GHZ,shell',
      distanceFormula: 'd = &Gamma;(1 + 1/3) / (&lambda;4&pi;/3)<sup>1/3</sup>',
      noteHtml: ' <em style="font-size:9px;color:var(--text-dim);">(heuristic spherical shell)</em>'
    };
  }

  return metrics;
}

function getFermiReferenceModel(metrics) {
  return metrics.modelRadial || metrics.model3dDisk || metrics.model2d || metrics.model3dSphere || null;
}

function getDistanceScenarioModelLabel(scenario) {
  if (!scenario) return 'not calculated';
  if (scenario.refModel && scenario.refModel.modelLabel) return scenario.refModel.modelLabel;
  if (scenario.kind === 'external') return 'external reference distance';
  if (scenario.kind === 'sparse') return 'sparse expected-count existence probability';
  if (scenario.kind === 'no-model') return 'no active geometric distance model';
  return 'active geometric distance model';
}

function getDistanceScenarioValue(scenario) {
  if (!scenario) return null;
  if (Number.isFinite(scenario.fermiDistance)) return scenario.fermiDistance;
  return null;
}

function getDistanceBasisHtml(scenario, countBasisLabel) {
  const modelLabel = getDistanceScenarioModelLabel(scenario);
  const kindLabel =
    scenario && scenario.kind === 'external'
      ? 'reference distance, not a detected planet distance'
      : scenario && scenario.kind === 'sparse'
        ? 'existence probability; nearest-neighbour distance suppressed'
        : scenario && scenario.kind === 'no-model'
          ? 'no nearest-neighbour distance model active'
          : 'nearest-neighbour distance scale, not a detected planet distance';

  return (
    `<span class="result-label">DISTANCE BASIS ·</span> ${modelLabel}; ` +
    `${countBasisLabel}; ${kindLabel}.<br>`
  );
}

function resetActiveDistanceSnapshot() {
  activeDistanceModel = null;
  activeDistanceBasis = 'not calculated';
  activeDistanceCountBasis = 'not calculated';
  displayedDistanceValue = null;
  displayedDistanceLabel = 'not calculated';
}

function updateActiveDistanceSnapshot(scenario, countBasisLabel) {
  activeDistanceModel = getDistanceScenarioModelLabel(scenario);
  activeDistanceBasis =
    scenario && scenario.kind === 'external'
      ? 'external reference distance'
      : scenario && scenario.kind === 'sparse'
        ? 'existence probability; distance suppressed'
        : scenario && scenario.kind === 'no-model'
          ? 'no active distance model'
          : 'nearest-neighbour distance scale';
  activeDistanceCountBasis = countBasisLabel;
  displayedDistanceValue = getDistanceScenarioValue(scenario);
  displayedDistanceLabel = Number.isFinite(displayedDistanceValue)
    ? `${activeDistanceModel} (${countBasisLabel})`
    : activeDistanceBasis;
}

function getMonteCarloState() {
  if (simulationCompleted) return 'current';
  return monteCarloState === 'stale' ? 'stale' : 'not-run';
}

function getActiveDistanceSnapshot() {
  return {
    activeDistanceModel,
    activeDistanceBasis,
    activeDistanceCountBasis,
    displayedDistanceValue,
    displayedDistanceLabel,
    distanceRadial: Number.isFinite(distanceRadial) ? distanceRadial : null,
    minDistanceRadial: Number.isFinite(minDistanceRadial) ? minDistanceRadial : null,
    maxDistanceRadial: Number.isFinite(maxDistanceRadial) ? maxDistanceRadial : null,
    distance2D: Number.isFinite(distance2D) ? distance2D : null,
    minDistance2D: Number.isFinite(minDistance2D) ? minDistance2D : null,
    maxDistance2D: Number.isFinite(maxDistance2D) ? maxDistance2D : null,
    distance3DDisk: Number.isFinite(distance3DDisk) ? distance3DDisk : null,
    minDistance3DDisk: Number.isFinite(minDistance3DDisk) ? minDistance3DDisk : null,
    maxDistance3DDisk: Number.isFinite(maxDistance3DDisk) ? maxDistance3DDisk : null,
    distance3DSphere: Number.isFinite(distance3DSphere) ? distance3DSphere : null,
    minDistance3DSphere: Number.isFinite(minDistance3DSphere) ? minDistance3DSphere : null,
    maxDistance3DSphere: Number.isFinite(maxDistance3DSphere) ? maxDistance3DSphere : null
  };
}

function buildDistanceScenario(count, ciLowCount = null, ciHighCount = null) {
  const pAtLeastOne = 1 - Math.exp(-Math.max(0, count));

  if (count < 1) {
    return {
      kind: 'sparse',
      html:
        `<span class="result-label">DISTANCE ·</span> Expected count < 1. ` +
        `P(at least one modelled candidate) = <span class="bold-number">${(100 * pAtLeastOne).toFixed(1)}%</span>. ` +
        `Nearest-distance estimate suppressed in this sparse regime.`,
      refModel: null,
      fermiDistance: null,
      metrics: null
    };
  }

  if (galaxyName !== 'Milky Way (MW)' && galaxyName !== 'Custom Galaxy X') {
    const manualEarthDist = getGalaxyEarthDistance();
    const earthDist = manualEarthDist > 0 ? manualEarthDist : galaxyDistances[galaxyName];

    return {
      kind: 'external',
      html:
        earthDist === null
          ? '<span class="result-label">DISTANCE ·</span> Galaxy X · distance from Earth unknown.'
          : `<span class="result-label">DISTANCE ·</span> Foreign galaxy · <span class="bold-number">${fmtN(earthDist)}</span> light years from Earth.`,
      refModel: null,
      fermiDistance: earthDist,
      metrics: null
    };
  }

  if (galaxyName === 'Custom Galaxy X') {
    const customEarthDist = getGalaxyEarthDistance();
    if (customEarthDist > 0) {
      return {
        kind: 'external',
        html:
          `<span class="result-label">DISTANCE ·</span> Custom galaxy reference distance from Earth · ` +
          `<span class="bold-number">${fmtN(customEarthDist)}</span> light years.`,
        refModel: null,
        fermiDistance: customEarthDist,
        metrics: null
      };
    }
  }

  if (allDistanceModelsDisabled()) {
    return {
      kind: 'no-model',
      html:
        '<span class="result-label">DISTANCE ·</span> No geometric distance model selected. Enable at least one distance model to derive a nearest-neighbour estimate.',
      refModel: null,
      fermiDistance: null,
      metrics: null
    };
  }

  const metrics = buildDistanceMetrics(count, ciLowCount, ciHighCount);
  const refModel = getFermiReferenceModel(metrics);

  return {
    kind: 'geometric',
    html: renderDistanceHtml(metrics),
    refModel,
    fermiDistance: refModel ? refModel.distance : null,
    metrics
  };
}

function buildSparseFermiContext(count, options = {}) {
  const mode = options.mode || 'mc';
  const sourceShort = mode === 'dt' ? 'DT Result' : 'MC Result';
  const pAtLeastOne = 1 - Math.exp(-Math.max(0, count));
  const hints = [];

  if (isComplexLifeEnabled) {
    hints.push('raise the complex-life prior');
  }
  if (isXEnabled) {
    hints.push('relax the wildcard filter');
  }
  hints.push('switch to a less restrictive preset');

  const hintText =
    hints.length === 1
      ? hints[0]
      : `${hints.slice(0, -1).join(', ')}, or ${hints[hints.length - 1]}`;

  return {
    mode,
    distLy: null,
    html:
      `<strong>${sourceShort} · no stable nearest-neighbour estimate in this sparse regime</strong><br><br>` +
      `➤ The expected count under the current filters is below <strong>1</strong>, so the script does not show a nearest-distance estimate here.<br><br>` +
      `➤ Instead, the most meaningful summary is the existence probability: <strong>${(100 * pAtLeastOne).toFixed(1)}%</strong> for at least one such world in ${galaxyName}.<br><br>` +
      `➤ In plain terms: this scenario is so restrictive that the calculator often ends up with <strong>no such planet at all</strong> in the modelled galaxy.<br><br>` +
      `➤ Try different settings: ${hintText}.`
  };
}

function buildFermiContext(distLy, refModel = null, options = {}) {
  const count = Math.max(0, options.count ?? mcMedianQ50);
  const mode = options.mode || 'mc';
  const detection = simulationCompleted ? computeDetectionFilter(count) : null;

  if (count < 1) {
    return buildSparseFermiContext(count, options);
  }

  if (!Number.isFinite(distLy) || distLy <= 0) {
    return null;
  }

  const signalTime = distLy;
  const roundTrip = distLy * 2;
  const sourceShort = mode === 'dt' ? 'DT Result' : 'MC Result';

  const star = getNearestStar(distLy);
  const starDiff = Math.abs(distLy - star.d);

  const starNameHtml = `<strong>${star.name}</strong>`;
  const starCatalogHtml = star.catalogLink
    ? ` <a href="${star.catalogLink}" target="_blank" rel="noopener noreferrer" style="color:var(--text-bright);text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.24);font-weight:700;">${star.catalogLabel || "Check star in catalogue"} ↗</a>`
    : '';

  const nearThreshold = Math.max(12, distLy * 0.12);
  const moderateThreshold = Math.max(40, distLy * 0.28);

  let starCtx = '';
  if (starDiff <= nearThreshold) {
    starCtx =
      `roughly the same distance as ${starNameHtml} (${fmtN(star.d)} ly, ` +
      `${star.note}.${starCatalogHtml}`;
  } else if (starDiff <= moderateThreshold) {
    starCtx =
      `${distLy >= star.d ? 'somewhat farther out than' : 'somewhat closer than'} ` +
      `${starNameHtml} (${fmtN(star.d)} ly, ${star.note}.${starCatalogHtml}`;
  } else {
    starCtx =
      `the nearest reference object in this catalogue is ${starNameHtml} (${fmtN(star.d)} ly, ` +
      `${star.note}.${starCatalogHtml}`;
  }

  const hist = getHistoricalContext(signalTime);
  let tension = 'low';
  if (distLy <= 1000) tension = 'very high';
  else if (distLy <= 10000) tension = 'high';
  else if (distLy <= 50000) tension = 'moderate';

  const earthRadioBubbleLy = 110;
  const radioBubbleText =
    `➤ Human radio leakage has only filled roughly <strong>${earthRadioBubbleLy}</strong> light years so far 〰 far smaller than many modelled communication distance scales.<br><br>`;

  const fmtSetiWait = y => {
    if (y >= 1e9) return fmtN(y / 1e9) + ' billion years';
    if (y >= 1e6) return fmtN(y / 1e6) + ' million years';
    if (y >= 1000) return fmtN(y / 1000) + ' thousand years';
    return fmtN(y) + ' years';
  };

  let setiDetectabilityText = '';
  if (detection) {
    const setiItemStyle = 'style="padding:7px 8px;border-left:2px solid rgba(78,204,163,0.48);background:rgba(255,255,255,0.018);font-size:10px;line-height:1.6;"';
    let waitItem =
      `<div ${setiItemStyle}><strong>Temporal Poisson view · time to first signal</strong><br>` +
      `Unavailable because the expected active detectable count is zero in the current calculator state.<br>` +
      `<span class="fermi-subnote">This waiting time is a temporal Poisson expectation, not a light-travel distance and not a distance to a source.</span></div>`;

    if (detection.N_det > 0 && detection.L > 0) {
      const waitMean = detection.L / detection.N_det;
      const waitMedian = Math.LN2 * waitMean;
      const ratePerYear = detection.N_det / detection.L;
      const ratePer1Myr = 1e6 / waitMean;
      waitItem =
        `<div ${setiItemStyle}><strong>Temporal Poisson view · time to first signal</strong><br>` +
        `Mean waiting time: <span class="bold-number">${fmtSetiWait(waitMean)}</span><br>` +
        `Median waiting time: <span class="bold-number">${fmtSetiWait(waitMedian)}</span><br>` +
        `<div class="fermi-subnote" style="margin-top:4px;">` +
        `Formula: E[wait] = L / λ<sub>det</sub> = ${fmtN(detection.L)} / ${fmtN(detection.N_det)} ~ <strong>${fmtSetiWait(waitMean)}</strong>.<br>` +
        `λ<sub>det</sub> = expected active detectable transmitters within the current horizon right now.<br>` +
        `μ = λ<sub>det</sub> / L = expected detectable-signal arrival rate per year ~ ${fmtN(ratePerYear)} yr<sup>-1</sup> ` +
        `(${ratePer1Myr < 0.001 ? fmtN(ratePer1Myr) : ratePer1Myr.toFixed(4)} per million years of listening).` +
        `</div>` +
        `<div class="fermi-subnote" style="margin-top:4px;">This waiting time is a temporal Poisson expectation, not a light-travel distance and not a distance to a source.</div></div>`;
    }

    let distanceItem =
      `<div ${setiItemStyle}><strong>Spatial Poisson view · detectable-transmitter scale</strong><br>` +
      `No finite Poisson detectable-transmitter distance scale is available in the current calculator state.</div>`;

    if (Number.isFinite(detection.d_nearest_det) && detection.d_nearest_det > 0) {
      const horizonText = Number.isFinite(detection.d_horizon)
        ? ` The current detection horizon is <strong>${fmtN(detection.d_horizon)}</strong> light years.`
        : '';
      const horizonNote = detection.d_nearest_det > detection.d_horizon
        ? ` This scale lies beyond the current detection horizon, so the model does not expect an active detectable transmitter inside the present horizon under these assumptions. This should be read as no expected active detectable transmitter inside the current horizon, not as a location estimate.`
        : ` This scale lies within the current detection horizon under these assumptions.`;

      distanceItem =
        `<div ${setiItemStyle}><strong>Spatial Poisson view · detectable-transmitter scale</strong><br>` +
        `<span class="bold-number">${fmtN(detection.d_nearest_det)}</span> light years. This is a statistical distance scale implied by the low active-detectable density, not a located transmitter.${horizonText}${horizonNote}</div>`;
    }

    const geom = getGHZGeometryLy();
    const priorTerm = Math.max(1e-30, detection.f_tx);
    const distanceTerm =
      Math.max(
        1e-30,
        geom.area > 0 ? Math.min(Math.PI * detection.d_horizon * detection.d_horizon, geom.area) / geom.area : 0
      );
    const temporalTerm = Math.max(1e-30, detection.p_temporal_pct / 100);

    const bottleneck = [
      { key: 'prior', value: priorTerm },
      { key: 'distance', value: distanceTerm },
      { key: 'temporal', value: temporalTerm }
    ].sort((a, b) => a.value - b.value)[0];

    let diagnosis = 'distance and timing constraints acting together.';
    if (bottleneck.key === 'prior') {
      diagnosis = 'the low assumed transmitter fraction. Only a small fraction of modelled candidate worlds are assumed to produce detectable technosignatures.';
    } else if (bottleneck.key === 'distance') {
      diagnosis = 'detection-horizon geometry. The current detection horizon covers only a limited part of the modelled Galactic Habitable Zone.';
    } else if (bottleneck.key === 'temporal') {
      diagnosis = 'temporal mismatch. Detectable transmissions are short compared with galactic timescales, so active transmitters are unlikely to overlap with the current detection window.';
    }

    const interpretationItem =
      `<div ${setiItemStyle}><strong>Model interpretation · expected non-detection</strong><br>` +
      `Expected non-detection is mainly driven by ${diagnosis} This is a detectability diagnostic, not a claim about a specific nearest transmitter.</div>`;

    setiDetectabilityText =
      `➤ <div style="margin-top:2px;padding:10px 0 2px;border-top:1px solid rgba(255,255,255,0.07);border-bottom:1px solid rgba(255,255,255,0.05);">` +
      `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--accent3);margin-bottom:7px;">SETI detection context</div>` +
      `<div class="fermi-subnote" style="margin-bottom:8px;">These panels describe the same SETI detectability result from three complementary angles: temporal Poisson waiting time, spatial Poisson distance scale, and model-level bottleneck interpretation.</div>` +
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:8px;">` +
      waitItem +
      distanceItem +
      interpretationItem +
      `</div></div><br><br>`;
  }

  const text = `
    <strong>${sourceShort} · modelled candidate distance scale (${refModel ? refModel.modelLabel : 'external distance reference'}): ~${fmtN(distLy)} light years</strong><br><br>
    ➤ A radio signal travelling at light speed would take <strong>${fmtN(signalTime)}</strong> years to reach us ∼ ${starCtx}.<br><br>
    ➤ For us to detect a civilisation there, it would need to have been transmitting for at least <strong>${fmtN(signalTime)}</strong> years. In historical terms, that is roughly the time since ${hist.text}.<br><br>
    ➤ A round-trip exchange would take <strong>${fmtN(roundTrip)}</strong> years.<br><br>
    ${radioBubbleText}
    ${setiDetectabilityText}
    ➤ On this model, Fermi-paradox tension is <strong>${tension}</strong> under this scenario’s candidate-distance and SETI-detectability assumptions.<br>
    <span style="font-size:9.5px;color:var(--text-dim);">Fermi-tension labels are heuristic UI buckets based on model-derived distance and active-transmitter estimates. They are not literature-defined thresholds.</span>
  `;

  return {
    mode,
    distLy,
    html: text
  };
}

function calculateDistanceToNearestPlanet() {
  const loading = byId('loading');
  renderConfigurationWarnings();
  loading.style.display = 'block';

  byId('distance').innerHTML = '';
  fermiContexts = { mc: null, dt: null };
  distanceCalculated = false;
  resetActiveDistanceSnapshot();
  distance2D = minDistance2D = maxDistance2D = Infinity;
  distance3DDisk = minDistance3DDisk = maxDistance3DDisk = Infinity;
  distance3DSphere = minDistance3DSphere = maxDistance3DSphere = Infinity;
  distanceRadial = minDistanceRadial = maxDistanceRadial = Infinity;
  areaGHZ = 0;
  volumeGHZDisk = 0;
  volumeGHZSphere = 0;
  renderFermiBox();

  setTimeout(() => {
    deterministicPlanets = getCurrentDeterministicPlanets();

    const hasCurrentMc = simulationCompleted && Number.isFinite(mcMedianQ50);
    const mcScenario = hasCurrentMc ? buildDistanceScenario(mcMedianQ50, mcQ025, mcQ975) : null;
    const dtScenario = buildDistanceScenario(deterministicPlanets);
    const primaryScenario = hasCurrentMc ? mcScenario : dtScenario;
    const primaryCountBasis = hasCurrentMc ? 'Monte Carlo q50 count basis' : 'deterministic central count basis';

    byId('distance').innerHTML = getDistanceBasisHtml(primaryScenario, primaryCountBasis) + primaryScenario.html;
    updateActiveDistanceSnapshot(primaryScenario, primaryCountBasis);

    if (primaryScenario.metrics) {
      areaGHZ = primaryScenario.metrics.geom.area;
      volumeGHZDisk = primaryScenario.metrics.geom.volumeDisk;
      volumeGHZSphere = primaryScenario.metrics.geom.volumeSphere;

      distance2D = primaryScenario.metrics.model2d ? primaryScenario.metrics.model2d.distance : Infinity;
      minDistance2D = primaryScenario.metrics.model2d ? primaryScenario.metrics.model2d.ciLow : Infinity;
      maxDistance2D = primaryScenario.metrics.model2d ? primaryScenario.metrics.model2d.ciHigh : Infinity;

      distance3DDisk = primaryScenario.metrics.model3dDisk ? primaryScenario.metrics.model3dDisk.distance : Infinity;
      minDistance3DDisk = primaryScenario.metrics.model3dDisk ? primaryScenario.metrics.model3dDisk.ciLow : Infinity;
      maxDistance3DDisk = primaryScenario.metrics.model3dDisk ? primaryScenario.metrics.model3dDisk.ciHigh : Infinity;

      distance3DSphere = primaryScenario.metrics.model3dSphere ? primaryScenario.metrics.model3dSphere.distance : Infinity;
      minDistance3DSphere = primaryScenario.metrics.model3dSphere ? primaryScenario.metrics.model3dSphere.ciLow : Infinity;
      maxDistance3DSphere = primaryScenario.metrics.model3dSphere ? primaryScenario.metrics.model3dSphere.ciHigh : Infinity;

      distanceRadial = primaryScenario.metrics.modelRadial ? primaryScenario.metrics.modelRadial.distance : Infinity;
      minDistanceRadial = primaryScenario.metrics.modelRadial ? primaryScenario.metrics.modelRadial.ciLow : Infinity;
      maxDistanceRadial = primaryScenario.metrics.modelRadial ? primaryScenario.metrics.modelRadial.ciHigh : Infinity;
    }

    fermiContexts = {
      mc: hasCurrentMc ? buildFermiContext(mcScenario.fermiDistance, mcScenario.refModel, {
        mode: 'mc',
        count: mcMedianQ50
      }) : null,
      dt: buildFermiContext(dtScenario.fermiDistance, dtScenario.refModel, {
        mode: 'dt',
        count: deterministicPlanets
      })
    };

    loading.style.display = 'none';
    distanceCalculated = true;
    // Default Interpretation & Fermi Context view = DETERMINISTIC. Wide
    // literature-informed Monte Carlo distributions can produce unusable
    // drift for scenarios whose centrals sit at registry edges (Pessimist,
    // Optimist); deterministic is the methodological primary for scenario-
    // based presets. The user can still flip to MC RESULT via the toggle.
    renderFermiBox('dt');
    saveHistoryEntry();
    updateShareButtons();
    setTimeout(() => {
      runSobolAnalysis({ scrollIntoView: false });
    }, 20);
  }, 30);
}

function computeModelHealthSummary() {
  const cov = mcArithmeticMean > 0 ? stdDev / mcArithmeticMean : Infinity;
  const checkpoints =
    convergenceSummary && Array.isArray(convergenceSummary.checkpoints)
      ? convergenceSummary.checkpoints
      : [];
  const total = checkpoints.length ? checkpoints[checkpoints.length - 1].n : null;
  const stableAt = convergenceSummary ? convergenceSummary.stableAt : null;

  let level = 'warning';
  let label = 'High uncertainty';

  if (Number.isFinite(cov) && cov <= 0.35 && stableAt && total && stableAt < total) {
    level = 'stable';
    label = 'Stable';
  } else if (Number.isFinite(cov) && cov <= 1 && stableAt) {
    level = 'caution';
    label = 'Broad';
  }

  let convergenceNote = 'No convergence checkpoints available yet.';
  if (stableAt && total && stableAt < total) {
    convergenceNote = `Running mean settled by roughly ${stableAt.toLocaleString()} iterations.`;
  } else if (stableAt && total && stableAt >= total) {
    convergenceNote = 'Running mean only settled at the final checkpoint.';
  } else if (convergenceSummary) {
    convergenceNote = 'Running mean is still drifting across the sampled checkpoints.';
  }

  let note = `CoV = ${Number.isFinite(cov) ? cov.toFixed(2) : '∞'} (MC standard deviation / MC arithmetic mean). `;
  if (Number.isFinite(cov) && cov <= 0.35) {
    note += 'The Monte Carlo cloud is fairly tight around the mean. ';
  } else if (Number.isFinite(cov) && cov <= 1) {
    note += 'The mean is usable, but the sampled model distribution is still broad. ';
  } else {
    note += 'Dispersion exceeds the mean, so this scenario sits in a high-uncertainty regime. ';
  }
  note += convergenceNote;

  return { cov, level, label, note };
}

function ardInterpolate(m, field) {
  const d = ARD_DATA;
  if (m <= d[0].mass) return d[0][field];
  if (m >= d[d.length - 1].mass) return d[d.length - 1][field];

  for (let i = 0; i < d.length - 1; i++) {
    if (m >= d[i].mass && m <= d[i + 1].mass) {
      const t = (m - d[i].mass) / (d[i + 1].mass - d[i].mass);
      return d[i][field] + t * (d[i + 1][field] - d[i][field]);
    }
  }

  return d[0][field];
}

function computeARD() {
  const sm = pf('adv_ard_mass');
  const atm = (byId('adv_ard_atm') || {}).value || 'co2';
  const age = Math.max(0.5, pf('adv_ard_age'));
  const field = atm === 'n2' ? 'n2' : 'co2';

  let ard = ardInterpolate(sm, field);
  const hz_i = ardInterpolate(sm, 'hz_i');
  const hz_o = ardInterpolate(sm, 'hz_o');

  ard *= Math.pow(age / 5.0, -0.615);

  const effectiveInner = Math.max(hz_i, ard);
  const retainedFraction =
    hz_o - hz_i > 0 ? Math.max(0, hz_o - effectiveInner) / (hz_o - hz_i) : 0;

  const el = byId('adv-ard-result');
  if (!el) return { ard, hz_i, hz_o, fractionRetained: retainedFraction };

  if (ard < hz_i) {
    el.innerHTML = `✓ ARD (${ard.toFixed(3)} AU) < HZ inner (${hz_i.toFixed(3)} AU) · <strong>100% of HZ retains atmosphere</strong>`;
    el.style.color = 'var(--green)';
  } else if (ard > hz_o) {
    el.innerHTML = `✗ ARD (${ard.toFixed(3)} AU) > HZ outer (${hz_o.toFixed(3)} AU) · <strong>No atmosphere-safe HZ</strong>`;
    el.style.color = 'var(--red)';
  } else {
    el.innerHTML = `⚠ ARD (${ard.toFixed(3)} AU) cuts into HZ · <strong>${(retainedFraction * 100).toFixed(0)}% retains atmosphere</strong>`;
    el.style.color = 'var(--yellow)';
  }

  return { ard, hz_i, hz_o, fractionRetained: retainedFraction };
}

function computeTemporal() {
  const R = Math.max(1, pf('adv_temporal_R') || 8.0);

  const gAge = 13.5;
  const sunAge = 4.6;
  const tMet = Math.min(gAge, 2.0 + 0.6 * R);
  const tSN = Math.max(1.0, 4.0 + (8 - R) * 0.5);
  const tStart = Math.max(tMet, tSN);
  const tComplex = tStart + 4.0;
  const window = Math.max(0, gAge - tStart);
  const cWindow = Math.max(0, gAge - tComplex);
  const headStart = Math.max(0, (gAge - sunAge) - tComplex);

  const w = 660,
    h = 100,
    m = 30;
  const sc = t => m + (t / gAge) * (w - 2 * m);

  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;font-family:Nunito,sans-serif;">`;
  svg += `<rect x="${m}" y="35" width="${w - 2 * m}" height="20" rx="3" fill="#1c1e23" stroke="rgba(255,255,255,0.08)"/>`;
  svg += `<rect x="${sc(0)}" y="35" width="${sc(tStart) - sc(0)}" height="20" rx="3" fill="rgba(224,92,92,0.20)"/>`;

  if (tComplex > tStart && tComplex < gAge) {
    svg += `<rect x="${sc(tStart)}" y="35" width="${sc(Math.min(tComplex, gAge)) - sc(tStart)}" height="20" fill="rgba(86,201,122,0.25)"/>`;
  }
  if (tComplex < gAge) {
    svg += `<rect x="${sc(tComplex)}" y="35" width="${sc(gAge) - sc(tComplex)}" height="20" fill="rgba(86,201,122,0.55)"/>`;
  }

  const sunT = gAge - sunAge;
  svg += `<line x1="${sc(sunT)}" y1="28" x2="${sc(sunT)}" y2="62" stroke="#d4a843" stroke-width="1.5"/>`;
  svg += `<text x="${sc(sunT)}" y="24" text-anchor="middle" fill="#d4a843" font-size="7" font-weight="700">Sun (${sunT.toFixed(1)})</text>`;
  svg += `<text x="${sc(gAge) - 2}" y="24" text-anchor="end" fill="#5b9cf6" font-size="7" font-weight="700">Now</text>`;
  svg += `<text x="${m}" y="${h - 5}" fill="#6b7280" font-size="7">0 Gyr</text>`;
  svg += `<text x="${sc(tStart)}" y="70" text-anchor="middle" fill="#6b7280" font-size="6.5">Hab. start (${tStart.toFixed(1)})</text>`;

  if (tComplex < gAge) {
    svg += `<text x="${sc(tComplex)}" y="80" text-anchor="middle" fill="#56c97a" font-size="6.5">Complex (${tComplex.toFixed(1)})</text>`;
  }

  svg += `</svg>`;

  byId('adv-temporal-timeline').innerHTML = svg;
  byId('adv-temporal-text').innerHTML =
    `R=${R.toFixed(1)} kpc · Habitability from <strong>${tStart.toFixed(1)} Gyr</strong> ` +
    `(${window.toFixed(1)} Gyr window) · Complex life from <strong>${tComplex.toFixed(1)} Gyr</strong> ` +
    `(${cWindow.toFixed(1)} Gyr) · Head start: <strong>${headStart.toFixed(1)} Gyr</strong> · ` +
    `Habitable fraction: <strong>${((window / gAge) * 100).toFixed(0)}%</strong>`;

  return { tStart, tComplex, window, cWindow, headStart };
}

function computeSobolIndices(N_samples) {
  N_samples = N_samples || 300;
  const dist = (byId('distribution') || {}).value || 'lognormal';

  
  const boundsDescriptor = getMonteCarloBoundsDescriptor();
  const candidateIds = getMonteCarloSampledParameterIds(boundsDescriptor);

  const activeIds = candidateIds.filter(id => {
    const minEl = byId(id + '_min');
    const maxEl = byId(id + '_max');
    if (!minEl || !maxEl) return false;
    const m = rawNumber(id, NaN);
    if (!Number.isFinite(m)) return false;
    const lo = rawNumber(id + '_min', m);
    const hi = rawNumber(id + '_max', m);
    return Math.abs(hi - lo) > 1e-9 * Math.max(1, Math.abs(m));
  });

  if (activeIds.length < 2) return null;

  
  function buildMatrix() {
    const mat = [];
    for (let i = 0; i < N_samples; i++) {
      const row = {};
      for (const id of activeIds) {
        row[id] = sampleParam(id, dist, Math.random, boundsDescriptor);
      }
      mat.push(row);
    }
    return mat;
  }

  const A = buildMatrix();
  const B = buildMatrix();
  const baseInp = getInputs();

  function evalRow(overrides) {
    const baseOverrides = {};
    const advOverrides = {};

    Object.entries(overrides).forEach(function(entry) {
      const id = entry[0];
      const value = entry[1];
      const cfg = ADV_SOBOL_CONFIG[id];

      if (cfg) advOverrides[cfg.key] = value;
      else baseOverrides[id] = value;
    });

    const inp = Object.assign({}, baseInp, baseOverrides);
    const fullInp = applyAdvancedModules(inp, advOverrides);
    const N = computePlanetsAdvanced(fullInp);
    return (Number.isFinite(N) && N >= 0) ? N : 0;
  }

  const f_A = A.map(row => evalRow(row));
  const f_B = B.map(row => evalRow(row));
  const f_all = f_A.concat(f_B);
  const muY = mean(f_all);
  const varY = Math.max(1e-30, f_all.reduce(function(s, y){ return s + (y - muY) * (y - muY); }, 0) / (f_all.length - 1));

  const indices = {};

  for (let p = 0; p < activeIds.length; p++) {
    const id = activeIds[p];

    
    const f_ABi = A.map(function(aRow, j) {
      const overrides = Object.assign({}, aRow);
      overrides[id] = B[j][id];
      return evalRow(overrides);
    });

    let si_num = 0;
    let ti_num = 0;
    for (let j = 0; j < N_samples; j++) {
      si_num += f_B[j] * (f_ABi[j] - f_A[j]);
      ti_num += (f_A[j] - f_ABi[j]) * (f_A[j] - f_ABi[j]);
    }
    indices[id] = {
      S: Math.max(0, si_num / (N_samples * varY)),
      T: Math.max(0, ti_num / (2 * N_samples * varY))
    };
  }

  return { indices: indices, activeIds: activeIds, N_samples: N_samples, varY: varY };
}

function runSobolAnalysis(options = {}) {
  if (!simulationCompleted) return null;

  const result = computeSobolIndices(300);
  renderSobolPanel(result);

  if (options.scrollIntoView && byId('sobol-panel')) {
    byId('sobol-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return result;
}

function computeTemporalNt() {
  const T_gal = 13.5;    
  const T_min_met = 1.8; 
  const T_complex = T_min_met + 4.0; 
  const T_sun = T_gal - 4.6; 
  const steps = 300;
  const dt = T_gal / steps;

  
  function sfr(t) {
    if (t <= 0) return 0;
    const t_peak = 3.0;
    const sigma = 1.9;
    const lng = Math.log(t / t_peak);
    return Math.exp(-lng * lng / (2 * sigma * sigma)) / t;
  }

  
  function metFactor(t) {
    if (t < T_min_met) return 0;
    return Math.tanh((t - T_min_met) / 2.5);
  }

  const pts = [];
  let cum = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    cum += sfr(t) * metFactor(t) * dt;
    pts.push({ t: t, cum: cum });
  }

  const norm = cum || 1;
  return {
    pts: pts.map(function(p){ return { t: p.t, frac: p.cum / norm }; }),
    T_gal: T_gal, T_min_met: T_min_met, T_complex: T_complex, T_sun: T_sun
  };
}

function computeDetectionFilter(countOverride = mcMedianQ50) {
  if (!simulationCompleted) return null;

  const L = Math.max(1, rawNumber('detection-L', 30000));
  const f_tx = clamp01(rawNumber('detection-f_tx', 0.01));
  const T_gal_yr = 13.5e9;
  const geom = getGHZGeometryLy();
  const manualEarthDist = getGalaxyEarthDistance();
  const isExternalReference =
    (galaxyName !== 'Milky Way (MW)' && galaxyName !== 'Custom Galaxy X') ||
    (galaxyName === 'Custom Galaxy X' && manualEarthDist > 0);
  const earthDist = isExternalReference
    ? (manualEarthDist > 0 ? manualEarthDist : galaxyDistances[galaxyName])
    : null;
  
  const d_gal_ly = geom.outerLy > 0 ? Math.round(geom.outerLy / GHZ_OUTER_FRAC) * 2 : (isGalaxySettingsEnabled ? Math.max(1000, pf('galaxy-diameter')) : 100000);
  const N_planets = Number.isFinite(countOverride) ? Math.max(0, countOverride) : mcMedianQ50;
  if (N_planets <= 0 || geom.area <= 0) return null;

  
  const N_tx_total = N_planets * f_tx;
  const p_temporal = Math.min(1, L / T_gal_yr);

  if (isExternalReference && Number.isFinite(earthDist) && earthDist > 0) {
    const withinRange = L >= earthDist;
    const N_within = withinRange ? N_tx_total : 0;
    const N_det = N_within * p_temporal;
    const p_detect = 1 - Math.exp(-Math.max(0, N_det));

    return {
      L: L,
      f_tx: f_tx,
      N_planets: N_planets,
      N_tx_total: N_tx_total,
      d_horizon: Math.round(Math.min(L, earthDist)),
      N_within: N_within,
      p_temporal_pct: p_temporal * 100,
      N_det: N_det,
      p_detect_pct: p_detect * 100,
      d_nearest_det: withinRange ? earthDist : Infinity,
      nearest_beyond_horizon: !withinRange,
      is_external_reference: true,
      earth_distance: earthDist
    };
  }

  
  const d_horizon = Math.min(L, d_gal_ly);

  
  const rho_2d = N_tx_total / geom.area;
  const area_det = Math.min(Math.PI * d_horizon * d_horizon, geom.area);
  const N_within = rho_2d * area_det;

  
  const N_det = N_within * p_temporal;

  
  const p_detect = 1 - Math.exp(-Math.max(0, N_det));

  
  const lambda_det = N_det > 0 ? N_det / area_det : 0;
  const d_nearest_det = lambda_det > 0 ? E_from(lambda_det, 2) : Infinity;
  const nearest_beyond_horizon = Number.isFinite(d_nearest_det) && d_nearest_det > d_horizon;

  return {
    L: L,
    f_tx: f_tx,
    N_planets: N_planets,
    N_tx_total: N_tx_total,
    d_horizon: Math.round(d_horizon),
    N_within: N_within,
    p_temporal_pct: p_temporal * 100,
    N_det: N_det,
    p_detect_pct: p_detect * 100,
    d_nearest_det: d_nearest_det,
    nearest_beyond_horizon: nearest_beyond_horizon,
    is_external_reference: false,
    earth_distance: null
  };
}
