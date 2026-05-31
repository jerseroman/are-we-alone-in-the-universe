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
const expectedPresetKeys = Object.keys(SCIENTIFIC_PARAMETER_REGISTRY.presets).sort();
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
const shareSource = fs.readFileSync(path.join(root, 'src', 'share.js'), 'utf8');
const accessibilitySource = fs.readFileSync(path.join(root, 'src', 'accessibility.js'), 'utf8');

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

function arrayEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function extractUiPresetKeys() {
  return uniqueSorted(
    [...indexSource.matchAll(/\bdata-preset=["']([^"']+)["']/g)].map(match => match[1])
  );
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
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.disabled = false;
    this.checked = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.attributes = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  addEventListener() {}
}

function createHarness() {
  const elements = new Map();
  const presetButtons = expectedPresetKeys.map(key => {
    const el = new FakeElement(`preset-${key}`);
    el.dataset.preset = key;
    el.classList.add('preset-btn');
    return el;
  });

  function ensureElement(id) {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  }

  for (const key of parameterKeys) {
    ensureElement(key);
    ensureElement(`${key}_min`);
    ensureElement(`${key}_max`);
  }

  for (const id of [
    'bayes-pre',
    'bayes-post',
    'bayes-note',
    'preset-description',
    'complex-life-toggle',
    'x-toggle'
  ]) {
    ensureElement(id);
  }

  const document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.preset-btn[data-preset]') return presetButtons;
      return [];
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
    requestAnimationFrame() {}
  });

  vm.runInContext(coreSource, context, { filename: 'src/calculator-core.js' });
  vm.runInContext(accessibilitySource, context, { filename: 'src/accessibility.js' });
  vm.runInContext(appSource, context, { filename: 'src/app.js' });
  vm.runInContext(
    `
      invalidateResults = function () {};
      globalThis.__PRESET_TEST_EXPORTS__ = {
        PRESETS,
        BAYES,
        loadPreset,
        setBayesian,
        getActivePreset: () => activePreset,
        getScenarioState,
        getBayesianMode: () => bayesianMode,
        normalizeHistoryStore,
        readHistoryStore,
        writeHistoryStore
      };
    `,
    context,
    { filename: 'preset-test-harness.js' }
  );

  return {
    elements,
    ...context.__PRESET_TEST_EXPORTS__
  };
}

function readValues(elements, ids) {
  return Object.fromEntries(ids.map(id => [id, elements.get(id)?.value]));
}

function writeRegistryDefaults(elements) {
  for (const key of parameterKeys) {
    const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
    elements.get(key).value = String(parameter.central);
    elements.get(`${key}_min`).value = String(parameter.min);
    elements.get(`${key}_max`).value = String(parameter.max);
  }
}

function writePoisonBounds(elements) {
  for (const key of parameterKeys) {
    elements.get(`${key}_min`).value = key === 'N_GHZ' ? '50000000000' : '0.123456789';
    elements.get(`${key}_max`).value = key === 'N_GHZ' ? '400000000000' : '0.987654321';
  }
}

function compareSnapshots(label, before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) {
      fail(`${label}: '${key}' changed from ${before[key]} to ${after[key]}.`);
    }
  }
}

function assertRegistryBounds(label, elements, keys = parameterKeys) {
  for (const key of keys) {
    const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
    const actualMin = Number(elements.get(`${key}_min`)?.value);
    const actualMax = Number(elements.get(`${key}_max`)?.value);

    if (!almostEqual(actualMin, parameter.min)) {
      fail(`${label}: ${key}_min=${actualMin}, expected ${parameter.min}.`);
    }

    if (!almostEqual(actualMax, parameter.max)) {
      fail(`${label}: ${key}_max=${actualMax}, expected ${parameter.max}.`);
    }
  }
}

const harness = createHarness();
const runtimePresetKeys = Object.keys(harness.PRESETS).sort();
const uiPresetKeys = extractUiPresetKeys();

const startupLoadMatch = /window\.addEventListener\(['"]load['"][\s\S]*?loadPreset\(['"]([^'"]+)['"]\)/m.exec(appSource);
if (startupLoadMatch && startupLoadMatch[1] === 'kepler') {
  pass('Startup default preset is Kepler/Gaia.');
} else {
  fail(`Startup default preset is not Kepler/Gaia: ${startupLoadMatch ? startupLoadMatch[1] : 'not found'}.`);
}

const initialDescriptionMatch = /<div class=["']preset-description["'] id=["']preset-description["']>\s*([\s\S]*?)\s*<\/div>/m.exec(indexSource);
const initialDescription = initialDescriptionMatch ? initialDescriptionMatch[1].replace(/\s+/g, ' ').trim() : '';
if (initialDescription.includes('Kepler/Gaia · Bryson') && !initialDescription.includes('Consensus · Lineweaver')) {
  pass('Initial preset description matches the Kepler/Gaia default.');
} else {
  fail(`Initial preset description does not match Kepler/Gaia default: ${initialDescription}`);
}

harness.loadPreset('kepler');
if (harness.getActivePreset() === 'kepler') {
  pass('loadPreset("kepler") selects the Kepler/Gaia scenario.');
} else {
  fail(`loadPreset("kepler") did not select kepler; activePreset=${harness.getActivePreset()}.`);
}
if (harness.getBayesianMode() === 'post') {
  pass('loadPreset("kepler") selects the Updated Kepler/Gaia observational prior.');
} else {
  fail(`loadPreset("kepler") did not select post prior; bayesianMode=${harness.getBayesianMode()}.`);
}
if (/scenario_label:\s*typeof getScenarioExportLabel/.test(shareSource) && /scenario_state:\s*typeof getScenarioState/.test(shareSource) && /bayesianMode/.test(shareSource)) {
  pass('Share/export labels include scenario state, scenario label, and bayesianMode.');
} else {
  fail('Share/export labels do not include scenario state, scenario label, and bayesianMode.');
}

if (arrayEqual(runtimePresetKeys, expectedPresetKeys)) {
  pass(`Runtime preset keys match registry: ${runtimePresetKeys.join(', ')}`);
} else {
  fail(`Runtime preset keys mismatch. Expected ${expectedPresetKeys.join(', ')}, got ${runtimePresetKeys.join(', ')}.`);
}

if (arrayEqual(uiPresetKeys, expectedPresetKeys)) {
  pass(`UI preset keys match registry: ${uiPresetKeys.join(', ')}`);
} else {
  fail(`UI preset keys mismatch. Expected ${expectedPresetKeys.join(', ')}, got ${uiPresetKeys.join(', ')}.`);
}

const obsoleteJwstPatterns = [
  /\bdata-preset=["']jwst["']/i,
  /\bloadPreset\(["']jwst["']\)/i,
  /\bjwst\s*:/i,
  /\.preset-btn\.jwst\b/i
];

if ('jwst' in harness.PRESETS || uiPresetKeys.includes('jwst')) {
  fail('Obsolete jwst preset key still exists in runtime or UI preset keys.');
} else if (obsoleteJwstPatterns.some(pattern => pattern.test(indexSource) || pattern.test(coreSource) || pattern.test(appSource))) {
  fail('Obsolete jwst preset key pattern still exists in source.');
} else {
  pass('No obsolete jwst preset key exists.');
}

const boundIds = parameterKeys.flatMap(key => [`${key}_min`, `${key}_max`]);
const centralIds = parameterKeys.slice();

for (const name of expectedPresetKeys) {
  writeRegistryDefaults(harness.elements);
  writePoisonBounds(harness.elements);

  harness.loadPreset(name);

  assertRegistryBounds(`loadPreset('${name}') reset visible Monte Carlo bounds`, harness.elements);

  const scenario = harness.getScenarioState();
  if (scenario.state !== 'preset' || scenario.activePreset !== name || scenario.isModified) {
    fail(`loadPreset('${name}') left scenario state as ${JSON.stringify(scenario)}.`);
  }

  const preset = harness.PRESETS[name];
  for (const key of parameterKeys) {
    const actual = Number(harness.elements.get(key).value);
    const expected = preset[key];
    if (!almostEqual(actual, expected)) {
      fail(`loadPreset('${name}') did not set central ${key}: actual=${actual}, expected=${expected}.`);
    }
  }
}

if (!failures) {
  pass('loadPreset(name) resets visible custom min/max fields to default preset bounds.');
}

for (const mode of Object.keys(harness.BAYES).sort()) {
  writeRegistryDefaults(harness.elements);
  const boundsBefore = readValues(harness.elements, boundIds);
  const centralBefore = readValues(harness.elements, centralIds);

  harness.setBayesian(mode);

  const boundsAfter = readValues(harness.elements, boundIds);
  const centralAfter = readValues(harness.elements, centralIds);
  compareSnapshots(`setBayesian('${mode}') changed a Monte Carlo bound`, boundsBefore, boundsAfter);

  const expectedOrbit = harness.BAYES[mode].f_orbit;
  const expectedComposition = harness.BAYES[mode].f_composition;

  if (!almostEqual(Number(centralAfter.f_orbit), expectedOrbit)) {
    fail(`setBayesian('${mode}') did not set f_orbit central value.`);
  }
  if (!almostEqual(Number(centralAfter.f_composition), expectedComposition)) {
    fail(`setBayesian('${mode}') did not set f_composition central value.`);
  }

  for (const key of centralIds) {
    if (key === 'f_orbit' || key === 'f_composition') continue;
    if (centralBefore[key] !== centralAfter[key]) {
      fail(`setBayesian('${mode}') unexpectedly changed central ${key}.`);
    }
  }
}

if (!failures) {
  pass('setBayesian(mode) changes only intended central values and leaves current min/max fields unchanged.');
}

const keplerOrbit = SCIENTIFIC_PARAMETER_REGISTRY.presets.kepler.values.f_orbit;
const orbitMax = SCIENTIFIC_PARAMETER_REGISTRY.parameters.f_orbit.max;
if (keplerOrbit <= orbitMax) {
  pass(`Kepler/Gaia f_orbit (${keplerOrbit}) does not exceed registered max (${orbitMax}).`);
} else {
  fail(`Kepler/Gaia f_orbit (${keplerOrbit}) exceeds registered max (${orbitMax}).`);
}

const pessimistLife = SCIENTIFIC_PARAMETER_REGISTRY.presets.pessimist.values.f_complex_life;
const consensusLife = SCIENTIFIC_PARAMETER_REGISTRY.presets.consensus.values.f_complex_life;
if (pessimistLife <= 0.000001 && pessimistLife < consensusLife * 0.001) {
  pass(`Rare Earth f_complex_life (${pessimistLife}) remains clearly lower than consensus (${consensusLife}).`);
} else {
  fail(
    `Rare Earth f_complex_life is not clearly lower than consensus: ` +
    `pessimist=${pessimistLife}, consensus=${consensusLife}.`
  );
}

const expectedGhzPriors = new Map([
  ['pessimist', 5000000000],
  ['consensus', 10000000000],
  ['kepler', 10000000000],
  ['optimist', 40000000000]
]);

for (const [name, expectedN] of expectedGhzPriors) {
  const runtimeN = harness.PRESETS[name].N_GHZ;
  const registryN = SCIENTIFIC_PARAMETER_REGISTRY.presets[name].values.N_GHZ;
  if (runtimeN === expectedN && registryN === expectedN) {
    pass(`${name} N_GHZ prior is ${expectedN}.`);
  } else {
    fail(`${name} N_GHZ prior mismatch: runtime=${runtimeN}, registry=${registryN}, expected=${expectedN}.`);
  }
}

const nGhzRegistry = SCIENTIFIC_PARAMETER_REGISTRY.parameters.N_GHZ;
if (nGhzRegistry.valueType === 'interpretive_midpoint') {
  pass('N_GHZ registry is documented as LI_INTERPRETIVE_PRIOR.');
} else {
  fail(`N_GHZ registry valueType is ${nGhzRegistry.valueType}, expected interpretive_midpoint.`);
}

const directCalibrationToken = 'LC_' + 'DIRECT';
const nGhzDirectPattern = new RegExp(
  `${directCalibrationToken}[\\s\\S]*N_GHZ|N_GHZ[\\s\\S]*${directCalibrationToken}`
);
if (!nGhzDirectPattern.test(indexSource + coreSource + appSource + shareSource)) {
  pass('N_GHZ is not documented as directly literature-calibrated in runtime/UI/share sources.');
} else {
  fail('N_GHZ is incorrectly documented as directly literature-calibrated.');
}

const forbiddenDirectLineweaverPhrase = ['direct', 'Lineweaver', 'star count'].join(' ').toLowerCase();
if (/not directly quoted/i.test(indexSource) && !indexSource.toLowerCase().includes(forbiddenDirectLineweaverPhrase)) {
  pass('N_GHZ tooltip states that the value is not directly quoted and avoids direct star-count wording.');
} else {
  fail('N_GHZ tooltip does not clearly state that the value is not directly quoted.');
}

const oldHistory = [{ date: 'old', scenario: 'consensus' }];
const migratedHistory = harness.normalizeHistoryStore(oldHistory);
if (migratedHistory.schemaVersion === 1 && migratedHistory.items === oldHistory) {
  pass('Legacy raw simHistory array migrates to schemaVersion 1.');
} else {
  fail('Legacy raw simHistory array did not migrate to { schemaVersion: 1, items }.');
}

const corruptedHistory = harness.normalizeHistoryStore('not-an-object');
if (corruptedHistory.schemaVersion === 1 && Array.isArray(corruptedHistory.items) && corruptedHistory.items.length === 0) {
  pass('Corrupted simHistory payload normalizes to an empty schemaVersion 1 store.');
} else {
  fail('Corrupted simHistory payload did not safely normalize to an empty store.');
}

const memoryStorage = {
  value: JSON.stringify(oldHistory),
  getItem() { return this.value; },
  setItem(key, value) { this.key = key; this.value = value; },
  removeItem() { this.value = null; }
};
const readMigrated = harness.readHistoryStore(memoryStorage);
harness.writeHistoryStore(readMigrated, memoryStorage);
const persisted = JSON.parse(memoryStorage.value);
if (persisted.schemaVersion === 1 && Array.isArray(persisted.items) && persisted.items.length === 1) {
  pass('readHistoryStore/writeHistoryStore persist schemaVersion 1 format.');
} else {
  fail('readHistoryStore/writeHistoryStore did not persist schemaVersion 1 format.');
}

const throwingStorage = {
  getItem() { throw new Error('bad storage'); },
  setItem() { throw new Error('bad storage'); },
  removeItem() { throw new Error('bad storage'); }
};
const safeHistory = harness.readHistoryStore(throwingStorage);
if (safeHistory.schemaVersion === 1 && Array.isArray(safeHistory.items) && safeHistory.items.length === 0) {
  pass('Bad localStorage read is ignored safely.');
} else {
  fail('Bad localStorage read did not return a safe empty history store.');
}

if (failures) {
  process.stderr.write(`Preset invariant test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Preset invariant test completed.');
