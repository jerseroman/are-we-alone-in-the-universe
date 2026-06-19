function copyToClipboard(event, sourceId = 'fermi-copy-source') {
  const source = byId(sourceId);
  if (!source) return;

  const el = source.cloneNode(true);
  const plain = el.innerText;
  const tt = byId('copy-tooltip');

  if (event && tt) {
    tt.style.left = `${event.clientX + 10}px`;
    tt.style.top = `${event.clientY - 30}px`;
    tt.style.opacity = '1';
    setTimeout(() => {
      tt.style.opacity = '0';
    }, 1500);
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(plain).catch(() => {});
  }
}
window.copyToClipboard = copyToClipboard;

function normalizeShareText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function stripShareLead(text) {
  return normalizeShareText(text).replace(/^(DETERMINISTIC|MONTE CARLO|DISTANCE)\s*[·•]\s*/i, '');
}

function buildShareSummary() {
  const deterministic = normalizeShareText((byId('deterministicResult') || {}).textContent);
  const monteCarlo = normalizeShareText((byId('monteCarloResult') || {}).textContent);
  const simulationModel = normalizeShareText((byId('simulationModel') || {}).textContent);
  const distance = normalizeShareText((byId('distance') || {}).textContent);
  const primary = monteCarlo || deterministic;

  if (primary && simulationModel && distance) return `${primary} ${simulationModel} Distance: ${distance}`;
  if (primary && simulationModel) return `${primary} ${simulationModel}`;
  if (primary && distance) return `${primary} Distance: ${distance}`;
  if (primary) return primary;
  if (distance) return `Distance result for ${galaxyName}: ${distance}`;
  return `Explore Are We Alone in the Universe? Earth-like Planet Calculator for ${galaxyName}.`;
}
window.buildShareSummary = buildShareSummary;

function hasUsableDeterministicCalculation() {
  return typeof hasDeterministicCalculation !== 'undefined' &&
    hasDeterministicCalculation === true &&
    typeof deterministicPlanets !== 'undefined' &&
    Number.isFinite(deterministicPlanets);
}

function getJSONDetectionBasis() {
  if (typeof getDetectionPanelBasis === 'function') {
    return getDetectionPanelBasis();
  }
  if (typeof getInterpretationBasis === 'function') {
    return getInterpretationBasis(fermiMode);
  }
  if (simulationCompleted && Number.isFinite(mcMedianQ50)) {
    return {
      mode: 'mc',
      count: Math.max(0, mcMedianQ50),
      label: 'Monte Carlo median (q50)'
    };
  }
  const hasDeterministic = hasUsableDeterministicCalculation();
  return {
    mode: hasDeterministic ? 'dt' : 'none',
    count: hasDeterministic ? Math.max(0, deterministicPlanets) : 0,
    label: hasDeterministic ? 'deterministic result' : 'not calculated'
  };
}

function buildJSONFermiContextSnapshot(detectionBasis) {
  const mode = detectionBasis?.mode || fermiMode;
  const current = fermiContexts && fermiContexts[mode] ? fermiContexts[mode] : null;
  const signalTravelYears = current && Number.isFinite(current.distLy) ? current.distLy : null;
  const roundTripYears = Number.isFinite(signalTravelYears) ? signalTravelYears * 2 : null;
  const hist = Number.isFinite(signalTravelYears) && typeof getHistoricalContext === 'function'
    ? getHistoricalContext(signalTravelYears)
    : null;
  let tension = null;
  if (Number.isFinite(signalTravelYears)) {
    tension = 'low';
    if (signalTravelYears <= 1000) tension = 'very high';
    else if (signalTravelYears <= 10000) tension = 'high';
    else if (signalTravelYears <= 50000) tension = 'moderate';
  }

  return {
    basis: detectionBasis?.label || null,
    fermi_mode: mode,
    tension,
    signal_travel_years: signalTravelYears,
    round_trip_years: roundTripYears,
    historical_context: hist ? hist.text : null,
    historical_context_period: hist ? (hist.periodLabel || hist.period || null) : null,
    historical_context_omitted: hist ? false : true,
    historical_context_omitted_reason: hist ? null : 'No finite displayed Fermi signal-travel distance is available for the current mode.'
  };
}

const MONTE_CARLO_EXPORT_WARNING_MESSAGE = 'Run the Monte Carlo simulation before exporting Monte Carlo data.';
const MONTE_CARLO_CHART_WARNING_MESSAGE = 'Run the Monte Carlo simulation before downloading the chart.';
const MONTE_CARLO_PACKAGE_WARNING_MESSAGE = 'Run the Monte Carlo simulation before exporting the Monte Carlo package.';
const MONTE_CARLO_STALE_EXPORT_WARNING_MESSAGE = 'Monte Carlo results are stale. Rerun the simulation before exporting.';
const MONTE_CARLO_CHART_SOURCE_URL = 'https://www.arewealoneintheuniverse.com/';
const MONTE_CARLO_CHART_SOURCE_LABEL = 'Source: arewealoneintheuniverse.com';

function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function buildParameterExportSnapshot() {
  const params = {};
  BASE_SAMPLE_IDS.forEach(function(id){
    params[id] = {
      label: SENS_LABELS[id] || id,
      mean: rawNumber(id, null),
      min: rawNumber(id + '_min', null),
      max: rawNumber(id + '_max', null)
    };
  });
  if (typeof getActiveOccurrenceMode === 'function' && getActiveOccurrenceMode() === 'eta_earth_direct') {
    params.eta_earth_bryson = {
      label: SENS_LABELS.eta_earth_bryson,
      mean: typeof getActiveEtaEarthBryson === 'function' ? getActiveEtaEarthBryson() : 0.60,
      min: null,
      max: null,
      occurrence_role: 'direct_replacement_for_N_p_star_f_composition_f_orbit'
    };
  }
  return params;
}

function getResolvedModelStateForExport() {
  if (typeof buildResolvedModelState === 'function') return buildResolvedModelState();
  const occurrenceMode = typeof getActiveOccurrenceMode === 'function'
    ? getActiveOccurrenceMode()
    : 'factorized';
  return {
    rawInputValues: {},
    visibleInputValues: {},
    calculationInputValues: {},
    N_GHZ_used: null,
    N_GHZ_source: typeof getNGHZSource === 'function' ? getNGHZSource() : null,
    occurrenceMode,
    occurrenceOverlayMode: typeof astronomyOverrideMode !== 'undefined' ? astronomyOverrideMode : null,
    occurrenceTerm_used: null,
    etaEarth_used: occurrenceMode === 'eta_earth_direct' && typeof getActiveEtaEarthBryson === 'function'
      ? getActiveEtaEarthBryson()
      : null,
    replacedTerms: occurrenceMode === 'eta_earth_direct'
      ? ['N_p_star', 'f_composition', 'f_orbit']
      : [],
    monteCarlo: {
      requestedBasisMode: null,
      resolvedBasisMode: null,
      boundsLabel: null,
      uncertaintyBasisLabel: null
    },
    warnings: []
  };
}

function updateShareButtons() {
  const base = 'https://www.arewealoneintheuniverse.com';
  const summary = buildShareSummary();
  const mailBody = `${summary}\n\n${base}`;

  const platforms = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(summary)}&url=${encodeURIComponent(base)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(base)}&title=${encodeURIComponent(summary)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(base)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(base)}&title=${encodeURIComponent(summary)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${summary} ${base}`)}`,
    email: `mailto:?subject=${encodeURIComponent(summary)}&body=${encodeURIComponent(mailBody)}`
  };

  document.querySelectorAll('#share-buttons a').forEach(a => {
    const p = a.id.replace('share-', '');
    if (platforms[p]) a.href = platforms[p];

    if (p === 'email') {
      a.target = '_self';
      a.rel = '';
    } else {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

function buildJSONExportSnapshot() {
  const params = buildParameterExportSnapshot();

  const detectionBasis = getJSONDetectionBasis();
  const detectionSnapshot = simulationCompleted ? computeDetectionFilter(detectionBasis.count) : null;
  const fermiContextSnapshot = buildJSONFermiContextSnapshot(detectionBasis);
  const distanceSnapshot =
    typeof getActiveDistanceSnapshot === 'function'
      ? getActiveDistanceSnapshot()
      : {};
  const activeDistanceModelLabel = distanceSnapshot.activeDistanceModel || null;
  // Keep the old staleState alias next to the real Monte Carlo state.
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  const staleState = mcState;
  const resolvedModelState = getResolvedModelStateForExport();
  const deterministicForExport = hasUsableDeterministicCalculation()
    ? deterministicPlanets
    : (Number.isFinite(lastMonteCarloRunMetadata?.deterministic) ? lastMonteCarloRunMetadata.deterministic : null);
  const visibleIntervals = typeof getVisibleIntervalMap === 'function' ? getVisibleIntervalMap() : {};
  const currentSimulationEnvelope = typeof simulationEnvelope !== 'undefined' ? simulationEnvelope : null;
  const robustEnvelopeCoverage = currentSimulationEnvelope?.coverage || (byId('robust-bounds') && byId('robust-bounds').checked && typeof getRobustEnvelopeCoverageDescriptor === 'function'
    ? getRobustEnvelopeCoverageDescriptor()
    : null);

  const snap = {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    version: '2.17',
    timestamp: new Date().toISOString(),
    preset: activePreset || 'custom',
    scenario_label: typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom'),
    scenario_state: typeof getScenarioState === 'function' ? getScenarioState() : null,
    galaxy: galaxyName,
    bayesian_epoch: astronomyOverrideMode,
    astronomy_override_mode: astronomyOverrideMode,
    astronomy_prior_model: getAstronomyPriorExportSnapshot(),
    resolved_model_state: resolvedModelState,
    raw_input_values: resolvedModelState.rawInputValues,
    visible_input_values: resolvedModelState.visibleInputValues,
    pre_advanced_calculation_input_values: resolvedModelState.preAdvancedCalculationInputValues || resolvedModelState.calculationInputValues,
    final_effective_calculation_input_values: resolvedModelState.finalEffectiveCalculationInputValues || resolvedModelState.calculationInputValues,
    calculation_input_values: resolvedModelState.calculationInputValues,
    occurrence_model: {
      mode: resolvedModelState.occurrenceMode,
      overlay_mode: resolvedModelState.occurrenceOverlayMode,
      occurrence_term_used: resolvedModelState.occurrenceTerm_used,
      occurrence_term_pre_advanced: resolvedModelState.occurrenceTerm_preAdvanced,
      occurrence_term_final_used: resolvedModelState.occurrenceTerm_finalUsed,
      eta_earth_used: resolvedModelState.etaEarth_used,
      replaced_terms: resolvedModelState.replacedTerms
    },
    ui_state: {
      current_scale: currentScale,
      fermi_mode: fermiMode,
      intervals_visible: intervalsVisible,
      visible_intervals: visibleIntervals
    },
    enabled_factors: { H2O: isH2OEnabled, CHNOPS: isCHNOPSEnabled, complex_life: isComplexLifeEnabled, f_x: isXEnabled },
    advanced: {
      enabled: ADV.enabled,
      modules: Object.fromEntries(
        Object.entries(ADV.modules).map(function(entry){
          return [entry[0], !!entry[1].enabled];
        })
      ),
      controls: serializeControlTree('adv-options')
    },
    galaxy_settings: (function() {
      const _eff = getEffectiveNGHZ();
      return {
        enabled: isGalaxySettingsEnabled,
        galaxy_model_type: 'custom_galaxy_x',
        galaxy_preset_evidence_level: 'user_defined_scaling_proxy',
        galaxy_scaling_mode: galaxyScalingMode,
        N_GHZ_source: getNGHZSource(),
        raw_N_GHZ: sanitizePositiveInput('N_GHZ'),
        effective_N_GHZ: _eff.value,
        galaxy_total_stars: isGalaxySettingsEnabled ? pf('galaxy-total-stars', MW_TOTAL_STARS) : null,
        galaxy_GHZ_fraction: isGalaxySettingsEnabled ? pf('galaxy-ghz-fraction', MW_DEFAULT_GHZ_FRACTION) : null,
        controls: serializeControlTree('galaxy-options')
      };
    })(),
    detection_settings: {
      controls: serializeControlTree('detection-panel')
    },
    simulation: {
      iterations: parseInt((byId('iterations') || {}).value || '2000', 10),
      engine: (byId('simulation-engine') || {}).value || 'standard',
      distribution: (byId('distribution') || {}).value || 'lognormal',
      correlation: (byId('correlation-model') || {}).value || 'independent',
      robustBounds: !!((byId('robust-bounds') || {}).checked),
      requestedMcMode: resolvedModelState.monteCarlo.requestedBasisMode,
      resolvedMcMode: resolvedModelState.monteCarlo.resolvedBasisMode,
      mcMode: monteCarloBoundsMode || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().mode : null),
      uncertaintyBasisLabel: monteCarloUncertaintyBasisLabel || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().uncertaintyBasisLabel : null),
      seed: lastMonteCarloRunMetadata?.seed ?? null,
      seed_mode: lastMonteCarloRunMetadata?.seedMode || (typeof getMonteCarloSeedMode === 'function' ? getMonteCarloSeedMode() : null),
      prng: lastMonteCarloRunMetadata?.prng || MONTE_CARLO_PRNG,
      prngDescription: lastMonteCarloRunMetadata?.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION,
      robustEnvelopeCoverage,
      sampling_uncertainty_pct: rawNumber('sampling_uncertainty', 50),
      simulationCompleted,
      mcState,
      staleState
    },
    parameters: params,
    basis_labels: {
      deterministic: 'deterministic central',
      mc_median_q50: 'Monte Carlo q50/median',
      mc_mean: 'Monte Carlo arithmetic mean',
      sampled_interval: 'q2.5/q97.5 sampled interval',
      detection_count_basis: detectionBasis.label,
      mcMode: monteCarloBoundsMode || null,
      uncertaintyBasisLabel: monteCarloUncertaintyBasisLabel || null,
      distance_model: activeDistanceModelLabel || 'active geometric distance model',
      distance_basis: distanceSnapshot.activeDistanceCountBasis || (simulationCompleted ? 'Monte Carlo q50/median count with sampled q2.5/q97.5 interval' : 'deterministic central count'),
      mcState,
      staleState
    },
    results: {
      deterministic: deterministicForExport,
      mc_median_q50: simulationCompleted ? mcMedianQ50 : null,
      mc_mean: simulationCompleted ? mcArithmeticMean : null,
      mc_arithmetic_mean: simulationCompleted ? mcArithmeticMean : null,
      mc_q025: simulationCompleted ? mcQ025 : null,
      mc_q975: simulationCompleted ? mcQ975 : null,
      mc_stddev: simulationCompleted ? stdDev : null,
      active_distance_model: activeDistanceModelLabel,
      active_distance_basis: distanceSnapshot.activeDistanceBasis || null,
      active_distance_count_basis: distanceSnapshot.activeDistanceCountBasis || null,
      detection_count_basis: detectionBasis.label,
      detection_count: detectionBasis.count,
      fermi_mode: detectionBasis.mode || fermiMode,
      displayed_distance_value_ly: Number.isFinite(distanceSnapshot.displayedDistanceValue) ? Math.round(distanceSnapshot.displayedDistanceValue) : null,
      displayed_distance_label: distanceSnapshot.displayedDistanceLabel || null,
      simulationCompleted,
      mcState,
      staleState,
      distance_radial_ly: Number.isFinite(distanceSnapshot.distanceRadial) ? Math.round(distanceSnapshot.distanceRadial) : null,
      distance_2d_ly: Number.isFinite(distanceSnapshot.distance2D) ? Math.round(distanceSnapshot.distance2D) : null,
      distance_3d_disk_ly: Number.isFinite(distanceSnapshot.distance3DDisk) ? Math.round(distanceSnapshot.distance3DDisk) : null,
      distance_3d_sphere_ly: Number.isFinite(distanceSnapshot.distance3DSphere) ? Math.round(distanceSnapshot.distance3DSphere) : null,
      detection: detectionSnapshot
        ? {
            detection_count_basis: detectionBasis.label,
            detection_count: detectionBasis.count,
            fermi_mode: detectionBasis.mode || fermiMode,
            transmitter_fraction: detectionSnapshot.f_tx,
            transmitter_hosts_total: detectionSnapshot.N_tx_total,
            within_horizon: detectionSnapshot.N_within,
            temporal_overlap_pct: detectionSnapshot.p_temporal_pct,
            expected_detectable: detectionSnapshot.N_det,
            expected_detectable_now: detectionSnapshot.N_det,
            probability_at_least_one_pct: detectionSnapshot.p_detect_pct,
            detection_horizon_ly: Number.isFinite(detectionSnapshot.d_horizon)
              ? Math.round(detectionSnapshot.d_horizon)
              : null,
            nearest_detectable_ly: Number.isFinite(detectionSnapshot.d_nearest_det)
              ? Math.round(detectionSnapshot.d_nearest_det)
              : null,
            nearest_detectable_distance_scale_ly: Number.isFinite(detectionSnapshot.d_nearest_det)
              ? Math.round(detectionSnapshot.d_nearest_det)
              : null,
            nearest_detectable_beyond_horizon: !!detectionSnapshot.nearest_beyond_horizon
          }
        : null,
      fermi_context: fermiContextSnapshot
    }
  };

  return snap;
}
window.buildJSONExportSnapshot = buildJSONExportSnapshot;

function exportJSON() {
  const snap = buildJSONExportSnapshot();
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earth-like-candidate-snapshot-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportJSON = exportJSON;

function runGalaxySettingsTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  function setVal(id, v) { const el = byId(id); if (el) el.value = String(v); }

  // Save state
  const _savedEnabled = isGalaxySettingsEnabled;
  const _savedMode = galaxyScalingMode;
  const _savedAdvEnabled = ADV.enabled;
  const _savedRadial = ADV.modules.radialGHZ.enabled;
  const _savedNGHZ = (byId('N_GHZ') || {}).value;
  const _savedTotalStars = (byId('galaxy-total-stars') || {}).value;
  const _savedFrac = (byId('galaxy-ghz-fraction') || {}).value;
  const _savedDiam = (byId('galaxy-diameter') || {}).value;
  const _savedThick = (byId('galaxy-thickness') || {}).value;
  const _savedDist = (byId('galaxy-earth-distance') || {}).value;

  try {
    ADV.enabled = false; ADV.modules.radialGHZ.enabled = false;

    // T1: Galaxy X with MW reference values → result unchanged from manual
    // MW_TOTAL_STARS × MW_DEFAULT_GHZ_FRACTION = 200e9 × 0.05 = 10e9 = raw N_GHZ
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'simple';
    setVal('N_GHZ', String(MW_DEFAULT_N_GHZ));
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION));
    const t1 = getEffectiveNGHZ();
    assert('T1 Galaxy X MW ref: effective_N_GHZ equals raw N_GHZ', t1.value === MW_DEFAULT_N_GHZ, `got ${t1.value}, expected ${MW_DEFAULT_N_GHZ}`);
    assert('T1 Galaxy X MW ref: source is simple_galaxy_scaling', t1.source === 'simple_galaxy_scaling', `got ${t1.source}`);

    // T2: Changing total stars changes result proportionally
    // Half the stars → half the effective N_GHZ (fraction constant)
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS / 2));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION));
    const t2 = getEffectiveNGHZ();
    assert('T2 half total stars → half effective_N_GHZ', Math.abs(t2.value - MW_DEFAULT_N_GHZ / 2) < 1000, `got ${t2.value}`);

    // T3: Changing GHZ fraction changes result proportionally
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION * 2));
    const t3 = getEffectiveNGHZ();
    assert('T3 double GHZ fraction → double effective_N_GHZ', Math.abs(t3.value - MW_DEFAULT_N_GHZ * 2) < 1000, `got ${t3.value}`);

    // T4: Distance alone does NOT change effective_N_GHZ
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION));
    const baseT4 = getEffectiveNGHZ().value;
    setVal('galaxy-earth-distance', '2537000');
    assert('T4 earth-distance alone: no effect on effective_N_GHZ', getEffectiveNGHZ().value === baseT4, `base=${baseT4} after=${getEffectiveNGHZ().value}`);
    setVal('galaxy-earth-distance', '0');

    // T5: Diameter alone does NOT change effective_N_GHZ
    const baseT5 = getEffectiveNGHZ().value;
    setVal('galaxy-diameter', '220000');
    assert('T5 galaxy-diameter alone: no effect on effective_N_GHZ', getEffectiveNGHZ().value === baseT5, `base=${baseT5} after=${getEffectiveNGHZ().value}`);
    setVal('galaxy-diameter', '100000');

    // T6: Thickness alone does NOT change effective_N_GHZ
    const baseT6 = getEffectiveNGHZ().value;
    setVal('galaxy-thickness', '5000');
    assert('T6 galaxy-thickness alone: no effect on effective_N_GHZ', getEffectiveNGHZ().value === baseT6, `base=${baseT6} after=${getEffectiveNGHZ().value}`);
    setVal('galaxy-thickness', '1000');

    // T7: Radial GHZ Integrator overrides simple Galaxy X scaling
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION));
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'simple';
    assert('T7a without radial: source is simple_galaxy_scaling', getNGHZSource() === 'simple_galaxy_scaling', `got ${getNGHZSource()}`);
    ADV.enabled = true; ADV.modules.radialGHZ.enabled = true;
    assert('T7b ADV radial overrides simple Galaxy X', getNGHZSource() === 'radial_ghz_integrator', `got ${getNGHZSource()}`);
    ADV.enabled = false; ADV.modules.radialGHZ.enabled = false;

    // T8: Manual mode (galaxy settings OFF) returns raw N_GHZ
    isGalaxySettingsEnabled = false;
    galaxyScalingMode = 'manual';
    setVal('N_GHZ', String(MW_DEFAULT_N_GHZ));
    const t8 = getEffectiveNGHZ();
    assert('T8 manual mode: source is manual_raw_N_GHZ', t8.source === 'manual_raw_N_GHZ', `got ${t8.source}`);
    assert('T8 manual mode: value equals raw N_GHZ', t8.value === MW_DEFAULT_N_GHZ, `got ${t8.value}`);

    // T9: sampleBaseInputs() draws the fixed effective_N_GHZ in simple Galaxy X mode
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'simple';
    setVal('galaxy-total-stars', String(MW_TOTAL_STARS));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION));
    const effSimple = getEffectiveNGHZ().value;
    const sampled = sampleBaseInputs('lognormal');
    assert('T9 sampleBaseInputs N_GHZ == effective_N_GHZ (simple)', sampled.N_GHZ === effSimple, `sampled=${sampled.N_GHZ} effective=${effSimple}`);

    // T10: full Monte Carlo run / deterministic-at-run uses effective_N_GHZ, not preset/raw
    const mcSummary = runMonteCarloSimulation({ samples: 1000, updateUi: false, seedMode: 'fixed', seed: 123 });
    assert('T10 MC summary exists', !!(mcSummary && Array.isArray(mcSummary.results) && mcSummary.results.length > 0), 'no MC summary');
    if (mcSummary) {
      const detFromHelper = getCurrentDeterministicPlanets();
      assert('T10 summary.deterministic uses effective_N_GHZ (== getCurrentDeterministicPlanets)',
        Number.isFinite(mcSummary.deterministic) && Math.abs(mcSummary.deterministic - detFromHelper) < 1e-6,
        `summary=${mcSummary.deterministic} helper=${detFromHelper}`);

      // T11: every sampled N_GHZ equals effective_N_GHZ in simple mode (fixed, not distributed)
      const allEqual = Array.isArray(mcSummary.sampledN_GHZ)
        && mcSummary.sampledN_GHZ.length > 0
        && mcSummary.sampledN_GHZ.every(v => v === effSimple);
      assert('T11 all summary.sampledN_GHZ == effective_N_GHZ (simple)', allEqual,
        `n=${(mcSummary.sampledN_GHZ || []).length} firstFew=${(mcSummary.sampledN_GHZ || []).slice(0, 3)} effective=${effSimple}`);
    }

    // T12: preset-local bounds must NOT bypass effective_N_GHZ in deterministic resolution
    setVal('galaxy-total-stars', String(1e12));
    setVal('galaxy-ghz-fraction', String(MW_DEFAULT_GHZ_FRACTION)); // effective = 5e10, distinct from presets
    const effDistinct = getEffectiveNGHZ().value;
    const presetKey = Object.keys(PRESETS).find(k => PRESETS[k] && Number.isFinite(Number(PRESETS[k].N_GHZ)));
    if (presetKey) {
      const presetLocalDesc = {
        mode: MONTE_CARLO_BASIS_MODES.presetLocal,
        sourcePreset: presetKey,
        label: 'test-preset-local',
        uncertaintyBasisLabel: 'test'
      };
      const resolved = resolveInputsForCalculation(presetLocalDesc);
      assert('T12 preset-local resolve uses effective_N_GHZ', resolved.N_GHZ === effDistinct,
        `resolved=${resolved.N_GHZ} effective=${effDistinct}`);
      const presetN = Number(PRESETS[presetKey].N_GHZ);
      if (presetN !== effDistinct) {
        assert('T12 preset-local resolve does NOT use preset.N_GHZ', resolved.N_GHZ !== presetN,
          `resolved=${resolved.N_GHZ} preset.N_GHZ=${presetN}`);
      }
    }

    // T13: radial GHZ source overrides simple AND manual consistently in both
    // deterministic resolution and sampleBaseInputs.
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'radial';
    const radialVal = computeRadialGHZDetails().N_GHZ;
    assert('T13 source is radial_ghz_integrator', getNGHZSource() === 'radial_ghz_integrator', `got ${getNGHZSource()}`);
    assert('T13 resolveInputsForCalculation N_GHZ == radial value', resolveInputsForCalculation().N_GHZ === radialVal,
      `resolved=${resolveInputsForCalculation().N_GHZ} radial=${radialVal}`);
    assert('T13 sampleBaseInputs N_GHZ == radial value', sampleBaseInputs('lognormal').N_GHZ === radialVal,
      `sampled=${sampleBaseInputs('lognormal').N_GHZ} radial=${radialVal}`);

  } finally {
    isGalaxySettingsEnabled = _savedEnabled;
    galaxyScalingMode = _savedMode;
    ADV.enabled = _savedAdvEnabled;
    ADV.modules.radialGHZ.enabled = _savedRadial;
    if (_savedNGHZ !== undefined) setVal('N_GHZ', _savedNGHZ);
    if (_savedTotalStars !== undefined) setVal('galaxy-total-stars', _savedTotalStars);
    if (_savedFrac !== undefined) setVal('galaxy-ghz-fraction', _savedFrac);
    if (_savedDiam !== undefined) setVal('galaxy-diameter', _savedDiam);
    if (_savedThick !== undefined) setVal('galaxy-thickness', _savedThick);
    if (_savedDist !== undefined) setVal('galaxy-earth-distance', _savedDist);
  }

  return results;
}
window.runGalaxySettingsTests = runGalaxySettingsTests;

function runHistoricalContextTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    return haystack.split(needle).length - 1;
  }

  // Historical context wording
  const t900 = getHistoricalContextForLookback(900e6);
  assert('900e6: text exists', t900 && typeof t900.text === 'string', 'no text');
  if (t900) {
    assert('900e6: no "roughly to roughly"', !/roughly\s+to\s+roughly/i.test(t900.text), t900.text);
    assert('900e6: "roughly 900 million years ago" not repeated',
      countOccurrences(t900.text, 'roughly 900 million years ago') === 1,
      `count=${countOccurrences(t900.text, 'roughly 900 million years ago')} | ${t900.text}`);
  }

  const t1 = getHistoricalContextForLookback(1e6);
  if (t1) {
    assert('1e6: "roughly 1 million years ago" not repeated',
      countOccurrences(t1.text, 'roughly 1 million years ago') === 1,
      `count=${countOccurrences(t1.text, 'roughly 1 million years ago')} | ${t1.text}`);
  }

  const t65 = getHistoricalContextForLookback(65e6);
  if (t65) {
    assert('65e6: "roughly 65 million years ago" not repeated',
      countOccurrences(t65.text, 'roughly 65 million years ago') === 1,
      `count=${countOccurrences(t65.text, 'roughly 65 million years ago')} | ${t65.text}`);
  }

  // SETI signal sentence in buildFermiContext() / count>=1 reaches the main path.
  const fermi = buildFermiContext(900, null, { count: 10 });
  const fermiHtml = fermi && fermi.html ? fermi.html : '';
  assert('buildFermiContext: no "would need to have been transmitting for at least"',
    !fermiHtml.includes('would need to have been transmitting for at least'),
    'old wording still present');
  assert('buildFermiContext: contains "signal would have had to leave its source"',
    fermiHtml.includes('signal would have had to leave its source'),
    'new wording missing');

  // No unclosed star-reference parentheses: every "(" must have a matching ")".
  const openParens = countOccurrences(fermiHtml, '(');
  const closeParens = countOccurrences(fermiHtml, ')');
  assert('buildFermiContext: parentheses balanced (no unclosed star reference)',
    openParens === closeParens, `open=${openParens} close=${closeParens}`);

  assert('buildFermiContext: no "roughly to roughly"',
    !/roughly\s+to\s+roughly/i.test(fermiHtml), 'roughly to roughly present in fermi output');

  // 900e6 historical phrase must appear exactly once (no duplicated time phrase).
  if (t900) {
    const phrase = 'this corresponds to roughly 900 million years ago';
    assert('900e6: "this corresponds to roughly 900 million years ago" appears once',
      countOccurrences(t900.text, phrase) === 1,
      `count=${countOccurrences(t900.text, phrase)} | ${t900.text}`);
  }

  // JSON export historical_context is sourced from getHistoricalContext().text,
  // which routes through the same cleaned builder. Verify that exact value.
  const jsonHist = getHistoricalContext(900e6);
  if (jsonHist && jsonHist.text) {
    assert('JSON historical_context source: no "roughly to roughly"',
      !/roughly\s+to\s+roughly/i.test(jsonHist.text), jsonHist.text);
    assert('JSON historical_context source: uses "this corresponds to"',
      /this corresponds to/i.test(jsonHist.text), jsonHist.text);
  }

  return results;
}
window.runHistoricalContextTests = runHistoricalContextTests;

function runAstronomySourceTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  function arraysEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  }
  function ariaPressed(id) {
    const el = byId(id);
    return el ? el.getAttribute('aria-pressed') : null;
  }

  // Save state so the diagnostic run restores the live UI afterwards.
  const _savedPreset = activePreset;
  const _savedOverride = astronomyOverrideMode;

  try {
    // T1: loading each preset clears the occurrence overlay (no button active).
    ['kepler', 'consensus', 'optimist', 'pessimist'].forEach(key => {
      loadPreset(key);
      assert(`T1 loadPreset('${key}') sets astronomyOverrideMode = null`, astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
      assert(`T1 loadPreset('${key}') leaves all astronomy buttons inactive`,
        ariaPressed('bayes-pre') === 'false' && ariaPressed('bayes-post') === 'false' && ariaPressed('bayes-eta') === 'false',
        `pre=${ariaPressed('bayes-pre')} post=${ariaPressed('bayes-post')} eta=${ariaPressed('bayes-eta')}`);
    });

    // T2: loading High-End (optimist) does not mark bayes-post active, and returns ~30,086,211.
    loadPreset('optimist');
    assert('T2 High-End does not mark bayes-post active', ariaPressed('bayes-post') === 'false', `got ${ariaPressed('bayes-post')}`);
    assert('T2 High-End occurrence mode is factorized', getActiveOccurrenceMode() === 'factorized', `got ${getActiveOccurrenceMode()}`);
    const highEndN = computePlanetsAdvanced(applyAdvancedModules(getInputs()));
    assert('T12 High-End alone ~= 30,086,211', Math.abs(highEndN - 30086210.7) < 1, `got ${highEndN}`);

    // T7: scenario-only High-End export never says post.
    const highEndSnap = getAstronomyPriorExportSnapshot();
    assert('T7 High-End export astronomy_override_mode = null', highEndSnap.astronomy_override_mode === null, `got ${highEndSnap.astronomy_override_mode}`);
    assert('T7 High-End export mode is not "post"', highEndSnap.mode !== 'post', `got ${highEndSnap.mode}`);
    assert('T7 High-End export source_label = "Scenario astronomy values"', highEndSnap.source_label === 'Scenario astronomy values', `got ${highEndSnap.source_label}`);
    assert('T7 High-End export model_type = scenario_factorized', highEndSnap.astronomy_model_type === 'scenario_factorized', `got ${highEndSnap.astronomy_model_type}`);

    // T3: clicking an occurrence overlay (pre/post) changes ONLY f_composition + f_orbit and
    // preserves the scenario's N_GHZ, f_sun_type, f_sun_age, and N_p_star.
    // T3a Conservative Kepler-era overlay over High-End.
    loadPreset('optimist');
    setBayesian('pre');
    assert('T3 pre override active', astronomyOverrideMode === 'pre', `got ${astronomyOverrideMode}`);
    assert('T3a pre preserves High-End host fields',
      Math.abs(rawNumber('N_GHZ') - 40000000000) < 1 && Math.abs(rawNumber('f_sun_type') - 0.20) < 1e-9 &&
      Math.abs(rawNumber('f_sun_age') - 0.75) < 1e-9 && Math.abs(rawNumber('N_p_star') - 2.0) < 1e-9,
      `N_GHZ=${rawNumber('N_GHZ')} f_sun_type=${rawNumber('f_sun_type')} f_sun_age=${rawNumber('f_sun_age')} N_p=${rawNumber('N_p_star')}`);
    assert('T3a pre overlays only f_composition=0.20 and f_orbit=0.18',
      Math.abs(rawNumber('f_composition') - 0.20) < 1e-9 && Math.abs(rawNumber('f_orbit') - 0.18) < 1e-9,
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);
    const highEndPre = computePlanetsAdvanced(applyAdvancedModules(getInputs()));
    assert('T12 High-End + Conservative Kepler-era overlay ~= 14,736,103', Math.abs(highEndPre - 14736103.2) < 2, `got ${highEndPre}`);

    // T3b Updated Kepler/Gaia overlay applied after Conservative (host fields still preserved).
    setBayesian('post');
    assert('T8 post aria-pressed true; others false',
      ariaPressed('bayes-post') === 'true' && ariaPressed('bayes-pre') === 'false' && ariaPressed('bayes-eta') === 'false',
      `pre=${ariaPressed('bayes-pre')} post=${ariaPressed('bayes-post')} eta=${ariaPressed('bayes-eta')}`);
    assert('T3b post preserves High-End host fields',
      Math.abs(rawNumber('N_GHZ') - 40000000000) < 1 && Math.abs(rawNumber('f_sun_type') - 0.20) < 1e-9 &&
      Math.abs(rawNumber('f_sun_age') - 0.75) < 1e-9 && Math.abs(rawNumber('N_p_star') - 2.0) < 1e-9,
      `N_GHZ=${rawNumber('N_GHZ')} f_sun_type=${rawNumber('f_sun_type')} f_sun_age=${rawNumber('f_sun_age')} N_p=${rawNumber('N_p_star')}`);
    assert('T3b post overlays only f_composition=0.25 and f_orbit=0.21',
      Math.abs(rawNumber('f_composition') - 0.25) < 1e-9 && Math.abs(rawNumber('f_orbit') - 0.21) < 1e-9,
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);
    const highEndPost = computePlanetsAdvanced(applyAdvancedModules(getInputs()));
    assert('T12 High-End + Updated Kepler/Gaia overlay (after Conservative) ~= 21,490,151', Math.abs(highEndPost - 21490150.5) < 2, `got ${highEndPost}`);

    // T3c overlay export metadata describes an occurrence overlay, not a full astronomy-block override.
    const postSnap = getAstronomyPriorExportSnapshot();
    assert('T3c post export occurrence_overlay_mode = post', postSnap.occurrence_overlay_mode === 'post', `got ${postSnap.occurrence_overlay_mode}`);
    assert('T3c post export astronomy_model_type = rocky_hz_occurrence_overlay', postSnap.astronomy_model_type === 'rocky_hz_occurrence_overlay', `got ${postSnap.astronomy_model_type}`);
    assert('T3c post export occurrence_overlay_fields = [f_composition, f_orbit]',
      arraysEqual(postSnap.occurrence_overlay_fields, ['f_composition', 'f_orbit']), `got ${JSON.stringify(postSnap.occurrence_overlay_fields)}`);
    assert('T3c post export scenario_fields_preserved = [N_GHZ, f_sun_type, f_sun_age, N_p_star]',
      arraysEqual(postSnap.scenario_fields_preserved, ['N_GHZ', 'f_sun_type', 'f_sun_age', 'N_p_star']), `got ${JSON.stringify(postSnap.scenario_fields_preserved)}`);
    assert('T3c post export is not Bryson direct', postSnap.occurrence_mode === 'factorized' && postSnap.eta_earth_bryson === undefined, `mode=${postSnap.occurrence_mode}`);

    // T4: clicking Bryson sets eta_earth_direct occurrence mode + eta = 0.60.
    loadPreset('optimist');
    setBayesian('bryson_eta_direct');
    assert('T4 bryson override active', astronomyOverrideMode === 'bryson_eta_direct', `got ${astronomyOverrideMode}`);
    assert('T4 occurrence mode is eta_earth_direct', getActiveOccurrenceMode() === 'eta_earth_direct', `got ${getActiveOccurrenceMode()}`);
    assert('T4/T12 eta_earth_bryson == 0.60', getActiveEtaEarthBryson() === 0.60, `got ${getActiveEtaEarthBryson()}`);
    assert('T8 bryson aria-pressed true; others false',
      ariaPressed('bayes-eta') === 'true' && ariaPressed('bayes-pre') === 'false' && ariaPressed('bayes-post') === 'false',
      `pre=${ariaPressed('bayes-pre')} post=${ariaPressed('bayes-post')} eta=${ariaPressed('bayes-eta')}`);

    // T13: occurrence controls carry the strong "bypassed-by-eta" treatment in Bryson direct mode.
    if (byId('eta-replaced-N_p_star')) {
      const visibleAndLabeled = ['N_p_star', 'f_composition', 'f_orbit'].every(id => {
        const card = byId('card-' + id);
        const el = byId('eta-replaced-' + id);
        return card && card.classList.contains('bypassed-by-eta') &&
          el && /BYPASSED BY η⊕ NOT USED/.test(el.textContent || el.innerHTML || '');
      });
      assert('T13 occurrence controls marked "BYPASSED BY η⊕ NOT USED" in Bryson direct mode', visibleAndLabeled, 'card not bypassed or label missing');
      clearAstronomyOverride();
      const clearedAfterClear = !byId('card-N_p_star').classList.contains('bypassed-by-eta');
      assert('T13 bypass treatment removed once override cleared', clearedAfterClear, `class still present`);
      setBayesian('bryson_eta_direct');
    }

    // T5/T12: in Bryson direct mode the factorized occurrence trio is not used.
    assert('T12 resolveOccurrenceTerm == 0.60 in direct mode',
      resolveOccurrenceTerm({ N_p_star: 2, f_composition: 0.35, f_orbit: 0.21 }) === 0.60,
      `got ${resolveOccurrenceTerm({ N_p_star: 2, f_composition: 0.35, f_orbit: 0.21 })}`);
    const brysonInp = getInputs();
    const base1 = computePlanetsBase(brysonInp);
    const mutated = { ...brysonInp, N_p_star: brysonInp.N_p_star * 1000, f_composition: brysonInp.f_composition * 1000, f_orbit: brysonInp.f_orbit * 1000 };
    const base2 = computePlanetsBase(mutated);
    assert('T5 N_p_star × f_composition × f_orbit do not affect the Bryson direct result', base1 === base2, `base1=${base1} base2=${base2}`);

    // T12: direct mode is higher than the old factorized 0.147 product by 0.60/0.147 with identical host fields.
    const factorizedTrio = brysonInp.N_p_star * brysonInp.f_composition * brysonInp.f_orbit;
    const impliedFactorized = base1 / 0.60 * factorizedTrio;
    const ratio = base1 / impliedFactorized;
    assert('T12 direct/factorized occurrence ratio ~= 0.60/0.147 (4.08)', Math.abs(ratio - (0.60 / 0.147)) < 0.01, `ratio=${ratio}`);

    // T6: export metadata in Bryson direct mode.
    const brysonSnap = getAstronomyPriorExportSnapshot();
    assert('T6 astronomy_model_type = bryson_eta_earth_direct', brysonSnap.astronomy_model_type === 'bryson_eta_earth_direct', `got ${brysonSnap.astronomy_model_type}`);
    assert('T6 occurrence_term_used = eta_earth_bryson_direct', brysonSnap.occurrence_term_used === 'eta_earth_bryson_direct', `got ${brysonSnap.occurrence_term_used}`);
    assert('T6 occurrence_mode = eta_earth_direct', brysonSnap.occurrence_mode === 'eta_earth_direct', `got ${brysonSnap.occurrence_mode}`);
    assert('T6 eta_earth_bryson = 0.60', brysonSnap.eta_earth_bryson === 0.60, `got ${brysonSnap.eta_earth_bryson}`);
    assert('T6 replaced_factorized_terms = [N_p_star, f_composition, f_orbit]',
      arraysEqual(brysonSnap.replaced_factorized_terms, ['N_p_star', 'f_composition', 'f_orbit']),
      `got ${JSON.stringify(brysonSnap.replaced_factorized_terms)}`);

    // T6b: export must not imply the factorized occurrence proxy is the active term in direct mode.
    assert('T6b no active "eta_earth_factorized_proxy" field in Bryson direct export',
      !('eta_earth_factorized_proxy' in brysonSnap), `got ${brysonSnap.eta_earth_factorized_proxy}`);
    assert('T6b factorized proxy retained only as bypassed diagnostic',
      typeof brysonSnap.bypassed_factorized_occurrence_proxy === 'number', `got ${brysonSnap.bypassed_factorized_occurrence_proxy}`);
    assert('T6b diagnostic_only = true', brysonSnap.diagnostic_only === true, `got ${brysonSnap.diagnostic_only}`);
    assert('T6b not_used_in_direct_eta_mode = true', brysonSnap.not_used_in_direct_eta_mode === true, `got ${brysonSnap.not_used_in_direct_eta_mode}`);

    // T9: calculation console explicitly states the occurrence mode.
    if (byId('calc-console')) {
      loadPreset('optimist');
      setBayesian('bryson_eta_direct');
      calculateDeterministic();
      const directHtml = byId('calc-console').innerHTML;
      assert('T9 console states "direct η⊕ occurrence" in Bryson mode', directHtml.indexOf('direct η⊕ occurrence') !== -1, 'phrase missing');

      loadPreset('optimist');
      calculateDeterministic();
      const factHtml = byId('calc-console').innerHTML;
      assert('T9 console states "factorized occurrence" in scenario mode', factHtml.indexOf('factorized occurrence') !== -1, 'phrase missing');
    }

    // T10: Monte Carlo uses the same occurrence mode as the deterministic calculation.
    loadPreset('optimist');
    setBayesian('bryson_eta_direct');
    const detEta = computePlanetsAdvanced(applyAdvancedModules(resolveInputsForCalculation()));
    const mcEta = runMonteCarloSimulation({ samples: 200, updateUi: false, seedMode: 'fixed', seed: 7 });
    assert('T10 MC deterministic-at-run uses the eta_earth_direct occurrence mode',
      mcEta && Number.isFinite(mcEta.deterministic) && Math.abs(mcEta.deterministic - detEta) < 1e-6,
      `mc=${mcEta && mcEta.deterministic} det=${detEta}`);

    // T11: registries contain pre, post, bryson_eta_direct consistently.
    assert('T11 BAYES has pre, post, bryson_eta_direct', !!(BAYES.pre && BAYES.post && BAYES.bryson_eta_direct),
      `keys=${Object.keys(BAYES).join(',')}`);
    const priors = (typeof SCIENTIFIC_PARAMETER_REGISTRY !== 'undefined' && SCIENTIFIC_PARAMETER_REGISTRY.observationalPriors) || null;
    assert('T11 SCIENTIFIC_OBSERVATIONAL_PRIORS has pre, post, bryson_eta_direct',
      !!(priors && priors.pre && priors.post && priors.bryson_eta_direct),
      `keys=${priors ? Object.keys(priors).join(',') : 'none'}`);
    if (priors) {
      assert('T11 registry/runtime agree: pre f_orbit/f_composition',
        priors.pre.values.f_orbit === BAYES.pre.fields.f_orbit && priors.pre.values.f_composition === BAYES.pre.fields.f_composition,
        `priors=${JSON.stringify(priors.pre.values)} bayes={f_orbit:${BAYES.pre.fields.f_orbit},f_composition:${BAYES.pre.fields.f_composition}}`);
      assert('T11 registry/runtime agree: post f_orbit/f_composition',
        priors.post.values.f_orbit === BAYES.post.fields.f_orbit && priors.post.values.f_composition === BAYES.post.fields.f_composition,
        `priors=${JSON.stringify(priors.post.values)} bayes={f_orbit:${BAYES.post.fields.f_orbit},f_composition:${BAYES.post.fields.f_composition}}`);
      assert('T11 registry/runtime agree: bryson eta_earth_bryson and model_type',
        priors.bryson_eta_direct.values.eta_earth_bryson === BAYES.bryson_eta_direct.eta_earth_bryson &&
        priors.bryson_eta_direct.model_type === BAYES.bryson_eta_direct.model_type,
        `priors=${JSON.stringify(priors.bryson_eta_direct.values)} bayesEta=${BAYES.bryson_eta_direct.eta_earth_bryson}`);
    }

    // T14: Bryson η⊕ direct must not leak stale factorized values into pre/post overlays.
    // Kepler/Gaia scenario baseline N_p_star is 1.6, not Bryson's old 2.0.
    loadPreset('kepler');
    const keplerNp = rawNumber('N_p_star');
    assert('T14 Kepler/Gaia scenario baseline N_p_star captured', Math.abs(keplerNp - 1.6) < 1e-9, `got ${keplerNp}`);
    setBayesian('bryson_eta_direct');
    assert('T14 Bryson does not overwrite visible N_p_star', Math.abs(rawNumber('N_p_star') - keplerNp) < 1e-9, `got ${rawNumber('N_p_star')}`);
    setBayesian('pre');
    assert('T14 after Bryson -> Conservative, N_p_star equals scenario baseline (not 2.0)',
      Math.abs(rawNumber('N_p_star') - keplerNp) < 1e-9, `got ${rawNumber('N_p_star')} expected ${keplerNp}`);
    assert('T14 after Bryson -> Conservative, f_composition=0.20 & f_orbit=0.18',
      Math.abs(rawNumber('f_composition') - 0.20) < 1e-9 && Math.abs(rawNumber('f_orbit') - 0.18) < 1e-9,
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);

    // T14b: same path for Updated Kepler/Gaia overlay.
    loadPreset('kepler');
    setBayesian('bryson_eta_direct');
    setBayesian('post');
    assert('T14b after Bryson -> Updated K/G, N_p_star equals scenario baseline (not 2.0)',
      Math.abs(rawNumber('N_p_star') - keplerNp) < 1e-9, `got ${rawNumber('N_p_star')} expected ${keplerNp}`);
    assert('T14b after Bryson -> Updated K/G, f_composition=0.25 & f_orbit=0.21',
      Math.abs(rawNumber('f_composition') - 0.25) < 1e-9 && Math.abs(rawNumber('f_orbit') - 0.21) < 1e-9,
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);
    const t14Snap = getAstronomyPriorExportSnapshot();
    assert('T14b export not stale Bryson after switching to post',
      t14Snap.occurrence_overlay_mode === 'post' && t14Snap.occurrence_mode === 'factorized' &&
      t14Snap.eta_earth_bryson === undefined && !('replaced_factorized_terms' in t14Snap),
      `overlay=${t14Snap.occurrence_overlay_mode} mode=${t14Snap.occurrence_mode} eta=${t14Snap.eta_earth_bryson}`);

    // T14c: High-End regression survives a Bryson detour (still 14.7M / 21.5M).
    loadPreset('optimist');
    setBayesian('bryson_eta_direct');
    setBayesian('pre');
    const hePreAfterBryson = computePlanetsAdvanced(applyAdvancedModules(getInputs()));
    assert('T14c High-End + Conservative after Bryson detour ~= 14,736,103', Math.abs(hePreAfterBryson - 14736103.2) < 2, `got ${hePreAfterBryson}`);
    setBayesian('post');
    const hePostAfterBryson = computePlanetsAdvanced(applyAdvancedModules(getInputs()));
    assert('T14c High-End + Updated K/G after Bryson detour ~= 21,490,151', Math.abs(hePostAfterBryson - 21490150.5) < 2, `got ${hePostAfterBryson}`);

    // T15: user-facing clearAstronomyOverride() restores the full scenario baseline.
    loadPreset('optimist');
    setBayesian('pre');
    clearAstronomyOverride();
    assert('T15 clear restores N_GHZ=40B', Math.abs(rawNumber('N_GHZ') - 40000000000) < 1, `got ${rawNumber('N_GHZ')}`);
    assert('T15 clear restores f_sun_type=0.20', Math.abs(rawNumber('f_sun_type') - 0.20) < 1e-9, `got ${rawNumber('f_sun_type')}`);
    assert('T15 clear restores f_sun_age=0.75', Math.abs(rawNumber('f_sun_age') - 0.75) < 1e-9, `got ${rawNumber('f_sun_age')}`);
    assert('T15 clear restores N_p_star=2.0', Math.abs(rawNumber('N_p_star') - 2.0) < 1e-9, `got ${rawNumber('N_p_star')}`);
    assert('T15 clear restores f_composition=0.35', Math.abs(rawNumber('f_composition') - 0.35) < 1e-9, `got ${rawNumber('f_composition')}`);
    assert('T15 clear restores f_orbit=0.21', Math.abs(rawNumber('f_orbit') - 0.21) < 1e-9, `got ${rawNumber('f_orbit')}`);
    assert('T15 clear sets astronomyOverrideMode = null', astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
    assert('T15 clear leaves all overlay buttons inactive',
      ariaPressed('bayes-pre') === 'false' && ariaPressed('bayes-post') === 'false' && ariaPressed('bayes-eta') === 'false',
      `pre=${ariaPressed('bayes-pre')} post=${ariaPressed('bayes-post')} eta=${ariaPressed('bayes-eta')}`);
  } finally {
    // Restore the live UI state.
    if (_savedPreset && PRESETS[_savedPreset]) loadPreset(_savedPreset);
    else loadPreset('kepler');
    if (_savedOverride && BAYES[_savedOverride]) setBayesian(_savedOverride);
  }

  return results;
}
window.runAstronomySourceTests = runAstronomySourceTests;

function runV217StateConsistencyTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  function arraysEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  }

  const savedPreset = activePreset;
  const savedOverride = astronomyOverrideMode;
  const savedMcMode = (byId('mc-basis-mode') || {}).value;
  const savedGalaxyEnabled = isGalaxySettingsEnabled;
  const savedGalaxyMode = galaxyScalingMode;
  const savedGalaxyBaseline = galaxySettingsBaseline;
  const savedGalaxyName = galaxyName;
  const savedGalaxyTotalStars = (byId('galaxy-total-stars') || {}).value;
  const savedGalaxyGhzFraction = (byId('galaxy-ghz-fraction') || {}).value;
  const savedNGHZMin = (byId('N_GHZ_min') || {}).value;
  const savedNGHZMax = (byId('N_GHZ_max') || {}).value;
  const savedFSize = (byId('f_size') || {}).value;
  const savedFOrbit = (byId('f_orbit') || {}).value;
  const savedFOrbitMin = (byId('f_orbit_min') || {}).value;
  const savedFOrbitMax = (byId('f_orbit_max') || {}).value;

  try {
    const expectedNp = { pessimist: 1.0, consensus: 1.5, optimist: 2.0, kepler: 1.6 };
    Object.keys(expectedNp).forEach(key => {
      loadPreset(key);
      assert(`Preset ${key} restores N_p_star`, nearlyEqual(rawNumber('N_p_star'), expectedNp[key]), `got ${rawNumber('N_p_star')}`);
      assert(`Preset ${key} clears occurrence overlay`, astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
    });

    loadPreset('optimist');
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'simple';
    galaxySettingsBaseline = { stale: true };
    if (byId('mc-basis-mode')) byId('mc-basis-mode').value = 'presetLocal';
    setBayesian('bryson_eta_direct');
    loadPreset('kepler');
    assert('Preset switch clears stale galaxy override', !isGalaxySettingsEnabled && galaxyScalingMode === 'manual' && galaxySettingsBaseline === null,
      `enabled=${isGalaxySettingsEnabled} mode=${galaxyScalingMode} baseline=${JSON.stringify(galaxySettingsBaseline)}`);
    assert('Preset switch resets MC basis to auto', ((byId('mc-basis-mode') || {}).value || '') === 'auto', `got ${(byId('mc-basis-mode') || {}).value}`);
    assert('Preset switch after Bryson restores Kepler N_p_star = 1.6', nearlyEqual(rawNumber('N_p_star'), 1.6), `got ${rawNumber('N_p_star')}`);

    loadPreset('optimist');
    setBayesian('bryson_eta_direct');
    const directIds = getMonteCarloSampledParameterIds(getMonteCarloBoundsDescriptor());
    assert('Bryson direct sampled ids exclude factorized occurrence controls',
      !directIds.includes('N_p_star') && !directIds.includes('f_composition') && !directIds.includes('f_orbit'),
      `ids=${directIds.join(',')}`);
    assert('Bryson direct sampled ids treat eta_earth_bryson as fixed', !directIds.includes('eta_earth_bryson'), `ids=${directIds.join(',')}`);
    const directState = buildResolvedModelState();
    assert('Resolved state reports eta direct occurrence', directState.occurrenceMode === 'eta_earth_direct' && nearlyEqual(directState.occurrenceTerm_used, 0.60),
      `mode=${directState.occurrenceMode} term=${directState.occurrenceTerm_used}`);
    assert('Resolved state lists replaced occurrence terms',
      arraysEqual(directState.replacedTerms, ['N_p_star', 'f_composition', 'f_orbit']),
      `terms=${JSON.stringify(directState.replacedTerms)}`);

    ADV.enabled = true;
    ADV.modules.radiusValley.enabled = false;
    const directWithoutRadiusValley = computePlanetsAdvanced(applyAdvancedModules(resolveInputsForCalculation()));
    ADV.modules.radiusValley.enabled = true;
    if (byId('adv_P_rocky')) byId('adv_P_rocky').value = '0.01';
    const directWithRadiusValley = computePlanetsAdvanced(applyAdvancedModules(resolveInputsForCalculation()));
    assert('Radius-valley module is inert in Bryson direct occurrence mode',
      nearlyEqual(directWithRadiusValley, directWithoutRadiusValley),
      `without=${directWithoutRadiusValley} with=${directWithRadiusValley}`);
    ADV.modules.radiusValley.enabled = false;
    ADV.enabled = false;

    if (byId('mc-basis-mode')) byId('mc-basis-mode').value = 'presetLocal';
    const directBounds = getMonteCarloBoundsDescriptor(getSimulationOptions());
    assert('Explicit presetLocal resolves to modified basis while overlay/direct mode is active',
      directBounds.mode === MONTE_CARLO_BASIS_MODES.modifiedPresetLocal,
      `got ${directBounds.mode}`);

    loadPreset('optimist');
    setBayesian('pre');
    clearOccurrenceOverlayForManualEdit('f_H2O');
    assert('Unrelated manual scientific edit keeps occurrence overlay active', astronomyOverrideMode === 'pre', `got ${astronomyOverrideMode}`);
    assert('Unrelated manual scientific edit keeps overlay values active',
      nearlyEqual(rawNumber('f_composition'), 0.20) && nearlyEqual(rawNumber('f_orbit'), 0.18),
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);

    if (byId('f_composition')) byId('f_composition').value = '0.22';
    clearOccurrenceOverlayForManualEdit('f_composition');
    assert('Occurrence-field manual edit clears occurrence overlay state', astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
    assert('Occurrence-field manual edit preserves edited field and restores overlay sibling',
      nearlyEqual(rawNumber('f_composition'), 0.22) && nearlyEqual(rawNumber('f_orbit'), 0.21),
      `f_comp=${rawNumber('f_composition')} f_orbit=${rawNumber('f_orbit')}`);

    loadPreset('kepler');
    isGalaxySettingsEnabled = true;
    galaxyScalingMode = 'simple';
    if (byId('galaxy-total-stars')) byId('galaxy-total-stars').value = '1000000000000';
    if (byId('galaxy-ghz-fraction')) byId('galaxy-ghz-fraction').value = '0.2';
    const effectiveGalaxyNGHZ = getEffectiveNGHZ().value;
    const lowEnvelope = buildEnvelopeBaseInputs('low');
    const highEnvelope = buildEnvelopeBaseInputs('high');
    assert('Robust envelope uses effective simple Galaxy N_GHZ',
      nearlyEqual(lowEnvelope.N_GHZ, effectiveGalaxyNGHZ) && nearlyEqual(highEnvelope.N_GHZ, effectiveGalaxyNGHZ),
      `effective=${effectiveGalaxyNGHZ} low=${lowEnvelope.N_GHZ} high=${highEnvelope.N_GHZ}`);

    loadPreset('kepler');
    if (byId('N_GHZ_min') && byId('N_GHZ_max')) {
      byId('N_GHZ_min').value = '30000000000';
      byId('N_GHZ_max').value = '10000000000';
      clearBoundIntervalWarnings();
      getParamSamplingState('N_GHZ', { mode: MONTE_CARLO_BASIS_MODES.customInput, label: 'test', uncertaintyBasisLabel: 'test' });
      assert('Sampling normalization swaps inverted bounds locally without mutating DOM',
        (byId('N_GHZ_min') || {}).value === '30000000000' && (byId('N_GHZ_max') || {}).value === '10000000000',
        `min=${(byId('N_GHZ_min') || {}).value} max=${(byId('N_GHZ_max') || {}).value}`);
    }

    assert('Exact probability lower boundary samples exact zero',
      sampleLogitNormalBounded(0, 0, 0, () => 0.5) === 0,
      `got ${sampleLogitNormalBounded(0, 0, 0, () => 0.5)}`);
    assert('Exact probability upper boundary samples exact one',
      sampleLogitNormalBounded(1, 1, 1, () => 0.5) === 1,
      `got ${sampleLogitNormalBounded(1, 1, 1, () => 0.5)}`);

    if (byId('f_size')) {
      byId('f_size').value = '1.5';
      const visible = getInputs();
      assert('getInputs normalizes invalid probability locally without mutating DOM',
        nearlyEqual(visible.f_size, 1) && (byId('f_size') || {}).value === '1.5',
        `value=${(byId('f_size') || {}).value} normalized=${visible.f_size}`);
      buildResolvedModelState();
      assert('buildResolvedModelState does not mutate invalid probability DOM',
        (byId('f_size') || {}).value === '1.5',
        `value=${(byId('f_size') || {}).value}`);
    }

    if (byId('f_orbit') && byId('f_orbit_min') && byId('f_orbit_max')) {
      byId('f_orbit').value = '0';
      byId('f_orbit_min').value = '0';
      byId('f_orbit_max').value = '0.25';
      clearBoundIntervalWarnings();
      const before = `${(byId('f_orbit') || {}).value}|${(byId('f_orbit_min') || {}).value}|${(byId('f_orbit_max') || {}).value}`;
      getParamSamplingState('f_orbit', { mode: MONTE_CARLO_BASIS_MODES.customInput, label: 'test', uncertaintyBasisLabel: 'test' });
      const after = `${(byId('f_orbit') || {}).value}|${(byId('f_orbit_min') || {}).value}|${(byId('f_orbit_max') || {}).value}`;
      const hasBoundaryWarning = getBoundValidationWarnings().some(w => w.code === 'PROBABILITY_BOUNDARY_WITH_WIDTH');
      assert('Boundary probability with interval emits explicit warning without mutating DOM',
        hasBoundaryWarning && before === after,
        `warning=${hasBoundaryWarning} before=${before} after=${after}`);
    }
  } finally {
    if (savedPreset && PRESETS[savedPreset]) loadPreset(savedPreset);
    else loadPreset('kepler');
    if (savedOverride && BAYES[savedOverride]) setBayesian(savedOverride);
    if (byId('mc-basis-mode')) byId('mc-basis-mode').value = savedMcMode || 'auto';
    isGalaxySettingsEnabled = savedGalaxyEnabled;
    galaxyScalingMode = savedGalaxyMode;
    galaxySettingsBaseline = savedGalaxyBaseline;
    galaxyName = savedGalaxyName;
    if (byId('galaxy-total-stars') && savedGalaxyTotalStars !== undefined) byId('galaxy-total-stars').value = savedGalaxyTotalStars;
    if (byId('galaxy-ghz-fraction') && savedGalaxyGhzFraction !== undefined) byId('galaxy-ghz-fraction').value = savedGalaxyGhzFraction;
    applyGalaxyScalingModeUI(galaxyScalingMode || 'manual');
    const toggle = byId('enable-galaxy-settings');
    if (toggle) toggle.classList.toggle('enabled', isGalaxySettingsEnabled);
    const options = byId('galaxy-options');
    if (options) options.style.display = isGalaxySettingsEnabled ? 'block' : 'none';
    if (byId('N_GHZ_min') && savedNGHZMin !== undefined) byId('N_GHZ_min').value = savedNGHZMin;
    if (byId('N_GHZ_max') && savedNGHZMax !== undefined) byId('N_GHZ_max').value = savedNGHZMax;
    if (byId('f_size') && savedFSize !== undefined) byId('f_size').value = savedFSize;
    if (byId('f_orbit') && savedFOrbit !== undefined) byId('f_orbit').value = savedFOrbit;
    if (byId('f_orbit_min') && savedFOrbitMin !== undefined) byId('f_orbit_min').value = savedFOrbitMin;
    if (byId('f_orbit_max') && savedFOrbitMax !== undefined) byId('f_orbit_max').value = savedFOrbitMax;
    if (typeof clearInputValidationWarnings === 'function') clearInputValidationWarnings();
    syncPresetUi();
    syncBayesianUi();
    renderConfigurationWarnings();
  }

  return results;
}
window.runV217StateConsistencyTests = runV217StateConsistencyTests;

// Regression suite for the occurrence-mode GUI/state semantics: the exact "confusing case" from the
// audit (factorized 0.084 -> 35,364 vs Bryson η⊕ direct 0.60 -> 252,599) plus a full preset × mode
// matrix that proves the visible GUI, active button state, resolved state, and export metadata all
// agree on whether the active occurrence term is factorized or eta_earth_direct.
function runOccurrenceModeRegressionTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  function approx(a, b, tol) {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  }
  function arraysEqual(x, y) {
    return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((v, i) => v === y[i]);
  }
  function deterministicNow() {
    return computePlanetsAdvanced(applyAdvancedModules(getInputs()));
  }

  const _savedPreset = activePreset;
  const _savedOverride = astronomyOverrideMode;

  try {
    // ---- A. The exact confusing case on the Kepler/Gaia · Bryson main preset. ----

    // B + C: Updated Kepler/Gaia posterior proxy keeps the factorized rocky/HZ values visible.
    loadPreset('kepler');
    setBayesian('post');
    assert('R-A visible f_rocky = 0.25 in Updated K/G mode', approx(rawNumber('f_composition'), 0.25, 1e-9), `got ${rawNumber('f_composition')}`);
    assert('R-A visible f_HZ = 0.21 in Updated K/G mode', approx(rawNumber('f_orbit'), 0.21, 1e-9), `got ${rawNumber('f_orbit')}`);

    // D: active occurrence term is the factorized product 1.6 × 0.25 × 0.21 = 0.084.
    const postState = buildResolvedModelState();
    assert('R-A active occurrence mode is factorized', postState.occurrenceMode === 'factorized', `got ${postState.occurrenceMode}`);
    assert('R-A active occurrence term = 1.6 × 0.25 × 0.21 = 0.084', approx(postState.occurrenceTerm_used, 0.084, 1e-6), `got ${postState.occurrenceTerm_used}`);
    assert('R-A occurrence proxy helper agrees = 0.084', approx(getAstronomyOccurrenceProxyFromValues(), 0.084, 1e-6), `got ${getAstronomyOccurrenceProxyFromValues()}`);

    // E: deterministic result ≈ 35,364.
    const postDet = deterministicNow();
    assert('R-A deterministic (Updated K/G) ≈ 35,364', approx(postDet, 35363.79, 2), `got ${postDet}`);

    // F + G: Bryson η⊕ direct proxy — visible f_rocky/f_HZ may remain but must be made visually inert.
    setBayesian('bryson_eta_direct');
    assert('R-A Bryson active button state', astronomyOverrideMode === 'bryson_eta_direct', `got ${astronomyOverrideMode}`);
    assert('R-A visible f_rocky still 0.25 (not overwritten)', approx(rawNumber('f_composition'), 0.25, 1e-9), `got ${rawNumber('f_composition')}`);
    assert('R-A visible f_HZ still 0.21 (not overwritten)', approx(rawNumber('f_orbit'), 0.21, 1e-9), `got ${rawNumber('f_orbit')}`);

    // G (strengthened, requirement #5): each card greyed-out via class, inputs disabled/read-only,
    // ± interval button disabled, and the exact "BYPASSED BY η⊕ NOT USED" label present.
    ['N_p_star', 'f_composition', 'f_orbit'].forEach(id => {
      const card = byId('card-' + id);
      assert(`R-A G: card-${id} has class bypassed-by-eta`, !!card && card.classList.contains('bypassed-by-eta'), `class=${card && card.className}`);
      const input = byId(id);
      assert(`R-A G: input ${id} disabled or read-only`, !!input && (input.disabled === true || input.readOnly === true), `disabled=${input && input.disabled} readOnly=${input && input.readOnly}`);
      const toggleBtn = card && card.querySelector('.interval-toggle');
      assert(`R-A G: interval button for ${id} disabled`, !!toggleBtn && toggleBtn.disabled === true, `disabled=${toggleBtn && toggleBtn.disabled}`);
      const note = byId('eta-replaced-' + id);
      assert(`R-A G: card-${id} shows exact label "BYPASSED BY η⊕ NOT USED"`,
        !!note && (note.textContent || '').trim() === 'BYPASSED BY η⊕ NOT USED', `got "${note && note.textContent}"`);
    });

    // H: active occurrence term is η⊕ = 0.60.
    const brysonState = buildResolvedModelState();
    assert('R-A active occurrence mode is eta_earth_direct', brysonState.occurrenceMode === 'eta_earth_direct', `got ${brysonState.occurrenceMode}`);
    assert('R-A active occurrence term = η⊕ = 0.60', approx(brysonState.occurrenceTerm_used, 0.60, 1e-9), `got ${brysonState.occurrenceTerm_used}`);
    assert('R-A bypassed diagnostic factorized product still = 0.084', approx(brysonState.factorizedOccurrenceTerm_visible, 0.084, 1e-6), `got ${brysonState.factorizedOccurrenceTerm_visible}`);

    // H (presentation): the large lower "ACTIVE OCCURRENCE TERM" panel must be GONE; Bryson direct
    // renders a single direct-mode banner (not the generic "Occurrence overlay active" text).
    assert('R-A large lower active-occurrence-term panel removed', !byId('active-occurrence-term-card'), 'panel still present');
    const banner = byId('occurrence-mode-banner');
    assert('R-A Bryson direct mode renders #occurrence-mode-banner', !!banner, 'banner missing');
    const bannerText = banner ? (banner.textContent || '') : '';
    assert('R-A banner says "Direct η⊕ occurrence replacement active"',
      /Direct η⊕ occurrence replacement active/.test(bannerText), `got "${bannerText}"`);
    assert('R-A banner does NOT use generic "Occurrence overlay active" text',
      !/Occurrence overlay active/.test(bannerText), `got "${bannerText}"`);
    assert('R-A banner does NOT repeat the full multiplication 1.6 × 0.25 × 0.21',
      !/1\.6\s*×\s*0\.25\s*×\s*0\.21/.test(bannerText), `got "${bannerText}"`);

    // Upper Active Calculation State box remains the canonical summary (η⊕ direct + bypassed product).
    renderActiveCalculationStateBox();
    const upperHtml = (byId('active-calculation-state-body') || {}).innerHTML || '';
    assert('R-A upper state box still shows η⊕ direct = 0.60',
      /η⊕ direct =\s*<strong>0\.6<\/strong>/.test(upperHtml) || /η⊕ direct =\s*0\.6/.test(upperHtml.replace(/<[^>]+>/g, '')),
      `got "${upperHtml}"`);
    assert('R-A upper state box still shows bypassed diagnostic factorized product = 0.084',
      /Bypassed diagnostic factorized product/.test(upperHtml) && /=\s*<strong>0\.084<\/strong>/.test(upperHtml),
      `got "${upperHtml}"`);

    // I: deterministic result ≈ 252,599 (= 35,363.79 × 0.60/0.084).
    const brysonDet = deterministicNow();
    assert('R-A deterministic (Bryson η⊕ direct) ≈ 252,599', approx(brysonDet, 252598.5, 3), `got ${brysonDet}`);
    assert('R-A deterministic ratio Bryson/Updated = 0.60/0.084 (7.142857)', approx(brysonDet / postDet, 0.60 / 0.084, 1e-4), `ratio=${brysonDet / postDet}`);

    // J: the GUI must visibly state that N_p_star, f_rocky, and f_HZ are not used in Bryson direct mode.
    calculateDeterministic();
    const alertsHtml = (byId('config-alerts-body') || {}).innerHTML || '';
    assert('R-A J: result area states f_rocky/f_HZ are bypassed in Bryson direct mode',
      /f_rocky, and f_HZ remain visible as diagnostics but are bypassed/.test(alertsHtml),
      'bypass statement missing from rendered configuration warnings');

    // Export agreement for the exact case.
    const brysonSnap = getAstronomyPriorExportSnapshot();
    assert('R-A export occurrence_mode = eta_earth_direct', brysonSnap.occurrence_mode === 'eta_earth_direct', `got ${brysonSnap.occurrence_mode}`);
    assert('R-A export active_occurrence_term = eta_earth_bryson', brysonSnap.active_occurrence_term === 'eta_earth_bryson', `got ${brysonSnap.active_occurrence_term}`);
    assert('R-A export eta_earth_bryson = 0.60', brysonSnap.eta_earth_bryson === 0.60, `got ${brysonSnap.eta_earth_bryson}`);
    assert('R-A export replaced_terms = [N_p_star, f_composition, f_orbit]',
      arraysEqual(brysonSnap.replaced_terms, ['N_p_star', 'f_composition', 'f_orbit']), `got ${JSON.stringify(brysonSnap.replaced_terms)}`);
    assert('R-A export visible_terms_status = diagnostic_only', brysonSnap.visible_terms_status === 'diagnostic_only', `got ${brysonSnap.visible_terms_status}`);

    // ---- B. Full preset × occurrence-mode matrix. ----
    const scenarioNp = { kepler: 1.6, consensus: 1.5, optimist: 2.0, pessimist: 1.0 };
    const overlayValues = { pre: { f_composition: 0.20, f_orbit: 0.18 }, post: { f_composition: 0.25, f_orbit: 0.21 } };

    Object.keys(scenarioNp).forEach(preset => {
      // Factorized overlays (Conservative Kepler-era + Updated Kepler/Gaia) must visibly apply f_rocky/f_HZ.
      ['pre', 'post'].forEach(mode => {
        loadPreset(preset);
        setBayesian(mode);
        const ov = overlayValues[mode];
        assert(`R-M ${preset}/${mode}: applies f_rocky=${ov.f_composition}`, approx(rawNumber('f_composition'), ov.f_composition, 1e-9), `got ${rawNumber('f_composition')}`);
        assert(`R-M ${preset}/${mode}: applies f_HZ=${ov.f_orbit}`, approx(rawNumber('f_orbit'), ov.f_orbit, 1e-9), `got ${rawNumber('f_orbit')}`);
        const st = buildResolvedModelState();
        const expectedProxy = scenarioNp[preset] * ov.f_composition * ov.f_orbit;
        assert(`R-M ${preset}/${mode}: occurrence mode factorized`, st.occurrenceMode === 'factorized', `got ${st.occurrenceMode}`);
        assert(`R-M ${preset}/${mode}: active term = N_p × f_rocky × f_HZ = ${expectedProxy.toFixed(4)}`, approx(st.occurrenceTerm_used, expectedProxy, 1e-6), `got ${st.occurrenceTerm_used}`);
        const snap = getAstronomyPriorExportSnapshot();
        assert(`R-M ${preset}/${mode}: export occurrence_mode factorized`, snap.occurrence_mode === 'factorized' && snap.eta_earth_bryson === undefined, `mode=${snap.occurrence_mode} eta=${snap.eta_earth_bryson}`);
      });

      // Bryson η⊕ direct must always show η⊕ = 0.60 and never let f_rocky/f_HZ drive the result.
      loadPreset(preset);
      setBayesian('bryson_eta_direct');
      const det1 = deterministicNow();
      // Mutating the bypassed factorized trio must not change the Bryson direct result.
      if (byId('f_composition') && byId('f_orbit')) {
        const savedC = byId('f_composition').value;
        const savedO = byId('f_orbit').value;
        byId('f_composition').value = String(Number(savedC) * 3 || 0.99);
        byId('f_orbit').value = String(Number(savedO) * 3 || 0.99);
        const det2 = deterministicNow();
        byId('f_composition').value = savedC;
        byId('f_orbit').value = savedO;
        assert(`R-M ${preset}/bryson: f_rocky/f_HZ are not the active cause of the result`, approx(det1, det2, 1e-6), `det1=${det1} det2=${det2}`);
      }
      const stB = buildResolvedModelState();
      assert(`R-M ${preset}/bryson: occurrence mode eta_earth_direct`, stB.occurrenceMode === 'eta_earth_direct', `got ${stB.occurrenceMode}`);
      assert(`R-M ${preset}/bryson: active occurrence term = η⊕ = 0.60`, approx(stB.occurrenceTerm_used, 0.60, 1e-9), `got ${stB.occurrenceTerm_used}`);
      const snapB = getAstronomyPriorExportSnapshot();
      assert(`R-M ${preset}/bryson: export occurrence_mode eta_earth_direct`, snapB.occurrence_mode === 'eta_earth_direct', `got ${snapB.occurrence_mode}`);
      assert(`R-M ${preset}/bryson: export active_occurrence_term eta_earth_bryson`, snapB.active_occurrence_term === 'eta_earth_bryson', `got ${snapB.active_occurrence_term}`);
      // Cross-check the deterministic jump equals the occurrence-term ratio (host/habitability factors held fixed).
      loadPreset(preset);
      setBayesian('post');
      const detPost = deterministicNow();
      const postProxy = scenarioNp[preset] * 0.25 * 0.21;
      assert(`R-M ${preset}: Bryson/Updated deterministic ratio = 0.60/${postProxy.toFixed(4)}`, approx(det1 / detPost, 0.60 / postProxy, 1e-4), `ratio=${det1 / detPost} expected=${0.60 / postProxy}`);
    });
  } finally {
    if (_savedPreset && PRESETS[_savedPreset]) loadPreset(_savedPreset);
    else loadPreset('kepler');
    if (_savedOverride && BAYES[_savedOverride]) setBayesian(_savedOverride);
    renderConfigurationWarnings();
  }

  return results;
}
window.runOccurrenceModeRegressionTests = runOccurrenceModeRegressionTests;

// Regression suite for the occurrence-mode BANNER (#occurrence-mode-banner) and the readable UI
// labels. The banner must never become a sticky DOM artifact: it is removed before each re-render,
// is absent for no-override and factorized overlays, and only Bryson η⊕ direct shows direct-mode text.
function runOccurrenceNoticeUiTests() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, passed: !!cond, detail: cond ? 'OK' : (detail || 'FAILED') });
  }
  const RAW_BANNED = ['modifiedPresetLocal', 'manual_raw_N_GHZ', 'simple_galaxy_scaling', 'radial_ghz_integrator'];
  function cardBypassed(id) {
    const card = byId('card-' + id);
    const input = byId(id);
    return !!card && card.classList.contains('bypassed-by-eta') && !!input && (input.disabled || input.readOnly);
  }
  function bannerEl() { return byId('occurrence-mode-banner'); }
  function bannerVisible() {
    const n = bannerEl();
    return !!n && n.style.display !== 'none' && (n.textContent || '').trim().length > 0;
  }
  function bodyHasText(s) {
    const t = (document.body && (document.body.innerText || document.body.textContent)) || '';
    return t.indexOf(s) !== -1;
  }
  function ariaPressed(id) { const el = byId(id); return el ? el.getAttribute('aria-pressed') : null; }
  function allButtonsInactive() {
    return ariaPressed('bayes-pre') === 'false' && ariaPressed('bayes-post') === 'false' && ariaPressed('bayes-eta') === 'false';
  }
  function upperHtml() {
    renderActiveCalculationStateBox();
    return (byId('active-calculation-state-body') || {}).innerHTML || '';
  }

  const _savedPreset = activePreset;
  const _savedOverride = astronomyOverrideMode;

  try {
    // A. Initial-load / clean state: no override, no banner, no stale "Occurrence overlay active" text.
    loadPreset('kepler');
    assert('A astronomyOverrideMode === null on clean preset', astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
    assert('A no #occurrence-mode-banner element exists', !bannerEl(), 'banner present on clean load');
    assert('A no "Occurrence overlay active" text in body', !bodyHasText('Occurrence overlay active'), 'stale generic text present');
    assert('A all occurrence buttons inactive', allButtonsInactive(), 'a button still active');
    assert('A upper state box shows Scenario factorized', /Scenario factorized/.test(upperHtml()), 'missing factorized label');

    // B. Updated Kepler/Gaia posterior proxy (factorized overlay): NO generic full-width banner.
    loadPreset('kepler');
    setBayesian('post');
    assert('B astronomyOverrideMode === "post"', astronomyOverrideMode === 'post', `got ${astronomyOverrideMode}`);
    assert('B active occurrence mode is factorized', getActiveOccurrenceMode() === 'factorized', `got ${getActiveOccurrenceMode()}`);
    assert('B no full-width occurrence banner for factorized overlay', !bannerEl(), 'factorized banner present');
    assert('B no "Occurrence overlay active" text in body', !bodyHasText('Occurrence overlay active'), 'stale generic text present');
    assert('B Active calculation state shows N_p_star × f_rocky × f_HZ',
      /N_p_star × f_rocky × f_HZ/.test(upperHtml()), 'factorized term missing from state box');

    // C. Bryson η⊕ direct proxy: banner present with direct-mode text, η⊕ = 0.60, cards bypassed.
    loadPreset('kepler');
    setBayesian('bryson_eta_direct');
    assert('C astronomyOverrideMode === "bryson_eta_direct"', astronomyOverrideMode === 'bryson_eta_direct', `got ${astronomyOverrideMode}`);
    assert('C active occurrence mode is eta_earth_direct', getActiveOccurrenceMode() === 'eta_earth_direct', `got ${getActiveOccurrenceMode()}`);
    assert('C #occurrence-mode-banner present', bannerVisible(), 'banner missing/empty');
    const cText = bannerEl() ? (bannerEl().textContent || '') : '';
    assert('C banner says "Direct η⊕ occurrence replacement active"', /Direct η⊕ occurrence replacement active/.test(cText), `got "${cText}"`);
    assert('C generic "Occurrence overlay active" text NOT visible', !bodyHasText('Occurrence overlay active'), 'generic text present');
    assert('C N_p_star/f_composition/f_orbit cards bypassed+disabled',
      cardBypassed('N_p_star') && cardBypassed('f_composition') && cardBypassed('f_orbit'), 'a card not bypassed/disabled');
    const cUpper = upperHtml();
    assert('C active occurrence term shows η⊕ = 0.60', /η⊕ direct =\s*0\.6/.test(cUpper.replace(/<[^>]+>/g, '')), `got "${cUpper}"`);

    // D. After Bryson direct -> Updated K/G: direct banner disappears, bypass labels gone, no stale text.
    setBayesian('post');
    assert('D direct banner removed after switching to factorized overlay', !bannerEl(), 'banner still present');
    assert('D no stale "Direct η⊕ occurrence replacement active" text', !bodyHasText('Direct η⊕ occurrence replacement active'), 'stale direct text present');
    assert('D bypass/diagnostic labels removed from occurrence cards',
      !cardBypassed('N_p_star') && !cardBypassed('f_composition') && !cardBypassed('f_orbit'), 'a card still bypassed');
    assert('D no full-width banner visible (factorized banner disabled)', !bannerEl(), 'banner present');

    // E. After any overlay/direct mode, click a main scenario preset -> fully cleared.
    ['kepler', 'consensus', 'optimist', 'pessimist'].forEach(key => {
      setBayesian('bryson_eta_direct');
      loadPreset(key);
      assert(`E ${key}: astronomyOverrideMode === null after preset click`, astronomyOverrideMode === null, `got ${astronomyOverrideMode}`);
      assert(`E ${key}: all occurrence buttons inactive`, allButtonsInactive(), 'a button still active');
      assert(`E ${key}: no occurrence banner visible`, !bannerEl(), 'banner present');
      assert(`E ${key}: no stale overlay/direct text above parameter cards`,
        !bodyHasText('Occurrence overlay active') && !bodyHasText('Direct η⊕ occurrence replacement active'), 'stale banner text present');
      assert(`E ${key}: occurrence cards not bypassed`,
        !cardBypassed('N_p_star') && !cardBypassed('f_composition') && !cardBypassed('f_orbit'), 'a card still bypassed');
    });

    // F. Readable labels — the UI must never leak raw enums.
    loadPreset('kepler');
    setBayesian('bryson_eta_direct');
    const fUpper = upperHtml();
    RAW_BANNED.forEach(raw => {
      assert(`F upper state box does not display raw "${raw}"`, fUpper.indexOf(raw) === -1, `found ${raw}`);
    });
    assert('F MC basis shows readable occurrence-override wording',
      /preset-local with Bryson η⊕ direct override/.test(fUpper), `got "${fUpper}"`);
    assert('F N_GHZ source shows "Visible N_GHZ field"', /Visible N_GHZ field/.test(fUpper), `got "${fUpper}"`);
    assert('F map manual_raw_N_GHZ -> Visible N_GHZ field', formatNGHZSourceLabel('manual_raw_N_GHZ') === 'Visible N_GHZ field', formatNGHZSourceLabel('manual_raw_N_GHZ'));
    assert('F map simple_galaxy_scaling -> Galaxy Settings · simple scaling', formatNGHZSourceLabel('simple_galaxy_scaling') === 'Galaxy Settings · simple scaling', formatNGHZSourceLabel('simple_galaxy_scaling'));
    assert('F map radial_ghz_integrator -> Radial GHZ integrator', formatNGHZSourceLabel('radial_ghz_integrator') === 'Radial GHZ integrator', formatNGHZSourceLabel('radial_ghz_integrator'));
    assert('F map modifiedPresetLocal -> readable', monteCarloBasisPlainLabel('modifiedPresetLocal') === 'modified preset-local', monteCarloBasisPlainLabel('modifiedPresetLocal'));
  } finally {
    if (_savedPreset && PRESETS[_savedPreset]) loadPreset(_savedPreset);
    else loadPreset('kepler');
    if (_savedOverride && BAYES[_savedOverride]) setBayesian(_savedOverride);
  }

  return results;
}
window.runOccurrenceNoticeUiTests = runOccurrenceNoticeUiTests;

// Convenience aggregator so all occurrence-related suites can be run in one console call.
function runAllOccurrenceTests() {
  const suites = [
    ['AstronomySource', runAstronomySourceTests],
    ['V217StateConsistency', runV217StateConsistencyTests],
    ['OccurrenceModeRegression', runOccurrenceModeRegressionTests],
    ['OccurrenceNoticeUi', runOccurrenceNoticeUiTests]
  ];
  const all = [];
  suites.forEach(([label, fn]) => {
    try {
      fn().forEach(r => all.push({ ...r, suite: label }));
    } catch (e) {
      all.push({ suite: label, name: `${label} threw`, passed: false, detail: String(e && e.message || e) });
    }
  });
  const failed = all.filter(r => !r.passed);
  /* eslint-disable no-console */
  console.log(`Occurrence test suites: ${all.length - failed.length}/${all.length} passed.`);
  if (failed.length) console.table(failed.map(r => ({ suite: r.suite, name: r.name, detail: r.detail })));
  /* eslint-enable no-console */
  return { total: all.length, passed: all.length - failed.length, failed };
}
window.runAllOccurrenceTests = runAllOccurrenceTests;

function getCurrentMonteCarloSamplesForExport() {
  if (!Array.isArray(lastResults)) return [];
  return lastResults.filter(v => typeof v === 'number' && Number.isFinite(v));
}

function hasCurrentMonteCarloDataForExport() {
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  return (
    mcState === 'current' &&
    simulationCompleted === true &&
    getCurrentMonteCarloSamplesForExport().length > 0
  );
}

function getMonteCarloExportBlockWarning(defaultMessage) {
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  if (mcState === 'stale') return MONTE_CARLO_STALE_EXPORT_WARNING_MESSAGE;
  return defaultMessage;
}

function showMonteCarloExportWarning(message = MONTE_CARLO_EXPORT_WARNING_MESSAGE) {
  const warning = byId('monte-carlo-export-warning');
  if (warning) {
    warning.textContent = message;
    warning.style.display = 'block';
  } else if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
  return message;
}
window.showMonteCarloExportWarning = showMonteCarloExportWarning;

function clearMonteCarloExportWarning() {
  const warning = byId('monte-carlo-export-warning');
  if (!warning) return;
  warning.textContent = '';
  warning.style.display = 'none';
}
window.clearMonteCarloExportWarning = clearMonteCarloExportWarning;

function buildMonteCarloDataExportSnapshot() {
  const samples = getCurrentMonteCarloSamplesForExport();
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');

  if (mcState !== 'current' || simulationCompleted !== true || !samples.length) {
    return null;
  }

  const runMeta = lastMonteCarloRunMetadata || {};
  const scenarioLabel =
    typeof getScenarioExportLabel === 'function'
      ? getScenarioExportLabel()
      : (activePreset || 'custom');
  const scenarioStateSnapshot =
    typeof getScenarioState === 'function' ? getScenarioState() : null;
  const deterministicAtRun = Number.isFinite(runMeta.deterministic)
    ? runMeta.deterministic
    : (hasUsableDeterministicCalculation() ? deterministicPlanets : null);
  const resolvedModelState = runMeta.resolvedModelState || getResolvedModelStateForExport();

  return {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    export_type: 'monte_carlo_data',
    version: '2.17',
    timestamp: new Date().toISOString(),
    preset: activePreset || 'custom',
    scenario_label: scenarioLabel,
    scenario_state: scenarioStateSnapshot,
    galaxy: galaxyName,
    astronomy_prior_model: runMeta.astronomyPriorModel || getAstronomyPriorExportSnapshot(),
    resolved_model_state: resolvedModelState,
    pre_advanced_calculation_input_values: resolvedModelState.preAdvancedCalculationInputValues || resolvedModelState.calculationInputValues,
    final_effective_calculation_input_values: resolvedModelState.finalEffectiveCalculationInputValues || resolvedModelState.calculationInputValues,
    occurrence_model: {
      mode: resolvedModelState.occurrenceMode,
      overlay_mode: resolvedModelState.occurrenceOverlayMode,
      occurrence_term_used: resolvedModelState.occurrenceTerm_used,
      occurrence_term_pre_advanced: resolvedModelState.occurrenceTerm_preAdvanced,
      occurrence_term_final_used: resolvedModelState.occurrenceTerm_finalUsed,
      eta_earth_used: resolvedModelState.etaEarth_used,
      replaced_terms: resolvedModelState.replacedTerms
    },
    simulation: {
      iterations: Number.isFinite(Number(runMeta.requestedSamples))
        ? Number(runMeta.requestedSamples)
        : samples.length,
      samples_exported: samples.length,
      valid_samples: Number.isFinite(Number(runMeta.validSamples))
        ? Number(runMeta.validSamples)
        : samples.length,
      engine: runMeta.engine || null,
      distribution: runMeta.distribution || null,
      correlation: runMeta.correlation || null,
      robustBounds: !!runMeta.robustBounds,
      requestedMcMode: resolvedModelState.monteCarlo.requestedBasisMode,
      resolvedMcMode: resolvedModelState.monteCarlo.resolvedBasisMode,
      mcMode: runMeta.mcMode ?? null,
      boundsMode: runMeta.boundsMode ?? null,
      boundsLabel: runMeta.boundsLabel ?? null,
      uncertaintyBasisLabel: runMeta.uncertaintyBasisLabel ?? null,
      robustEnvelopeCoverage: runMeta.robustEnvelopeCoverage || null,
      seed: Object.prototype.hasOwnProperty.call(runMeta, 'seed') ? runMeta.seed : null,
      seed_mode: runMeta.seedMode || null,
      prng: runMeta.prng || MONTE_CARLO_PRNG,
      prngDescription: runMeta.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION,
      sample_order: runMeta.sampleOrder || 'ascending_candidate_count'
    },
    parameters: buildParameterExportSnapshot(),
    N_GHZ_resolved: (function() {
      const _eff = getEffectiveNGHZ();
      return {
        galaxy_model_type: 'custom_galaxy_x',
        galaxy_preset_evidence_level: 'user_defined_scaling_proxy',
        raw_N_GHZ: sanitizePositiveInput('N_GHZ'),
        effective_N_GHZ: _eff.value,
        N_GHZ_source: getNGHZSource(),
        galaxy_total_stars: isGalaxySettingsEnabled ? pf('galaxy-total-stars', MW_TOTAL_STARS) : null,
        galaxy_GHZ_fraction: isGalaxySettingsEnabled ? pf('galaxy-ghz-fraction', MW_DEFAULT_GHZ_FRACTION) : null,
        galaxy_scaling_mode: galaxyScalingMode,
        galaxy_settings_enabled: isGalaxySettingsEnabled
      };
    })(),
    summary: {
      deterministic: finiteNumberOrNull(deterministicAtRun),
      mc_median_q50: finiteNumberOrNull(mcMedianQ50),
      mc_mean: finiteNumberOrNull(mcArithmeticMean),
      mc_q025: finiteNumberOrNull(mcQ025),
      mc_q975: finiteNumberOrNull(mcQ975),
      mc_stddev: finiteNumberOrNull(stdDev),
      mc_mode_estimate: finiteNumberOrNull(mostFrequent)
    },
    samples
  };
}
window.buildMonteCarloDataExportSnapshot = buildMonteCarloDataExportSnapshot;

function exportMonteCarloData() {
  if (!hasCurrentMonteCarloDataForExport()) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_EXPORT_WARNING_MESSAGE));
    return null;
  }

  const snap = buildMonteCarloDataExportSnapshot();
  if (!snap) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_EXPORT_WARNING_MESSAGE));
    return null;
  }

  clearMonteCarloExportWarning();
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earth-like-candidate-monte-carlo-data-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return snap;
}
window.exportMonteCarloData = exportMonteCarloData;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return blob;
}
window.downloadBlob = downloadBlob;

function escapeXmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizePdfText(value) {
  return String(value ?? '').replace(/[^\x20-\x7E]/g, '-');
}

function escapePdfText(value) {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatPublicationNumber(value) {
  if (!Number.isFinite(value)) return 'n/a';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e6 || abs < 0.01) return value.toExponential(2).replace('e+', 'e');
  if (abs >= 1000) return Math.round(value).toLocaleString('en-US');
  if (abs >= 1) return Number(value.toPrecision(4)).toLocaleString('en-US');
  return Number(value.toPrecision(3)).toString();
}

function getMonteCarloPresetTitle(snapshot) {
  const preset = String((snapshot || {}).preset || '').toLowerCase();
  const presetNames = {
    kepler: 'Kepler/Gaia preset',
    consensus: 'Consensus preset',
    optimist: 'Optimist preset',
    pessimist: 'Pessimist preset'
  };
  if (presetNames[preset]) return presetNames[preset];

  const label = String((snapshot || {}).scenario_label || (snapshot || {}).preset || 'Custom scenario')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label) return 'Custom scenario';
  if (/custom/i.test(label)) return label;
  return /preset/i.test(label) ? label : `${label} preset`;
}

function getMonteCarloGalaxyLabel(galaxy) {
  const clean = String(galaxy || 'selected galaxy')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^milky way$/i.test(clean)) return 'the Milky Way';
  return clean || 'selected galaxy';
}

function buildMonteCarloChartTitle(snapshot) {
  return `${getMonteCarloPresetTitle(snapshot)}: model-derived uncertainty summary for ${getMonteCarloGalaxyLabel((snapshot || {}).galaxy)}`;
}
window.buildMonteCarloChartTitle = buildMonteCarloChartTitle;

function getMonteCarloSeedLabel(simulation = {}) {
  const seed = Number.isFinite(Number(simulation.seed)) ? Number(simulation.seed) : 'n/a';
  const mode = simulation.seed_mode === 'fixed' ? 'fixed' : 'random';
  return `seed: ${seed} (${mode})`;
}

function buildMonteCarloChartCaption(snapshot = {}) {
  const title = buildMonteCarloChartTitle(snapshot);
  return `${title}. The histogram shows valid Monte Carlo samples of the candidate count implied by the selected model assumptions. The shaded region marks the q2.5-q97.5 sampled model interval. Vertical markers show the deterministic central estimate, Monte Carlo median, and arithmetic mean. The result is conditional on the selected preset and should not be interpreted as an observational census, detection claim, or validated habitability estimate.`;
}

function buildMonteCarloChartSpec(snapshot = buildMonteCarloDataExportSnapshot()) {
  if (!snapshot || !Array.isArray(snapshot.samples) || !snapshot.samples.length) return null;

  const samples = snapshot.samples.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!samples.length) return null;

  const summary = snapshot.summary || {};
  const summaryValues = [
    summary.mc_q025,
    summary.mc_q975,
    summary.mc_median_q50,
    summary.mc_mean,
    summary.deterministic
  ].filter(v => Number.isFinite(v));
  const allValues = samples.concat(summaryValues);
  const canUseLog = allValues.every(v => v > 0);
  const toScale = canUseLog ? (v => Math.log10(v)) : (v => v);
  const fromScale = canUseLog ? (v => Math.pow(10, v)) : (v => v);
  const scaledSamples = samples.map(toScale);
  const scaledValues = allValues.map(toScale);

  let xMin = Math.min.apply(null, scaledValues);
  let xMax = Math.max.apply(null, scaledValues);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) return null;
  if (xMin === xMax) {
    const pad = Math.max(1, Math.abs(xMin) * 0.05);
    xMin -= pad;
    xMax += pad;
  } else {
    const pad = (xMax - xMin) * 0.06;
    xMin -= pad;
    xMax += pad;
  }

  const width = 1800;
  const height = 1200;
  const plot = { x: 190, y: 220, width: 1450, height: 540 };
  const binCount = Math.min(42, Math.max(18, Math.ceil(Math.sqrt(samples.length) * 1.15)));
  const binWidth = (xMax - xMin) / binCount;
  const bins = Array.from({ length: binCount }, (_, idx) => ({
    x0: xMin + idx * binWidth,
    x1: xMin + (idx + 1) * binWidth,
    count: 0
  }));

  scaledSamples.forEach(value => {
    let idx = Math.floor((value - xMin) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count += 1;
  });

  const maxCount = Math.max.apply(null, bins.map(b => b.count).concat([1]));
  const xPixel = value => plot.x + ((value - xMin) / (xMax - xMin)) * plot.width;
  const ticks = Array.from({ length: 6 }, (_, idx) => {
    const value = xMin + ((xMax - xMin) * idx) / 5;
    return {
      value,
      x: xPixel(value),
      label: formatPublicationNumber(fromScale(value))
    };
  });

  const markerInput = [
    { key: 'deterministic', label: 'Deterministic central estimate', value: summary.deterministic, color: '#8b5cf6', dash: '10 8' },
    { key: 'median', label: 'Monte Carlo q50 median', value: summary.mc_median_q50, color: '#047857', dash: '' },
    { key: 'mean', label: 'Monte Carlo arithmetic mean', value: summary.mc_mean, color: '#b45309', dash: '3 6' }
  ];
  const markers = markerInput
    .filter(m => Number.isFinite(m.value) && (!canUseLog || m.value > 0))
    .map(m => ({
      ...m,
      scaledValue: toScale(m.value),
      x: xPixel(toScale(m.value)),
      valueLabel: formatPublicationNumber(m.value)
    }));

  const interval =
    Number.isFinite(summary.mc_q025) &&
    Number.isFinite(summary.mc_q975) &&
    (!canUseLog || (summary.mc_q025 > 0 && summary.mc_q975 > 0))
      ? {
          x0: xPixel(toScale(summary.mc_q025)),
          x1: xPixel(toScale(summary.mc_q975)),
          label: `q2.5-q97.5 sampled model interval`
        }
      : null;

  const simulation = snapshot.simulation || {};
  const galaxyLabel = getMonteCarloGalaxyLabel(snapshot.galaxy);
  const seedLabel = getMonteCarloSeedLabel(simulation);
  const subtitle = `Scenario: ${snapshot.scenario_label || snapshot.preset || 'custom'} | ${formatPublicationNumber(samples.length)} valid samples | ${simulation.engine || 'Monte Carlo'} engine | ${simulation.distribution || 'distribution n/a'} distribution | ${seedLabel}`;

  return {
    width,
    height,
    plot,
    samples,
    bins,
    maxCount,
    ticks,
    markers,
    interval,
    title: buildMonteCarloChartTitle(snapshot),
    subtitle,
    caption: buildMonteCarloChartCaption(snapshot),
    xAxisLabel: `Model-implied Earth-like candidate count in ${galaxyLabel} (${canUseLog ? 'log10' : 'linear'} scale), not an observational census`,
    yAxisLabel: 'Monte Carlo sample frequency',
    sourceLabel: MONTE_CARLO_CHART_SOURCE_LABEL,
    sourceUrl: MONTE_CARLO_CHART_SOURCE_URL,
    scale: canUseLog ? 'log10' : 'linear',
    exportedAt: snapshot.timestamp,
    simulation,
    seedLabel,
    summary: snapshot.summary || {},
    N_GHZ_resolved: snapshot.N_GHZ_resolved || null
  };
}
window.buildMonteCarloChartSpec = buildMonteCarloChartSpec;

function buildMonteCarloChartSvg(snapshot = buildMonteCarloDataExportSnapshot()) {
  const spec = buildMonteCarloChartSpec(snapshot);
  if (!spec) return null;

  const plot = spec.plot;
  const barSvg = spec.bins.map(bin => {
    const x0 = plot.x + ((bin.x0 - spec.ticks[0].value) / (spec.ticks[5].value - spec.ticks[0].value)) * plot.width;
    const x1 = plot.x + ((bin.x1 - spec.ticks[0].value) / (spec.ticks[5].value - spec.ticks[0].value)) * plot.width;
    const barWidth = Math.max(1, x1 - x0 - 2);
    const barHeight = (bin.count / spec.maxCount) * (plot.height * 0.86);
    const y = plot.y + plot.height - barHeight;
    return `<rect x="${x0.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="#5b9bd5" opacity="0.72"/>`;
  }).join('\n');

  const gridSvg = spec.ticks.map(tick => `
    <line x1="${tick.x.toFixed(2)}" y1="${plot.y}" x2="${tick.x.toFixed(2)}" y2="${plot.y + plot.height}" stroke="#e5e7eb" stroke-width="2"/>
    <text x="${tick.x.toFixed(2)}" y="${plot.y + plot.height + 44}" text-anchor="middle" font-size="28" fill="#374151">${escapeXmlText(tick.label)}</text>
  `).join('\n');

  const intervalSvg = spec.interval
    ? `<rect x="${Math.min(spec.interval.x0, spec.interval.x1).toFixed(2)}" y="${plot.y}" width="${Math.abs(spec.interval.x1 - spec.interval.x0).toFixed(2)}" height="${plot.height}" fill="#dbeafe" opacity="0.74"/>`
    : '';

  const markerSvg = spec.markers.map(marker => `
    <line x1="${marker.x.toFixed(2)}" y1="${plot.y}" x2="${marker.x.toFixed(2)}" y2="${plot.y + plot.height}" stroke="${marker.color}" stroke-width="6" ${marker.dash ? `stroke-dasharray="${marker.dash}"` : ''}/>
  `).join('\n');

  const intervalLegendSvg = spec.interval
    ? `<rect x="190" y="908" width="60" height="22" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/>
       <text x="270" y="928" font-size="28" fill="#111827">q2.5-q97.5 sampled model interval</text>`
    : '';

  const legendSvg = spec.markers.map((marker, idx) => {
    const y = 970 + idx * 46;
    return `
      <line x1="190" y1="${y}" x2="250" y2="${y}" stroke="${marker.color}" stroke-width="7" ${marker.dash ? `stroke-dasharray="${marker.dash}"` : ''}/>
      <text x="270" y="${y + 10}" font-size="28" fill="#111827">${escapeXmlText(marker.label)}: ${escapeXmlText(marker.valueLabel)}</text>
    `;
  }).join('\n');

  const chartMetadata = {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    export_type: 'monte_carlo_chart',
    title: spec.title,
    subtitle: spec.subtitle,
    caption: spec.caption,
    seed: spec.simulation.seed ?? null,
    seed_mode: spec.simulation.seed_mode || null,
    prng: spec.simulation.prng || MONTE_CARLO_PRNG,
    prngDescription: spec.simulation.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION,
    scale: spec.scale,
    generated_at: spec.exportedAt,
    source: spec.sourceUrl || MONTE_CARLO_CHART_SOURCE_URL,
    summary: spec.summary
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" role="img" aria-label="${escapeXmlText(spec.title)}">
  <metadata id="monte-carlo-chart-metadata">${escapeXmlText(JSON.stringify(chartMetadata))}</metadata>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="90" y="92" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="700" fill="#111827">${escapeXmlText(spec.title)}</text>
  <text x="90" y="145" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#4b5563">${escapeXmlText(spec.subtitle)}</text>
  <g font-family="Arial, Helvetica, sans-serif">
    ${gridSvg}
    ${intervalSvg}
    ${barSvg}
    ${markerSvg}
    <rect x="${plot.x}" y="${plot.y}" width="${plot.width}" height="${plot.height}" fill="none" stroke="#111827" stroke-width="3"/>
    <line x1="${plot.x}" y1="${plot.y + plot.height}" x2="${plot.x + plot.width}" y2="${plot.y + plot.height}" stroke="#111827" stroke-width="4"/>
    <line x1="${plot.x}" y1="${plot.y}" x2="${plot.x}" y2="${plot.y + plot.height}" stroke="#111827" stroke-width="4"/>
    <text x="${plot.x + plot.width / 2}" y="${plot.y + plot.height + 100}" text-anchor="middle" font-size="34" font-weight="700" fill="#111827">${escapeXmlText(spec.xAxisLabel)}</text>
    <text x="56" y="${plot.y + plot.height / 2}" text-anchor="middle" font-size="32" font-weight="700" fill="#111827" transform="rotate(-90 56 ${plot.y + plot.height / 2})">${escapeXmlText(spec.yAxisLabel)}</text>
    ${intervalLegendSvg}
    ${legendSvg}
    <text x="90" y="1110" font-size="21" fill="#4b5563">PRNG: ${escapeXmlText(spec.simulation.prng || MONTE_CARLO_PRNG)} | ${escapeXmlText(spec.seedLabel)} | exported ${escapeXmlText(spec.exportedAt || '')}</text>
    <text x="90" y="1148" font-size="21" fill="#4b5563">${escapeXmlText(spec.sourceLabel || MONTE_CARLO_CHART_SOURCE_LABEL)}</text>
  </g>
</svg>`;
}
window.buildMonteCarloChartSvg = buildMonteCarloChartSvg;

function buildMonteCarloChartPngBlob(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Unable to render Monte Carlo chart PNG.'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load Monte Carlo chart SVG for PNG export.'));
    };
    img.src = url;
  });
}

function pdfNumber(value) {
  return Number(value || 0).toFixed(2).replace(/\.?0+$/, '');
}

function pdfHexColor(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b].map(pdfNumber).join(' ');
}

function buildMonteCarloChartPdfBytes(snapshot = buildMonteCarloDataExportSnapshot()) {
  const spec = buildMonteCarloChartSpec(snapshot);
  if (!spec) return null;
  const scale = 0.4;
  const pageWidth = spec.width * scale;
  const pageHeight = spec.height * scale;
  const plot = spec.plot;
  const xDomain0 = spec.ticks[0].value;
  const xDomain1 = spec.ticks[5].value;
  const sx = x => x * scale;
  const sy = y => pageHeight - y * scale;
  const rectY = (y, h) => pageHeight - (y + h) * scale;
  let c = '';

  function fillRect(x, y, w, h, color) {
    c += `q ${pdfHexColor(color)} rg ${pdfNumber(sx(x))} ${pdfNumber(rectY(y, h))} ${pdfNumber(w * scale)} ${pdfNumber(h * scale)} re f Q\n`;
  }
  function strokeRect(x, y, w, h, color, lineWidth = 1) {
    c += `q ${pdfHexColor(color)} RG ${pdfNumber(lineWidth * scale)} w ${pdfNumber(sx(x))} ${pdfNumber(rectY(y, h))} ${pdfNumber(w * scale)} ${pdfNumber(h * scale)} re S Q\n`;
  }
  function line(x1, y1, x2, y2, color, lineWidth = 1, dash = '') {
    c += `q ${pdfHexColor(color)} RG ${pdfNumber(lineWidth * scale)} w ${dash ? `[${dash}] 0 d ` : ''}${pdfNumber(sx(x1))} ${pdfNumber(sy(y1))} m ${pdfNumber(sx(x2))} ${pdfNumber(sy(y2))} l S Q\n`;
  }
  function text(value, x, y, size, color = '#111827', bold = false) {
    c += `q ${pdfHexColor(color)} rg BT /F${bold ? '2' : '1'} ${pdfNumber(size * scale)} Tf ${pdfNumber(sx(x))} ${pdfNumber(sy(y))} Td (${escapePdfText(value)}) Tj ET Q\n`;
  }

  fillRect(0, 0, spec.width, spec.height, '#ffffff');
  text(spec.title, 90, 92, 43, '#111827', true);
  text(spec.subtitle, 90, 145, 26, '#4b5563', false);

  spec.ticks.forEach(tick => {
    line(tick.x, plot.y, tick.x, plot.y + plot.height, '#e5e7eb', 2);
    text(tick.label, tick.x - 35, plot.y + plot.height + 44, 24, '#374151', false);
  });

  if (spec.interval) {
    fillRect(Math.min(spec.interval.x0, spec.interval.x1), plot.y, Math.abs(spec.interval.x1 - spec.interval.x0), plot.height, '#dbeafe');
    text(spec.interval.label, Math.min(spec.interval.x0, spec.interval.x1), plot.y - 18, 24, '#1d4ed8', false);
  }

  spec.bins.forEach(bin => {
    const x0 = plot.x + ((bin.x0 - xDomain0) / (xDomain1 - xDomain0)) * plot.width;
    const x1 = plot.x + ((bin.x1 - xDomain0) / (xDomain1 - xDomain0)) * plot.width;
    const barWidth = Math.max(1, x1 - x0 - 2);
    const barHeight = (bin.count / spec.maxCount) * (plot.height * 0.86);
    fillRect(x0, plot.y + plot.height - barHeight, barWidth, barHeight, '#5b9bd5');
  });

  spec.markers.forEach(marker => {
    line(marker.x, plot.y, marker.x, plot.y + plot.height, marker.color, 6, marker.dash);
  });

  strokeRect(plot.x, plot.y, plot.width, plot.height, '#111827', 3);
  line(plot.x, plot.y + plot.height, plot.x + plot.width, plot.y + plot.height, '#111827', 4);
  line(plot.x, plot.y, plot.x, plot.y + plot.height, '#111827', 4);
  text(spec.xAxisLabel, plot.x + 160, plot.y + plot.height + 100, 28, '#111827', true);
  text(spec.yAxisLabel, plot.x, plot.y - 54, 27, '#111827', true);
  if (spec.interval) {
    fillRect(190, 908, 60, 22, '#dbeafe');
    strokeRect(190, 908, 60, 22, '#1d4ed8', 3);
    text('q2.5-q97.5 sampled model interval', 270, 928, 28, '#111827', false);
  }

  spec.markers.forEach((marker, idx) => {
    const y = 970 + idx * 46;
    line(190, y, 250, y, marker.color, 7, marker.dash);
    text(`${marker.label}: ${marker.valueLabel}`, 270, y + 10, 28, '#111827', false);
  });
  text(`PRNG: ${spec.simulation.prng || MONTE_CARLO_PRNG} | ${spec.seedLabel} | exported ${spec.exportedAt || ''}`, 90, 1110, 20, '#4b5563', false);
  text(spec.sourceLabel || MONTE_CARLO_CHART_SOURCE_LABEL, 90, 1148, 20, '#4b5563', false);

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(c);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentBytes.length} >>\nstream\n${c}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, idx) => {
    offsets[idx + 1] = encoder.encode(pdf).length;
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}
window.buildMonteCarloChartPdfBytes = buildMonteCarloChartPdfBytes;

async function downloadMonteCarloChart(format = null) {
  if (!hasCurrentMonteCarloDataForExport()) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_CHART_WARNING_MESSAGE));
    return null;
  }
  const snapshot = buildMonteCarloDataExportSnapshot();
  if (!snapshot) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_CHART_WARNING_MESSAGE));
    return null;
  }
  clearMonteCarloExportWarning();

  const selectedFormat = String(format || ((byId('monteCarloChartFormat') || {}).value || 'png')).toLowerCase();
  const svg = buildMonteCarloChartSvg(snapshot);
  if (!svg) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_CHART_WARNING_MESSAGE));
    return null;
  }

  if (selectedFormat === 'svg') {
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'earth-like-candidate-monte-carlo-chart.svg');
    return { format: 'svg', snapshot };
  }

  if (selectedFormat === 'pdf') {
    const pdfBytes = buildMonteCarloChartPdfBytes(snapshot);
    if (!pdfBytes) {
      showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_CHART_WARNING_MESSAGE));
      return null;
    }
    downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'earth-like-candidate-monte-carlo-chart.pdf');
    return { format: 'pdf', snapshot };
  }

  const pngBlob = await buildMonteCarloChartPngBlob(svg);
  downloadBlob(pngBlob, 'earth-like-candidate-monte-carlo-chart.png');
  return { format: 'png', snapshot };
}
window.downloadMonteCarloChart = downloadMonteCarloChart;

function buildMonteCarloPackageReadme(snapshot) {
  const summary = snapshot.summary || {};
  const simulation = snapshot.simulation || {};
  return [
    'Are We Alone in the Universe? Earth-like Planet Calculator',
    'Monte Carlo export package',
    '',
    `Exported: ${snapshot.timestamp}`,
    MONTE_CARLO_CHART_SOURCE_LABEL,
    `Preset: ${snapshot.preset}`,
    `Scenario: ${snapshot.scenario_label}`,
    `Galaxy: ${snapshot.galaxy}`,
    `Samples exported: ${simulation.samples_exported}`,
    `Engine: ${simulation.engine}`,
    `Distribution: ${simulation.distribution}`,
    `Correlation: ${simulation.correlation}`,
    `Seed: ${simulation.seed} (${simulation.seed_mode || 'random'})`,
    `PRNG: ${simulation.prng || MONTE_CARLO_PRNG} - ${simulation.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION}`,
    `Bounds: ${simulation.boundsLabel}`,
    `Uncertainty basis: ${simulation.uncertaintyBasisLabel}`,
    '',
    'Summary statistics:',
    `Deterministic central estimate: ${formatPublicationNumber(summary.deterministic)}`,
    `Monte Carlo q50 median: ${formatPublicationNumber(summary.mc_median_q50)}`,
    `Monte Carlo arithmetic mean: ${formatPublicationNumber(summary.mc_mean)}`,
    `q2.5: ${formatPublicationNumber(summary.mc_q025)}`,
    `q97.5: ${formatPublicationNumber(summary.mc_q975)}`,
    `Stddev: ${formatPublicationNumber(summary.mc_stddev)}`,
    '',
    'Caption:',
    buildMonteCarloChartCaption(snapshot),
    '',
    'Files:',
    '- chart.png: high-resolution raster chart, 1800x1200 px',
    '- chart.svg: vector chart',
    '- chart.pdf: vector PDF chart',
    '- monte-carlo-data.json: raw finite numeric candidate-count samples and metadata',
    '',
    'The x-axis is model-implied candidate count, not an observational census.',
    'Exports are generated from the latest current in-memory Monte Carlo samples; export does not rerun the simulation.'
  ].join('\n');
}

function getZipCrcTable() {
  if (globalThis.__zipCrcTable) return globalThis.__zipCrcTable;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  globalThis.__zipCrcTable = table;
  return table;
}

function crc32Bytes(bytes) {
  const table = getZipCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function writeUint16LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

async function buildStoredZipBlob(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.bytes instanceof Uint8Array
      ? entry.bytes
      : new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32Bytes(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, 20);
    writeUint16LE(localHeader, 6, 0);
    writeUint16LE(localHeader, 8, 0);
    writeUint16LE(localHeader, 10, dosTime);
    writeUint16LE(localHeader, 12, dosDate);
    writeUint32LE(localHeader, 14, crc);
    writeUint32LE(localHeader, 18, dataBytes.length);
    writeUint32LE(localHeader, 22, dataBytes.length);
    writeUint16LE(localHeader, 26, nameBytes.length);
    writeUint16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, 0);
    writeUint16LE(centralHeader, 10, 0);
    writeUint16LE(centralHeader, 12, dosTime);
    writeUint16LE(centralHeader, 14, dosDate);
    writeUint32LE(centralHeader, 16, crc);
    writeUint32LE(centralHeader, 20, dataBytes.length);
    writeUint32LE(centralHeader, 24, dataBytes.length);
    writeUint16LE(centralHeader, 28, nameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const end = new Uint8Array(22);
  writeUint32LE(end, 0, 0x06054b50);
  writeUint16LE(end, 4, 0);
  writeUint16LE(end, 6, 0);
  writeUint16LE(end, 8, entries.length);
  writeUint16LE(end, 10, entries.length);
  writeUint32LE(end, 12, centralDirectory.length);
  writeUint32LE(end, 16, offset);
  writeUint16LE(end, 20, 0);

  return new Blob([concatUint8Arrays(localParts), centralDirectory, end], { type: 'application/zip' });
}

async function exportMonteCarloPackage() {
  if (!hasCurrentMonteCarloDataForExport()) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_PACKAGE_WARNING_MESSAGE));
    return null;
  }
  const snapshot = buildMonteCarloDataExportSnapshot();
  if (!snapshot) {
    showMonteCarloExportWarning(getMonteCarloExportBlockWarning(MONTE_CARLO_PACKAGE_WARNING_MESSAGE));
    return null;
  }
  clearMonteCarloExportWarning();

  const svg = buildMonteCarloChartSvg(snapshot);
  const pngBlob = await buildMonteCarloChartPngBlob(svg);
  const pdfBytes = buildMonteCarloChartPdfBytes(snapshot);
  const dataJson = JSON.stringify(snapshot, null, 2);
  const readme = buildMonteCarloPackageReadme(snapshot);
  const encoder = new TextEncoder();
  const zipBlob = await buildStoredZipBlob([
    { name: 'chart.png', blob: pngBlob },
    { name: 'chart.svg', bytes: encoder.encode(svg) },
    { name: 'chart.pdf', bytes: pdfBytes },
    { name: 'monte-carlo-data.json', bytes: encoder.encode(dataJson) },
    { name: 'readme.txt', bytes: encoder.encode(readme) }
  ]);
  downloadBlob(zipBlob, 'earth-like-candidate-monte-carlo-package-' + new Date().toISOString().slice(0, 10) + '.zip');
  return { snapshot, zipBlob };
}
window.exportMonteCarloPackage = exportMonteCarloPackage;

function buildLatexExportText() {
  const rows = BASE_SAMPLE_IDS.map(function(id){
    const lbl = (SENS_LABELS[id] || id).replace(/_/g, '\\_');
    const sym = id.replace(/_/g, '\\_');
    const m = rawNumber(id, NaN);
    const lo = rawNumber(id + '_min', m);
    const hi = rawNumber(id + '_max', m);
    function fmt(v){ if (!Number.isFinite(v)) return '--'; return (Math.abs(v) < 0.001 || Math.abs(v) > 9999) ? v.toExponential(2) : v.toPrecision(4); }
    return '  ' + lbl + ' & $' + sym + '$ & ' + fmt(m) + ' & ' + fmt(lo) + '--' + fmt(hi) + ' \\\\';
  }).join('\n');

  const det = hasUsableDeterministicCalculation() ? deterministicPlanets.toExponential(3) : '--';
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  const hasCurrentMc = mcState === 'current';
  // Export rows use text for missing Monte Carlo, never fake zeros.
  const mcPlaceholder = mcState === 'stale' ? 'stale' : 'not run';
  const mcMedian  = hasCurrentMc && Number.isFinite(mcMedianQ50) ? mcMedianQ50.toExponential(3) : mcPlaceholder;
  const mcMean  = hasCurrentMc && Number.isFinite(mcArithmeticMean) ? mcArithmeticMean.toExponential(3) : mcPlaceholder;
  const lo  = hasCurrentMc && Number.isFinite(mcQ025) ? mcQ025.toExponential(3) : mcPlaceholder;
  const hi  = hasCurrentMc && Number.isFinite(mcQ975) ? mcQ975.toExponential(3) : mcPlaceholder;
  const boundsDescriptor = typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor() : null;
  const exportedMcMode = hasCurrentMc
    ? (monteCarloBoundsMode || boundsDescriptor?.mode || 'not-run')
    : mcState;
  const exportedBasis = hasCurrentMc
    ? (monteCarloUncertaintyBasisLabel || boundsDescriptor?.uncertaintyBasisLabel || 'not-run')
    : mcState;

  const distanceSnapshot = typeof getActiveDistanceSnapshot === 'function' ? getActiveDistanceSnapshot() : {};
  const distanceModelLabel = distanceSnapshot.activeDistanceModel || 'not calculated';
  const distanceBasisLabel = distanceSnapshot.activeDistanceCountBasis
    || (hasCurrentMc ? 'Monte Carlo q50/median count' : 'deterministic central count');

  const astronomyPriorLabel = getAstronomyPriorModel().shortLabel || 'Scenario astronomy values';

  return (
    '% Are We Alone in the Universe? Earth-like Planet Calculator v2.17\n' +
    '% Exported: ' + new Date().toISOString() + '\n' +
    '% Scenario: ' + (typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom')) + ' | Galaxy: ' + galaxyName + ' | Occurrence model: ' + astronomyPriorLabel + '\n\n' +
    '% MC mode: ' + exportedMcMode + ' | Uncertainty basis: ' + exportedBasis + ' | simulationCompleted: ' + String(!!simulationCompleted) + ' | MC state: ' + mcState + '\n' +
    '% Active distance model: ' + distanceModelLabel + ' | Distance count basis: ' + distanceBasisLabel + '\n\n' +
    '% Scope note: LaTeX export is a compact parameter/result table. Full SETI signal context, Fermi tension, and historical context are available in the JSON export.\n\n' +
    '\\begin{table}[h!]\n\\centering\n' +
    '\\caption{Parameter values for the ' + galaxyName + ' modelled Earth-like candidate estimate (' + (typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom')) + ', ' + astronomyPriorLabel + ' occurrence model).}\n' +
    '\\label{tab:earth-like-candidate-params}\n' +
    '\\begin{tabular}{lccc}\n\\hline\n' +
    'Parameter & Symbol & Central & Range / uncertainty interval \\\\\n\\hline\n' +
    rows + '\n\\hline\n' +
    '\\multicolumn{4}{l}{\\textit{Results}} \\\\\n\\hline\n' +
    '  Deterministic central & $N_{\\mathrm{det}}$ & ' + det + ' & -- \\\\\n' +
    '  MC q50 median & $N_{50}$ & ' + mcMedian + ' & -- \\\\\n' +
    '  MC arithmetic mean & $\\bar{N}$ & ' + mcMean + ' & -- \\\\\n' +
    '  95\\% sampled interval & $[N_{2.5}, N_{97.5}]$ & [' + lo + ', ' + hi + '] & -- \\\\\n' +
    '\\hline\n\\end{tabular}\n\\end{table}'
  );
}
window.buildLatexExportText = buildLatexExportText;

function exportLatex() {
  const tex = buildLatexExportText();

  const blob = new Blob([tex], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earth-like-candidate-table-' + new Date().toISOString().slice(0, 10) + '.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportLatex = exportLatex;

// This BibTeX list repeats the source registry. Update both, or wire this to the registry.
function exportBibtex() {
  const bib =
    '% BibTeX references - Are We Alone in the Universe? Earth-like Planet Calculator v2.17\n' +
    '% Exported: ' + new Date().toISOString() + '\n\n' +
    '@article{Drake1965,\n  author={Drake, Frank},\n  title={The Radio Search for Intelligent Extraterrestrial Life},\n  journal={Current Aspects of Exobiology},\n  year={1965},\n  pages={323--345}\n}\n\n' +
    '@article{Lineweaver2004,\n  author={Lineweaver, Charles H.},\n  title={The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way},\n  journal={Science},\n  volume={303},\n  number={5654},\n  pages={59--62},\n  year={2004},\n  doi={10.1126/science.1092322}\n}\n\n' +
    '@article{Sandberg2018,\n  author={Sandberg, Anders and Drexler, Eric and Ord, Toby},\n  title={Dissolving the Fermi Paradox},\n  year={2018},\n  eprint={1806.02404},\n  archivePrefix={arXiv}\n}\n\n' +
    '@book{Cirkovic2018,\n  author={\\\'Cirkovi\\\'c, Milan M.},\n  title={The Great Silence: Science and Philosophy of Fermi\\\'s Paradox},\n  publisher={Oxford University Press},\n  year={2018},\n  url={https://books.google.com/books?id=G4FZDwAAQBAJ}\n}\n\n' +
    '@article{Hart1975,\n  author={Hart, Michael H.},\n  title={Explanation for the Absence of Extraterrestrials on Earth},\n  journal={Quarterly Journal of the Royal Astronomical Society},\n  volume={16},\n  pages={128--135},\n  year={1975}\n}\n\n' +
    '@book{WardBrownlee2000,\n  author={Ward, Peter D. and Brownlee, Donald},\n  title={Rare Earth: Why Complex Life Is Uncommon in the Universe},\n  publisher={Copernicus Books},\n  year={2000}\n}\n\n' +
    '@misc{Hanson1998,\n  author={Hanson, Robin},\n  title={The Great Filter---Are We Almost Past It?},\n  year={1998},\n  howpublished={Online essay},\n  url={https://mason.gmu.edu/~rhanson/greatfilter.html}\n}\n\n' +
    '@article{Bryson2021,\n  author={Bryson, Steve and others},\n  title={The Occurrence of Rocky Habitable-zone Planets around Solar-like Stars from Kepler Data},\n  journal={The Astronomical Journal},\n  volume={161},\n  number={1},\n  pages={36},\n  year={2021},\n  doi={10.3847/1538-3881/abc418}\n}\n\n' +
    '@article{Cassan2012,\n  author={Cassan, Arnaud and others},\n  title={One or more bound planets per Milky Way star from microlensing observations},\n  journal={Nature},\n  volume={481},\n  pages={167--169},\n  year={2012},\n  doi={10.1038/nature10684}\n}\n\n' +
    '@article{Hsu2019,\n  author={Hsu, Danley C. and Ford, Eric B. and Ragozzine, Darin and Ashby, Keir},\n  title={Occurrence Rates of Planets Orbiting FGK Stars: Combining Kepler DR25, Gaia DR2, and Bayesian Inference},\n  journal={The Astronomical Journal},\n  volume={158},\n  number={3},\n  pages={109},\n  year={2019},\n  doi={10.3847/1538-3881/ab31ab}\n}\n\n' +
    '@article{Conselice2016,\n  author={Conselice, Christopher J. and others},\n  title={The Evolution of Galaxy Number Density at z < 8 and Its Implications},\n  journal={The Astrophysical Journal},\n  volume={830},\n  number={2},\n  pages={83},\n  year={2016},\n  doi={10.3847/0004-637X/830/2/83}\n}\n\n' +
    '@article{Henry2006,\n  author={Henry, Todd J. and others},\n  title={The Solar Neighborhood. XVII. Parallax Results from the CTIOPI 0.9 m Program: 20 New Members of the RECONS 10 Parsec Sample},\n  journal={The Astronomical Journal},\n  volume={132},\n  pages={2360--2371},\n  year={2006},\n  doi={10.1086/508233}\n}\n\n' +
    '@article{MadauDickinson2014,\n  author={Madau, Piero and Dickinson, Mark},\n  title={Cosmic Star-Formation History},\n  journal={Annual Review of Astronomy and Astrophysics},\n  volume={52},\n  pages={415--486},\n  year={2014},\n  doi={10.1146/annurev-astro-081811-125615}\n}\n\n' +
    '@article{Saltelli2010,\n  author={Saltelli, Andrea and Annoni, Paola and Azzini, Ivano and Campolongo, Francesca and Ratto, Marco and Tarantola, Stefano},\n  title={Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index},\n  journal={Computer Physics Communications},\n  volume={181},\n  number={2},\n  pages={259--270},\n  year={2010},\n  doi={10.1016/j.cpc.2009.09.018}\n}';

  const blob = new Blob([bib], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earth-like-candidate-references-' + new Date().toISOString().slice(0, 10) + '.bib';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportBibtex = exportBibtex;

