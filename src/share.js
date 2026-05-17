/*
Are We Alone in the Universe? Earth-like Planet Calculator
Author: Roman Jerše
Website: https://www.arewealoneintheuniverse.com/
Version: 2.12
License: Custom source-available attribution license. See ../LICENSE.md.
*/

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
  const deterministic = stripShareLead((byId('deterministicResult') || {}).textContent);
  const monteCarlo = stripShareLead((byId('monteCarloResult') || {}).textContent);
  const distance = stripShareLead((byId('distance') || {}).textContent);
  const primary = monteCarlo || deterministic;

  if (primary && distance) return `${primary} Distance: ${distance}`;
  if (primary) return primary;
  if (distance) return `Distance result for ${galaxyName}: ${distance}`;
  return `Explore Are We Alone in the Universe? Earth-like Planet Calculator for ${galaxyName}.`;
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

function exportJSON() {
  const params = {};
  BASE_SAMPLE_IDS.forEach(function(id){
    params[id] = {
      label: SENS_LABELS[id] || id,
      mean: rawNumber(id, null),
      min: rawNumber(id + '_min', null),
      max: rawNumber(id + '_max', null)
    };
  });

  const detectionSnapshot = simulationCompleted ? computeDetectionFilter() : null;

  const snap = {
    calculator: 'Are We Alone in the Universe? Earth-like Planet Calculator',
    version: '2.12',
    timestamp: new Date().toISOString(),
    preset: activePreset || 'custom',
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
      correlation: (byId('correlation-model') || {}).value || 'heuristic',
      sampling_uncertainty_pct: rawNumber('sampling_uncertainty', 50)
    },
    parameters: params,
    results: {
      deterministic: deterministicPlanets,
      mc_mean: simulationCompleted ? averagePlanets : null,
      mc_q025: simulationCompleted ? percentile5 : null,
      mc_q975: simulationCompleted ? percentile95 : null,
      mc_stddev: simulationCompleted ? stdDev : null,
      distance_2d_ly: Number.isFinite(distance2D) ? Math.round(distance2D) : null,
      distance_3d_disk_ly: Number.isFinite(distance3DDisk) ? Math.round(distance3DDisk) : null,
      distance_3d_sphere_ly: Number.isFinite(distance3DSphere) ? Math.round(distance3DSphere) : null,
      detection: detectionSnapshot
        ? {
            transmitter_fraction: detectionSnapshot.f_tx,
            transmitter_hosts_total: detectionSnapshot.N_tx_total,
            within_horizon: detectionSnapshot.N_within,
            temporal_overlap_pct: detectionSnapshot.p_temporal_pct,
            expected_detectable: detectionSnapshot.N_det,
            probability_at_least_one_pct: detectionSnapshot.p_detect_pct,
            nearest_detectable_ly: Number.isFinite(detectionSnapshot.d_nearest_det)
              ? Math.round(detectionSnapshot.d_nearest_det)
              : null
          }
        : null
    }
  };

  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habitability-snapshot-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportJSON = exportJSON;

function exportLatex() {
  const rows = BASE_SAMPLE_IDS.map(function(id){
    const lbl = (SENS_LABELS[id] || id).replace(/_/g, '\\_');
    const sym = id.replace(/_/g, '\\_');
    const m = rawNumber(id, NaN);
    const lo = rawNumber(id + '_min', m);
    const hi = rawNumber(id + '_max', m);
    function fmt(v){ if (!Number.isFinite(v)) return '--'; return (Math.abs(v) < 0.001 || Math.abs(v) > 9999) ? v.toExponential(2) : v.toPrecision(4); }
    return '  ' + lbl + ' & $' + sym + '$ & ' + fmt(m) + ' & ' + fmt(lo) + '--' + fmt(hi) + ' \\\\';
  }).join('\n');

  const det = Number.isFinite(deterministicPlanets) ? deterministicPlanets.toExponential(3) : '--';
  const mc  = Number.isFinite(averagePlanets) ? averagePlanets.toExponential(3) : '--';
  const lo  = Number.isFinite(percentile5)   ? percentile5.toExponential(3) : '--';
  const hi  = Number.isFinite(percentile95)  ? percentile95.toExponential(3) : '--';

  const tex =
    '% Are We Alone in the Universe? Earth-like Planet Calculator v2.12\n' +
    '% Generated: ' + new Date().toISOString() + '\n' +
    '% Preset: ' + (activePreset || 'custom') + ' | Galaxy: ' + galaxyName + ' | Epoch: ' + bayesianMode + '\n\n' +
    '\\begin{table}[h!]\n\\centering\n' +
    '\\caption{Parameter values for the ' + galaxyName + ' habitability estimate (' + (activePreset || 'custom') + ' scenario, ' + bayesianMode + '-JWST epoch).}\n' +
    '\\label{tab:habitability-params}\n' +
    '\\begin{tabular}{lccc}\n\\hline\n' +
    'Parameter & Symbol & Central & Literature range \\\\\n\\hline\n' +
    rows + '\n\\hline\n' +
    '\\multicolumn{4}{l}{\\textit{Results}} \\\\\n\\hline\n' +
    '  Deterministic & $N_{\\mathrm{det}}$ & ' + det + ' & -- \\\\\n' +
    '  MC mean & $\\bar{N}$ & ' + mc + ' & -- \\\\\n' +
    '  95\\% interval & $[N_{2.5}, N_{97.5}]$ & [' + lo + ', ' + hi + '] & -- \\\\\n' +
    '\\hline\n\\end{tabular}\n\\end{table}';

  const blob = new Blob([tex], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habitability-table-' + new Date().toISOString().slice(0, 10) + '.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportLatex = exportLatex;

function exportBibtex() {
  const bib =
    '% BibTeX references - Are We Alone in the Universe? Earth-like Planet Calculator v2.12\n' +
    '% Generated: ' + new Date().toISOString() + '\n\n' +
    '@article{Drake1965,\n  author={Drake, Frank},\n  title={The Radio Search for Intelligent Extraterrestrial Life},\n  journal={Current Aspects of Exobiology},\n  year={1965},\n  pages={323--345}\n}\n\n' +
    '@article{Lineweaver2004,\n  author={Lineweaver, Charles H.},\n  title={The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way},\n  journal={Science},\n  volume={303},\n  number={5654},\n  pages={59--62},\n  year={2004},\n  doi={10.1126/science.1092322}\n}\n\n' +
    '@article{Sandberg2018,\n  author={Sandberg, Anders and Drexler, Eric and Ord, Toby},\n  title={Dissolving the Fermi Paradox},\n  year={2018},\n  eprint={1806.02404},\n  archivePrefix={arXiv}\n}\n\n' +
    '@article{Cirkovic2018,\n  author={\\\'Cirkovi\\\'c, Milan M.},\n  title={The Great Silence},\n  journal={Foundations of Physics},\n  year={2018},\n  doi={10.1007/s10701-018-0170-6}\n}\n\n' +
    '@article{Hart1975,\n  author={Hart, Michael H.},\n  title={Explanation for the Absence of Extraterrestrials on Earth},\n  journal={Quarterly Journal of the Royal Astronomical Society},\n  volume={16},\n  pages={128--135},\n  year={1975}\n}\n\n' +
    '@article{Bryson2021,\n  author={Bryson, Steve and others},\n  title={The Occurrence of Rocky Habitable-zone Planets around Solar-like Stars from Kepler Data},\n  journal={The Astronomical Journal},\n  volume={161},\n  number={1},\n  pages={36},\n  year={2021},\n  doi={10.3847/1538-3881/abc418}\n}\n\n' +
    '@article{Conselice2016,\n  author={Conselice, Christopher J. and others},\n  title={The Evolution of Galaxy Number Density at z < 8 and Its Implications},\n  journal={The Astrophysical Journal},\n  volume={830},\n  number={2},\n  pages={83},\n  year={2016},\n  doi={10.3847/0004-637X/830/2/83}\n}\n\n' +
    '@article{Henry2006,\n  author={Henry, Todd J. and others},\n  title={The Solar Neighborhood XVII},\n  journal={The Astronomical Journal},\n  volume={132},\n  pages={2360--2371},\n  year={2006},\n  doi={10.1086/507268}\n}\n\n' +
    '@article{MadauDickinson2014,\n  author={Madau, Piero and Dickinson, Mark},\n  title={Cosmic Star-Formation History},\n  journal={Annual Review of Astronomy and Astrophysics},\n  volume={52},\n  pages={415--486},\n  year={2014},\n  doi={10.1146/annurev-astro-081811-125615}\n}\n\n' +
    '@article{Saltelli2010,\n  author={Saltelli, Andrea and Annoni, Paola and Azzini, Ivano and Campolongo, Francesca and Ratto, Marco and Tarantola, Stefano},\n  title={Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index},\n  journal={Computer Physics Communications},\n  volume={181},\n  number={2},\n  pages={259--270},\n  year={2010},\n  doi={10.1016/j.cpc.2009.09.018}\n}';

  const blob = new Blob([bib], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habitability-references-' + new Date().toISOString().slice(0, 10) + '.bib';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportBibtex = exportBibtex;
