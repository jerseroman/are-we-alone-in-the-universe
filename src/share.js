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
  const params = {};
  BASE_SAMPLE_IDS.forEach(function(id){
    params[id] = {
      label: SENS_LABELS[id] || id,
      mean: rawNumber(id, null),
      min: rawNumber(id + '_min', null),
      max: rawNumber(id + '_max', null)
    };
  });

  const detectionBasis = getJSONDetectionBasis();
  const detectionSnapshot = simulationCompleted ? computeDetectionFilter(detectionBasis.count) : null;
  const fermiContextSnapshot = buildJSONFermiContextSnapshot(detectionBasis);
  const distanceSnapshot =
    typeof getActiveDistanceSnapshot === 'function'
      ? getActiveDistanceSnapshot()
      : {};
  const activeDistanceModelLabel = distanceSnapshot.activeDistanceModel || null;
  // Tri-state MC lifecycle: 'not-run' | 'current' | 'stale'. 'staleState' is kept
  // as a backward-compatible alias carrying the same value.
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  const staleState = mcState;

  const snap = {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    version: '2.13',
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
      mcMode: monteCarloBoundsMode || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().mode : null),
      uncertaintyBasisLabel: monteCarloUncertaintyBasisLabel || (typeof getMonteCarloBoundsDescriptor === 'function' ? getMonteCarloBoundsDescriptor().uncertaintyBasisLabel : null),
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
  // Tri-state MC lifecycle: 'not-run' | 'current' | 'stale'.
  const mcState = typeof getMonteCarloState === 'function'
    ? getMonteCarloState()
    : (simulationCompleted ? 'current' : 'not-run');
  const hasCurrentMc = mcState === 'current';
  // Non-current rows never emit finite-looking numbers: 'stale' marks an
  // invalidated run, 'not run' marks a run that never completed.
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
    '% Are We Alone in the Universe? Earth-like Planet Calculator v2.13\n' +
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

// Maintenance note: this BibTeX list duplicates source metadata in src/scientific-parameters.js.
// When updating source DOIs or titles, update both locations or refactor exportBibtex to read from the registry.
function exportBibtex() {
  const bib =
    '% BibTeX references - Are We Alone in the Universe? Earth-like Planet Calculator v2.13\n' +
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
