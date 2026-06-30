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

const scenarioOrder = ['pessimist', 'consensus', 'kepler', 'optimist'];
const expectedOutputs = {
  pessimist: 0.000006804000000000001,
  consensus: 13778.1,
  kepler: 35363.79,
  optimist: 30086210.699999988
};

function almostEqual(actual, expected, relTol = 1e-12, absTol = 1e-18) {
  return Math.abs(actual - expected) <= Math.max(absTol, Math.abs(expected) * relTol);
}

function fail(message) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exitCode = 1;
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function loadRuntimeCalculator() {
  const corePath = path.join(root, 'src', 'calculator-core.js');
  const source = fs.readFileSync(corePath, 'utf8');
  const context = vm.createContext({ console });
  vm.runInContext(
    `${source}\n;globalThis.__NUMERIC_TEST_EXPORTS__ = { PRESETS, computePlanetsAdvanced, fmtExistencePct, fmtPct, nearlyEqual, buildDistanceScenario };`,
    context,
    { filename: corePath }
  );
  return context.__NUMERIC_TEST_EXPORTS__;
}

function makeElement(value, min = null, max = null) {
  return {
    value: String(value),
    min: min === null ? '' : String(min),
    max: max === null ? '' : String(max),
    getAttribute(name) {
      if (name === 'min') return this.min || null;
      if (name === 'max') return this.max || null;
      return null;
    }
  };
}

function snapshotValues(elements, ids = null) {
  const out = {};
  const source = ids || [...elements.keys()];
  source.forEach(id => {
    const el = elements.get(id);
    if (el) out[id] = el.value;
  });
  return out;
}

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function loadValidationCalculator() {
  const corePath = path.join(root, 'src', 'calculator-core.js');
  const source = fs.readFileSync(corePath, 'utf8');
  const elements = new Map();

  SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder.forEach(key => {
    const parameter = SCIENTIFIC_PARAMETER_REGISTRY.parameters[key];
    const isProbability = parameter.unit === 'fraction';
    elements.set(key, makeElement(parameter.central, isProbability ? 0 : 0, isProbability ? 1 : null));
    elements.set(`${key}_min`, makeElement(parameter.min, isProbability ? 0 : 0, isProbability ? 1 : null));
    elements.set(`${key}_max`, makeElement(parameter.max, isProbability ? 0 : 0, isProbability ? 1 : null));
  });

  elements.set('adv_f_atm_ret', makeElement(0.5, 0, 1));
  elements.set('adv_f_atm_ret_min', makeElement(0.1, 0, 1));
  elements.set('adv_f_atm_ret_max', makeElement(0.8, 0, 1));
  elements.set('adv_f_vol_del', makeElement(0.4, 0, 1));
  elements.set('adv_f_vol_del_min', makeElement(0.15, 0, 1));
  elements.set('adv_f_vol_del_max', makeElement(0.7, 0, 1));
  elements.set('adv_f_wat_ret', makeElement(0.35, 0, 1));
  elements.set('adv_f_wat_ret_min', makeElement(0.1, 0, 1));
  elements.set('adv_f_wat_ret_max', makeElement(0.6, 0, 1));

  const context = vm.createContext({
    console,
    document: {
      getElementById(id) {
        return elements.get(id) || null;
      }
    }
  });

  vm.runInContext(
    `${source}\n;globalThis.__VALIDATION_TEST_EXPORTS__ = {
      ADV,
      getInputs,
      getInputValidationWarnings,
      getBoundValidationWarnings,
      getConfigurationWarnings,
      getParamSamplingState,
      buildResolvedModelState,
      clearBoundIntervalWarnings,
      applyAdvancedModules,
      setH2OEnabled(value) { isH2OEnabled = !!value; },
      computePlanetsAdvanced
    };`,
    context,
    { filename: corePath }
  );

  return {
    elements,
    ...context.__VALIDATION_TEST_EXPORTS__
  };
}

function runtimeInputFromPreset(preset) {
  return {
    ...preset,
    f_complex_life: preset.enableComplex ? preset.f_complex_life : 1,
    f_x: preset.enableX ? preset.f_x : 1
  };
}

function registryInputFromPreset(preset) {
  return {
    ...preset.values,
    f_complex_life: preset.enableComplex ? preset.values.f_complex_life : 1,
    f_x: preset.enableX ? preset.values.f_x : 1
  };
}

function comparePresetValues(name, runtimePreset, registryPreset) {
  if (!registryPreset) {
    fail(`Missing registry preset '${name}'.`);
    return;
  }

  for (const key of SCIENTIFIC_PARAMETER_REGISTRY.parameterOrder) {
    const runtimeValue = runtimePreset[key];
    const registryValue = registryPreset.values[key];
    if (!almostEqual(runtimeValue, registryValue)) {
      fail(
        `Registry/runtime preset mismatch for ${name}.${key}: ` +
        `runtime=${runtimeValue}, registry=${registryValue}`
      );
    }
  }

  if (runtimePreset.enableComplex !== registryPreset.enableComplex) {
    fail(`Registry/runtime enableComplex mismatch for '${name}'.`);
  }
  if (runtimePreset.enableX !== registryPreset.enableX) {
    fail(`Registry/runtime enableX mismatch for '${name}'.`);
  }
}

const { PRESETS, computePlanetsAdvanced } = loadRuntimeCalculator();
const actualOutputs = {};

{
  const { nearlyEqual } = loadRuntimeCalculator();
  if (nearlyEqual(1e-9, 2e-9)) {
    fail('nearlyEqual treats 1e-9 and 2e-9 as equal; tiny bound edits would be missed.');
  } else if (!nearlyEqual(1e-9, 1e-9 + 1e-13)) {
    fail('nearlyEqual is too strict for harmless tiny floating-point noise.');
  } else {
    pass('nearlyEqual preserves tiny bound edit detection while tolerating floating-point noise.');
  }
}

for (const name of scenarioOrder) {
  const preset = PRESETS[name];
  if (!preset) {
    fail(`Missing runtime preset '${name}'.`);
    continue;
  }

  const registryPreset = SCIENTIFIC_PARAMETER_REGISTRY.presets[name];
  comparePresetValues(name, preset, registryPreset);

  const actual = computePlanetsAdvanced(runtimeInputFromPreset(preset));
  const expected = expectedOutputs[name];
  actualOutputs[name] = actual;

  if (!almostEqual(actual, expected)) {
    fail(
      `Unexpected deterministic output for '${name}': ` +
      `actual=${actual}, expected=${expected}, diff=${actual - expected}`
    );
    continue;
  }

  const registryActual = computePlanetsAdvanced(registryInputFromPreset(registryPreset));
  if (!almostEqual(registryActual, expected)) {
    fail(
      `Unexpected registry deterministic output for '${name}': ` +
      `actual=${registryActual}, expected=${expected}, diff=${registryActual - expected}`
    );
    continue;
  }

  pass(`${name} deterministic output = ${actual}`);
}

if (
  !(
    actualOutputs.pessimist < actualOutputs.consensus &&
    actualOutputs.consensus < actualOutputs.kepler &&
    actualOutputs.kepler < actualOutputs.optimist
  )
) {
  fail(
    'Scenario ordering changed: expected pessimist < consensus < kepler < optimist, got ' +
    scenarioOrder.map(name => `${name}=${actualOutputs[name]}`).join(', ')
  );
} else {
  pass('Scenario ordering pessimist < consensus < kepler < optimist');
}

const validationCases = [
  { name: 'nanOrbit', field: 'f_orbit', raw: 'NaN', expected: 0 },
  { name: 'stringOrbit', field: 'f_orbit', raw: 'not-a-number', expected: 0 },
  { name: 'hugeOrbit', field: 'f_orbit', raw: '10', expected: 1 },
  { name: 'negativeOrbit', field: 'f_orbit', raw: '-0.5', expected: 0 },
  { name: 'emptyN', field: 'N_GHZ', raw: '', expected: 0 }
];

for (const testCase of validationCases) {
  const calculator = loadValidationCalculator();
  calculator.elements.get(testCase.field).value = testCase.raw;

  const inputs = calculator.getInputs();
  const warnings = calculator.getInputValidationWarnings();
  const normalized = inputs[testCase.field];
  const domValue = calculator.elements.get(testCase.field).value;
  const warning = warnings.find(item => item.id === testCase.field);
  const output = calculator.computePlanetsAdvanced(inputs);

  if (!almostEqual(normalized, testCase.expected)) {
    fail(`${testCase.name}: expected normalized ${testCase.field}=${testCase.expected}, got ${normalized}.`);
    continue;
  }

  if (domValue !== testCase.raw) {
    fail(`${testCase.name}: getInputs() mutated DOM value from ${testCase.raw} to ${domValue}.`);
    continue;
  }

  if (!warning) {
    fail(`${testCase.name}: semantic correction happened without a validation warning.`);
    continue;
  }

  if (!Number.isFinite(output) || output < 0) {
    fail(`${testCase.name}: normalized input produced invalid output ${output}.`);
    continue;
  }

  pass(`${testCase.name} normalizes calculation value without mutating DOM for ${testCase.field}.`);
}

const boundCases = [
  {
    name: 'minGreaterThanMax',
    field: 'f_orbit',
    mutate(calc) {
      calc.elements.get('f_orbit').value = '0.5';
      calc.elements.get('f_orbit_min').value = '0.8';
      calc.elements.get('f_orbit_max').value = '0.2';
    },
    expect(calc) {
      const state = calc.getParamSamplingState('f_orbit');
      return state.lo === 0.2 && state.hi === 0.8;
    }
  },
  {
    name: 'probabilityMinBelowZero',
    field: 'f_orbit',
    mutate(calc) {
      calc.elements.get('f_orbit_min').value = '-0.3';
    },
    expect(calc) {
      return calc.getParamSamplingState('f_orbit').lo === 0;
    }
  },
  {
    name: 'probabilityMaxAboveOne',
    field: 'f_orbit',
    mutate(calc) {
      calc.elements.get('f_orbit_max').value = '1.7';
    },
    expect(calc) {
      return calc.getParamSamplingState('f_orbit').hi === 1;
    }
  }
];

for (const testCase of boundCases) {
  const calculator = loadValidationCalculator();
  testCase.mutate(calculator);
  const before = snapshotValues(calculator.elements, [testCase.field, `${testCase.field}_min`, `${testCase.field}_max`]);
  const ok = testCase.expect(calculator);
  const after = snapshotValues(calculator.elements, [testCase.field, `${testCase.field}_min`, `${testCase.field}_max`]);
  const warnings = calculator.getBoundValidationWarnings();
  const configWarnings = calculator.getConfigurationWarnings();

  if (!ok) {
    fail(`${testCase.name}: sampling state was not normalized correctly.`);
    continue;
  }

  if (!warnings.length || !configWarnings.some(w => w.label === 'Monte Carlo bounds normalized')) {
    fail(`${testCase.name}: bound normalization happened without visible warning state.`);
    continue;
  }

  if (!snapshotsEqual(before, after)) {
    fail(`${testCase.name}: sampling state mutated DOM bounds from ${JSON.stringify(before)} to ${JSON.stringify(after)}.`);
    continue;
  }

  pass(`${testCase.name} normalizes Monte Carlo bounds locally with visible warning state.`);
}

[
  {
    name: 'probabilityZeroWithWidth',
    mutate(calc) {
      calc.elements.get('f_orbit').value = '0';
      calc.elements.get('f_orbit_min').value = '0';
      calc.elements.get('f_orbit_max').value = '0.2';
    }
  },
  {
    name: 'probabilityOneWithWidth',
    mutate(calc) {
      calc.elements.get('f_orbit').value = '1';
      calc.elements.get('f_orbit_min').value = '0.8';
      calc.elements.get('f_orbit_max').value = '1';
    }
  }
].forEach(testCase => {
  const calculator = loadValidationCalculator();
  testCase.mutate(calculator);
  const before = snapshotValues(calculator.elements, ['f_orbit', 'f_orbit_min', 'f_orbit_max']);
  const state = calculator.getParamSamplingState('f_orbit');
  const after = snapshotValues(calculator.elements, ['f_orbit', 'f_orbit_min', 'f_orbit_max']);
  const warning = calculator
    .getBoundValidationWarnings()
    .find(item => item.code === 'PROBABILITY_BOUNDARY_WITH_WIDTH');

  if (!warning) {
    fail(`${testCase.name}: expected PROBABILITY_BOUNDARY_WITH_WIDTH warning.`);
  } else if (!snapshotsEqual(before, after)) {
    fail(`${testCase.name}: boundary warning path mutated DOM from ${JSON.stringify(before)} to ${JSON.stringify(after)}.`);
  } else if (!(state.lo < state.hi)) {
    fail(`${testCase.name}: expected non-degenerate sampling interval, got ${JSON.stringify(state)}.`);
  } else {
    pass(`${testCase.name} emits PROBABILITY_BOUNDARY_WITH_WIDTH without mutating DOM.`);
  }
});

{
  const calculator = loadValidationCalculator();
  calculator.elements.get('f_orbit').value = 'not-a-number';
  calculator.elements.get('f_orbit_min').value = '0.9';
  calculator.elements.get('f_orbit_max').value = '0.1';
  const before = snapshotValues(calculator.elements);
  const state = calculator.buildResolvedModelState();
  const after = snapshotValues(calculator.elements);

  if (!state || typeof state !== 'object') {
    fail('buildResolvedModelStateNoDomMutation: resolved state was not returned.');
  } else if (!snapshotsEqual(before, after)) {
    fail(`buildResolvedModelStateNoDomMutation: DOM mutated from ${JSON.stringify(before)} to ${JSON.stringify(after)}.`);
  } else {
    pass('buildResolvedModelState() reads normalized state without mutating DOM inputs.');
  }
}

[
  { name: 'advancedInputAboveOne', raw: '2', expected: 1 },
  { name: 'advancedInputBelowZero', raw: '-0.5', expected: 0 }
].forEach(testCase => {
  const calculator = loadValidationCalculator();
  calculator.ADV.enabled = true;
  calculator.ADV.modules.atmRet.enabled = true;
  calculator.elements.get('adv_f_atm_ret').value = testCase.raw;
  const base = calculator.getInputs();
  const full = calculator.applyAdvancedModules(base);
  const warning = calculator.getInputValidationWarnings().find(item => item.id === 'adv_f_atm_ret');

  if (full._f_atm_ret !== testCase.expected) {
    fail(`${testCase.name}: expected advanced value ${testCase.expected}, got ${full._f_atm_ret}.`);
  } else if (calculator.elements.get('adv_f_atm_ret').value !== testCase.raw) {
    fail(`${testCase.name}: advanced read path mutated DOM to ${calculator.elements.get('adv_f_atm_ret').value}.`);
  } else if (!warning) {
    fail(`${testCase.name}: advanced clamp happened without visible validation warning.`);
  } else {
    pass(`${testCase.name} normalizes advanced calculation value without mutating DOM.`);
  }
});

{
  const calculator = loadValidationCalculator();
  calculator.setH2OEnabled(false);
  calculator.ADV.enabled = true;
  calculator.ADV.modules.volatileSplit.enabled = true;
  calculator.elements.get('adv_f_vol_del').value = '0.08';
  calculator.elements.get('adv_f_wat_ret').value = '0.09';
  const base = calculator.getInputs();
  const full = calculator.applyAdvancedModules(base);

  if (base.f_H2O === 1 && full.f_H2O === 1) {
    pass('H2O disabled remains multiplicative 1 even when volatile delivery / retention is enabled.');
  } else {
    fail(`H2O disabled was not neutral with volatile split enabled: base=${base.f_H2O}, full=${full.f_H2O}.`);
  }
}

// ─── fmtExistencePct: sparse probability display precision ───────────────────
{
  const { fmtExistencePct, fmtPct, buildDistanceScenario } = loadRuntimeCalculator();

  // λ = 1.28e-6  →  P ≈ 1.28e-6, pct ≈ 1.28e-4 %  (well below 0.01 %)
  const lambda = 1.28e-6;
  const prob = 1 - Math.exp(-lambda);
  const result = fmtExistencePct(prob);
  if (/0\.0+%$/.test(result) || result === '0.0%' || result === '0.00%') {
    fail(`fmtExistencePct(λ=1.28e-6): displayed as "${result}" which looks like exactly zero.`);
  } else if (result.includes('%') && (result.includes('≈') || result.includes('1 in'))) {
    pass(`fmtExistencePct(λ=1.28e-6): "${result}" — correctly shows nonzero probability.`);
  } else {
    fail(`fmtExistencePct(λ=1.28e-6): unexpected format "${result}".`);
  }

  // "1 in X" odds must be present for sub-0.01 % probabilities.
  if (result.includes('1 in')) {
    pass(`fmtExistencePct(λ=1.28e-6): includes "1 in X" odds.`);
  } else {
    fail(`fmtExistencePct(λ=1.28e-6): missing "1 in X" odds in "${result}".`);
  }

  // prob = 0 must display as exactly "0%".
  const zeroResult = fmtExistencePct(0);
  if (zeroResult === '0%') {
    pass(`fmtExistencePct(0): correctly returns "0%".`);
  } else {
    fail(`fmtExistencePct(0): expected "0%", got "${zeroResult}".`);
  }

  // λ = 0.01 (1 %) — normal range, no "1 in" odds needed.
  const normalProb = 1 - Math.exp(-0.01);
  const normalResult = fmtExistencePct(normalProb);
  if (!/0\.0+%$/.test(normalResult) && normalResult.includes('%')) {
    pass(`fmtExistencePct(λ=0.01): "${normalResult}" — uses normal percentage format.`);
  } else {
    fail(`fmtExistencePct(λ=0.01): unexpected format "${normalResult}".`);
  }

  // Pessimist deterministic output (λ ≈ 1.28e-6) must not display "0.0%" or "0.00%".
  const pessimistLambda = expectedOutputs.pessimist;
  const pessimistProb = 1 - Math.exp(-Math.max(0, pessimistLambda));
  const pessimistResult = fmtExistencePct(pessimistProb);
  if (pessimistResult === '0.0%' || pessimistResult === '0.00%' || /^0\.0+%$/.test(pessimistResult)) {
    fail(`Pessimist existence probability: displayed as "${pessimistResult}" — looks like zero.`);
  } else {
    pass(`Pessimist existence probability: "${pessimistResult}" — nonzero display confirmed.`);
  }

  const sparseScenario = buildDistanceScenario(0.01);
  const sparseHtml = sparseScenario && sparseScenario.html ? sparseScenario.html : '';
  if (
    sparseScenario &&
    sparseScenario.kind === 'sparse' &&
    sparseHtml.includes('0.995%') &&
    !/\b99(?:\.0+)?%/.test(sparseHtml)
  ) {
    pass('Sparse distance scenario uses P(at least one) = 1 - exp(-count), not the inverted survival probability.');
  } else {
    fail(`Sparse distance scenario probability regression failed: kind=${sparseScenario?.kind}, html="${sparseHtml}".`);
  }
}

if (process.exitCode) {
  process.stderr.write('Deterministic numerical regression test failed.\n');
  process.exit(process.exitCode);
}

pass('Deterministic numerical regression test completed.');
