/*
Are We Alone in the Universe? Earth-like Planet Calculator
Author: Roman Jerše
Website: https://www.arewealoneintheuniverse.com/
Version: 2.12
License: Custom source-available attribution license. See ../LICENSE.md.
*/

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

let averagePlanets = 0;

let percentile5 = 0;

let percentile95 = 0;

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

let areaGHZ = 0;

let volumeGHZDisk = 0;

let volumeGHZSphere = 0;

let simulationCompleted = false;

let distanceCalculated = false;

let isComplexLifeEnabled = false;

let isXEnabled = false;

let isH2OEnabled = true;

let isCHNOPSEnabled = true;

let isGalaxySettingsEnabled = false;

let galaxyName = 'Milky Way (MW)';

let galaxySettingsBaseline = null;

let bayesianMode = 'pre';

let fermiMode = 'mc';

let fermiContexts = { mc: null, dt: null };

let currentScale = 'log';

let activePreset = '';

let intervalsVisible = false;

let lastResults = [];

let convergenceSummary = null;

let simulationEnvelope = null;

let hasDeterministicCalculation = false;

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

const SAMPLABLE_PARAM_IDS = [...new Set([...BASE_SAMPLE_IDS, ...ADV_SAMPLE_IDS])];

const SIM_ENGINE_LABELS = {
  standard: 'Standard Monte Carlo',
  lhs: 'Latin Hypercube'
};

const SIM_CORRELATION_LABELS = {
  heuristic: 'Heuristic correlation scaffold',
  independent: 'Independent factors'
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
    label: 'Pessimist · Great Filter',
    source: 'Hart 1975 / Rare Earth',
    description:
      'Low host fractions, strong astrophysical filters and an extremely small complex-life prior. This is the most restrictive published-style scenario in the tool.',
    N_GHZ: 50000000000,
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
    f_complex_life: 0.01,
    f_x: 1,
    enableComplex: true,
    enableX: false
  },
  consensus: {
    label: 'Consensus · Lineweaver',
    source: 'Lineweaver 2004',
    description:
      'Moderate literature values across the full chain, giving a middle estimate anchored near Lineweaver-style assumptions rather than a strongly rare or strongly abundant universe.',
    N_GHZ: 100000000000,
    f_sun_type: 0.08,
    f_sun_age: 0.70,
    N_p_star: 1.5,
    f_composition: 0.20,
    f_orbit: 0.20,
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
    label: 'Optimist · Dissolving Fermi',
    source: 'Sandberg et al. 2018',
    description:
      'Higher rocky, habitable-zone and survivability fractions, together with a permissive biological chain. It probes how quickly the Fermi tension rises under optimistic priors.',
    N_GHZ: 100000000000,
    f_sun_type: 0.20,
    f_sun_age: 0.75,
    N_p_star: 2.0,
    f_composition: 0.35,
    f_orbit: 0.40,
    f_stability: 0.70,
    f_magnetosphere: 0.70,
    f_lunar_stability: 0.80,
    f_size: 0.65,
    f_rotation: 0.40,
    f_tilt: 0.65,
    f_H2O: 0.30,
    f_CHNOPS: 0.50,
    f_complex_life: 1.0,
    f_x: 1,
    enableComplex: true,
    enableX: false
  },
  jwst: {
    label: 'Post-JWST · 2023~2025',
    source: 'Bryson + JWST Data',
    description:
      'Keeps the broader consensus structure but updates key observational terms such as rocky-planet and habitable-zone fractions to match the newer post-2022 exoplanet literature.',
    N_GHZ: 100000000000,
    f_sun_type: 0.08,
    f_sun_age: 0.70,
    N_p_star: 1.8,
    f_composition: 0.28,
    f_orbit: 0.30,
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

const BAYES = {
  pre: {
    f_orbit: 0.20,
    f_composition: 0.20,
    note: 'Pre-JWST literature values (≤2021) for f_HZ and f_rocky.'
  },
  post: {
    f_orbit: 0.30,
    f_composition: 0.28,
    note: 'Post-JWST literature values (2022~2025) for f_HZ and f_rocky.'
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
  { d: 11.8, name: "DX Cancri", note: "a very faint nearby red dwarf emitting most of its energy outside the visible range", ...cat("DX Cnc") },
  { d: 11.87, name: "Epsilon Indi", note: "a nearby K-dwarf system with brown-dwarf companions and 1 confirmed exoplanet", ...cat("eps Ind") },
  { d: 11.91, name: "Tau Ceti", note: "one of the nearest Sun-like stars, with 4 confirmed exoplanets in the current archive and a long history in nearby planetary-system studies", ...cat("tau Cet") },
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
  { d: 321.0, name: "Acrux", note: "the brightest star in the Southern Cross, actually a multiple stellar system", ...cat("Acrux") },
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

  if (allDistanceModelsDisabled()) {
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
          : 'This run has <strong>not converged cleanly</strong> even at the current iteration cap. Re-run cautiously and treat the Monte Carlo mean as provisional.'
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
  return {
    N_GHZ: sanitizePositive(pf('N_GHZ')),
    f_sun_type: sanitizeProbability(pf('f_sun_type')),
    f_sun_age: sanitizeProbability(pf('f_sun_age')),
    N_p_star: sanitizePositive(pf('N_p_star')),
    f_composition: sanitizeProbability(pf('f_composition')),
    f_orbit: sanitizeProbability(pf('f_orbit')),
    f_stability: sanitizeProbability(pf('f_stability')),
    f_magnetosphere: sanitizeProbability(pf('f_magnetosphere')),
    f_lunar_stability: sanitizeProbability(pf('f_lunar_stability')),
    f_size: sanitizeProbability(pf('f_size')),
    f_rotation: sanitizeProbability(pf('f_rotation')),
    f_tilt: sanitizeProbability(pf('f_tilt')),
    f_H2O: isH2OEnabled ? sanitizeProbability(pf('f_H2O')) : 1,
    f_CHNOPS: isCHNOPSEnabled ? sanitizeProbability(pf('f_CHNOPS')) : 1,
    f_complex_life: isComplexLifeEnabled
      ? sanitizeProbability(pf('f_complex_life'))
      : 1,
    f_x: isXEnabled ? sanitizeProbability(pf('f_x')) : 1
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

function boxMuller() {
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.max(1e-12, Math.random());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function getSamplingUncertaintyFraction() {
  return clamp(rawNumber('sampling_uncertainty', 50), 1, 100) / 100;
}

function getSimulationOptions() {
  return {
    engine: ((byId('simulation-engine') || {}).value || 'standard').toLowerCase(),
    correlation: ((byId('correlation-model') || {}).value || 'heuristic').toLowerCase(),
    robustBounds: !!((byId('robust-bounds') || {}).checked)
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

  return {
    engineLabel: SIM_ENGINE_LABELS[options.engine] || SIM_ENGINE_LABELS.standard,
    correlationLabel: SIM_CORRELATION_LABELS[options.correlation] || SIM_CORRELATION_LABELS.heuristic,
    distributionShort: distLabels.short,
    distributionLong: distLabels.long
  };
}

function shuffleInPlace(values) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
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

function sampleNormalBounded(meanVal, lo, hi) {
  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, 1e-12);
  for (let i = 0; i < 14; i++) {
    const v = meanVal + sd * boxMuller();
    if (v >= lo && v <= hi) return v;
  }
  return clamp(meanVal, lo, hi);
}

function sampleLogNormalBounded(meanVal, lo, hi) {
  if (meanVal <= 0) return 0;

  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, meanVal * 0.1, 1e-12);
  const variance = sd * sd;
  const mu =
    Math.log(meanVal) -
    0.5 * Math.log(1 + variance / (meanVal * meanVal));
  const sigma = Math.sqrt(Math.log(1 + variance / (meanVal * meanVal)));

  for (let i = 0; i < 14; i++) {
    const v = Math.exp(mu + sigma * boxMuller());
    if (v >= lo && v <= hi) return v;
  }
  return clamp(meanVal, lo, hi);
}

function sampleLogitNormalBounded(meanVal, lo, hi) {
  const m = clamp(meanVal, Math.max(lo, 1e-9), Math.min(hi, 1 - 1e-9));
  const lo2 = clamp(lo, 1e-9, 1 - 1e-9);
  const hi2 = clamp(hi, 1e-9, 1 - 1e-9);
  const uncertaintyFraction = getSamplingUncertaintyFraction();

  const spread = Math.max((logit(hi2) - logit(lo2)) * uncertaintyFraction / 2, 1e-6);
  const center = logit(m) * Math.sqrt(1 + (Math.PI * spread * spread) / 8);

  for (let i = 0; i < 14; i++) {
    const z = center + spread * boxMuller();
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

  const uncertaintyFraction = getSamplingUncertaintyFraction();
  const sd = Math.max((hi - lo) * uncertaintyFraction / 2, meanVal * 0.1, 1e-12);
  const variance = sd * sd;
  const mu =
    Math.log(meanVal) -
    0.5 * Math.log(1 + variance / (meanVal * meanVal));
  const sigma = Math.sqrt(Math.log(1 + variance / (meanVal * meanVal)));
  const cdfLo = lo <= 0 ? 0 : normalCdf((Math.log(Math.max(lo, 1e-12)) - mu) / sigma);
  const cdfHi = normalCdf((Math.log(Math.max(hi, 1e-12)) - mu) / sigma);
  const p = cdfLo + u * Math.max(cdfHi - cdfLo, 1e-12);
  return clamp(Math.exp(mu + sigma * inverseNormalCdf(p)), lo, hi);
}

function sampleLogitNormalQuantile(meanVal, lo, hi, u) {
  const m = clamp(meanVal, Math.max(lo, 1e-9), Math.min(hi, 1 - 1e-9));
  const lo2 = clamp(lo, 1e-9, 1 - 1e-9);
  const hi2 = clamp(hi, 1e-9, 1 - 1e-9);
  const uncertaintyFraction = getSamplingUncertaintyFraction();

  const spread = Math.max((logit(hi2) - logit(lo2)) * uncertaintyFraction / 2, 1e-6);
  const center = logit(m) * Math.sqrt(1 + (Math.PI * spread * spread) / 8);
  const cdfLo = normalCdf((logit(lo2) - center) / spread);
  const cdfHi = normalCdf((logit(hi2) - center) / spread);
  const p = cdfLo + u * Math.max(cdfHi - cdfLo, 1e-12);
  return clamp(logistic(center + spread * inverseNormalCdf(p)), lo2, hi2);
}

function sampleParam(id, dist) {
  let meanVal = rawNumber(id, NaN);
  const minEl = byId(id + '_min');
  const maxEl = byId(id + '_max');

  if (!Number.isFinite(meanVal)) meanVal = 0;

  const isProbability = PROBABILITY_FIELDS.has(id);
  const isPositive = POSITIVE_FIELDS.has(id);

  if (!minEl || !maxEl) {
    if (isProbability) return clamp01(meanVal);
    if (isPositive) return Math.max(0, meanVal);
    return meanVal;
  }

  let lo = rawNumber(id + '_min', meanVal);
  let hi = rawNumber(id + '_max', meanVal);
  if (lo > hi) [lo, hi] = [hi, lo];

  if (isProbability) {
    lo = clamp01(lo);
    hi = clamp01(hi);
    meanVal = clamp01(meanVal);
  } else if (isPositive) {
    lo = Math.max(0, lo);
    hi = Math.max(0, hi);
    meanVal = Math.max(0, meanVal);
  }

  if (meanVal < lo) lo = meanVal;
  if (meanVal > hi) hi = meanVal;

  if (dist === 'uniform') return lo + Math.random() * (hi - lo);

  if (isProbability) {
    if (dist === 'lognormal') return sampleLogitNormalBounded(meanVal, lo, hi);
    return sampleNormalBounded(meanVal, lo, hi);
  }

  if (dist === 'lognormal' && lo >= 0) {
    return sampleLogNormalBounded(meanVal, lo, hi);
  }

  return sampleNormalBounded(meanVal, lo, hi);
}

function sampleParamFromQuantile(id, dist, u) {
  let meanVal = rawNumber(id, NaN);
  const minEl = byId(id + '_min');
  const maxEl = byId(id + '_max');

  if (!Number.isFinite(meanVal)) meanVal = 0;

  const isProbability = PROBABILITY_FIELDS.has(id);
  const isPositive = POSITIVE_FIELDS.has(id);

  if (!minEl || !maxEl) {
    if (isProbability) return clamp01(meanVal);
    if (isPositive) return Math.max(0, meanVal);
    return meanVal;
  }

  let lo = rawNumber(id + '_min', meanVal);
  let hi = rawNumber(id + '_max', meanVal);
  if (lo > hi) [lo, hi] = [hi, lo];

  if (isProbability) {
    lo = clamp01(lo);
    hi = clamp01(hi);
    meanVal = clamp01(meanVal);
  } else if (isPositive) {
    lo = Math.max(0, lo);
    hi = Math.max(0, hi);
    meanVal = Math.max(0, meanVal);
  }

  if (meanVal < lo) lo = meanVal;
  if (meanVal > hi) hi = meanVal;
  if (hi <= lo) return clamp(meanVal, lo, hi);

  if (dist === 'uniform') return lo + u * (hi - lo);

  if (isProbability) {
    if (dist === 'lognormal') return sampleLogitNormalQuantile(meanVal, lo, hi, u);
    return sampleNormalQuantile(meanVal, lo, hi, u);
  }

  if (dist === 'lognormal' && lo >= 0) {
    return sampleLogNormalQuantile(meanVal, lo, hi, u);
  }

  return sampleNormalQuantile(meanVal, lo, hi, u);
}

function buildLatinHypercubeSequence(iterations) {
  return shuffleInPlace(
    Array.from({ length: iterations }, (_, idx) => (idx + Math.random()) / iterations)
  );
}

function createParameterSampler(engine, dist, iterations) {
  if (engine !== 'lhs') {
    return {
      startIteration() {},
      sample(id) {
        return sampleParam(id, dist);
      }
    };
  }

  const plans = {};
  SAMPLABLE_PARAM_IDS.forEach(id => {
    plans[id] = buildLatinHypercubeSequence(iterations);
  });

  let iterationIndex = 0;

  return {
    startIteration(index) {
      iterationIndex = index;
    },
    sample(id) {
      const plan = plans[id];
      const u = plan && Number.isFinite(plan[iterationIndex]) ? plan[iterationIndex] : Math.random();
      return sampleParamFromQuantile(id, dist, u);
    }
  };
}

function getParamBoundValue(id, side) {
  let meanVal = rawNumber(id, NaN);
  const minEl = byId(id + '_min');
  const maxEl = byId(id + '_max');

  if (!Number.isFinite(meanVal)) meanVal = 0;

  const isProbability = PROBABILITY_FIELDS.has(id);
  const isPositive = POSITIVE_FIELDS.has(id);

  if (!minEl || !maxEl) {
    if (isProbability) return clamp01(meanVal);
    if (isPositive) return Math.max(0, meanVal);
    return meanVal;
  }

  let lo = rawNumber(id + '_min', meanVal);
  let hi = rawNumber(id + '_max', meanVal);
  if (lo > hi) [lo, hi] = [hi, lo];

  if (isProbability) {
    lo = clamp01(lo);
    hi = clamp01(hi);
    meanVal = clamp01(meanVal);
  } else if (isPositive) {
    lo = Math.max(0, lo);
    hi = Math.max(0, hi);
    meanVal = Math.max(0, meanVal);
  }

  if (meanVal < lo) lo = meanVal;
  if (meanVal > hi) hi = meanVal;
  return side === 'low' ? lo : hi;
}

function getGalaxyEarthDistance() {
  return Math.max(0, rawNumber('galaxy-earth-distance', 0));
}

function applyBaseCorrelationModel(sampledInputs, meanInp, correlationModel = 'heuristic') {
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

function sampleBaseInputs(dist, sampler = null, correlationModel = 'heuristic') {
  const meanInp = getInputs();
  const draw = id => (sampler ? sampler.sample(id) : sampleParam(id, dist));

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
    f_H2O: isH2OEnabled ? draw('f_H2O') : 1,
    f_CHNOPS: isCHNOPSEnabled ? draw('f_CHNOPS') : 1,
    f_complex_life: isComplexLifeEnabled
      ? draw('f_complex_life')
      : 1,
    f_x: isXEnabled ? draw('f_x') : 1
  };

  return applyBaseCorrelationModel(s, meanInp, correlationModel);
}

function sampleAdvanced(dist, sampler = null) {
  const s = {};
  const draw = id => (sampler ? sampler.sample(id) : sampleParam(id, dist));

  if (ADV.modules.atmRet.enabled) s._f_atm_ret = draw('adv_f_atm_ret');

  if (ADV.modules.volatileSplit.enabled) {
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

function buildEnvelopeBaseInputs(side, correlationModel = 'heuristic') {
  const meanInp = getInputs();
  const draw = id => getParamBoundValue(id, side);

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
    f_H2O: isH2OEnabled ? draw('f_H2O') : 1,
    f_CHNOPS: isCHNOPSEnabled ? draw('f_CHNOPS') : 1,
    f_complex_life: isComplexLifeEnabled ? draw('f_complex_life') : 1,
    f_x: isXEnabled ? draw('f_x') : 1
  };

  return applyBaseCorrelationModel(s, meanInp, correlationModel);
}

function buildEnvelopeAdvancedInputs(side) {
  const draw = id => getParamBoundValue(id, side);
  const s = {};

  if (ADV.modules.atmRet.enabled) s._f_atm_ret = draw('adv_f_atm_ret');

  if (ADV.modules.volatileSplit.enabled) {
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
  const lowBase = buildEnvelopeBaseInputs('low', options.correlation);
  const highBase = buildEnvelopeBaseInputs('high', options.correlation);
  const lowAdv = buildEnvelopeAdvancedInputs('low');
  const highAdv = buildEnvelopeAdvancedInputs('high');

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

  const getAdv = (key, id) => {
    const v = sampledAdv[key];
    if (Number.isFinite(v)) return v;
    return pf(id);
  };

  if (ADV.modules.hostChannels.enabled) {
    const ch = computeHostChannels(ADV.modules.spinObliquity.enabled);
    inp.f_sun_type = ch.total;
  }

  if (ADV.modules.atmRet.enabled) {
    inp._f_atm_ret = clamp01(getAdv('_f_atm_ret', 'adv_f_atm_ret'));
  }

  if (ADV.modules.volatileSplit.enabled) {
    const delivery = clamp01(getAdv('f_H2O', 'adv_f_vol_del'));
    const retention = clamp01(getAdv('f_H2O_ret', 'adv_f_wat_ret'));
    inp.f_H2O = delivery * retention;
  }

  if (ADV.modules.longterm.enabled) {
    const tect = clamp01(getAdv('_f_tect', 'adv_f_tect'));
    const radio = clamp01(getAdv('_f_radio', 'adv_f_radio'));
    const clim = clamp01(getAdv('_f_clim', 'adv_f_clim'));
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
    inp.f_composition = clamp01(getAdv('f_composition', 'adv_P_rocky'));
    inp.f_size = 1;
  }

  if (ADV.modules.radialGHZ.enabled) {
    inp.N_GHZ = computeRadialGHZDetails().N_GHZ;
  }

  if (ADV.modules.spaceWeather.enabled) {
    inp._f_xuv_quiet = clamp01(getAdv('_f_xuv_quiet', 'adv_f_xuv'));
  }

  if (ADV.modules.prebioticUV.enabled) {
    inp._f_uv = clamp01(getAdv('_f_uv', 'adv_f_uv'));
  }

  if (ADV.modules.binary.enabled) {
    inp._f_binary = clamp01(getAdv('_f_binary', 'adv_f_binary'));
  }

  if (ADV.modules.radiation.enabled) {
    inp._f_rad = clamp01(getAdv('_f_rad', 'adv_f_rad'));
  }

  return inp;
}

const KPC_TO_LY = 3261.56;

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

    
    innerLy = 0.26 * radius;
    outerLy = 0.85 * radius;
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

function calculateDeterministic() {
  renderConfigurationWarnings();
  const inp = getInputs();
  const advInp = applyAdvancedModules(inp);
  const N = computePlanetsAdvanced(advInp);

  invalidateResults(false, false);
  deterministicPlanets = N;
  hasDeterministicCalculation = true;

  byId('deterministicResult').innerHTML =
    `<span class="result-label">DETERMINISTIC ·</span> ${fmtN(N)} Earth-like planets in ${galaxyName}${lifeLabel()}`;
  renderResultRealityCheck();
  renderCalculationConsole();
  updateShareButtons();
}

function monteCarloCalculate() {
  const loading = byId('loading');
  renderConfigurationWarnings();
  loading.style.display = 'block';

  setTimeout(() => {
    const iterations = clamp(parseInt(byId('iterations').value || '2000', 10), 1000, 20000);
    const dist = byId('distribution').value || 'lognormal';
    const simulationOptions = getSimulationOptions();
    const sampler = createParameterSampler(simulationOptions.engine, dist, iterations);

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

    if (ADV.enabled && ADV.modules.sensitivity.enabled) {
      SENS.init(sensKeys);
    }

    const results = [];
    const checkpoints = [];
    let runningSum = 0;
    const checkpointEvery = Math.max(25, Math.ceil(iterations / 40));

    for (let i = 0; i < iterations; i++) {
      sampler.startIteration(i);
      const baseS = sampleBaseInputs(dist, sampler, simulationOptions.correlation);
      const advS = sampleAdvanced(dist, sampler);
      const full = applyAdvancedModules(baseS, advS);
      const N = computePlanetsAdvanced(full);

      if (Number.isFinite(N) && N >= 0) {
        results.push(N);
        runningSum += N;

        const n = results.length;
        if (n === 1 || n % checkpointEvery === 0) {
          checkpoints.push({ n, mean: runningSum / n });
        }

        if (ADV.enabled && ADV.modules.sensitivity.enabled) {
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

    if (!results.length) {
      convergenceSummary = null;
      simulationEnvelope = null;
      renderConvergenceSummary();
      renderSimulationMethodSummary();
      loading.style.display = 'none';
      updateShareButtons();
      return;
    }

    if (!checkpoints.length || checkpoints[checkpoints.length - 1].n !== results.length) {
      checkpoints.push({ n: results.length, mean: runningSum / results.length });
    }

    results.sort((a, b) => a - b);
    lastResults = results.slice();

    averagePlanets = mean(results);
    percentile5 = percentile(results, 0.025);
    percentile95 = percentile(results, 0.975);
    stdDev = stdev(results, averagePlanets);

    const canUseLog = currentScale === 'log' && results.every(v => v > 0);
    mostFrequent = getModeEstimate(results, canUseLog);
    convergenceSummary = summarizeConvergence(checkpoints, averagePlanets);
    simulationEnvelope = simulationOptions.robustBounds
      ? computeSimulationEnvelope(simulationOptions)
      : null;

    byId('monteCarloResult').innerHTML =
      `<span class="result-label">MONTE CARLO ·</span> ${fmtN(averagePlanets)} Earth-like planets in ${galaxyName}${lifeLabel()}`;

    byId('stats').innerHTML =
      `<span class="result-label">95% CI ·</span> [${fmtN(percentile5)}, ${fmtN(percentile95)}] <span style="font-size:10px;color:var(--text-dim)">(q2.5–q97.5)</span>`;
    renderResultRealityCheck();

    byId('distance').textContent = '';
    byId('whereAreTheyBtn').disabled = false;

    rebuildCharts(results);
    renderConvergenceSummary();
    simulationCompleted = true;
    renderSimulationMethodSummary();

    if (ADV.enabled && ADV.modules.sensitivity.enabled) SENS.render('adv-tornado-container');
    if (ADV.enabled && ADV.modules.ard.enabled) computeARD();
    if (ADV.enabled && ADV.modules.temporal.enabled) computeTemporal();

    
    renderTemporalNtPanel();
    renderDetectionPanel();
    if (byId('sobolBtn')) byId('sobolBtn').disabled = false;

    renderCalculationConsole();
    loading.style.display = 'none';
    updateShareButtons();
  }, 30);
}

function getCurrentDeterministicPlanets() {
  const inp = getInputs();
  const advInp = applyAdvancedModules(inp);
  return computePlanetsAdvanced(advInp);
}

function getDistanceModelSelection() {
  return {
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
    model2d: null,
    model3dDisk: null,
    model3dSphere: null
  };

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
  return metrics.model3dDisk || metrics.model2d || metrics.model3dSphere || null;
}

function buildDistanceScenario(count, ciLowCount = null, ciHighCount = null) {
  const pAtLeastOne = 1 - Math.exp(-Math.max(0, count));

  if (count < 1) {
    return {
      kind: 'sparse',
      html:
        `<span class="result-label">DISTANCE ·</span> Expected count < 1. ` +
        `P(at least one planet) = <span class="bold-number">${(100 * pAtLeastOne).toFixed(1)}%</span>. ` +
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
  const count = Math.max(0, options.count ?? averagePlanets);
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
  let radioBubbleText = '';
  if (detection && Number.isFinite(detection.d_nearest_det) && detection.d_nearest_det > 0) {
    radioBubbleText =
      `➤ Human radio leakage has only filled roughly <strong>${earthRadioBubbleLy}</strong> light years so far. ` +
      `On the current detection settings, the nearest detectable-transmitter estimate is <strong>${fmtN(detection.d_nearest_det)}</strong> light years 〰 about <strong>${fmtN(detection.d_nearest_det / earthRadioBubbleLy)}</strong>× farther out.<br><br>`;
  } else {
    radioBubbleText =
      `➤ Human radio leakage has only filled roughly <strong>${earthRadioBubbleLy}</strong> light years so far 〰 far smaller than the current nearest-habitable distance scale.<br><br>`;
  }

  let silenceDriverText = '';
  if (detection) {
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

    let diagnosis = 'distance and timing constraints jointly dominate the silence.';
    if (bottleneck.key === 'prior') {
      diagnosis = 'the strongest filter is the low assumed transmitter fraction f_tx.';
    } else if (bottleneck.key === 'distance') {
      diagnosis = 'the strongest filter is sheer geometric distance inside the GHZ.';
    } else if (bottleneck.key === 'temporal') {
      diagnosis = 'the strongest filter is short temporal overlap relative to galactic age.';
    }

    silenceDriverText =
      `➤ Automatic silence interpretation: <strong>${diagnosis}</strong><br><br>`;
  }

  const text = `
    <strong>${sourceShort} · nearest habitable planet estimate (${refModel ? refModel.modelLabel : 'external distance reference'}): ~${fmtN(distLy)} light years</strong><br><br>
    ➤ A radio signal travelling at light speed would take <strong>${fmtN(signalTime)}</strong> years to reach us ∼ ${starCtx}.<br><br>
    ➤ For us to detect a civilisation there, it would need to have been transmitting for at least <strong>${fmtN(signalTime)}</strong> years. In historical terms, that is roughly the time since ${hist.text}.<br><br>
    ➤ A round-trip exchange would take <strong>${fmtN(roundTrip)}</strong> years.<br><br>
    ${radioBubbleText}
    ${silenceDriverText}
    ➤ On this model, Fermi-paradox tension is <strong>${tension}</strong> at that distance scale.
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
  distance2D = minDistance2D = maxDistance2D = Infinity;
  distance3DDisk = minDistance3DDisk = maxDistance3DDisk = Infinity;
  distance3DSphere = minDistance3DSphere = maxDistance3DSphere = Infinity;
  areaGHZ = 0;
  volumeGHZDisk = 0;
  volumeGHZSphere = 0;
  renderFermiBox();

  setTimeout(() => {
    deterministicPlanets = getCurrentDeterministicPlanets();

    const mcScenario = buildDistanceScenario(averagePlanets, percentile5, percentile95);
    const dtScenario = buildDistanceScenario(deterministicPlanets);

    byId('distance').innerHTML = mcScenario.html;

    if (mcScenario.metrics) {
      areaGHZ = mcScenario.metrics.geom.area;
      volumeGHZDisk = mcScenario.metrics.geom.volumeDisk;
      volumeGHZSphere = mcScenario.metrics.geom.volumeSphere;

      distance2D = mcScenario.metrics.model2d ? mcScenario.metrics.model2d.distance : Infinity;
      minDistance2D = mcScenario.metrics.model2d ? mcScenario.metrics.model2d.ciLow : Infinity;
      maxDistance2D = mcScenario.metrics.model2d ? mcScenario.metrics.model2d.ciHigh : Infinity;

      distance3DDisk = mcScenario.metrics.model3dDisk ? mcScenario.metrics.model3dDisk.distance : Infinity;
      minDistance3DDisk = mcScenario.metrics.model3dDisk ? mcScenario.metrics.model3dDisk.ciLow : Infinity;
      maxDistance3DDisk = mcScenario.metrics.model3dDisk ? mcScenario.metrics.model3dDisk.ciHigh : Infinity;

      distance3DSphere = mcScenario.metrics.model3dSphere ? mcScenario.metrics.model3dSphere.distance : Infinity;
      minDistance3DSphere = mcScenario.metrics.model3dSphere ? mcScenario.metrics.model3dSphere.ciLow : Infinity;
      maxDistance3DSphere = mcScenario.metrics.model3dSphere ? mcScenario.metrics.model3dSphere.ciHigh : Infinity;
    }

    fermiContexts = {
      mc: buildFermiContext(mcScenario.fermiDistance, mcScenario.refModel, {
        mode: 'mc',
        count: averagePlanets
      }),
      dt: buildFermiContext(dtScenario.fermiDistance, dtScenario.refModel, {
        mode: 'dt',
        count: deterministicPlanets
      })
    };

    loading.style.display = 'none';
    distanceCalculated = true;
    renderFermiBox('mc');
    saveHistoryEntry();
    updateShareButtons();
    setTimeout(() => {
      runSobolAnalysis({ scrollIntoView: false });
    }, 20);
  }, 30);
}

function computeModelHealthSummary() {
  const cov = averagePlanets > 0 ? stdDev / averagePlanets : Infinity;
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

  let note = `CoV = ${Number.isFinite(cov) ? cov.toFixed(2) : '∞'} (mc_stddev / mc_mean). `;
  if (Number.isFinite(cov) && cov <= 0.35) {
    note += 'The Monte Carlo cloud is fairly tight around the mean. ';
  } else if (Number.isFinite(cov) && cov <= 1) {
    note += 'The mean is usable, but the posterior is still broad. ';
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

  const gAge = 13.2;
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

  
  const candidateIds = ADV.enabled
    ? BASE_SAMPLE_IDS.concat(
        ADV_SAMPLE_IDS.filter(id => {
          const cfg = ADV_SOBOL_CONFIG[id];
          return cfg && ADV.modules[cfg.module] && ADV.modules[cfg.module].enabled;
        })
      )
    : BASE_SAMPLE_IDS;

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
        row[id] = sampleParam(id, dist);
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

function computeDetectionFilter(countOverride = averagePlanets) {
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
  
  const d_gal_ly = geom.outerLy > 0 ? Math.round(geom.outerLy / 0.85) * 2 : (isGalaxySettingsEnabled ? Math.max(1000, pf('galaxy-diameter')) : 100000);
  const N_planets = Number.isFinite(countOverride) ? Math.max(0, countOverride) : averagePlanets;
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
