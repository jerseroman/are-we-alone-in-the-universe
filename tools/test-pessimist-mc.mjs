#!/usr/bin/env node
// Unified Monte Carlo diagnostic across all named presets.
//
// All presets (Pessimist / Rare Earth, Consensus / Lineweaver,
// High-End / Literature Bounds, Kepler/Gaia · Bryson) must now share the
// same balanced Monte Carlo sampling semantics: sampling depends only on
// the active central / min / max values and the selected distribution,
// never on the preset name. This file:
//
//   * exercises each preset under a seeded Monte Carlo run,
//   * checks that the reported bounds mode and label are identical,
//   * checks that no preset is artificially degenerated (q2.5 < q97.5),
//   * checks that N_GHZ and f_complex_life are sampled with non-trivial
//     intervals (the old Pessimist edge-constraint is gone),
//   * checks that editing only N_GHZ keeps the same balanced method (no
//     hybrid mode that special-cases other parameters), and
//   * checks that a genuine bounds collapse (min == max) still pins the
//     sampler to that single value via the generic degenerate guard.

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

const iterations = 1500;
let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function fmt(value) {
  return Number.isFinite(value) ? value.toPrecision(8) : String(value);
}

function approxEqual(actual, expected, relTol = 1e-9, absTol = 1e-18) {
  return Math.abs(actual - expected) <= Math.max(absTol, Math.abs(expected) * relTol);
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

  ensure('iterations', iterations);
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

  ['loading', 'monteCarloResult', 'stats', 'distance', 'whereAreTheyBtn']
    .forEach(id => ensure(id));

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
    setTimeout(fn) { fn(); return 1; }
  });

  vm.runInContext(
    `${source}\n;globalThis.__PESS_MC_TEST_EXPORTS__ = {
      PRESETS,
      runMonteCarloSimulation,
      monteCarloCalculate,
      createSeededRng,
      getParamSamplingState,
      getMonteCarloBoundsDescriptor,
      getScenarioState,
      sampleParam,
      markScenarioModified,
      loadPresetForTest(name) {
        const preset = PRESETS[name];
        if (!preset) throw new Error('Unknown preset: ' + name);
        setScenarioPreset(name);
        // Use the real preset-loading entry point so it sets both central
        // values AND preset-local min/max bounds (±0.3 dex convention).
        applyPresetParameterState(preset);
        isComplexLifeEnabled = !!preset.enableComplex;
        isXEnabled = !!preset.enableX;
        return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
      },
      editFieldForTest(fieldId, newValue) {
        const el = document.getElementById(fieldId);
        if (!el) throw new Error('Unknown field: ' + fieldId);
        el.value = String(newValue);
        markScenarioModified();
        return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
      }
    };`,
    context,
    { filename: 'src/calculator-core.js' }
  );

  return context.__PESS_MC_TEST_EXPORTS__;
}

// ============================================================================
// (1) Sanity: each preset's deterministic chain produces the expected anchor
//     value. Confirms the preset central values themselves are unchanged.
// ============================================================================
const expectedDeterministics = {
  pessimist: 1.27575e-6,
  consensus: 2733.75,
  kepler: 10524.9375,
  optimist: 7669034.1
};

const presetKeys = ['pessimist', 'consensus', 'kepler', 'optimist'];
const presetSummaries = {};

for (const key of presetKeys) {
  const calc = loadCalculator();
  const det = calc.loadPresetForTest(key);
  const expected = expectedDeterministics[key];
  if (approxEqual(det, expected, 1e-9)) {
    pass(`${key}: deterministic chain = ${fmt(det)} (matches expected ${expected}).`);
  } else {
    fail(`${key}: deterministic chain ${fmt(det)} does not match expected ${expected}.`);
  }
  presetSummaries[key] = { calc, det };
}

// ============================================================================
// (2) All named presets must default to scenario-local Monte Carlo.
//     Local mode is centered on the selected preset central values, not on
//     the broad registry/global envelope.
// ============================================================================
const observedModes = new Set();
const observedLabels = new Set();
for (const key of presetKeys) {
  const calc = loadCalculator();
  calc.loadPresetForTest(key);
  const desc = calc.getMonteCarloBoundsDescriptor();
  observedModes.add(desc.mode);
  observedLabels.add(desc.label);
  if (desc.mode === 'presetLocal' && desc.label === 'Scenario-local preset uncertainty') {
    pass(`${key}: MC mode="presetLocal", label="Scenario-local preset uncertainty".`);
  } else {
    fail(`${key}: expected scenario-local preset MC; got mode="${desc.mode}", label="${desc.label}".`);
  }
}
if (observedModes.size === 1 && observedLabels.size === 1) {
  pass(`All four presets share the same presetLocal MC mode and label.`);
} else {
  fail(
    `Presets do not share a unified MC bounds mode/label. ` +
    `Modes seen: ${[...observedModes].join(', ')}. Labels seen: ${[...observedLabels].join(' | ')}.`
  );
}

// ============================================================================
// (3) Pessimist scenario-local bounds must be non-degenerate but centered
//     around the Pessimist preset point rather than the global registry range.
// ============================================================================
{
  const calc = loadCalculator();
  calc.loadPresetForTest('pessimist');
  const nState = calc.getParamSamplingState('N_GHZ');
  const fState = calc.getParamSamplingState('f_complex_life');

  if (nState.lo < nState.meanVal && nState.meanVal < nState.hi && nState.basis === 'scenario-local') {
    pass(
      `Pessimist N_GHZ uses scenario-local bounds centered on the preset ` +
      `(lo=${nState.lo}, central=${nState.meanVal}, hi=${nState.hi}).`
    );
  } else {
    fail(
      `Pessimist N_GHZ bounds are not scenario-local around the preset point: ` +
      `lo=${nState.lo}, central=${nState.meanVal}, hi=${nState.hi}, basis=${nState.basis}.`
    );
  }

  if (fState.lo < fState.meanVal && fState.meanVal < fState.hi && fState.hi < 1e-4 && fState.basis === 'scenario-local') {
    pass(
      `Pessimist f_complex_life uses local Rare Earth bounds ` +
      `(lo=${fmt(fState.lo)}, central=${fmt(fState.meanVal)}, hi=${fmt(fState.hi)}).`
    );
  } else {
    fail(
      `Pessimist f_complex_life is not local to 1e-6: ` +
      `lo=${fmt(fState.lo)}, central=${fmt(fState.meanVal)}, hi=${fmt(fState.hi)}, basis=${fState.basis}.`
    );
  }
}

// ============================================================================
// (4) Monte Carlo summary for each preset: q2.5 < q97.5 (non-degenerate),
//     mean is finite and positive, and the bounds label is unified.
// ============================================================================
for (const key of presetKeys) {
  const calc = loadCalculator();
  const det = calc.loadPresetForTest(key);
  const summary = calc.monteCarloCalculate({
    samples: iterations,
    seed: 20260524,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent',
    updateUi: false
  });

  if (!summary || !Number.isFinite(summary.mean) || summary.mean <= 0) {
    fail(`${key}: Monte Carlo did not return a valid positive mean.`);
    continue;
  }

  if (summary.p025 < summary.p975) {
    pass(
      `${key} MC: mean=${fmt(summary.mean)}, q2.5=${fmt(summary.p025)}, ` +
      `q97.5=${fmt(summary.p975)} (non-degenerate, span ${fmt(summary.p975 / summary.p025)}x).`
    );
  } else {
    fail(
      `${key} MC degenerate (q2.5=q97.5=${fmt(summary.p025)}) under presetLocal sampling.`
    );
  }

  if (summary.boundsMode === 'presetLocal' && summary.boundsLabel === 'Scenario-local preset uncertainty') {
    pass(`${key} MC: mode is presetLocal scenario-local uncertainty.`);
  } else {
    fail(`${key} MC: expected presetLocal scenario-local uncertainty; got ${summary.boundsMode} / "${summary.boundsLabel}".`);
  }

  const median = summary.median ?? summary.p500;
  if (Number.isFinite(median) && median > 0) {
    const logRatio = Math.log10(median / det);
    if (Math.abs(logRatio) <= 0.5) {
      pass(`${key} MC: q50 ${fmt(median)} remains within 0.5 dex of deterministic ${fmt(det)} (${logRatio.toFixed(2)} dex).`);
    } else {
      fail(`${key} MC: q50 ${fmt(median)} differs from deterministic ${fmt(det)} by ${logRatio.toFixed(2)} dex.`);
    }
  } else {
    fail(`${key} MC: median ${fmt(median)} is not a positive finite value.`);
  }

  presetSummaries[key].summary = summary;
}

// ============================================================================
// (5) Generic degenerate guard: when the user manually sets min == max == mean,
//     sampleParam must return that single value. This collapse is allowed only
//     when actual bounds are degenerate, not when the preset is Pessimist.
// ============================================================================
{
  const calc = loadCalculator();
  calc.loadPresetForTest('consensus');
  // Force degenerate bounds on N_GHZ.
  calc.editFieldForTest('N_GHZ', 1e10);
  calc.editFieldForTest('N_GHZ_min', 1e10);
  calc.editFieldForTest('N_GHZ_max', 1e10);
  const nState = calc.getParamSamplingState('N_GHZ');
  if (nState.lo === nState.hi && nState.lo === 1e10) {
    pass(`Generic degenerate guard: min==max==central collapses N_GHZ to ${nState.lo}.`);
  } else {
    fail(
      `Generic degenerate guard failed: N_GHZ lo=${nState.lo}, hi=${nState.hi} ` +
      `after forcing min==max==1e10.`
    );
  }

  let nghzDrift = 0;
  for (let i = 0; i < 100; i++) {
    if (calc.sampleParam('N_GHZ', 'lognormal') !== 1e10) nghzDrift += 1;
  }
  if (nghzDrift === 0) {
    pass(`Generic degenerate guard: 100/100 N_GHZ samples are exactly 1e10.`);
  } else {
    fail(`Generic degenerate guard: ${nghzDrift}/100 N_GHZ samples drifted from 1e10.`);
  }
}

// ============================================================================
// (6) Modified preset behaviour: editing only N_GHZ switches to
//     modifiedPresetLocal. Edited fields use visible bounds; unchanged preset
//     fields keep scenario-local preset uncertainty.
// ============================================================================
{
  const calc = loadCalculator();
  const baselineDet = calc.loadPresetForTest('pessimist');
  const modDet = calc.editFieldForTest('N_GHZ', 5e10);
  const ratio = modDet / baselineDet;
  if (approxEqual(ratio, 10, 1e-9)) {
    pass(`Editing only N_GHZ from 5e9 to 5e10 scales deterministic exactly 10x.`);
  } else {
    fail(`Editing only N_GHZ did not scale deterministic by exactly 10x; got ratio ${ratio}.`);
  }

  const desc = calc.getMonteCarloBoundsDescriptor();
  if (desc.mode === 'modifiedPresetLocal' && /Modified preset-local uncertainty/.test(desc.label)) {
    pass(
      `Modified Pessimist uses modified preset-local uncertainty ` +
      `(mode="${desc.mode}").`
    );
  } else {
    fail(
      `Modified Pessimist should produce modified preset-local uncertainty; ` +
      `got mode="${desc.mode}", label="${desc.label}".`
    );
  }

  // f_complex_life is unedited, so under modifiedPresetLocal it keeps
  // scenario-local preset uncertainty (a non-degenerate band, not visible bounds).
  const fState = calc.getParamSamplingState('f_complex_life');
  if (fState.lo < fState.hi && fState.basis === 'scenario-local') {
    pass(
      `Modified Pessimist: unedited f_complex_life keeps scenario-local uncertainty ` +
      `(lo=${fmt(fState.lo)}, hi=${fmt(fState.hi)}, basis=${fState.basis}).`
    );
  } else {
    fail(
      `Modified Pessimist: unedited f_complex_life basis was ${fState.basis} ` +
      `(lo=${fState.lo}, hi=${fState.hi}); expected non-degenerate scenario-local.`
    );
  }
}

// ============================================================================
// (7) Modified Consensus / Kepler / Optimist also use modifiedPresetLocal mode.
// ============================================================================
for (const key of ['consensus', 'kepler', 'optimist']) {
  const calc = loadCalculator();
  calc.loadPresetForTest(key);
  calc.editFieldForTest('N_GHZ', 2e10);
  const desc = calc.getMonteCarloBoundsDescriptor();
  if (desc.mode === 'modifiedPresetLocal') {
    pass(`Modified ${key} reports modifiedPresetLocal mode.`);
  } else {
    fail(`Modified ${key} reports mode="${desc.mode}" instead of "modifiedPresetLocal".`);
  }
}

// ============================================================================
// (8) Diagnostic summary table — printed for visibility, not asserted.
// ============================================================================
process.stdout.write('\nDiagnostic: per-preset MC summary under presetLocal sampling\n');
process.stdout.write('preset      | deterministic       | MC arithmetic mean  | q2.5                | q50/median         | q97.5\n');
process.stdout.write('------------+---------------------+---------------------+---------------------+--------------------+-----------------\n');
for (const key of presetKeys) {
  const e = presetSummaries[key];
  if (!e || !e.summary) continue;
  const sorted = e.summary.results.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  process.stdout.write(
    `${key.padEnd(11)} | ${fmt(e.det).padEnd(19)} | ${fmt(e.summary.mean).padEnd(19)} | ` +
    `${fmt(e.summary.p025).padEnd(19)} | ${fmt(median).padEnd(18)} | ${fmt(e.summary.p975)}\n`
  );
}
process.stdout.write('\n');

if (failures) {
  process.stderr.write(`Preset-local Monte Carlo regression test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass('Preset-local Monte Carlo regression test completed for all four presets.');
