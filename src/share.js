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
  return {
    mode: 'dt',
    count: Number.isFinite(deterministicPlanets) ? Math.max(0, deterministicPlanets) : 0,
    label: 'deterministic result'
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
  return params;
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

  const snap = {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    version: '2.16',
    timestamp: new Date().toISOString(),
    preset: activePreset || 'custom',
    scenario_label: typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom'),
    scenario_state: typeof getScenarioState === 'function' ? getScenarioState() : null,
    galaxy: galaxyName,
    bayesian_epoch: bayesianMode,
    ui_state: {
      current_scale: currentScale,
      fermi_mode: fermiMode,
      intervals_visible: intervalsVisible
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
    galaxy_settings: {
      enabled: isGalaxySettingsEnabled,
      controls: serializeControlTree('galaxy-options')
    },
    detection_settings: {
      controls: serializeControlTree('detection-panel')
    },
    simulation: {
      iterations: parseInt((byId('iterations') || {}).value || '2000', 10),
      engine: (byId('simulation-engine') || {}).value || 'standard',
      distribution: (byId('distribution') || {}).value || 'lognormal',
      correlation: (byId('correlation-model') || {}).value || 'independent',
      robustBounds: !!((byId('robust-bounds') || {}).checked),
      mcMode: monteCarloBoundsMode || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().mode : null),
      uncertaintyBasisLabel: monteCarloUncertaintyBasisLabel || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().uncertaintyBasisLabel : null),
      seed: lastMonteCarloRunMetadata?.seed ?? null,
      seed_mode: lastMonteCarloRunMetadata?.seedMode || (typeof getMonteCarloSeedMode === 'function' ? getMonteCarloSeedMode() : null),
      prng: lastMonteCarloRunMetadata?.prng || MONTE_CARLO_PRNG,
      prngDescription: lastMonteCarloRunMetadata?.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION,
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
      deterministic: deterministicPlanets,
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
    : deterministicPlanets;

  return {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    export_type: 'monte_carlo_data',
    version: '2.16',
    timestamp: new Date().toISOString(),
    preset: activePreset || 'custom',
    scenario_label: scenarioLabel,
    scenario_state: scenarioStateSnapshot,
    galaxy: galaxyName,
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
      mcMode: runMeta.mcMode ?? null,
      boundsMode: runMeta.boundsMode ?? null,
      boundsLabel: runMeta.boundsLabel ?? null,
      uncertaintyBasisLabel: runMeta.uncertaintyBasisLabel ?? null,
      seed: Object.prototype.hasOwnProperty.call(runMeta, 'seed') ? runMeta.seed : null,
      seed_mode: runMeta.seedMode || null,
      prng: runMeta.prng || MONTE_CARLO_PRNG,
      prngDescription: runMeta.prngDescription || MONTE_CARLO_PRNG_DESCRIPTION,
      sample_order: runMeta.sampleOrder || 'ascending_candidate_count'
    },
    parameters: buildParameterExportSnapshot(),
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
    summary: snapshot.summary || {}
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

  const det = hasDeterministicCalculation && Number.isFinite(deterministicPlanets) ? deterministicPlanets.toExponential(3) : '--';
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

  const bayesLabel =
    bayesianMode === 'pre' ? 'Conservative Kepler-era'
    : bayesianMode === 'post' ? 'Updated Kepler/Gaia'
    : bayesianMode;

  return (
    '% Are We Alone in the Universe? Earth-like Planet Calculator v2.16\n' +
    '% Exported: ' + new Date().toISOString() + '\n' +
    '% Scenario: ' + (typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom')) + ' | Galaxy: ' + galaxyName + ' | Observational prior: ' + bayesLabel + '\n\n' +
    '% MC mode: ' + exportedMcMode + ' | Uncertainty basis: ' + exportedBasis + ' | simulationCompleted: ' + String(!!simulationCompleted) + ' | MC state: ' + mcState + '\n' +
    '% Active distance model: ' + distanceModelLabel + ' | Distance count basis: ' + distanceBasisLabel + '\n\n' +
    '% Scope note: LaTeX export is a compact parameter/result table. Full SETI signal context, Fermi tension, and historical context are available in the JSON export.\n\n' +
    '\\begin{table}[h!]\n\\centering\n' +
    '\\caption{Parameter values for the ' + galaxyName + ' modelled Earth-like candidate estimate (' + (typeof getScenarioExportLabel === 'function' ? getScenarioExportLabel() : (activePreset || 'custom')) + ', ' + bayesLabel + ' observational prior).}\n' +
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
    '% BibTeX references - Are We Alone in the Universe? Earth-like Planet Calculator v2.16\n' +
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
