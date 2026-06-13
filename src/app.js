const sfCanvas = byId('starfield');

const sfCtx = sfCanvas ? sfCanvas.getContext('2d') : null;

let stars = [];

function resizeSF() {
  if (!sfCanvas) return;
  sfCanvas.width = window.innerWidth;
  sfCanvas.height = window.innerHeight;
}

function initStars() {
  if (!sfCanvas) return;
  stars = [];
  const n = Math.floor((sfCanvas.width * sfCanvas.height) / 3200);

  for (let i = 0; i < n; i++) {
    const tier = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2;
    const baseR =
      tier === 0
        ? 0.3 + Math.random() * 0.4
        : tier === 1
        ? 0.6 + Math.random() * 0.5
        : 1.0 + Math.random() * 0.6;
    const baseA =
      tier === 0
        ? 0.15 + Math.random() * 0.35
        : tier === 1
        ? 0.35 + Math.random() * 0.35
        : 0.55 + Math.random() * 0.35;

    const f1 = 0.000002 + Math.random() * 0.00000875;
    const f2 = 0.00001 + Math.random() * 0.00003;
    const deepFade = Math.random() < 0.18;
    const r = 195 + Math.floor(Math.random() * 30);
    const g = 210 + Math.floor(Math.random() * 20);
    const b = 240 + Math.floor(Math.random() * 15);

    stars.push({
      x: Math.random() * sfCanvas.width,
      y: Math.random() * sfCanvas.height,
      r: baseR,
      baseA,
      f1,
      f2,
      p1: Math.random() * Math.PI * 2,
      p2: Math.random() * Math.PI * 2,
      deepFade,
      dfPhase: Math.random() * Math.PI * 2,
      dfSpeed: 0.00000075 + Math.random() * 0.0000025,
      cr: r,
      cg: g,
      cb: b,
      tier
    });
  }
}

function drawStars(t) {
  if (!sfCtx || !sfCanvas) return;

  sfCtx.clearRect(0, 0, sfCanvas.width, sfCanvas.height);

  stars.forEach(s => {
    const tw1 = 0.5 + 0.5 * Math.sin(t * s.f1 * 1000 + s.p1);
    const tw2 = 0.5 + 0.5 * Math.sin(t * s.f2 * 1000 + s.p2);
    let twinkle = tw1 * 0.75 + tw2 * 0.25;

    if (s.deepFade) {
      const df =
        0.15 +
        0.85 * (0.5 + 0.5 * Math.sin(t * s.dfSpeed * 1000 + s.dfPhase));
      twinkle *= df;
    }

    const alpha = s.baseA * (0.25 + 0.75 * twinkle);

    if (s.tier === 2 && twinkle > 0.8) {
      const glowA = (twinkle - 0.8) * 0.8 * s.baseA;
      const grd = sfCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
      grd.addColorStop(0, `rgba(${s.cr},${s.cg},${s.cb},${glowA})`);
      grd.addColorStop(1, `rgba(${s.cr},${s.cg},${s.cb},0)`);
      sfCtx.beginPath();
      sfCtx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
      sfCtx.fillStyle = grd;
      sfCtx.fill();
    }

    sfCtx.beginPath();
    sfCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sfCtx.fillStyle = `rgba(${s.cr},${s.cg},${s.cb},${alpha})`;
    sfCtx.fill();
  });

  requestAnimationFrame(drawStars);
}

function toggleSection(btn) {
  const body = btn.previousElementSibling;
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  btn.textContent = isOpen ? 'Read more ↓' : 'Read less ↑';
}
window.toggleSection = toggleSection;

function toggleInterval(id) {
  const row = byId('interval-' + id);
  if (!row) return;

  const btn = document.querySelector('#card-' + id + ' .interval-toggle');
  const visible = row.classList.contains('visible');

  row.classList.toggle('visible', !visible);
  if (btn) btn.classList.toggle('active', !visible);
}
window.toggleInterval = toggleInterval;

function toggleAllIntervals() {
  intervalsVisible = !intervalsVisible;

  document
    .querySelectorAll('.interval-row')
    .forEach(r => r.classList.toggle('visible', intervalsVisible));

  document
    .querySelectorAll('.interval-toggle')
    .forEach(b => b.classList.toggle('active', intervalsVisible));

  const btn = byId('global-interval-btn');
  if (btn) {
    btn.textContent = intervalsVisible ? 'Hide intervals' : 'Show ±min/max';
    btn.classList.toggle('active', intervalsVisible);
  }
}
window.toggleAllIntervals = toggleAllIntervals;

const PRESET_BOUNDS_NOTE =
  'Selecting a named scenario resets visible min/max fields; default Monte Carlo uses scenario-local uncertainty centered on that preset. Modified scenarios use visible custom bounds.';

function syncPresetUi() {
  const scenario = getScenarioState();
  document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
    const activeKey = scenario.isModified ? scenario.originPreset : activePreset;
    setPressedState(btn, btn.dataset.preset === activeKey);
  });

  const desc = byId('preset-description');
  if (!desc) return;

  if (scenario.isModified && PRESETS[scenario.originPreset]) {
    desc.innerHTML =
      `<strong>${scenario.label}.</strong> ` +
      `<em>${getModifiedPresetWarningText()} The central values may still resemble the loaded preset, but this is no longer the unchanged preset scenario.</em>` +
      `<span style="display:block;margin-top:6px;font-size:10px;color:var(--text-dim);">${PRESET_BOUNDS_NOTE}</span>`;
  } else if (PRESETS[activePreset]) {
    const preset = PRESETS[activePreset];
    desc.innerHTML =
      `<strong>${preset.label}.</strong> ` +
      `<em>${preset.source}. ${preset.description}</em>` +
      `<span style="display:block;margin-top:6px;font-size:10px;color:var(--text-dim);">${PRESET_BOUNDS_NOTE}</span>`;
  } else {
    desc.innerHTML =
      '<strong>Custom values active.</strong> ' +
      '<em>Manual input changes override the named scenario presets until you load one of the scenario cards again.</em>' +
      `<span style="display:block;margin-top:6px;font-size:10px;color:var(--text-dim);">${PRESET_BOUNDS_NOTE}</span>`;
  }
}

function syncBayesianUi() {
  setPressedState(byId('bayes-pre'), bayesianMode === 'pre');
  setPressedState(byId('bayes-post'), bayesianMode === 'post');

  const note = byId('bayes-note');
  if (note && BAYES[bayesianMode]) {
    const scenario = getScenarioState();
    const modeLead =
      bayesianMode === 'pre'
        ? '<strong>f_HZ / f_rocky source active - Conservative Kepler-era.</strong> '
        : '<strong>f_HZ / f_rocky source active - Updated Kepler/Gaia.</strong> ';
    const autoLead =
      scenario.isModified
        ? `This source mode is attached to ${scenario.label}; manual edits mean the run is no longer the unchanged preset. `
        : activePreset && activePreset !== 'custom'
        ? 'This source mode was selected with the current scientific scenario; it is separate from the four scenario cards. '
        : 'Manual source override active. ';
    note.innerHTML =
      modeLead +
      autoLead +
      `${BAYES[bayesianMode].note}` +
      `<span style="display:block;margin-top:4px;">${PRESET_BOUNDS_NOTE}</span>`;
  }
}

function renderInputValidationWarnings(warnings = []) {
  document.querySelectorAll('.input-validation-warning').forEach(el => el.remove());
  document.querySelectorAll('.input-card.validation-warning').forEach(card => {
    card.classList.remove('validation-warning');
  });

  warnings.forEach(warning => {
    const card = byId(`card-${warning.id}`);
    if (!card) return;

    card.classList.add('validation-warning');
    const warningEl = document.createElement('div');
    warningEl.className = 'input-validation-warning';
    warningEl.setAttribute('role', 'status');
    warningEl.textContent = warning.shortText || 'Input was normalized to the nearest valid value.';
    card.appendChild(warningEl);
  });
}

// ── Probability / fraction field clamp (>1 → 1) ─────────────────────────────
// The canonical probability-field set lives in calculator-core.js.  We access
// it through the globalThis bridge so app.js is not duplicating the list.
const CLAMP_PROBABILITY_FIELDS = typeof PROBABILITY_FIELDS_GLOBAL !== 'undefined'
  ? PROBABILITY_FIELDS_GLOBAL
  : new Set();

// Derive the base parameter id from a control id (strips _min / _max suffix).
function _clampBaseId(controlId) {
  return controlId.replace(/_(min|max)$/, '');
}

// Show or clear the local >1 clamp warning inside the parameter card.
function showClampWarning(baseId) {
  const card = byId(`card-${baseId}`);
  if (!card || typeof card.querySelectorAll !== 'function') return;
  if (card.querySelectorAll('.input-clamp-warning').length) return; // already shown
  const el = document.createElement('div');
  el.className = 'input-clamp-warning';
  if (typeof el.setAttribute === 'function') el.setAttribute('role', 'status');
  el.textContent = 'Maximum allowed value is 1. Value was set to 1.';
  card.appendChild(el);
}

function clearClampWarning(baseId) {
  const card = byId(`card-${baseId}`);
  if (!card || typeof card.querySelectorAll !== 'function') return;
  card.querySelectorAll('.input-clamp-warning').forEach(el => {
    el.remove();
    // Keep the children array in sync for harnesses where remove() is a no-op.
    if (Array.isArray(card.children)) {
      const idx = card.children.indexOf(el);
      if (idx !== -1) card.children.splice(idx, 1);
    }
  });
}

// Called on input/change for any field.  Returns true if a clamp was applied.
function applyProbabilityClamp(controlId) {
  const baseId = _clampBaseId(controlId);
  if (!CLAMP_PROBABILITY_FIELDS.has(baseId)) return false;

  const el = byId(controlId);
  if (!el) return false;

  const raw = el.value;
  const val = parseFloat(raw);
  // Only clamp when we have a clearly finite value > 1; partial input like '.'
  // or '' is left for existing validation.
  if (!Number.isFinite(val) || val <= 1) {
    // Clear any prior clamp warning once value is back in range.
    if (Number.isFinite(val)) clearClampWarning(baseId);
    return false;
  }

  el.value = '1';
  showClampWarning(baseId);
  return true;
}

// Clear all clamp warnings for a set of ids (called on preset load).
function clearAllClampWarnings(ids = []) {
  const visited = new Set();
  for (const id of ids) {
    const base = _clampBaseId(id);
    if (!visited.has(base)) { clearClampWarning(base); visited.add(base); }
  }
}
globalThis.clearAllClampWarnings = clearAllClampWarnings;

function allDistanceModelsDisabled() {
  return (
    !((byId('model-radial') || {}).checked) &&
    !((byId('model-2d') || {}).checked) &&
    !((byId('model-3d-disk') || {}).checked) &&
    !((byId('model-3d-sphere') || {}).checked)
  );
}

function renderConfigurationWarnings() {
  const box = byId('config-alerts');
  const body = byId('config-alerts-body');
  if (!box || !body) return;

  const warnings = getConfigurationWarnings();
  if (typeof getInputValidationWarnings === 'function') {
    const fieldWarnings = getInputValidationWarnings();
    const intervalWarnings =
      typeof getBoundIntervalWarnings === 'function' ? getBoundIntervalWarnings() : [];
    renderInputValidationWarnings([...fieldWarnings, ...intervalWarnings]);
  }
  if (!warnings.length) {
    box.style.display = 'none';
    body.innerHTML = '';
    return;
  }

  body.innerHTML = warnings
    .map(
      w => {
        const isBlocked = w.label === 'Monte Carlo blocked';
        const itemClass = isBlocked ? 'alert-item alert-item--blocked' : 'alert-item';
        const icon = '⚠';
        return `
        <div class="${itemClass}">
          <div class="alert-head">
            <div class="alert-title">${icon} Warning <span class="alert-label">· ${w.label}</span></div>
          </div>
          <div class="alert-copy">${w.text}</div>
        </div>
      `;
      }
    )
    .join('');

  box.style.display = 'block';
}

function renderResultRealityCheck() {
  const box = byId('result-reality-check');
  const body = byId('result-reality-copy');
  if (!box || !body) return;

  const isMilkyWay = galaxyName === 'Milky Way (MW)';
  const triggered = [];
  const messages = [];

  if (hasDeterministicCalculation && Number.isFinite(deterministicPlanets) && deterministicPlanets < 1) {
    triggered.push('deterministic estimate');
  }
  if (simulationCompleted && Number.isFinite(mcMedianQ50) && mcMedianQ50 < 1) {
    triggered.push('Monte Carlo q50 median');
  }

  if (monteCarloIntervalComparison && monteCarloIntervalComparison.warning) {
    messages.push(
      `<strong>Monte Carlo basis check.</strong> ${monteCarloIntervalComparison.warning}`
    );
  }

  if (isMilkyWay && isComplexLifeEnabled && triggered.length) {
    const subject =
      triggered.length === 2
        ? 'Both the deterministic estimate and the Monte Carlo q50 median'
        : `The ${triggered[0]}`;

    messages.push(
      `<strong>Reality check.</strong> ${subject} falls below 1 even though the Milky Way is known ` +
      `to host at least one planet with complex life and intelligent life: Earth. ` +
      `Treat this scenario as an extreme prior rather than an Earth-conditioned baseline. ` +
      `Even with such a restrictive Milky Way estimate, the model can still imply very large totals on observable-universe scales; see the <strong>Universe scale</strong> section after running <strong>Where is Everyone?</strong>.`
    );
  }

  if (!messages.length) {
    box.style.display = 'none';
    body.innerHTML = '';
    return;
  }

  body.innerHTML = messages.join('<br><br>');
  box.style.display = 'block';
}

function buildConvergenceSparkline(checkpoints) {
  if (!checkpoints.length) return '';

  const width = 320;
  const height = 54;
  const padX = 10;
  const padY = 7;
  const means = checkpoints.map(p => p.mean);
  const minV = Math.min(...means);
  const maxV = Math.max(...means);
  const span = Math.max(maxV - minV, 1e-12);
  const innerWidth = width - 2 * padX;
  const innerHeight = height - 2 * padY;

  const points = checkpoints.map((p, idx) => {
    const x =
      checkpoints.length === 1
        ? width / 2
        : padX + (idx / (checkpoints.length - 1)) * innerWidth;
    const y =
      maxV === minV
        ? height / 2
        : height - padY - ((p.mean - minV) / span) * innerHeight;
    return { x, y };
  });

  function buildSmoothPath(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      const my = (curr.y + next.y) / 2;
      d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }

    const last = pts[pts.length - 1];
    d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
    return d;
  }

  const linePath = buildSmoothPath(points);
  const baselineY = height - padY;
  const areaPath =
    `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} ` +
    `L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
  const lastPoint = points[points.length - 1];

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="convergence-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#63a3ff" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#63a3ff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line class="convergence-guide" x1="${padX}" y1="${(padY + innerHeight * 0.45).toFixed(1)}" x2="${width - padX}" y2="${(padY + innerHeight * 0.45).toFixed(1)}"/>
      <line class="convergence-axis" x1="${padX}" y1="${baselineY}" x2="${width - padX}" y2="${baselineY}"/>
      <path class="convergence-area" d="${areaPath}"/>
      <path class="convergence-line" d="${linePath}"/>
      <circle class="convergence-end-ring" cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="3.1"/>
      <circle class="convergence-end-dot" cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="1.8"/>
    </svg>
  `;
}

function renderConvergenceSummary() {
  const box = byId('convergence-box');
  const alert = byId('convergence-alert');
  const status = byId('convergence-status');
  const chart = byId('convergence-chart');
  const meta = byId('convergence-meta');
  if (!box || !alert || !status || !chart || !meta) return;

  if (!convergenceSummary) {
    box.style.display = 'none';
    alert.className = 'convergence-alert';
    alert.innerHTML = '';
    status.innerHTML = '';
    chart.innerHTML = '';
    meta.innerHTML = '';
    return;
  }

  const stable = convergenceSummary.stableAt;
  const total = convergenceSummary.checkpoints[convergenceSummary.checkpoints.length - 1].n;

  if (stable !== null && stable < total) {
    status.innerHTML =
      `Running mean stabilised after roughly <strong>${stable.toLocaleString()}</strong> iterations ` +
      `within ±<strong>${convergenceSummary.relTolPct.toFixed(0)}%</strong> of the final mean.`;
  } else if (stable !== null) {
    status.innerHTML =
      `Running mean only settled by the final checkpoint. The estimate is usable, but more iterations would make the mean less path-dependent.`;
  } else {
    status.innerHTML =
      `Running arithmetic mean is still drifting by more than ±<strong>${convergenceSummary.relTolPct.toFixed(0)}%</strong>. Consider increasing the iteration count before over-interpreting the Monte Carlo arithmetic mean.`;
  }

  const convergenceAlert = getConvergenceAlert(convergenceSummary);
  alert.className = 'convergence-alert';
  alert.innerHTML = '';
  if (convergenceAlert) {
    alert.classList.add('visible', convergenceAlert.level);
    alert.innerHTML =
      `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i>` +
      `<div class="convergence-alert-copy"><strong>Re-run recommended.</strong> ${convergenceAlert.text}</div>`;
  }

  chart.innerHTML = buildConvergenceSparkline(convergenceSummary.checkpoints);
  meta.innerHTML =
    `<span class="convergence-pill">Final mean ${fmtN(convergenceSummary.finalMean)}</span>` +
    `<span class="convergence-pill">Tail drift ${convergenceSummary.tailDriftPct.toFixed(2)}%</span>` +
    `<span class="convergence-pill">${convergenceSummary.checkpoints.length} checkpoints sampled</span>`;

  box.style.display = 'block';
}

function invalidateResults(markCustom = true, clearDeterministic = true) {
  if (typeof clearInputValidationWarnings === 'function') clearInputValidationWarnings();
  // A previously-current Monte Carlo run is now stale (results no longer match
  // the current input state). A run that never completed stays 'not-run'.
  if (simulationCompleted) monteCarloState = 'stale';
  simulationCompleted = false;
  distanceCalculated = false;
  if (clearDeterministic) {
    deterministicPlanets = 0;
    hasDeterministicCalculation = false;
  }
  mcMedianQ50 = 0;
  mcArithmeticMean = 0;
  mcQ025 = 0;
  mcQ975 = 0;
  mostFrequent = 0;
  stdDev = 0;

  distance2D = distance3DDisk = distance3DSphere = distanceRadial = Infinity;
  minDistance2D = maxDistance2D = Infinity;
  minDistance3DDisk = maxDistance3DDisk = Infinity;
  minDistance3DSphere = maxDistance3DSphere = Infinity;
  minDistanceRadial = maxDistanceRadial = Infinity;
  if (typeof resetActiveDistanceSnapshot === 'function') resetActiveDistanceSnapshot();

  lastResults = [];
  lastSampleYields = [];
  monteCarloYieldStats = null;
  convergenceSummary = null;
  simulationEnvelope = null;
  monteCarloBoundsMode = '';
  monteCarloBoundsLabel = '';
  monteCarloUncertaintyBasisLabel = '';
  monteCarloIntervalComparison = null;

  if (markCustom) {
    markScenarioModified();
    if (typeof reconcileScenarioStateWithVisiblePreset === 'function') {
      reconcileScenarioStateWithVisiblePreset();
    }
  }
  syncPresetUi();
  syncBayesianUi();
  renderConfigurationWarnings();
  fermiContexts = { mc: null, dt: null };
  renderConvergenceSummary();
  renderSimulationMethodSummary();

  if (clearDeterministic && byId('deterministicResult')) {
    byId('deterministicResult').textContent = '';
  }
  if (byId('monteCarloResult')) byId('monteCarloResult').textContent = '';
  if (byId('monteCarloMedian')) byId('monteCarloMedian').textContent = '';
  if (byId('stats')) byId('stats').textContent = '';
  if (byId('result-reality-check')) byId('result-reality-check').style.display = 'none';
  if (byId('result-reality-copy')) byId('result-reality-copy').innerHTML = '';
  if (byId('simulationModel')) byId('simulationModel').textContent = '';
  if (byId('robustEnvelopeResult')) byId('robustEnvelopeResult').textContent = '';
  if (byId('distance')) byId('distance').textContent = '';
  if (byId('whereAreTheyBtn')) byId('whereAreTheyBtn').disabled = true;
  if (byId('fermi-box')) byId('fermi-box').classList.remove('visible');
  if (byId('fermi-summary')) byId('fermi-summary').innerHTML = '';
  if (byId('fermi-content')) byId('fermi-content').innerHTML = '';
  if (byId('fermi-tail')) byId('fermi-tail').innerHTML = '';
  if (byId('fermi-actions')) byId('fermi-actions').innerHTML = '';
  if (typeof clearCharts === 'function') clearCharts();
  if (byId('adv-tornado-container')) byId('adv-tornado-container').innerHTML = '';

  
  if (byId('sobol-panel')) byId('sobol-panel').style.display = 'none';
  if (byId('temporal-nt-panel')) byId('temporal-nt-panel').style.display = 'none';
  if (byId('detection-panel')) byId('detection-panel').style.display = 'none';

  renderCalculationConsole();
  updateShareButtons();
}

function invalidateScenarioResults(clearDeterministic = true) {
  invalidateResults(true, clearDeterministic);
}

function invalidateResultsOnly(clearDeterministic = true) {
  invalidateResults(false, clearDeterministic);
}

function invalidateDisplayOrDistanceOnly(clearDeterministic = true) {
  invalidateResults(false, clearDeterministic);
}

function fmtConsoleValue(v) {
  if (!Number.isFinite(v)) return 'Infinity';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs < 0.001 || abs >= 1e9) return v.toExponential(3);
  if (abs < 1) return v.toFixed(6).replace(/\.?0+$/, '');
  if (abs < 1000) return v.toFixed(4).replace(/\.?0+$/, '');
  return Math.round(v).toLocaleString();
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtLatexNumber(v) {
  if (!Number.isFinite(v)) return '\\infty';
  if (v === 0) return '0';

  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);

  if (abs < 0.001 || abs >= 1e6) {
    const parts = abs.toExponential(3).split('e');
    const mantissa = parts[0].replace(/\.?0+$/, '');
    const exponent = parseInt(parts[1], 10);
    return `${sign}${mantissa} \\times 10^{${exponent}}`;
  }

  let body = '';
  if (abs < 1) body = abs.toFixed(6).replace(/\.?0+$/, '');
  else if (abs < 1000) body = abs.toFixed(4).replace(/\.?0+$/, '');
  else body = Math.round(abs).toLocaleString('en-US').replace(/,/g, '{,}');

  return sign + body;
}

function buildLatexProductEquation(lhs, tokens, wrapAfter = 6) {
  const parts = (tokens || []).filter(Boolean).map(String);
  if (!parts.length) return [`${lhs} &= 1`];

  const lines = [];
  for (let i = 0; i < parts.length; i += wrapAfter) {
    const chunk = parts.slice(i, i + wrapAfter).join(' \\cdot ');
    lines.push(`${i === 0 ? `${lhs} &= ` : '&= '}${chunk}`);
  }
  return lines;
}

function renderConsoleFormulaBlock(blockLines, note = '') {
  const aligned = (blockLines || []).filter(Boolean).join(' \\\\ ');
  return (
    `<div class="calc-console-formula">` +
    `\\[\\begin{aligned}${aligned}\\end{aligned}\\]` +
    (note ? `<div class="calc-console-note">${escapeHtml(note)}</div>` : '') +
    `</div>`
  );
}

function typesetMathInElement(el, retries = 8) {
  if (!el) return;

  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    try {
      if (typeof window.MathJax.typesetClear === 'function') {
        window.MathJax.typesetClear([el]);
      }
    } catch (_) {}

    window.MathJax.typesetPromise([el]).catch(() => {});
    return;
  }

  if (retries > 0) {
    setTimeout(() => typesetMathInElement(el, retries - 1), 250);
  }
}

function buildConsoleDetectionTrace(planetCount) {
  const N_planets = Math.max(0, Number(planetCount) || 0);
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

  if (N_planets <= 0 || geom.area <= 0) return null;

  const N_tx_total = N_planets * f_tx;
  const p_temporal = Math.min(1, L / T_gal_yr);

  if (isExternalReference && Number.isFinite(earthDist) && earthDist > 0) {
    const range_gate = L >= earthDist ? 1 : 0;
    const N_within = N_tx_total * range_gate;
    const N_det = N_within * p_temporal;
    const p_detect = 1 - Math.exp(-Math.max(0, N_det));

    return {
      branch: 'external-range-gate',
      N_planets,
      L,
      f_tx,
      T_gal_yr,
      d_horizon: Math.round(Math.min(L, earthDist)),
      geom_area: geom.area,
      area_det: null,
      area_fraction: null,
      N_tx_total,
      rho_2d: null,
      N_within,
      p_temporal,
      N_det,
      p_detect_pct: p_detect * 100,
      lambda_det: null,
      d_nearest_det: range_gate ? earthDist : Infinity,
      is_external_reference: true,
      earth_distance: earthDist,
      range_gate
    };
  }

  const d_horizon = Math.min(L, d_gal_ly);
  const area_det = Math.min(Math.PI * d_horizon * d_horizon, geom.area);
  const area_fraction = geom.area > 0 ? area_det / geom.area : 0;
  const rho_2d = N_tx_total / geom.area;
  const N_within = rho_2d * area_det;
  const N_det = N_within * p_temporal;
  const p_detect = 1 - Math.exp(-Math.max(0, N_det));
  const lambda_det = area_det > 0 ? N_det / area_det : 0;
  const d_nearest_det = lambda_det > 0 ? E_from(lambda_det, 2) : Infinity;

  return {
    branch: 'internal-area-fraction',
    N_planets,
    L,
    f_tx,
    T_gal_yr,
    d_horizon,
    geom_area: geom.area,
    area_det,
    area_fraction,
    N_tx_total,
    rho_2d,
    N_within,
    p_temporal,
    N_det,
    p_detect_pct: p_detect * 100,
    lambda_det,
    d_nearest_det,
    is_external_reference: false,
    earth_distance: null,
    range_gate: null
  };
}

function renderCalculationConsole() {
  const el = byId('calc-console');
  if (!el) return;

  if (!simulationCompleted && !hasDeterministicCalculation) {
    el.innerHTML =
      `<div class="calc-console-empty">` +
      `<strong>No calculation run yet.</strong><br>` +
      `The starting preset only preloads the form values. ` +
      `This console activates after you click <strong>Calculate</strong> or <strong>Monte Carlo</strong>.` +
      `</div>`;
    return;
  }

  const baseInp = getInputs();
  const fullInp = applyAdvancedModules(baseInp);
  const baseFactors = [
    { key: 'N_GHZ', symbol: 'N_GHZ', latex: 'N_{\\mathrm{GHZ}}', label: 'Stars in GHZ' },
    { key: 'f_sun_type', symbol: 'f_sun_type', latex: 'f_{\\odot}', label: 'Host-star fraction' },
    { key: 'f_sun_age', symbol: 'f_sun_age', latex: 'f_{\\mathrm{age}}', label: 'Old-enough stars' },
    { key: 'N_p_star', symbol: 'N_p_star', latex: 'N_p', label: 'Planets per star' },
    { key: 'f_composition', symbol: 'f_composition', latex: 'f_{\\mathrm{rocky}}', label: 'Rocky fraction' },
    { key: 'f_orbit', symbol: 'f_orbit', latex: 'f_{\\mathrm{HZ}}', label: 'Habitable-zone fraction' },
    { key: 'f_stability', symbol: 'f_stability', latex: 'f_{\\mathrm{stab}}', label: 'Dynamical stability' },
    { key: 'f_magnetosphere', symbol: 'f_magnetosphere', latex: 'f_B', label: 'Magnetosphere' },
    { key: 'f_lunar_stability', symbol: 'f_lunar_stability', latex: 'f_{\\mathrm{moon}}', label: 'Lunar stability' },
    { key: 'f_size', symbol: 'f_size', latex: 'f_{\\mathrm{size}}', label: 'Size suitability' },
    { key: 'f_rotation', symbol: 'f_rotation', latex: 'f_{\\omega}', label: 'Rotation suitability' },
    { key: 'f_tilt', symbol: 'f_tilt', latex: 'f_{\\varepsilon}', label: 'Obliquity suitability' },
    { key: 'f_H2O', symbol: 'f_H2O', latex: 'f_{H_2O}', label: 'Surface water' },
    { key: 'f_CHNOPS', symbol: 'f_CHNOPS', latex: 'f_{\\mathrm{CHNOPS}}', label: 'CHNOPS' },
    { key: 'f_complex_life', symbol: 'f_complex_life', latex: 'f_{\\mathrm{life}}', label: 'Complex-life prior' },
    { key: 'f_x', symbol: 'f_x', latex: 'f_x', label: 'Wildcard factor' }
  ];
  const advancedFactors = [
    { key: '_f_atm_ret', symbol: 'f_atm_ret', latex: 'f_{\\mathrm{atm}}', label: 'Atmospheric retention', enabled: ADV.enabled && ADV.modules.atmRet.enabled },
    { key: '_f_longterm', symbol: 'f_longterm', latex: 'f_{\\mathrm{long}}', label: 'Long-term geodynamics', enabled: ADV.enabled && ADV.modules.longterm.enabled },
    { key: '_f_xuv_quiet', symbol: 'f_xuv_quiet', latex: 'f_{\\mathrm{xuv}}', label: 'Space weather', enabled: ADV.enabled && ADV.modules.spaceWeather.enabled },
    { key: '_f_uv', symbol: 'f_uv', latex: 'f_{\\mathrm{uv}}', label: 'Prebiotic UV', enabled: ADV.enabled && ADV.modules.prebioticUV.enabled },
    { key: '_f_binary', symbol: 'f_binary', latex: 'f_{\\mathrm{bin}}', label: 'Binary filter', enabled: ADV.enabled && ADV.modules.binary.enabled },
    { key: '_f_rad', symbol: 'f_rad', latex: 'f_{\\mathrm{rad}}', label: 'Radiation survival', enabled: ADV.enabled && ADV.modules.radiation.enabled }
  ];
  const activeAdvanced = advancedFactors.filter(f => f.enabled);
  const baseResult = computePlanetsBase(fullInp);
  const finalResult = computePlanetsAdvanced(fullInp);
  const basisCount = simulationCompleted ? mcMedianQ50 : finalResult;
  const detectionTrace = buildConsoleDetectionTrace(basisCount);
  const distanceScenario = buildDistanceScenario(
    basisCount,
    simulationCompleted ? mcQ025 : null,
    simulationCompleted ? mcQ975 : null
  );

  const lines = [];
  const pushSection = title => lines.push(`<div class="calc-console-section">${title}</div>`);
  const pushLine = (text, cls = '') =>
    lines.push(`<div class="calc-console-line${cls ? ' ' + cls : ''}">${text}</div>`);
  const pushFormula = (formulaLines, note = '') =>
    lines.push(renderConsoleFormulaBlock(formulaLines, note));

  pushSection('Status');
  pushLine(
    `Scenario=${getScenarioExportLabel()} | Prior=${bayesianMode} | Advanced=${ADV.enabled ? 'on' : 'off'} | Basis=${simulationCompleted ? 'Monte Carlo q50 median' : 'deterministic preview'}`
  );
  pushLine(
    `Galaxy=${galaxyName} | Detection L=${fmtConsoleValue(Math.max(1, rawNumber('detection-L', 30000)))} yr | f_tx=${fmtConsoleValue(clamp01(rawNumber('detection-f_tx', 0.01)))}`
  );
  pushLine(
    simulationCompleted
      ? 'Detection and distance traces below are using the latest Monte Carlo q50 median and sampled model interval where applicable.'
      : 'Detection and distance traces below are live previews based on the current deterministic state. The official detection panel still activates after Monte Carlo.'
    ,
    'calc-console-muted'
  );

  pushSection('Effective Equation');
  pushLine('Symbolic base model:', 'calc-console-muted');
  pushFormula(buildLatexProductEquation('N_{\\mathrm{base}}', baseFactors.map(f => f.latex)));
  if (activeAdvanced.length) {
    pushLine('Final model after active advanced multipliers:', 'calc-console-muted');
    pushFormula(
      buildLatexProductEquation(
        'N_{\\mathrm{final}}',
        baseFactors.map(f => f.latex).concat(activeAdvanced.map(f => f.latex))
      ),
      'Base terms already include any advanced replacements such as radial GHZ, host-channel aggregation, radius-valley composition, or spin/obliquity rewrites.'
    );
  } else {
    pushLine('N_final = N_base because no extra advanced multipliers are active right now.', 'calc-console-muted');
  }

  const changedFactors = baseFactors.filter(function(entry) {
    const key = entry.key;
    return Math.abs((fullInp[key] ?? 0) - (baseInp[key] ?? 0)) > 1e-12;
  });

  if (changedFactors.length) {
    pushSection('Resolved Replacements');
    changedFactors.forEach(function(entry) {
      const key = entry.key;
      pushLine(`${entry.symbol} (${entry.label}): ${fmtConsoleValue(baseInp[key])} -> ${fmtConsoleValue(fullInp[key])}`);
    });
  }

  pushSection('Derived Definitions');
  let hasDerivedDefinitions = false;

  if (!isH2OEnabled) {
    hasDerivedDefinitions = true;
    pushLine('f_H2O = 1 because the surface-water gate is disabled.', 'calc-console-muted');
  }
  if (!isCHNOPSEnabled) {
    hasDerivedDefinitions = true;
    pushLine('f_CHNOPS = 1 because the CHNOPS gate is disabled.', 'calc-console-muted');
  }
  if (!isComplexLifeEnabled) {
    hasDerivedDefinitions = true;
    pushLine('f_complex_life = 1 because the complex-life gate is disabled.', 'calc-console-muted');
  }
  if (!isXEnabled) {
    hasDerivedDefinitions = true;
    pushLine('f_x = 1 because the wildcard gate is disabled.', 'calc-console-muted');
  }

  if (ADV.enabled && ADV.modules.hostChannels.enabled) {
    hasDerivedDefinitions = true;
    const host = computeHostChannels(ADV.modules.spinObliquity.enabled);
    const { fG, fK, fM } = getHostChannelFractions();
    const mLock = ADV.modules.spinObliquity.enabled ? 1 : pf('adv_w_M_lock');
    pushLine('Host-channel aggregation replaces f_sun_type:', 'calc-console-muted');
    pushFormula(
      [
        'f_{\\odot} &= (f_G \\cdot w_{G,\\mathrm{HZ}} \\cdot w_{G,\\mathrm{act}}) + (f_K \\cdot w_{K,\\mathrm{HZ}} \\cdot w_{K,\\mathrm{act}}) + (f_M \\cdot w_{M,\\mathrm{HZ}} \\cdot w_{M,\\mathrm{act}} \\cdot w_{M,\\mathrm{lock}})',
        `&= (${fmtLatexNumber(fG)} \\cdot ${fmtLatexNumber(pf('adv_w_G_hz'))} \\cdot ${fmtLatexNumber(pf('adv_w_G_act'))}) + (${fmtLatexNumber(fK)} \\cdot ${fmtLatexNumber(pf('adv_w_K_hz'))} \\cdot ${fmtLatexNumber(pf('adv_w_K_act'))}) + (${fmtLatexNumber(fM)} \\cdot ${fmtLatexNumber(pf('adv_w_M_hz'))} \\cdot ${fmtLatexNumber(pf('adv_w_M_act'))} \\cdot ${fmtLatexNumber(mLock)})`,
        `&= ${fmtLatexNumber(host.G)} + ${fmtLatexNumber(host.K)} + ${fmtLatexNumber(host.M)} = ${fmtLatexNumber(host.total)}`
      ],
      ADV.modules.spinObliquity.enabled
        ? 'When spin/obliquity mode is active, the M-dwarf lock penalty is deferred to that downstream survival term.'
        : ''
    );
  }

  if (ADV.enabled && ADV.modules.atmRet.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Atmospheric-retention multiplier:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{atm}} &= f_{\\mathrm{atm,ret}}',
      `&= ${fmtLatexNumber(fullInp._f_atm_ret ?? 1)}`
    ]);
  }

  if (ADV.enabled && ADV.modules.volatileSplit.enabled) {
    hasDerivedDefinitions = true;
    if (isH2OEnabled) {
      const delivery = clamp01(pf('adv_f_vol_del'));
      const retention = clamp01(pf('adv_f_wat_ret'));
      pushLine('Water availability is decomposed into delivery and retention:', 'calc-console-muted');
      pushFormula([
        'f_{H_2O} &= f_{\\mathrm{vol}} \\cdot f_{\\mathrm{ret}}',
        `&= ${fmtLatexNumber(delivery)} \\cdot ${fmtLatexNumber(retention)} = ${fmtLatexNumber(delivery * retention)}`
      ]);
    } else {
      pushLine('Volatile delivery / retention is enabled, but f_H2O remains 1 because the surface-water gate is disabled.', 'calc-console-muted');
    }
  }

  if (ADV.enabled && ADV.modules.longterm.enabled) {
    hasDerivedDefinitions = true;
    const tect = clamp01(pf('adv_f_tect'));
    const radio = clamp01(pf('adv_f_radio'));
    const clim = clamp01(pf('adv_f_clim'));
    pushLine('Long-term geodynamics is factored explicitly:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{long}} &= f_{\\mathrm{tect}} \\cdot f_{\\mathrm{radio}} \\cdot f_{\\mathrm{clim}}',
      `&= ${fmtLatexNumber(tect)} \\cdot ${fmtLatexNumber(radio)} \\cdot ${fmtLatexNumber(clim)} = ${fmtLatexNumber(tect * radio * clim)}`
    ]);
  }

  if (ADV.enabled && ADV.modules.spinObliquity.enabled) {
    hasDerivedDefinitions = true;
    const moonBase = clamp01(baseInp.f_lunar_stability || 0);
    const moonBoost = Math.max(1, pf('adv_moon_boost'));
    let fSpin = clamp01(pf('adv_f_spin_G'));
    let spinNote = `f_spin = ${fmtConsoleValue(fSpin)}`;

    if (ADV.modules.hostChannels.enabled) {
      const { fG, fK, fM } = getHostChannelFractions();
      const denom = Math.max(1e-12, fG + fK + fM);
      fSpin =
        (fG * clamp01(pf('adv_f_spin_G')) +
          fK * clamp01(pf('adv_f_spin_K')) +
          fM * clamp01(pf('adv_f_spin_M'))) /
        denom;
      spinNote =
        `Weighted spin prior: (${fmtConsoleValue(fG)} x ${fmtConsoleValue(pf('adv_f_spin_G'))} + ` +
        `${fmtConsoleValue(fK)} x ${fmtConsoleValue(pf('adv_f_spin_K'))} + ` +
        `${fmtConsoleValue(fM)} x ${fmtConsoleValue(pf('adv_f_spin_M'))}) / ${fmtConsoleValue(denom)} = ${fmtConsoleValue(fSpin)}`;
    }

    pushLine('Spin/obliquity rewrites the rotation stack:', 'calc-console-muted');
    pushFormula(
      [
        'f_{\\varepsilon} &= \\operatorname{clamp}_{[0,1]}\\left(f_{\\mathrm{spin}} \\cdot (1 + (b_{\\mathrm{moon}} - 1) \\cdot f_{\\mathrm{moon,base}})\\right)',
        `&= \\operatorname{clamp}_{[0,1]}\\left(${fmtLatexNumber(fSpin)} \\cdot (1 + (${fmtLatexNumber(moonBoost)} - 1) \\cdot ${fmtLatexNumber(moonBase)})\\right)`,
        `&= ${fmtLatexNumber(fullInp.f_tilt)},\\quad f_{\\omega} = 1,\\quad f_{\\mathrm{moon}} = 1`
      ],
      spinNote
    );
  }

  if (ADV.enabled && ADV.modules.radiusValley.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Radius-valley prior replaces composition and collapses size to unity:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{rocky}} &= P_{\\mathrm{rocky}}',
      `&= ${fmtLatexNumber(fullInp.f_composition)},\\quad f_{\\mathrm{size}} = 1`
    ]);
  }

  if (ADV.enabled && ADV.modules.radialGHZ.enabled) {
    hasDerivedDefinitions = true;
    const ghz = computeRadialGHZDetails();
    pushLine('Radial GHZ integration replaces the raw N_GHZ input:', 'calc-console-muted');
    pushFormula(
      [
        'N_{\\mathrm{GHZ}} &= \\operatorname{radialGHZ}(N_{\\mathrm{tot}}, R_d, R_{\\mathrm{in}}, R_{\\mathrm{out}}, [\\mathrm{Fe/H}]_{\\min}, n_{\\mathrm{bins}})',
        `&= \\operatorname{radialGHZ}(${fmtLatexNumber(ghz.N_total)}, ${fmtLatexNumber(pf('adv_scale_length'))}, ${fmtLatexNumber(ghz.innerKpc)}, ${fmtLatexNumber(ghz.outerKpc)}, ${fmtLatexNumber(pf('adv_met_thresh'))}, ${fmtLatexNumber(Math.max(20, Math.floor(pf('adv_radial_bins'))))})`,
        `&= ${fmtLatexNumber(ghz.N_GHZ)}`
      ],
      'This is the simplified radial integration currently implemented in the calculator.'
    );
  }

  if (ADV.enabled && ADV.modules.spaceWeather.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Space-weather survival term:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{xuv}} &= f_{\\mathrm{xuv,quiet}}',
      `&= ${fmtLatexNumber(fullInp._f_xuv_quiet ?? 1)}`
    ]);
  }

  if (ADV.enabled && ADV.modules.prebioticUV.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Prebiotic-UV term:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{uv}} &= f_{\\mathrm{uv,prebiotic}}',
      `&= ${fmtLatexNumber(fullInp._f_uv ?? 1)}`
    ]);
  }

  if (ADV.enabled && ADV.modules.binary.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Binary-system survival term:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{bin}} &= f_{\\mathrm{binary}}',
      `&= ${fmtLatexNumber(fullInp._f_binary ?? 1)}`
    ]);
  }

  if (ADV.enabled && ADV.modules.radiation.enabled) {
    hasDerivedDefinitions = true;
    pushLine('Radiation-survival term:', 'calc-console-muted');
    pushFormula([
      'f_{\\mathrm{rad}} &= f_{\\mathrm{radiation}}',
      `&= ${fmtLatexNumber(fullInp._f_rad ?? 1)}`
    ]);
  }

  if (!hasDerivedDefinitions) {
    pushLine('No derived rewrites are active. The model is currently using the base factors exactly as entered.', 'calc-console-muted');
  }

  pushSection('Numeric Evaluation');
  pushLine('Base substitution:', 'calc-console-muted');
  pushFormula(
    buildLatexProductEquation(
      'N_{\\mathrm{base}}',
      baseFactors.map(entry => fmtLatexNumber(fullInp[entry.key]))
    ).concat([`&= ${fmtLatexNumber(baseResult)}`]),
    `= ${fmtConsoleValue(baseResult)}`
  );
  if (activeAdvanced.length) {
    pushLine('Advanced stage:', 'calc-console-muted');
    pushFormula(
      buildLatexProductEquation(
        'N_{\\mathrm{final}}',
        [fmtLatexNumber(baseResult)].concat(
          activeAdvanced.map(entry => fmtLatexNumber(fullInp[entry.key] ?? 1))
        )
      ).concat([`&= ${fmtLatexNumber(finalResult)}`]),
      `= ${fmtConsoleValue(finalResult)}`
    );
  } else {
    pushLine(`N_final = ${fmtConsoleValue(finalResult)}`, 'calc-console-accent');
  }
  pushLine(`Deterministic output = <strong>${fmtConsoleValue(finalResult)}</strong> modelled Earth-like candidates`, 'calc-console-accent');

  pushSection('Detection Trace');
  if (detectionTrace) {
    pushLine(
      `Current planet basis = ${simulationCompleted ? 'Monte Carlo q50 median' : 'deterministic preview'} = ${fmtConsoleValue(detectionTrace.N_planets)}`,
      'calc-console-muted'
    );
    pushFormula([
      'N_{\\mathrm{tx}} &= N_{\\mathrm{planets}} \\cdot f_{\\mathrm{tx}}',
      `&= ${fmtLatexNumber(detectionTrace.N_planets)} \\cdot ${fmtLatexNumber(detectionTrace.f_tx)}`,
      `&= ${fmtLatexNumber(detectionTrace.N_tx_total)}`
    ]);
    if (detectionTrace.is_external_reference) {
      pushFormula(
        [
          'g_{\\mathrm{range}} &= \\begin{cases}1, & L \\geq d_{\\oplus} \\\\ 0, & L < d_{\\oplus}\\end{cases}',
          `&= ${fmtLatexNumber(detectionTrace.range_gate)}`,
          'N_{\\mathrm{within}} &= N_{\\mathrm{tx}} \\cdot g_{\\mathrm{range}}',
          `&= ${fmtLatexNumber(detectionTrace.N_tx_total)} \\cdot ${fmtLatexNumber(detectionTrace.range_gate)} = ${fmtLatexNumber(detectionTrace.N_within)}`,
          '\\hat N_{\\mathrm{det}} &= N_{\\mathrm{within}} \\cdot \\frac{L}{T_{\\mathrm{gal}}}',
          `&= ${fmtLatexNumber(detectionTrace.N_within)} \\cdot \\frac{${fmtLatexNumber(detectionTrace.L)}}{${fmtLatexNumber(detectionTrace.T_gal_yr)}}`,
          `&= ${fmtLatexNumber(detectionTrace.N_det)}`
        ],
        `external range-gate branch; d_Earth = ${fmtConsoleValue(detectionTrace.earth_distance)} ly ; d_horizon = ${fmtConsoleValue(detectionTrace.d_horizon)} ly ; P(>=1) = ${fmtPct(detectionTrace.p_detect_pct)}`
      );
    } else {
      pushFormula(
        [
          '\\hat N_{\\mathrm{det}} &= \\left(N_{\\mathrm{tx}} \\cdot \\frac{A_{\\mathrm{horizon}}}{A_{\\mathrm{GHZ}}}\\right) \\cdot \\frac{L}{T_{\\mathrm{gal}}}',
          `&= \\left(${fmtLatexNumber(detectionTrace.N_tx_total)} \\cdot \\frac{${fmtLatexNumber(detectionTrace.area_det)}}{${fmtLatexNumber(detectionTrace.geom_area)}}\\right) \\cdot \\frac{${fmtLatexNumber(detectionTrace.L)}}{${fmtLatexNumber(detectionTrace.T_gal_yr)}}`,
          `&= ${fmtLatexNumber(detectionTrace.N_det)}`
        ],
        `d_horizon = ${fmtConsoleValue(detectionTrace.d_horizon)} ly ; rho_2d = ${fmtConsoleValue(detectionTrace.rho_2d)} ly^-2 ; P(>=1) = ${fmtPct(detectionTrace.p_detect_pct)}`
      );
    }
    if (!detectionTrace.is_external_reference && Number.isFinite(detectionTrace.d_nearest_det)) {
      pushFormula(
        [
          '\\bar d_{\\mathrm{det}} &= \\frac{\\Gamma(1 + 1/2)}{(\\rho_{\\mathrm{det}} \\pi)^{1/2}}',
          `&= \\frac{\\Gamma(3/2)}{(${fmtLatexNumber(detectionTrace.lambda_det)} \\cdot \\pi)^{1/2}}`,
          `&= ${fmtLatexNumber(detectionTrace.d_nearest_det)}\\,\\text{ly}`
        ],
        detectionTrace.d_nearest_det > detectionTrace.d_horizon
          ? `The equivalent Poisson nearest-detectable distance scale exceeds the current detection horizon of ${fmtConsoleValue(detectionTrace.d_horizon)} ly; it is not a literal currently reachable source.`
          : `Nearest-detectable transmitter distance scale within the current detection horizon of ${fmtConsoleValue(detectionTrace.d_horizon)} ly.`
      );
      if (detectionTrace.N_det < 1) {
        pushLine(
          'Sub-Poisson regime: fewer than one active detectable transmitter is expected on average inside the current detection horizon. Non-detection is therefore the statistically dominant outcome, although the Poisson probability is not zero.',
          'calc-console-muted'
        );
      }
    } else if (detectionTrace.is_external_reference) {
      pushLine(
        'External-galaxy SETI trace uses an Earth-reference range gate, not an internal GHZ nearest-neighbour density.',
        'calc-console-muted'
      );
    }
  } else {
    pushLine('Detection trace is unavailable because the current planet count or GHZ geometry collapses to zero.', 'calc-console-muted');
  }

  pushSection('Distance Trace');
  if (distanceScenario.kind === 'geometric' && distanceScenario.metrics) {
    pushLine(
      `Current distance basis = ${simulationCompleted ? 'Monte Carlo q50 median' : 'deterministic preview'} = ${fmtConsoleValue(basisCount)}`,
      'calc-console-muted'
    );
    if (distanceScenario.metrics.modelRadial) {
      const model = distanceScenario.metrics.modelRadial;
      pushFormula(
        [
          '\\Lambda(r) &= \\int_{B(r)} \\lambda(R)\\,dA',
          '\\bar d_{\\mathrm{radial}} &= \\int_0^\\infty \\exp[-\\Lambda(r)]\\,dr',
          `&= ${fmtLatexNumber(model.distance)}\\,\\text{ly}`
        ],
        `${model.modelLabel} (R_sun=${model.rSunKpc.toFixed(1)} kpc, GHZ=${model.innerKpc.toFixed(1)}-${model.outerKpc.toFixed(1)} kpc)`
      );
    }
    [distanceScenario.metrics.model2d, distanceScenario.metrics.model3dDisk, distanceScenario.metrics.model3dSphere]
      .filter(Boolean)
      .forEach(function(model) {
        const is2d = model.densityUnits.indexOf('-2') !== -1;
        const geomLatex =
          model.geometryLabel === 'A_GHZ'
            ? 'A_{\\mathrm{GHZ}}'
            : model.geometryLabel === 'V_GHZ,disk'
              ? 'V_{\\mathrm{GHZ,disk}}'
              : 'V_{\\mathrm{GHZ,shell}}';
        const distLatex =
          model.htmlLabel === '2D GHZ ANNULUS'
            ? '\\bar d_{2\\mathrm{D}}'
            : model.htmlLabel === '3D GHZ DISK'
              ? '\\bar d_{3\\mathrm{D,disk}}'
              : '\\bar d_{3\\mathrm{D,shell}}';
        pushFormula(
          [
            `\\lambda &= \\frac{N}{${geomLatex}} = \\frac{${fmtLatexNumber(basisCount)}}{${fmtLatexNumber(model.geometryValue)}} = ${fmtLatexNumber(model.densityValue)}`,
            is2d
              ? `${distLatex} &= \\frac{\\Gamma(1 + 1/2)}{(\\lambda \\pi)^{1/2}}`
              : `${distLatex} &= \\frac{\\Gamma(1 + 1/3)}{(\\lambda 4\\pi/3)^{1/3}}`,
            `&= ${fmtLatexNumber(model.distance)}\\,\\text{ly}`
          ],
          `${model.modelLabel}`
        );
      });
  } else if (distanceScenario.kind === 'sparse') {
    pushLine('Expected count is below 1, so the calculator suppresses a nearest-neighbour estimate in the sparse regime.', 'calc-console-muted');
  } else if (distanceScenario.kind === 'no-model') {
    pushLine('All geometric distance models are currently disabled.', 'calc-console-muted');
  } else if (distanceScenario.kind === 'external') {
    pushLine('Current galaxy selection uses an external reference distance instead of an internal GHZ nearest-neighbour model.', 'calc-console-muted');
  } else {
    pushLine('Distance trace is not available for the current scenario.', 'calc-console-muted');
  }

  if (simulationCompleted && lastResults.length) {
    const simulationSummary = describeSimulationOptions();
    pushSection('Latest Monte Carlo Run');
    pushLine(`Iterations=${parseInt((byId('iterations') || {}).value || '2000', 10).toLocaleString()} | Engine=${((byId('simulation-engine') || {}).value || 'standard')} | Distribution=${((byId('distribution') || {}).value || 'lognormal')} | MC basis=${simulationSummary.boundsLabel}`);
    pushLine(`MC q50 median=${fmtConsoleValue(mcMedianQ50)} | MC arithmetic mean=${fmtConsoleValue(mcArithmeticMean)} | 95% sampled model interval=[${fmtConsoleValue(mcQ025)}, ${fmtConsoleValue(mcQ975)}] | StdDev=${fmtConsoleValue(stdDev)} | Mode≈${fmtConsoleValue(mostFrequent)}`);
    if (monteCarloIntervalComparison && monteCarloIntervalComparison.warning) {
      pushLine(monteCarloIntervalComparison.warning, 'calc-console-warn');
    }
    if (distanceCalculated) {
      const radialMetric = fermiContexts.mc && fermiContexts.mc.distLy ? fermiContexts.mc.distLy : null;
      pushLine(`Distance models: radial=${Number.isFinite(radialMetric) ? fmtConsoleValue(radialMetric) + ' ly' : 'off/Infinity'} | 2D=${Number.isFinite(distance2D) ? fmtConsoleValue(distance2D) + ' ly' : 'off/Infinity'} | 3D disk=${Number.isFinite(distance3DDisk) ? fmtConsoleValue(distance3DDisk) + ' ly' : 'off/Infinity'} | 3D shell=${Number.isFinite(distance3DSphere) ? fmtConsoleValue(distance3DSphere) + ' ly' : 'off/Infinity'}`);
    }
  } else {
    pushLine('Monte Carlo has not been run yet for this state.', 'calc-console-muted');
  }

  if (ADV.enabled) {
    pushSection('Active Advanced Modules');
    const activeModuleLabels = Object.entries(ADV.modules)
      .filter(function(entry) { return entry[1].enabled; })
      .map(function(entry) { return entry[1].label; });
    pushLine(activeModuleLabels.length ? activeModuleLabels.join(' | ') : 'Advanced master enabled, but no individual module is active.', activeModuleLabels.length ? '' : 'calc-console-warn');
  }

  el.innerHTML = lines.join('');
  typesetMathInElement(el);
}

function renderSimulationMethodSummary() {
  const modelLine = byId('simulationModel');
  const envelopeLine = byId('robustEnvelopeResult');
  if (!modelLine || !envelopeLine) return;

  if (!simulationCompleted || !lastResults.length) {
    modelLine.textContent = '';
    envelopeLine.textContent = '';
    modelLine.style.display = 'none';
    envelopeLine.style.display = 'none';
    return;
  }

  const summary = describeSimulationOptions();
  modelLine.style.display = 'block';
  modelLine.innerHTML =
    `<span class="result-label">SIMULATION MODEL ·</span> ` +
    `${summary.engineLabel} · ${summary.distributionShort} · ${summary.correlationLabel} · ${summary.boundsLabel}`;
  if (summary.uncertaintyBasisLabel) {
    modelLine.innerHTML += ` <span style="font-size:10px;color:var(--text-dim)">(${summary.uncertaintyBasisLabel})</span>`;
  }

  if (simulationEnvelope) {
    envelopeLine.style.display = 'block';
    envelopeLine.innerHTML =
      `<span class="result-label">ROBUST ENVELOPE ·</span> ` +
      `[${fmtN(simulationEnvelope.low)}, ${fmtN(simulationEnvelope.high)}] ` +
      `<span style="font-size:10px;color:var(--text-dim)">(parameterwise min/max bounds check)</span>`;
  } else {
    envelopeLine.textContent = '';
    envelopeLine.style.display = 'none';
  }
}

const UNCERTAINTY_PROFILES = {
  conservative: {
    uncertainty: 25,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent',
    robustBounds: false,
    mcMode: 'auto'
  },
  baseline: {
    uncertainty: 50,
    distribution: 'lognormal',
    engine: 'standard',
    correlation: 'independent',
    robustBounds: false,
    mcMode: 'auto'
  },
  broad: {
    uncertainty: 75,
    distribution: 'lognormal',
    engine: 'lhs',
    correlation: 'independent',
    robustBounds: false,
    mcMode: 'globalEnvelope'
  },
  stress: {
    uncertainty: 100,
    distribution: 'uniform',
    engine: 'lhs',
    correlation: 'independent',
    robustBounds: true,
    mcMode: 'globalEnvelope'
  }
};

function applyUncertaintyProfile(name) {
  const profile = UNCERTAINTY_PROFILES[name];
  if (!profile) return;

  if (byId('sampling_uncertainty')) byId('sampling_uncertainty').value = String(profile.uncertainty);
  if (byId('distribution')) byId('distribution').value = profile.distribution;
  if (byId('simulation-engine')) byId('simulation-engine').value = profile.engine;
  if (byId('correlation-model')) byId('correlation-model').value = profile.correlation;
  if (byId('robust-bounds')) byId('robust-bounds').checked = profile.robustBounds;
  if (byId('mc-basis-mode')) byId('mc-basis-mode').value = profile.mcMode || 'auto';

  clampSamplingUncertaintyInput();
  invalidateResults(false, false);
}

function clampIterationsInput() {
  const el = byId('iterations');
  if (!el) return;

  const value = parseFloat(el.value);
  if (!Number.isFinite(value)) {
    el.value = '2000';
    return;
  }

  el.value = String(clamp(value, 1000, 20000));
}

function clampSamplingUncertaintyInput() {
  const el = byId('sampling_uncertainty');
  if (!el) return;

  const value = parseFloat(el.value);
  if (!Number.isFinite(value)) {
    el.value = '50';
    return;
  }

  el.value = String(clamp(value, 1, 100));
}

function captureGalaxySettingsBaseline() {
  return {
    galaxyName,
    preset: (byId('galaxy-preset') || {}).value || 'mw',
    diameter: (byId('galaxy-diameter') || {}).value || '100000',
    thickness: (byId('galaxy-thickness') || {}).value || '1000',
    earthDistance: (byId('galaxy-earth-distance') || {}).value || '0',
    N_GHZ: (byId('N_GHZ') || {}).value || '10000000000',
    totalStars: (byId('adv_N_total_stars') || {}).value || '',
    modelRadial: !!((byId('model-radial') || {}).checked),
    model2d: !!((byId('model-2d') || {}).checked),
    model3dDisk: !!((byId('model-3d-disk') || {}).checked),
    model3dSphere: !!((byId('model-3d-sphere') || {}).checked)
  };
}

function applyGalaxyPresetSelection(key) {
  const preset = GALAXY_PRESET_MAP[key];
  if (!preset) return null;

  galaxyName = preset.name;

  if (byId('galaxy-preset')) byId('galaxy-preset').value = key;
  if (Number.isFinite(preset.d) && byId('galaxy-diameter')) byId('galaxy-diameter').value = preset.d;
  if (Number.isFinite(preset.t) && byId('galaxy-thickness')) byId('galaxy-thickness').value = preset.t;
  if (Number.isFinite(preset.n) && byId('adv_N_total_stars')) byId('adv_N_total_stars').value = preset.n;
  if (byId('galaxy-earth-distance') && preset.earthDist !== undefined) {
    byId('galaxy-earth-distance').value = preset.earthDist ?? 0;
  }

  return preset;
}

function restoreGalaxySettingsBaseline(state) {
  if (!state) {
    applyGalaxyPresetSelection('mw');
    if (byId('model-radial')) byId('model-radial').checked = true;
    if (byId('model-2d')) byId('model-2d').checked = true;
    if (byId('model-3d-disk')) byId('model-3d-disk').checked = true;
    if (byId('model-3d-sphere')) byId('model-3d-sphere').checked = true;
    return;
  }

  galaxyName = state.galaxyName || 'Milky Way (MW)';

  if (byId('galaxy-preset')) byId('galaxy-preset').value = state.preset || 'mw';
  if (byId('galaxy-diameter')) byId('galaxy-diameter').value = state.diameter || '100000';
  if (byId('galaxy-thickness')) byId('galaxy-thickness').value = state.thickness || '1000';
  if (byId('galaxy-earth-distance')) byId('galaxy-earth-distance').value = state.earthDistance || '0';
  if (byId('N_GHZ')) byId('N_GHZ').value = state.N_GHZ || '10000000000';
  if (byId('adv_N_total_stars')) byId('adv_N_total_stars').value = state.totalStars || '';
  if (byId('model-radial')) byId('model-radial').checked = state.modelRadial !== false;
  if (byId('model-2d')) byId('model-2d').checked = state.model2d !== false;
  if (byId('model-3d-disk')) byId('model-3d-disk').checked = state.model3dDisk !== false;
  if (byId('model-3d-sphere')) byId('model-3d-sphere').checked = state.model3dSphere !== false;
}

const ADVANCED_DEFAULT_CONTROL_IDS = [
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
  'adv_N_total_stars', 'adv_scale_length', 'adv_ghz_inner', 'adv_ghz_outer',
  'adv_met_thresh', 'adv_radial_bins',
  'adv_f_xuv', 'adv_f_xuv_min', 'adv_f_xuv_max',
  'adv_f_uv', 'adv_f_uv_min', 'adv_f_uv_max',
  'adv_f_binary', 'adv_f_binary_min', 'adv_f_binary_max',
  'adv_f_rad', 'adv_f_rad_min', 'adv_f_rad_max',
  'adv_ard_mass', 'adv_ard_atm', 'adv_ard_age', 'adv_temporal_R'
];

let advancedControlDefaults = null;

function captureAdvancedControlDefaults() {
  const defaults = {};
  ADVANCED_DEFAULT_CONTROL_IDS.forEach(id => {
    const el = byId(id);
    if (!el) return;
    defaults[id] = {
      value: el.value,
      checked: !!el.checked
    };
  });
  advancedControlDefaults = defaults;
}

function resetAdvancedStateToDefaults() {
  if (!advancedControlDefaults) captureAdvancedControlDefaults();

  ADV.enabled = false;
  Object.keys(ADV.modules).forEach(key => {
    ADV.modules[key].enabled = false;
    const toggle = byId('toggle-' + key);
    const body = byId('body-' + key);
    if (toggle) toggle.classList.toggle('enabled', false);
    if (body) body.style.display = 'none';
  });

  const master = byId('adv-master-toggle');
  if (master) master.classList.toggle('enabled', false);
  const options = byId('adv-options');
  if (options) options.style.display = 'none';

  Object.entries(advancedControlDefaults || {}).forEach(([id, state]) => {
    const el = byId(id);
    if (!el) return;
    el.value = state.value;
    el.checked = state.checked;
  });

  refreshAdvancedInlineNotes();
}

function areAdvancedControlsAtDefaults() {
  if (!advancedControlDefaults) captureAdvancedControlDefaults();

  return Object.entries(advancedControlDefaults || {}).every(([id, state]) => {
    const el = byId(id);
    if (!el) return true;
    return String(el.value ?? '') === String(state.value ?? '') && !!el.checked === !!state.checked;
  });
}

function resetOptionalFactorStateForPreset(preset) {
  isH2OEnabled = preset.enableH2O !== false;
  isCHNOPSEnabled = preset.enableCHNOPS !== false;
  isComplexLifeEnabled = !!preset.enableComplex;
  isXEnabled = !!preset.enableX;

  if (byId('H2O-toggle')) byId('H2O-toggle').classList.toggle('enabled', isH2OEnabled);
  if (byId('CHNOPS-toggle')) byId('CHNOPS-toggle').classList.toggle('enabled', isCHNOPSEnabled);
  if (byId('complex-life-toggle')) byId('complex-life-toggle').classList.toggle('enabled', isComplexLifeEnabled);
  if (byId('x-toggle')) byId('x-toggle').classList.toggle('enabled', isXEnabled);
}

function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  setScenarioPreset(name);

  applyPresetParameterState(p);

  resetOptionalFactorStateForPreset(p);
  resetAdvancedStateToDefaults();
  syncPresetUi();

  if (name === 'kepler' || name === 'optimist') setBayesian('post', false);
  else setBayesian('pre', false);

  // Clear any per-card clamp warnings left over from prior user edits.
  clearAllClampWarnings([...CLAMP_PROBABILITY_FIELDS, ...[...CLAMP_PROBABILITY_FIELDS].map(id => id + '_min'), ...[...CLAMP_PROBABILITY_FIELDS].map(id => id + '_max')]);

  invalidateResults(false);
  // Loading a preset is a fresh scenario slate: Monte Carlo has never completed
  // for this new state, so reset the lifecycle to 'not-run' (not 'stale').
  monteCarloState = 'not-run';
}
window.loadPreset = loadPreset;

function setBayesian(mode, applyToFields = true) {
  bayesianMode = mode;
  syncBayesianUi();

  if (applyToFields) {
    byId('f_orbit').value = BAYES[mode].f_orbit;
    byId('f_composition').value = BAYES[mode].f_composition;
    markScenarioModified();
    if (typeof reconcileScenarioStateWithVisiblePreset === 'function') {
      reconcileScenarioStateWithVisiblePreset();
    }
    invalidateResults(false);
  }
}
window.setBayesian = setBayesian;

function setScale(s) {
  currentScale = s;
  byId('scale-linear').classList.toggle('active', s === 'linear');
  byId('scale-log').classList.toggle('active', s === 'log');

  if (simulationCompleted && lastResults.length) rebuildCharts(lastResults);
}
window.setScale = setScale;

function detectionPresetMatches(preset) {
  if (!preset) return false;
  const currentL = rawNumber('detection-L', preset.L);
  const currentFTx = rawNumber('detection-f_tx', preset.f_tx);
  return Math.abs(currentL - preset.L) < 0.5 && Math.abs(currentFTx - preset.f_tx) < 1e-12;
}

function syncDetectionPresetUi() {
  document.querySelectorAll('[data-detection-preset]').forEach(btn => {
    const preset = DETECTION_PRESETS[btn.dataset.detectionPreset];
    btn.classList.toggle('active', detectionPresetMatches(preset));
  });
}

function refreshDetectionControls() {
  syncDetectionPresetUi();
  renderCalculationConsole();
  if (simulationCompleted) renderDetectionPanel();
  updateShareButtons();
}

function setDetectionPreset(name) {
  const preset = DETECTION_PRESETS[name];
  if (!preset) return;

  if (byId('detection-L')) byId('detection-L').value = preset.L;
  if (byId('detection-f_tx')) byId('detection-f_tx').value = preset.f_tx;

  refreshDetectionControls();
}

function renderDistanceHtml(metrics) {
  const rows = [];

  if (metrics.modelRadial) {
    rows.push(
      `<span class="result-label">${metrics.modelRadial.htmlLabel} ·</span> ` +
        `<span class="bold-number">${fmtN(metrics.modelRadial.distance)}</span> ly` +
        (Number.isFinite(metrics.modelRadial.ciLow) && Number.isFinite(metrics.modelRadial.ciHigh)
          ? ` (95% sampled model interval: ${fmtN(metrics.modelRadial.ciLow)}~${fmtN(metrics.modelRadial.ciHigh)} ly`
          : '') +
        ` <em style="font-size:9px;color:var(--text-dim);">(default non-uniform baseline)</em>`
    );
  }

  if (metrics.model3dDisk) {
    rows.push(
      `<span class="result-label">${metrics.model3dDisk.htmlLabel} ·</span> ` +
        `<span class="bold-number">${fmtN(metrics.model3dDisk.distance)}</span> ly` +
        (Number.isFinite(metrics.model3dDisk.ciLow) && Number.isFinite(metrics.model3dDisk.ciHigh)
          ? ` (95% sampled model interval: ${fmtN(metrics.model3dDisk.ciLow)}~${fmtN(metrics.model3dDisk.ciHigh)} ly`
          : '') +
        ` <em style="font-size:9px;color:var(--text-dim);">(uniform comparison baseline)</em>`
    );
  }

  if (metrics.model2d) {
    rows.push(
      `<span class="result-label">${metrics.model2d.htmlLabel} ·</span> ` +
        `<span class="bold-number">${fmtN(metrics.model2d.distance)}</span> ly` +
        (Number.isFinite(metrics.model2d.ciLow) && Number.isFinite(metrics.model2d.ciHigh)
          ? ` (95% sampled model interval: ${fmtN(metrics.model2d.ciLow)}~${fmtN(metrics.model2d.ciHigh)} ly`
          : '') +
        ` <em style="font-size:9px;color:var(--text-dim);">(optimistic lower bound)</em>`
    );
  }

  if (metrics.model3dSphere) {
    rows.push(
      `<span class="result-label">${metrics.model3dSphere.htmlLabel} ·</span> ` +
        `<span class="bold-number">${fmtN(metrics.model3dSphere.distance)}</span> ly` +
        (metrics.model3dSphere.noteHtml || '')
    );
  }

  return rows.join('<br>');
}

function syncFermiModeUi() {
  const mcBtn = byId('fermi-mode-mc');
  const dtBtn = byId('fermi-mode-dt');
  const toggle = byId('fermi-toggle');
  const hasMc = !!fermiContexts.mc;
  const hasDt = !!fermiContexts.dt;

  if (toggle) toggle.style.display = hasMc || hasDt ? 'inline-flex' : 'none';
  if (mcBtn) {
    mcBtn.disabled = !hasMc;
    mcBtn.classList.toggle('active', hasMc && fermiMode === 'mc');
  }
  if (dtBtn) {
    dtBtn.disabled = !hasDt;
    dtBtn.classList.toggle('active', hasDt && fermiMode === 'dt');
  }
}

function buildFermiCommunicationSupplementHtml(mode = fermiMode) {
  // Legacy Fermi supplement intentionally removed from the visible panel.
  // The underlying SETI calculations remain in computeDetectionFilter() and
  // are rendered once inside the SETI signal context diagnostics.
  return '';
}

function renderFermiBox(preferredMode = null) {
  const box = byId('fermi-box');
  const summary = byId('fermi-summary');
  const content = byId('fermi-content');
  const tail = byId('fermi-tail');
  const actions = byId('fermi-actions');
  if (!box || !summary || !content || !tail || !actions) return;

  if (preferredMode && fermiContexts[preferredMode]) {
    fermiMode = preferredMode;
  } else if (!fermiContexts[fermiMode]) {
    // Prefer deterministic when current mode is unavailable — deterministic
    // is the methodological primary for scenario-based presets.
    fermiMode = fermiContexts.dt ? 'dt' : fermiContexts.mc ? 'mc' : 'dt';
  }

  syncFermiModeUi();

  if (!fermiContexts[fermiMode]) {
    summary.innerHTML = '';
    content.innerHTML = '';
    tail.innerHTML = '';
    actions.innerHTML = '';
    box.classList.remove('visible');
    return;
  }

  summary.innerHTML = buildInterpretationHtml(fermiMode);
  // The old Fermi supplement duplicated
  // the SETI signal context and diagnostics already rendered in the narrative.
  const communicationSupplementHtml = '';
  content.innerHTML = buildFermiGroupHtml(
    `<div class="fermi-context-label fermi-reveal-item">Fermi communication context</div>` +
    `<div class="fermi-content-copy">${buildFermiNarrativeHtml(fermiContexts[fermiMode].html)}</div>` +
    communicationSupplementHtml,
    'narrative'
  );
  const universeHtml = buildUniverseScaleHtml(fermiMode);
  tail.innerHTML = universeHtml ? buildFermiGroupHtml(universeHtml, 'cosmic') : '';
  actions.innerHTML =
    `<a class="fermi-copy-link fermi-reveal-item" onclick="copyToClipboard(event, 'fermi-copy-source')">Copy to clipboard</a>`;
  applyFermiRevealSequence(box);
  box.classList.add('visible');
}

function setFermiMode(mode) {
  if (!fermiContexts[mode]) return;
  fermiMode = mode;
  renderFermiBox();
  if (typeof renderDetectionPanel === 'function') renderDetectionPanel();
}

const HISTORY_STORAGE_KEY = 'simHistory';
const HISTORY_SCHEMA_VERSION = 1;

function safeHistoryStorage() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function normalizeHistoryStore(parsed) {
  if (Array.isArray(parsed)) {
    return {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      items: parsed
    };
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed.schemaVersion === HISTORY_SCHEMA_VERSION &&
    Array.isArray(parsed.items)
  ) {
    return {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      items: parsed.items
    };
  }

  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    items: []
  };
}

function readHistoryStore(storage = safeHistoryStorage()) {
  try {
    if (!storage) return normalizeHistoryStore(null);
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return normalizeHistoryStore(null);
    return normalizeHistoryStore(JSON.parse(raw));
  } catch (e) {
    return normalizeHistoryStore(null);
  }
}

function writeHistoryStore(store, storage = safeHistoryStorage()) {
  const normalized = normalizeHistoryStore(store);
  try {
    if (!storage) return normalized;
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {}
  return normalized;
}

function clearHistoryStore(storage = safeHistoryStorage()) {
  try {
    if (!storage) return;
    storage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {}
}

window.normalizeHistoryStore = normalizeHistoryStore;
window.safeHistoryStorage = safeHistoryStorage;
window.readHistoryStore = readHistoryStore;
window.writeHistoryStore = writeHistoryStore;
window.clearHistoryStore = clearHistoryStore;

function saveHistoryEntry() {
  try {
    const store = readHistoryStore();
    const distanceSnapshot =
      typeof getActiveDistanceSnapshot === 'function'
        ? getActiveDistanceSnapshot()
        : {};
    const mcState = typeof getMonteCarloState === 'function'
      ? getMonteCarloState()
      : (simulationCompleted ? 'current' : 'not-run');
    const isCurrentMc = mcState === 'current';
    // Non-current display placeholder: 'stale' marks an invalidated run,
    // 'not run' marks a run that never completed. Never store 0 as a placeholder.
    const mcPlaceholder = mcState === 'stale' ? 'stale' : 'not run';
    const mcDisplay = v => Number.isFinite(v) ? (v < 1 ? v.toExponential(2) : Math.round(v)) : mcPlaceholder;
    // Raw numeric value only when the run is current; null otherwise (never an invalid zero placeholder).
    const mcRaw = v => isCurrentMc && Number.isFinite(v) ? v : null;
    const mcMedianQ50Display = isCurrentMc ? mcDisplay(mcMedianQ50) : mcPlaceholder;
    const mcArithmeticMeanDisplay = isCurrentMc ? mcDisplay(mcArithmeticMean) : mcPlaceholder;
    const mcQ025Display = isCurrentMc ? mcDisplay(mcQ025) : mcPlaceholder;
    const mcQ975Display = isCurrentMc ? mcDisplay(mcQ975) : mcPlaceholder;
    store.items.push({
      date: new Date().toLocaleString('en-US'),
      selectedPreset: activePreset || 'custom',
      scenario: getScenarioExportLabel(),
      scenarioLabel: getScenarioExportLabel(),
      scenarioState: typeof getScenarioState === 'function' ? getScenarioState() : null,
      galaxy: galaxyName,
      basis: isCurrentMc ? 'MC q50 median' : 'deterministic central',
      mcMode: monteCarloBoundsMode || null,
      uncertaintyBasisLabel: monteCarloUncertaintyBasisLabel || null,
      simulationCompleted,
      mcState,
      staleState: mcState,
      deterministic: deterministicPlanets,
      // Backward-compatible display fields (read by renderHistory):
      mcMedianQ50: mcMedianQ50Display,
      mcArithmeticMean: mcArithmeticMeanDisplay,
      ciLow: mcQ025Display,
      ciHigh: mcQ975Display,
      // Explicit display fields:
      mcMedianQ50Display,
      mcArithmeticMeanDisplay,
      mcQ025Display,
      mcQ975Display,
      // Raw numeric fields for auditability (null unless MC is current):
      mcMedianQ50Raw: mcRaw(mcMedianQ50),
      mcArithmeticMeanRaw: mcRaw(mcArithmeticMean),
      mcQ025Raw: mcRaw(mcQ025),
      mcQ975Raw: mcRaw(mcQ975),
      activeDistanceModel: distanceSnapshot.activeDistanceModel || null,
      activeDistanceBasis: distanceSnapshot.activeDistanceBasis || null,
      activeDistanceCountBasis: distanceSnapshot.activeDistanceCountBasis || null,
      displayedDistanceValue: Number.isFinite(distanceSnapshot.displayedDistanceValue)
        ? Math.round(distanceSnapshot.displayedDistanceValue)
        : null,
      displayedDistanceLabel: distanceSnapshot.displayedDistanceLabel || null,
      distanceRadial: Number.isFinite(distanceSnapshot.distanceRadial) ? Math.round(distanceSnapshot.distanceRadial) : null,
      distance2D: Number.isFinite(distanceSnapshot.distance2D) ? Math.round(distanceSnapshot.distance2D) : null,
      distance3DDisk: Number.isFinite(distanceSnapshot.distance3DDisk) ? Math.round(distanceSnapshot.distance3DDisk) : null,
      distance3DSphere: Number.isFinite(distanceSnapshot.distance3DSphere) ? Math.round(distanceSnapshot.distance3DSphere) : null,
      externalReferenceDistance: distanceSnapshot.activeDistanceBasis === 'external reference distance' && Number.isFinite(distanceSnapshot.displayedDistanceValue)
        ? Math.round(distanceSnapshot.displayedDistanceValue)
        : null
    });
    writeHistoryStore(store);
  } catch (e) {
    
  }
}

function buildExpectedWithinPills(count, geom, refModel = null) {
  if (!Number.isFinite(count) || count <= 0 || !geom) return null;

  let modelLabel = '3D GHZ disk';
  let modelNote = 'Same active 3D GHZ disk model as the headline distance. The search sphere is capped at disk thickness when the radius exceeds the GHZ half-thickness.';
  let modelKind = '3d-disk';
  let expectedAtRadius = null;

  if (refModel && refModel.isRadial && typeof buildRadialGHZDensityProfile === 'function' && typeof radialMeanWithinDistance === 'function') {
    const profile = buildRadialGHZDensityProfile();
    if (profile) {
      modelLabel = 'radial GHZ density';
      modelNote = 'Same active radial GHZ density model as the headline distance. Values are Lambda(r): the expected count inside an observer-centred search circle in the non-uniform radial GHZ profile.';
      modelKind = 'radial';
      expectedAtRadius = radius => radialMeanWithinDistance(count, profile, radius / 3261.56);
    }
  }

  if (!expectedAtRadius && refModel && refModel.modelLabel === '2D GHZ annulus' && Number.isFinite(geom.area) && geom.area > 0) {
    const density2D = count / geom.area;
    modelLabel = '2D GHZ annulus';
    modelNote = 'Same active 2D GHZ annulus model as the headline distance. Values use the expected count inside a projected observer-centred search circle.';
    modelKind = '2d';
    expectedAtRadius = radius => density2D * Math.min(Math.PI * radius * radius, geom.area);
  }

  if (!expectedAtRadius && refModel && refModel.modelLabel === '3D GHZ shell' && Number.isFinite(geom.volumeSphere) && geom.volumeSphere > 0) {
    const densityShell = count / geom.volumeSphere;
    modelLabel = '3D GHZ shell';
    modelNote = 'Same active 3D GHZ shell reference model as the headline distance. Values use the expected count inside a local spherical search volume.';
    modelKind = '3d-shell';
    expectedAtRadius = radius => densityShell * Math.min((4 / 3) * Math.PI * Math.pow(radius, 3), geom.volumeSphere);
  }

  if (!expectedAtRadius && Number.isFinite(geom.volumeDisk) && geom.volumeDisk > 0) {
    const density3D = count / geom.volumeDisk;
    const halfThick = geom.thickness / 2;
    expectedAtRadius = radius => {
      const volume = radius <= halfThick
        ? (4 / 3) * Math.PI * Math.pow(radius, 3)
        : Math.PI * radius * radius * geom.thickness;
      return density3D * Math.min(volume, geom.volumeDisk);
    };
  }

  if (!expectedAtRadius) return null;

  const html = [100, 200, 300, 400, 500, 1000, 2000, 3000]
    .map(radius => {
      const expected = expectedAtRadius(radius);
      const expectedFmt = expected < 0.001 ? '∅' : fmtHuman(expected);
      const probability = Number.isFinite(expected) && expected >= 0 ? 1 - Math.exp(-expected) : NaN;
      const probabilityTitle = Number.isFinite(probability)
        ? `Poisson P(at least one within ${radius.toLocaleString()} ly) = ${fmtExistencePct(probability, true)}`
        : `Poisson probability unavailable for ${radius.toLocaleString()} ly`;
      return `<span class="fermi-pill" title="${probabilityTitle}"><strong>${radius.toLocaleString()} ly</strong> ${expectedFmt}</span>`;
    })
    .join('');

  return { html, modelLabel, modelNote, modelKind };
}

function buildHostBreakdownHtml() {
  if (!(ADV.enabled && ADV.modules.hostChannels.enabled)) {
    return `<div class="fermi-subnote">Enable the <strong>Host Channels</strong> advanced module to surface the live G/K/M contribution split inside this panel.</div>`;
  }

  const channels = computeHostChannels(ADV.modules.spinObliquity.enabled);
  const total = channels.G + channels.K + channels.M;
  if (!Number.isFinite(total) || total <= 0) return '';

  const pills = [
    { label: 'G', value: channels.G, raw: channels.fractions.fG },
    { label: 'K', value: channels.K, raw: channels.fractions.fK },
    { label: 'M', value: channels.M, raw: channels.fractions.fM }
  ]
    .map(item => {
      const share = item.value / total;
      return `<span class="fermi-pill"><strong>${item.label}</strong> ${(share * 100).toFixed(1)}% weighted share <span style="opacity:.75;">(raw ${(item.raw * 100).toFixed(1)}%)</span></span>`;
    })
    .join('');

  return (
    `Effective host-star term <span class="bold-number">${fmtN(channels.total)}</span> is built from the weighted G/K/M channels below.` +
    `<div class="fermi-pill-row">${pills}</div>` +
    `<div class="fermi-subnote">M dwarfs often dominate the raw count, but activity and tidal-lock penalties can suppress their effective contribution strongly.</div>`
  );
}

function buildTopDriversHtml() {
  if (!(ADV.enabled && ADV.modules.sensitivity.enabled)) {
    return `<div class="fermi-subnote">Enable the <strong>Sensitivity</strong> module and rerun Monte Carlo to populate the top 3 ranked uncertainty drivers here.</div>`;
  }

  const drivers = SENS.compute().slice(0, 3);
  if (!drivers.length) {
    return `<div class="fermi-subnote">Sensitivity storage is empty for this state. Run Monte Carlo once more with the module enabled to extract the dominant drivers.</div>`;
  }

  const pills = drivers
    .map((driver, idx) =>
      `<span class="fermi-pill"><strong>#${idx + 1}</strong> ${driver.label} <span style="opacity:.75;">${driver.r >= 0 ? '+' : '−'}${driver.score.toFixed(0)}</span></span>`
    )
    .join('');

  return (
    `Current tornado ranking highlights the three parameters with the largest log-space pull on <span class="bold-number">N</span>.` +
    `<div class="fermi-pill-row">${pills}</div>`
  );
}

function buildFermiGroupHtml(innerHtml, tone = 'core') {
  return (
    `<div class="fermi-group" data-tone="${tone}">` +
    innerHtml +
    `</div>`
  );
}

function buildFermiFactHtml(text) {
  return String(text || '')
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<div class="fermi-fact-item fermi-reveal-item">${part}</div>`)
    .join('');
}

function buildFermiNarrativeHtml(text) {
  const parts = String(text || '')
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map(part => part.trim())
    .filter(Boolean);

  if (!parts.length) return '';

  const title = `<div class="fermi-narrative-title fermi-reveal-item">${parts[0]}</div>`;
  const facts = parts
    .slice(1)
    .map(part => part.replace(/^\s*➤\s*/, ''))
    .map(part => `<div class="fermi-fact-item fermi-reveal-item">${part}</div>`)
    .join('');

  return title + facts;
}

function applyFermiRevealSequence(container) {
  if (!container) return;
  const items = container.querySelectorAll('.fermi-reveal-item');
  items.forEach((item, index) => {
    item.style.setProperty('--item-delay', `${(index * 0.074).toFixed(3)}s`);
  });
}

function renderFermiSection(section) {
  return (
    `<div class="fermi-summary-block">` +
    `<div class="fermi-summary-label fermi-reveal-item">${section.label}</div>` +
    `<div class="fermi-summary-copy">${buildFermiFactHtml(section.text)}</div>` +
    `</div>`
  );
}

function getInterpretationBasis(mode = fermiMode) {
  const requestedMode = mode === 'dt' ? 'dt' : 'mc';
  const hasDeterministic = Number.isFinite(deterministicPlanets);
  const resolvedMode = requestedMode === 'dt' && hasDeterministic ? 'dt' : 'mc';
  const count = resolvedMode === 'dt' ? deterministicPlanets : mcMedianQ50;

  return {
    mode: resolvedMode,
    count: Number.isFinite(count) ? Math.max(0, count) : 0,
    label: resolvedMode === 'dt' ? 'deterministic result' : 'Monte Carlo median (q50)'
  };
}

function getDetectionPanelBasis() {
  if (distanceCalculated && fermiContexts[fermiMode]) {
    const basis = getInterpretationBasis(fermiMode);
    return {
      ...basis,
      note:
        basis.mode === 'dt'
          ? 'same count basis as the current Fermi DT view'
          : 'same count basis as the current Fermi MC view'
    };
  }

  if (simulationCompleted && Number.isFinite(mcMedianQ50)) {
    return {
      mode: 'mc',
      count: Math.max(0, mcMedianQ50),
      label: 'Monte Carlo median (q50)',
      note: 'Monte Carlo basis; run the distance context to compare with DT/MC Fermi views'
    };
  }

  if (hasDeterministicCalculation && Number.isFinite(deterministicPlanets)) {
    return {
      mode: 'dt',
      count: Math.max(0, deterministicPlanets),
      label: 'deterministic result',
      note: 'deterministic basis'
    };
  }

  return {
    mode: 'none',
    count: 0,
    label: 'not calculated',
    note: 'not calculated'
  };
}

function getCurrentEffectiveModelStars() {
  if (ADV.enabled && ADV.modules.radialGHZ.enabled && typeof computeRadialGHZDetails === 'function') {
    const details = computeRadialGHZDetails();
    if (details && Number.isFinite(details.N_GHZ) && details.N_GHZ > 0) {
      return details.N_GHZ;
    }
  }

  return Math.max(1, rawNumber('N_GHZ', 1e10));
}

function getUniverseScaleBasis(mode = fermiMode) {
  const basis = getInterpretationBasis(mode);
  const scenario = getScenarioState();
  const boundsDescriptor = getMonteCarloBoundsDescriptor();

  if (
    basis.mode === 'mc' &&
    monteCarloYieldStats &&
    monteCarloYieldStats.basis === 'per-sample-yield' &&
    monteCarloYieldStats.n > 0
  ) {
    // Use the MEDIAN per-sample yield (q50), not the arithmetic mean. The
    // mean of yield samples is also right-skewed for multiplicative chains
    // and would systematically over-scale the Universe estimate. Median is
    // the methodologically defensible aggregator here.
    const yieldPoint = Number.isFinite(monteCarloYieldStats.median)
      ? monteCarloYieldStats.median
      : monteCarloYieldStats.mean;
    const scalePoint = Number.isFinite(monteCarloYieldStats.scaleMedian)
      ? monteCarloYieldStats.scaleMedian
      : monteCarloYieldStats.scaleMean;
    return {
      basis,
      perStarYield: yieldPoint,
      scale: scalePoint,
      yieldInterval: monteCarloYieldStats,
      label: `Monte Carlo per-sample yield scaling with ${boundsDescriptor.label}`,
      note:
        `Scenario state: ${scenario.label}. Universe-scale extrapolation uses the MEDIAN (q50) per-sample yield N_i / N_GHZ_i, which is the methodologically preferred point estimate for multiplicative chains; the arithmetic mean would drift above due to Jensen's inequality on the right-skewed sample distribution.`
    };
  }

  const currentModelStars = getCurrentEffectiveModelStars();
  const perStarYield = basis.count / currentModelStars;
  return {
    basis,
    perStarYield,
    scale: computeUniverseScaleFromYield(perStarYield),
    yieldInterval: null,
    label:
      basis.mode === 'dt'
        ? `Deterministic scenario per-star yield scaling for ${scenario.label}`
        : `Deterministic fallback per-star yield scaling for ${scenario.label}`,
    note:
      `This uses ${basis.label} divided by the effective N_GHZ used in the current model state.`
  };
}

function buildInterpretationHtml(mode = fermiMode) {
  if (!simulationCompleted || !distanceCalculated) return '';

  const basis = getInterpretationBasis(mode);
  const currentMode = basis.mode;
  const basisCount = basis.count;
  const basisLabel = basis.label;
  const itr = clamp(parseInt(byId('iterations').value || '2000', 10), 1000, 20000);
  const modalLabel =
    mostFrequent < 1 ? mostFrequent.toExponential(2) : Math.round(mostFrequent).toLocaleString();
  const simulationOptions = getSimulationOptions();
  const simulationSummary = describeSimulationOptions(simulationOptions);

  const bayesLabel =
    bayesianMode === 'post'
      ? '(updated Kepler/Gaia observational prior)'
      : '(conservative Kepler-era observational prior)';

  const pAtLeastOne = 1 - Math.exp(-Math.max(0, basisCount));
  const health = computeModelHealthSummary();
  const detection = computeDetectionFilter(basisCount);
  const geom = getGHZGeometryLy();
  const distanceScenario = buildDistanceScenario(
    basisCount,
    currentMode === 'mc' ? mcQ025 : null,
    currentMode === 'mc' ? mcQ975 : null
  );
  const distanceMetrics = distanceScenario.metrics;
  const referenceDistance = Number.isFinite(distanceScenario.fermiDistance)
    ? distanceScenario.fermiDistance
    : null;
  const requiredOneWayL = Number.isFinite(referenceDistance) ? referenceDistance : null;
  const requiredTwoWayL = Number.isFinite(referenceDistance) ? referenceDistance * 2 : null;
  const isExternalGalaxy = galaxyName !== 'Milky Way (MW)' && galaxyName !== 'Custom Galaxy X';
  const expectedWithinPills =
    isExternalGalaxy || distanceScenario.kind === 'external'
      ? null
      : buildExpectedWithinPills(basisCount, geom, distanceScenario.refModel);

  let keyTakeaway =
    `The current ${basisLabel} suggests <span class="bold-number">${fmtN(basisCount)}</span> modelled Earth-like candidates${lifeLabel()} in ${galaxyName}`;
  if (Number.isFinite(referenceDistance)) {
    keyTakeaway +=
      `, with a nearest GHZ-style reference distance of roughly <span class="bold-number">${fmtN(referenceDistance)}</span> light years`;
  }
  if (detection) {
    keyTakeaway +=
      `, yet the chance of at least one <strong>detectable transmitter</strong> being active within the current range right now is only <span class="bold-number">${fmtPct(detection.p_detect_pct)}</span>.`;
  } else {
    keyTakeaway += '.';
  }

  const sections = [];

  sections.push({
    label: 'Primary inference',
    text: keyTakeaway
  });

  sections.push({
    label: 'Model health',
    text:
      `<span class="fermi-health-badge ${health.level}">${health.label}</span>` +
      `${health.note}`
  });

  sections.push({
    label: 'Result summary',
    text:
      currentMode === 'dt'
        ? `The deterministic calculation using the current central parameter values yields <span class="bold-number">${fmtN(basisCount)}</span> modelled Earth-like candidates${lifeLabel()} in ${galaxyName}.<br><br>` +
          `For reference, the latest Monte Carlo run based on ${itr.toLocaleString()} ${simulationSummary.engineLabel} draws with ${simulationSummary.distributionLong}, ${simulationSummary.correlationLabel.toLowerCase()}, and ${simulationSummary.boundsLabel.toLowerCase()} ${bayesLabel} gives q50 median <span class="bold-number">${fmtN(mcMedianQ50)}</span> and arithmetic mean <span class="bold-number">${fmtN(mcArithmeticMean)}</span>, ` +
          `with a 95% sampled model interval of [<span class="bold-number">${fmtN(mcQ025)}</span>, <span class="bold-number">${fmtN(mcQ975)}</span>] (q2.5–q97.5; not an observational confidence interval). ` +
          `Mode estimate: ~<span class="bold-number">${modalLabel}</span>. Sample standard deviation: <span class="bold-number">${fmtN(stdDev)}</span>.`
        : `Based on ${itr.toLocaleString()} ${simulationSummary.engineLabel} draws with ${simulationSummary.distributionLong}, ${simulationSummary.correlationLabel.toLowerCase()}, and ${simulationSummary.boundsLabel.toLowerCase()} ${bayesLabel}, ` +
          `the model estimates <span class="bold-number">${fmtN(basisCount)}</span> modelled Earth-like candidates${lifeLabel()} in ${galaxyName}.<br><br>` +
          `MC arithmetic mean: <span class="bold-number">${fmtN(mcArithmeticMean)}</span>. ` +
          `95% sampled model interval: [<span class="bold-number">${fmtN(mcQ025)}</span>, ` +
          `<span class="bold-number">${fmtN(mcQ975)}</span>] (q2.5–q97.5; not an observational confidence interval). ` +
          `Mode estimate: ~<span class="bold-number">${modalLabel}</span>. ` +
          `Sample standard deviation: <span class="bold-number">${fmtN(stdDev)}</span>.`
  });

  if (simulationEnvelope) {
    sections.push({
      label: 'Bounds check',
      text:
        `Optional robust interval envelope: [<span class="bold-number">${fmtN(simulationEnvelope.low)}</span>, ` +
        `<span class="bold-number">${fmtN(simulationEnvelope.high)}</span>]. This is a direct parameterwise min/max bounds check, not the empirical Monte Carlo sampled model interval.`
    });
  }

  sections.push({
    label: 'Existence odds',
    text:
      `Poisson probability of at least one such planet in the modelled system under this ${currentMode === 'dt' ? 'deterministic central count' : 'Monte Carlo q50 median'}: ` +
      `<span class="bold-number">${fmtExistencePct(pAtLeastOne)}</span>.`
  });

  if (expectedWithinPills) {
    const showDiskNearestNote = expectedWithinPills.modelKind === '3d-disk';
    const r1ly = showDiskNearestNote && geom.volumeDisk > 0 && basisCount > 0
      ? Math.pow(3 * geom.volumeDisk / (4 * Math.PI * basisCount), 1 / 3)
      : null;
    const dNearestLy = r1ly ? gamma(1 + 1 / 3) * r1ly : null;

    const r1note = r1ly
      ? `<div class="fermi-subnote" style="margin-top:6px">
           <strong>Why is the nearest-planet distance (${fmtN(dNearestLy)} ly) smaller than the radius where E[N] = 1 (${fmtN(r1ly)} ly?</strong><br>
           These are two different statistics. <em>E[N] = 1</em> is the sphere radius at which you expect exactly one planet on average ~ here ~${fmtN(r1ly)} ly.
           The <em>mean nearest-neighbour distance</em> is the average distance to the single closest planet ~ here ~${fmtN(dNearestLy)} ly.
           In a 3D Poisson process these differ by a factor of Γ(⁴⁄₃) ≈ 0.893, because the nearest neighbour is
           statistically pulled slightly inward relative to the "expected count = 1" radius.
           At the nearest-neighbour distance the expected count is ≈ 0.71, not 1 ~ both values are internally consistent.
         </div>`
      : '';

    sections.push({
      label: 'Local neighbourhood',
      text:
        `Expected modelled Earth-like candidates inside local search radii using the active <strong>${expectedWithinPills.modelLabel}</strong> distance model:` +
        `<div class="fermi-pill-row">${expectedWithinPills.html}</div>` +
        `<div class="fermi-subnote"><strong>How to read this:</strong> the headline nearest-distance number is the mean nearest-neighbour distance <em>E[D]</em>. The pills below show <em>Lambda(r)</em>, the expected count inside radius <em>r</em>. <em>Lambda(E[D])</em> does not have to equal 1, so values like 0.67 at 300 ly can still be consistent with a nearest-distance expectation near 300 ly. In a Poisson model, the chance of at least one object inside radius <em>r</em> is <em>1 - e^-Lambda(r)</em>.</div>` +
        `<div class="fermi-subnote">${expectedWithinPills.modelNote}</div>` +
        r1note
    });
  }

  if (distanceScenario.kind === 'sparse') {
    sections.push({
      label: 'Distance frame',
      text:
        `The expected count is below one for the current ${basisLabel}. In this sparse regime, a nearest-neighbour distance is not a stable summary, so the script suppresses that estimate and instead reports the existence probability directly.`
    });
  } else if (distanceScenario.kind === 'external') {
    sections.push({
      label: 'Distance frame',
      text:
        Number.isFinite(referenceDistance)
          ? `Current galaxy selection uses an Earth-reference distance of <span class="bold-number">${fmtN(referenceDistance)}</span> light years rather than an internal GHZ nearest-neighbour model.`
          : `Current galaxy selection uses an external Earth-reference distance instead of an internal GHZ nearest-neighbour model.`
    });
  } else if (distanceScenario.kind === 'no-model') {
    sections.push({
      label: 'Distance frame',
      text:
        `No geometric distance model is currently active, so the calculator does not show the nearest-neighbour estimate even though the current ${basisLabel} is above one.`
    });
  } else {
    sections.push({
      label: 'Distance frame',
      text:
        `Default non-uniform baseline: radial GHZ density <span class="bold-number">${distanceMetrics && distanceMetrics.modelRadial && Number.isFinite(distanceMetrics.modelRadial.distance) ? Math.round(distanceMetrics.modelRadial.distance).toLocaleString() : '∞'}</span> ly. ` +
        `Uniform comparison baseline: 3D GHZ disk <span class="bold-number">${distanceMetrics && distanceMetrics.model3dDisk && Number.isFinite(distanceMetrics.model3dDisk.distance) ? Math.round(distanceMetrics.model3dDisk.distance).toLocaleString() : '∞'}</span> ly. ` +
        `Optimistic lower bound: 2D annulus <span class="bold-number">${distanceMetrics && distanceMetrics.model2d && Number.isFinite(distanceMetrics.model2d.distance) ? Math.round(distanceMetrics.model2d.distance).toLocaleString() : '∞'}</span> ly. ` +
        `Additional shell-style reference: 3D GHZ shell <span class="bold-number">${distanceMetrics && distanceMetrics.model3dSphere && Number.isFinite(distanceMetrics.model3dSphere.distance) ? Math.round(distanceMetrics.model3dSphere.distance).toLocaleString() : '∞'}</span> ly.<br><br>` +
        `The radial model uses an exponential-disk GHZ intensity and a non-homogeneous Poisson void-probability integral. The uniform 2D/3D models remain comparison geometries, not catalogue predictions.`
    });
  }

  sections.push({
    label: 'Host-star breakdown',
    text: buildHostBreakdownHtml()
  });

  sections.push({
    label: 'Top uncertainty drivers',
    text: buildTopDriversHtml()
  });

  const sectionGroupMap = {
    'Primary inference': 'core',
    'Model health': 'core',
    'Result summary': 'core',
    'Existence odds': 'core',
    'Bounds check': 'search',
    'Distance frame': 'spatial',
    'Local neighbourhood': 'spatial',
    'Host-star breakdown': 'spatial',
    'Top uncertainty drivers': 'search',
    'SETI silence update': 'search'
  };

  const grouped = { core: [], contact: [], spatial: [], search: [] };
  sections.forEach(section => {
    const key = sectionGroupMap[section.label] || 'search';
    grouped[key].push(section);
  });

  return ['core', 'contact', 'spatial', 'search']
    .map(key => {
      if (!grouped[key].length) return '';
      const html = grouped[key].map(renderFermiSection).join('');
      return buildFermiGroupHtml(html, key);
    })
    .join('');
}

function buildUniverseScaleHtml(mode = fermiMode) {
  if (!simulationCompleted || !distanceCalculated) return '';

  const universeBasis = getUniverseScaleBasis(mode);
  const basis = universeBasis.basis;
  const minUni = universeBasis.scale.min;
  const maxUni = universeBasis.scale.max;
  const fmtUniverseInteger = value =>
    value < 1 ? value.toExponential(2) : Math.round(value).toLocaleString();
  const intervalText =
    universeBasis.yieldInterval && universeBasis.yieldInterval.n
      ? ` The sampled per-star-yield interval would scale to roughly ` +
        `<span class="bold-number">${fmtUniverseInteger(universeBasis.yieldInterval.scaleP025.min)}</span> to ` +
        `<span class="bold-number">${fmtUniverseInteger(universeBasis.yieldInterval.scaleP975.max)}</span> ` +
        `modelled candidates across the same stellar-count range. `
      : '';
  const sourceLinks =
    `<div class="universe-source-row">` +
    `<span class="universe-source-label">Star-count basis:</span>` +
    `<a class="universe-source-link" href="https://www.esa.int/Science_Exploration/Space_Science/How_many_stars_are_there_in_the_Universe" rel="noopener noreferrer" target="_blank">ESA <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` +
    `<a class="universe-source-link" href="https://science.nasa.gov/universe/stars/" rel="noopener noreferrer" target="_blank">NASA <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` +
    `<a class="universe-source-link" href="https://doi.org/10.1046/j.1365-8711.2003.06826.x" rel="noopener noreferrer" target="_blank">Liske et al. 2003 / Driver IAU 2003 extrapolation <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` +
    `<a class="universe-source-link" href="https://arxiv.org/abs/1009.5992" rel="noopener noreferrer" target="_blank">van Dokkum & Conroy 2010 <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` +
    `<a class="universe-source-link" href="https://arxiv.org/abs/1607.03909" rel="noopener noreferrer" target="_blank">Conselice et al. 2016 <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` +
    `</div>`;

  return (
    `<div class="fermi-summary-block">` +
    `<div class="fermi-summary-label fermi-reveal-item">Universe scale</div>` +
    `<div class="fermi-summary-copy">` +
    buildFermiFactHtml(
      `Observable-universe star-count scaling from the current ${basis.label} uses an order-of-magnitude ` +
      `stellar-count range of 10<sup>22</sup>~10<sup>24</sup> stars and ${universeBasis.label}. ` +
      `${universeBasis.note} ` +
      `This gives roughly ` +
      `<span class="bold-number" style="color:var(--orange)">${fmtUniverseInteger(minUni)}</span> to ` +
      `<span class="bold-number" style="color:var(--orange)">${fmtUniverseInteger(maxUni)}</span> ` +
      `modelled Earth-like candidates in the observable universe, under the model's assumptions. ` +
      intervalText +
      `This is not a direct census; it does not model galaxy type, cosmic epoch, metallicity evolution, or low-mass-star uncertainties. ` +
      sourceLinks
    ) +
    `</div>` +
    `</div>`
  );
}

function refreshAdvancedInlineNotes() {
  const volNote = byId('adv-vol-note');
  if (volNote) {
    volNote.textContent = `Combined water term = ${(clamp01(pf('adv_f_vol_del')) * clamp01(pf('adv_f_wat_ret'))).toFixed(3)}`;
  }

  const longNote = byId('adv-long-note');
  if (longNote) {
    longNote.textContent = `Combined geodynamic term = ${(clamp01(pf('adv_f_tect')) * clamp01(pf('adv_f_radio')) * clamp01(pf('adv_f_clim'))).toFixed(4)}`;
  }

  const ghzNote = byId('adv-ghz-result');
  if (ghzNote) {
    const details = computeRadialGHZDetails();
    ghzNote.textContent =
      `Computed N_GHZ = ${details.N_GHZ.toLocaleString()} stars · GHZ = ${details.innerKpc.toFixed(1)}~${details.outerKpc.toFixed(1)} kpc`;
  }
}

function initAdvancedPanel() {
  captureAdvancedControlDefaults();
  const master = byId('adv-master-toggle');

  master.addEventListener('click', () => {
    ADV.enabled = !ADV.enabled;
    master.classList.toggle('enabled', ADV.enabled);
    byId('adv-options').style.display = ADV.enabled ? 'block' : 'none';
    invalidateResults();
    refreshAdvancedInlineNotes();
  });

  Object.keys(ADV.modules).forEach(key => {
    const toggle = byId('toggle-' + key);
    const body = byId('body-' + key);
    const header = toggle ? toggle.closest('.adv-module-header') : null;

    if (toggle && header) {
      header.addEventListener('click', () => {
        ADV.modules[key].enabled = !ADV.modules[key].enabled;
        toggle.classList.toggle('enabled', ADV.modules[key].enabled);
        body.style.display = ADV.modules[key].enabled ? 'block' : 'none';

        invalidateResults();
        refreshAdvancedInlineNotes();

        if (key === 'ard' && ADV.modules[key].enabled) computeARD();
        if (key === 'temporal' && ADV.modules[key].enabled) computeTemporal();
        if (key === 'sensitivity' && ADV.modules[key].enabled) {
          SENS.render('adv-tornado-container');
        }
      });
    }
  });

  [
    'adv_f_vol_del',
    'adv_f_wat_ret',
    'adv_f_tect',
    'adv_f_radio',
    'adv_f_clim',
    'adv_N_total_stars',
    'adv_scale_length',
    'adv_ghz_inner',
    'adv_ghz_outer',
    'adv_met_thresh',
    'adv_radial_bins'
  ].forEach(id => {
    const el = byId(id);
    if (el) {
      el.addEventListener('input', () => {
        refreshAdvancedInlineNotes();
        invalidateResults();
      });
    }
  });

  ['adv_ard_mass', 'adv_ard_age'].forEach(id => {
    const el = byId(id);
    if (el) {
      el.addEventListener('input', () => {
        if (ADV.modules.ard.enabled) computeARD();
        invalidateResults();
      });
    }
  });

  if (byId('adv_ard_atm')) {
    byId('adv_ard_atm').addEventListener('change', () => {
      if (ADV.modules.ard.enabled) computeARD();
      invalidateResults();
    });
  }

  if (byId('adv_temporal_R')) {
    byId('adv_temporal_R').addEventListener('input', () => {
      if (ADV.modules.temporal.enabled) computeTemporal();
      invalidateResults();
    });
  }

  refreshAdvancedInlineNotes();
}

function renderHistory() {
  const tbody = byId('history-body');
  if (!tbody) return;

  const hist = readHistoryStore().items;

  tbody.innerHTML = '';

  if (!hist.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.style.textAlign = 'center';
    cell.style.color = 'var(--text-dim)';
    cell.style.padding = '16px';
    cell.textContent = 'No saved simulations yet.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  hist
    .slice()
    .reverse()
    .forEach(e => {
      const r = document.createElement('tr');
      [
        e.date,
        e.scenario,
        e.galaxy,
        e.mcMedianQ50 ?? e.average,
        e.ciLow,
        e.ciHigh,
        e.displayedDistanceValue !== null && e.displayedDistanceValue !== undefined
          ? `${e.displayedDistanceValue} (${e.activeDistanceModel || e.displayedDistanceLabel || 'distance'})`
          : (e.activeDistanceBasis || e.distance2D || 'N/A')
      ].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        r.appendChild(cell);
      });
      tbody.appendChild(r);
    });
}

function initBaseEvents() {
  byId('H2O-toggle').addEventListener('click', () => {
    isH2OEnabled = !isH2OEnabled;
    byId('H2O-toggle').classList.toggle('enabled', isH2OEnabled);
    invalidateScenarioResults();
  });

  byId('CHNOPS-toggle').addEventListener('click', () => {
    isCHNOPSEnabled = !isCHNOPSEnabled;
    byId('CHNOPS-toggle').classList.toggle('enabled', isCHNOPSEnabled);
    invalidateScenarioResults();
  });

  byId('complex-life-toggle').addEventListener('click', () => {
    isComplexLifeEnabled = !isComplexLifeEnabled;
    byId('complex-life-toggle').classList.toggle('enabled', isComplexLifeEnabled);
    invalidateScenarioResults();
  });

  byId('x-toggle').addEventListener('click', () => {
    isXEnabled = !isXEnabled;
    byId('x-toggle').classList.toggle('enabled', isXEnabled);
    invalidateScenarioResults();
  });

  byId('enable-galaxy-settings').addEventListener('click', () => {
    if (!isGalaxySettingsEnabled) {
      galaxySettingsBaseline = captureGalaxySettingsBaseline();
    }

    isGalaxySettingsEnabled = !isGalaxySettingsEnabled;
    byId('enable-galaxy-settings').classList.toggle('enabled', isGalaxySettingsEnabled);
    byId('galaxy-options').style.display = isGalaxySettingsEnabled ? 'block' : 'none';

    if (!isGalaxySettingsEnabled) {
      restoreGalaxySettingsBaseline(galaxySettingsBaseline);
      galaxySettingsBaseline = null;
    }

    invalidateResultsOnly();
  });

  byId('galaxy-preset').addEventListener('change', function () {
    const v = applyGalaxyPresetSelection(this.value);
    if (!v) return;

    invalidateResultsOnly();
  });

  ['galaxy-diameter', 'galaxy-thickness', 'galaxy-earth-distance'].forEach(id => {
    byId(id).addEventListener('input', () => {
      byId('galaxy-preset').value = 'custom';
      galaxyName = 'Custom Galaxy X';
      invalidateResultsOnly();
    });
  });

  byId('calculateBtn').addEventListener('click', () => {
    calculateDeterministic();
  });

  byId('monteCarloBtn').addEventListener('click', () => {
    invalidateResults(false, false);
    monteCarloCalculate();
  });

  byId('whereAreTheyBtn').addEventListener('click', () => {
    calculateDistanceToNearestPlanet();
  });

  if (byId('fermi-mode-mc')) {
    byId('fermi-mode-mc').addEventListener('click', () => {
      setFermiMode('mc');
    });
  }

  if (byId('fermi-mode-dt')) {
    byId('fermi-mode-dt').addEventListener('click', () => {
      setFermiMode('dt');
    });
  }

  byId('showHistory').addEventListener('click', () => {
    const hDiv = byId('history');
    if (!hDiv.style.display || hDiv.style.display === 'none') {
      hDiv.style.display = 'block';
      renderHistory();
    } else {
      hDiv.style.display = 'none';
    }
  });

  
  if (byId('recomputeDetBtn')) {
    byId('recomputeDetBtn').addEventListener('click', event => {
      event.preventDefault();
      refreshDetectionControls();
    });
  }

  document.querySelectorAll('[data-detection-preset]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      setDetectionPreset(btn.dataset.detectionPreset);
    });
  });

  ['detection-L', 'detection-f_tx'].forEach(id => {
    const el = byId(id);
    if (!el) return;

    el.addEventListener('input', () => {
      syncDetectionPresetUi();
    });

    el.addEventListener('change', () => {
      refreshDetectionControls();
    });

    el.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        refreshDetectionControls();
      }
    });
  });

  byId('sampling_uncertainty').addEventListener('input', () => {
    clampSamplingUncertaintyInput();
    invalidateResults(false, false);
  });

  byId('sampling_uncertainty').addEventListener('change', () => {
    clampSamplingUncertaintyInput();
    invalidateResults(false, false);
  });

  byId('iterations').addEventListener('input', () => {
    clampIterationsInput();
    invalidateResults(false, false);
  });

  byId('iterations').addEventListener('change', () => {
    clampIterationsInput();
    invalidateResults(false, false);
  });

  const uncertaintyProfile = byId('uncertainty-profile');
  if (uncertaintyProfile) {
    uncertaintyProfile.addEventListener('change', () => {
      applyUncertaintyProfile(uncertaintyProfile.value);
    });
  }

  byId('clearHistory').addEventListener('click', () => {
    clearHistoryStore();
    renderHistory();
  });

  document.querySelectorAll('input, select').forEach(el => {
    if (el.id === 'detection-L' || el.id === 'detection-f_tx') return;

    if (
      el.id !== 'iterations' &&
      el.id !== 'sampling_uncertainty' &&
      el.id !== 'distribution' &&
      el.id !== 'uncertainty-profile' &&
      el.id !== 'simulation-engine' &&
      el.id !== 'mc-basis-mode' &&
      el.id !== 'correlation-model' &&
      el.id !== 'robust-bounds' &&
      el.id !== 'galaxy-preset' &&
      el.id !== 'model-radial' &&
      el.id !== 'model-2d' &&
      el.id !== 'model-3d-disk' &&
      el.id !== 'model-3d-sphere' &&
      el.id !== 'galaxy-diameter' &&
      el.id !== 'galaxy-thickness' &&
      el.id !== 'galaxy-earth-distance'
    ) {
      el.addEventListener('input', () => { applyProbabilityClamp(el.id); invalidateScenarioResults(); });
      el.addEventListener('change', () => { applyProbabilityClamp(el.id); invalidateScenarioResults(); });
    } else {
      el.addEventListener('input', () => invalidateDisplayOrDistanceOnly(false));
      el.addEventListener('change', () => invalidateDisplayOrDistanceOnly(false));
    }
  });

  syncDetectionPresetUi();
  window.addEventListener('load', updateShareButtons);
}

window.addEventListener('load', () => {
  if (sfCanvas && sfCtx) {
    resizeSF();
    initStars();
    requestAnimationFrame(drawStars);

    window.addEventListener('resize', () => {
      resizeSF();
      initStars();
    });
  }

  initCharts();
  initAdvancedPanel();
  initBaseEvents();
  if (typeof initAccessibilityHelpers === 'function') initAccessibilityHelpers();
  updateShareButtons();
  loadPreset('kepler');
});

function renderSobolPanel(result) {
  const panel = byId('sobol-panel');
  const barsEl = byId('sobol-bars');
  const noteEl = byId('sobol-note');
  const nLabel = byId('sobol-N-label');
  if (!panel || !barsEl) return;

  if (!result) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  if (nLabel) nLabel.textContent = result.N_samples + ' base samples · ' + result.activeIds.length + ' uncertain params';

  
  const sorted = result.activeIds.slice().sort(function(a, b){ return result.indices[b].T - result.indices[a].T; });
  const maxT = Math.max.apply(null, sorted.map(function(id){ return result.indices[id].T; }).concat([0.001]));

  let html = '';
  for (let i = 0; i < sorted.length; i++) {
    const id = sorted[i];
    const S = result.indices[id].S;
    const T = result.indices[id].T;
    const name = SENS_LABELS[id] || id;
    const sW = Math.min(100, (S / maxT) * 100).toFixed(1);
    const tW = Math.min(100, (T / maxT) * 100).toFixed(1);
    html += '<div class="sobol-bar-row">' +
      '<div class="sobol-bar-label">' + name + '</div>' +
      '<div class="sobol-bar-track">' +
        '<div class="sobol-bar-S" style="width:' + sW + '%;height:6px;"></div>' +
        '<div class="sobol-bar-T" style="width:' + tW + '%;height:6px;margin-top:0;"></div>' +
      '</div>' +
      '<div class="sobol-bar-meta">S₁ ' + S.toFixed(3) + '<br>T<sub>i</sub> ' + T.toFixed(3) + '</div>' +
    '</div>';
  }
  barsEl.innerHTML = html;

  if (noteEl) {
    const sumS = result.activeIds.reduce(function(acc, id){ return acc + result.indices[id].S; }, 0);
    const topId = sorted[0];
    const topName = SENS_LABELS[topId] || topId;
    const topT = result.indices[topId].T;
    const topS = result.indices[topId].S;

    
    let interp = '';
    if (topT > 0.5) {
      interp = '<strong style="color:var(--text-bright);">Key finding: "' + topName + '" dominates the result.</strong> ' +
        'Changing this one parameter moves the final number of planets more than all other parameters combined. ' +
        'This means the biggest scientific uncertainty in your model is not the astrophysics 〰 it is this single assumption. ';
      if (topT - topS > 0.1) {
        interp += 'It also interacts strongly with other parameters (green bar larger than blue), meaning its effect is amplified or suppressed depending on the values of other factors. ';
      }
    } else if (sorted.length >= 2) {
      const second = SENS_LABELS[sorted[1]] || sorted[1];
      interp = '<strong style="color:var(--text-bright);">The result is sensitive to multiple parameters.</strong> ' +
        '"' + topName + '" and "' + second + '" are the most influential. ' +
        'Improving the scientific estimates for these two would reduce the overall uncertainty most effectively. ';
    }

    if (sumS > 1.0) {
      interp += '<span style="color:var(--yellow);">Note: the sum of direct effects (' + sumS.toFixed(2) + ') exceeds 1.0 〰 a known artifact when one parameter is so dominant that the statistical estimator becomes noisy with finite samples. The ranking is still reliable; the absolute values are approximate.</span> ';
    } else if (sumS < 0.85) {
      interp += 'The sum of direct effects (' + sumS.toFixed(2) + ') is below 1 〰 this means a significant portion of the total variance comes from <em>interactions between parameters</em>, not from any single parameter acting alone. ';
    }

    interp += '<br><span style="font-size:9px;opacity:.7;">Technical: Saltelli 2010 estimator · ' + result.N_samples + ' base samples · ' + (result.N_samples * (2 + result.activeIds.length)) + ' total model evaluations · ' + result.activeIds.length + ' uncertain parameters included.</span>';
    noteEl.innerHTML = interp;
  }
}
window.renderSobolPanel = renderSobolPanel;

function renderTemporalNtPanel() {
  const panel = byId('temporal-nt-panel');
  const wrap = byId('nt-chart-svg-wrap');
  const meta = byId('nt-meta');
  if (!panel || !wrap) return;
  panel.style.display = 'block';

  const nt = computeTemporalNt();
  const pts = nt.pts;
  const T_gal = nt.T_gal;
  const T_min_met = nt.T_min_met;
  const T_complex = nt.T_complex;
  const T_sun = nt.T_sun;

  const W = 580, H = 100, padL = 34, padR = 10, padT = 10, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  function scX(t){ return padL + (t / T_gal) * innerW; }
  function scY(f){ return padT + (1 - f) * innerH; }

  
  function fracAt(tTarget) {
    return pts.reduce(function(best, p){ return Math.abs(p.t - tTarget) < Math.abs(best.t - tTarget) ? p : best; }, pts[0]).frac;
  }
  const fracAtSun = fracAt(T_sun);
  const fracAtComplex = fracAt(T_complex);

  
  let path = '';
  let area = 'M ' + scX(pts[0].t).toFixed(1) + ' ' + (padT + innerH).toFixed(1);
  for (let i = 0; i < pts.length; i++) {
    const x = scX(pts[i].t).toFixed(1);
    const y = scY(pts[i].frac).toFixed(1);
    if (i === 0) path = 'M ' + x + ' ' + y;
    else path += ' L ' + x + ' ' + y;
    area += ' L ' + x + ' ' + y;
  }
  area += ' L ' + scX(pts[pts.length-1].t).toFixed(1) + ' ' + (padT + innerH).toFixed(1) + ' Z';

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;font-family:Nunito,sans-serif;">';
  svg += '<defs><linearGradient id="nt-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5b9cf6" stop-opacity="0.28"/><stop offset="100%" stop-color="#5b9cf6" stop-opacity="0.03"/></linearGradient></defs>';

  
  svg += '<rect x="' + padL + '" y="' + padT + '" width="' + (scX(T_min_met) - padL).toFixed(1) + '" height="' + innerH + '" fill="rgba(224,92,92,0.07)"/>';
  svg += '<rect x="' + scX(T_complex).toFixed(1) + '" y="' + padT + '" width="' + (scX(T_gal) - scX(T_complex)).toFixed(1) + '" height="' + innerH + '" fill="rgba(78,204,163,0.07)"/>';

  
  [0, 0.25, 0.5, 0.75, 1.0].forEach(function(fy){
    const y = scY(fy).toFixed(1);
    svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>';
    svg += '<text x="' + (padL - 3) + '" y="' + (parseFloat(y) + 3).toFixed(1) + '" text-anchor="end" fill="#6b7280" font-size="6.5">' + (fy * 100).toFixed(0) + '%</text>';
  });

  
  [0, 2, 4, 6, 8, 10, 12, 13.5].forEach(function(gt){
    const x = scX(gt).toFixed(1);
    svg += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>';
    svg += '<text x="' + x + '" y="' + (padT + innerH + 9).toFixed(1) + '" text-anchor="middle" fill="#6b7280" font-size="6">' + gt + '</text>';
  });

  
  svg += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>';
  svg += '<line x1="' + padL + '" y1="' + (padT + innerH).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>';

  
  svg += '<path d="' + area + '" fill="url(#nt-grad)"/>';
  svg += '<path d="' + path + '" fill="none" stroke="#5b9cf6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

  
  const sunX = scX(T_sun).toFixed(1);
  const sunY = scY(fracAtSun).toFixed(1);
  svg += '<line x1="' + sunX + '" y1="' + padT + '" x2="' + sunX + '" y2="' + (padT + innerH).toFixed(1) + '" stroke="#d4a843" stroke-width="1.2" stroke-dasharray="3 2"/>';
  svg += '<circle cx="' + sunX + '" cy="' + sunY + '" r="2.4" fill="#d4a843"/>';
  svg += '<text x="' + sunX + '" y="' + (padT - 2).toFixed(1) + '" text-anchor="middle" fill="#d4a843" font-size="5.5" font-weight="700">Sun</text>';

  
  svg += '<text x="' + scX(T_min_met / 2).toFixed(1) + '" y="' + (padT + innerH + 18).toFixed(1) + '" text-anchor="middle" fill="rgba(224,92,92,0.65)" font-size="5.5">pre-met.</text>';
  svg += '<text x="' + scX((T_complex + T_gal) / 2).toFixed(1) + '" y="' + (padT + innerH + 18).toFixed(1) + '" text-anchor="middle" fill="rgba(78,204,163,0.65)" font-size="5.5">bio. window</text>';

  
  svg += '<text x="' + (padL + innerW / 2).toFixed(1) + '" y="' + H + '" text-anchor="middle" fill="#6b7280" font-size="6">Time since galaxy formation (Gyr)</text>';
  svg += '<text x="8" y="' + (padT + innerH / 2).toFixed(1) + '" text-anchor="middle" fill="#6b7280" font-size="6" transform="rotate(-90 8 ' + (padT + innerH / 2).toFixed(1) + ')">Cum. N fraction</text>';
  svg += '</svg>';

  wrap.innerHTML = svg;

  if (meta) {
    const headStart = Math.max(0, T_gal - 4.6 - T_complex).toFixed(1);
    meta.innerHTML =
      '<span class="nt-pill">N fraction at Sun\'s birth: ' + (fracAtSun * 100).toFixed(0) + '%</span>' +
      '<span class="nt-pill">Fraction before bio. window: ' + (fracAtComplex * 100).toFixed(0) + '%</span>' +
      '<span class="nt-pill">Potential head start: ~' + headStart + ' Gyr</span>' +
      '<span class="nt-pill" style="color:var(--text-dim);">Sources: Lineweaver 2004 · Madau &amp; Dickinson 2014</span>';
  }
}

function renderDetectionPanel() {
  const panel = byId('detection-panel');
  const resultsEl = byId('detection-results');
  if (!panel || !resultsEl) return;

  if (!simulationCompleted) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const basis = getDetectionPanelBasis();
  const r = computeDetectionFilter(basis.count);
  if (!r) {
    resultsEl.innerHTML = '<div style="font-size:11px;color:var(--text-dim);">Run Monte Carlo first to enable detection estimates.</div>';
    return;
  }

  const gaugePct = Math.min(100, r.p_detect_pct).toFixed(2);
  const gaugeColor = r.p_detect_pct > 50 ? 'var(--green)' : r.p_detect_pct > 2 ? 'var(--yellow)' : 'var(--red)';
  const pDetStr = fmtPct(r.p_detect_pct);

  
  var verdictText = '';
  var verdictColor = gaugeColor;
  if (r.p_detect_pct >= 50) {
    verdictText = 'Under these assumptions, at least one active detectable transmitter is more likely than not within the current detection range right now.';
  } else if (r.p_detect_pct >= 5) {
    verdictText = 'There is a meaningful but not dominant model probability for at least one active detectable transmitter within range today. Increasing L (civilisation longevity) would raise this significantly.';
  } else if (r.p_detect_pct >= 0.1) {
    verdictText = 'The probability is low. Even if many modelled Earth-like candidates exist, the timing and distance constraints make an overlapping active detectable transmitter rare under these settings.';
  } else {
    verdictText = 'The probability is extremely low 〰 consistent with the silence we observe. Most potentially inhabited planets are either too far away, or their transmission window does not overlap with ours.';
  }

  const distanceBarrierValue = r.is_external_reference && Number.isFinite(r.earth_distance)
    ? (r.earth_distance < 1e6
        ? Math.round(r.earth_distance).toLocaleString() + ' light-years'
        : (r.earth_distance / 1e6).toFixed(2) + ' million light-years')
    : r.d_horizon.toLocaleString() + ' light-years';
  const distanceBarrierCopy = r.is_external_reference && Number.isFinite(r.earth_distance)
    ? 'The target galaxy is about <strong>' + (r.earth_distance < 1e6 ? Math.round(r.earth_distance).toLocaleString() : (r.earth_distance / 1e6).toFixed(2) + ' million') + ' light-years</strong> away. Unless <strong>L</strong> exceeds that Earth-reference distance, no signal from it can reach us yet.'
    : 'Maximum range from which a signal sent <strong>' + r.L.toLocaleString() + ' years ago</strong> could reach us today.';
  const withinRangeCopy = r.is_external_reference
    ? fmtHuman(r.N_within) + ' transmitter-bearing worlds in this target galaxy currently inside the Earth-reach window'
    : fmtHuman(r.N_within) + ' transmitter-bearing worlds within this range';
  const combinedResultCopy = r.is_external_reference
    ? '= (' + fmtHuman(r.N_planets) + ' modelled Earth-like candidates × f_tx ' + r.f_tx.toFixed(4).replace(/\.?0+$/, '') + ') × range gate × ' + fmtPct(r.p_temporal_pct)
    : '= (' + fmtHuman(r.N_planets) + ' modelled Earth-like candidates × f_tx ' + r.f_tx.toFixed(4).replace(/\.?0+$/, '') + ') × area fraction × ' + fmtPct(r.p_temporal_pct);
  const formulaCopy = r.is_external_reference
    ? 'Formula: N̂ = (N<sub>Earth-like</sub> × f<sub>tx</sub> × range-gate) × (L / T<sub>galaxy</sub>) · P(≥1) = 1 − e<sup>−N̂</sup><br>'
    : 'Formula: N̂ = (N<sub>Earth-like</sub> × f<sub>tx</sub> × A<sub>horizon</sub> / A<sub>GHZ</sub>) × (L / T<sub>galaxy</sub>) · P(≥1) = 1 − e<sup>−N̂</sup><br>';
  const geometryFactor = r.is_external_reference
    ? (r.N_within > 0 ? 1 : 0)
    : (r.N_tx_total > 0 ? Math.max(0, Math.min(1, r.N_within / r.N_tx_total)) : 0);
  const geometryFactorLabel = r.is_external_reference ? 'range gate' : 'area fraction';
  const geometryFactorText = r.is_external_reference
    ? (geometryFactor > 0 ? '1 · within light-travel reach' : '0 · outside light-travel reach')
    : (geometryFactor > 0 ? fmtPct(geometryFactor * 100) : '0%');
  const rawExpectedText = fmtN(r.N_det);
  const basisCopy =
    '<div style="font-size:9.5px;color:var(--text-dim);margin-bottom:8px;line-height:1.45;">' +
      'Count basis: <strong style="color:var(--text-bright);">' + basis.label + '</strong> ' +
      '<span style="opacity:.78;">(' + basis.note + ')</span> · ' +
      '<span class="bold-number">' + fmtHuman(basis.count) + '</span> modelled Earth-like candidates.' +
    '</div>';

  resultsEl.innerHTML =
    basisCopy +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:12px;">' +
      '<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;">' +
        '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:4px;">Step 0 · Civilisation prior</div>' +
        '<div style="font-size:11px;font-weight:700;color:var(--text-bright);">f_tx = ' + r.f_tx.toFixed(4).replace(/\.?0+$/, '') + '</div>' +
        '<div style="font-size:9.5px;color:var(--text-dim);margin-top:3px;">Only this share of modelled Earth-like candidates is assumed to ever produce a detectable transmitter.</div>' +
        '<div style="font-size:10px;color:var(--accent);font-weight:700;margin-top:5px;">' + fmtHuman(r.N_tx_total) + ' transmitter-bearing worlds in the modelled system</div>' +
      '</div>' +
      '<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;">' +
        '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:4px;">Step 1 · Distance barrier</div>' +
        '<div style="font-size:11px;font-weight:700;color:var(--text-bright);">' + distanceBarrierValue + '</div>' +
        '<div style="font-size:9.5px;color:var(--text-dim);margin-top:3px;">' + distanceBarrierCopy + '</div>' +
        '<div style="font-size:10px;color:var(--accent);font-weight:700;margin-top:5px;">' + withinRangeCopy + '</div>' +
      '</div>' +
      '<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;">' +
        '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:4px;">Step 2 · Timing barrier</div>' +
        '<div style="font-size:11px;font-weight:700;color:var(--text-bright);">' + fmtPct(r.p_temporal_pct) + '</div>' +
        '<div style="font-size:9.5px;color:var(--text-dim);margin-top:3px;">Temporal-overlap probability for a transmitter-bearing world <strong>right now</strong> 〰 L ÷ galaxy age. This model-derived timing factor does not include f_tx, which separately represents whether a planet ever produces a detectable transmitter.</div>' +
        '<div style="font-size:10px;color:var(--accent3);font-weight:700;margin-top:5px;">Both barriers multiply together →</div>' +
      '</div>' +
    '</div>' +
    (function(){
      var distLabel, distSub;
      var distTitle = 'Nearest-detectable distance scale';
      var formatLy = function(value) {
        if (!Number.isFinite(value)) return '∞ light-years';
        if (value < 100) return value.toFixed(1) + ' light-years';
        if (value < 1e6) return Math.round(value).toLocaleString() + ' light-years';
        return (value / 1e6).toFixed(2) + ' million light-years';
      };
      var subPoissonWarning = r.N_det < 1
        ? '<div style="font-size:9.2px;color:var(--text-dim);margin-top:5px;line-height:1.35;"><strong>Sub-Poisson regime:</strong> fewer than one active detectable transmitter is expected on average inside the current detection horizon. Non-detection is therefore the statistically dominant outcome, although the Poisson probability is not zero.</div>'
        : '';
      if (r.is_external_reference && Number.isFinite(r.earth_distance)) {
        if (r.nearest_beyond_horizon) {
          distLabel = '〰';
          distSub = 'The target galaxy sits about ' + (r.earth_distance < 1e6 ? Math.round(r.earth_distance).toLocaleString() + ' light-years' : (r.earth_distance / 1e6).toFixed(2) + ' million light-years') + ' away, which is beyond the current detection horizon set by L. No signal from it can have reached us yet.';
        } else {
          distLabel = r.earth_distance < 1e6 ? Math.round(r.earth_distance).toLocaleString() + ' light-years' : (r.earth_distance / 1e6).toFixed(2) + ' million light-years';
          distSub = r.N_det >= 1
            ? 'Once the Earth-distance barrier is crossed, any active detectable transmitter in this target galaxy would still be seen from roughly this intergalactic distance.'
            : 'The target galaxy is finally within light-travel range, but the overlap probability is still low because the temporal window remains restrictive.';
        }
      } else if (!Number.isFinite(r.d_nearest_det) || r.N_det < 1e-9) {
        distLabel = '〰';
        distSub = 'Too few expected active detectable transmitters to estimate a nearest-detectable distance scale. Try increasing L or the number of planets.';
      } else {
        var d = r.d_nearest_det;
        distLabel = formatLy(d);
        if (r.nearest_beyond_horizon) {
          distTitle = 'Equivalent Poisson scale beyond horizon';
          distLabel = formatLy(d) + ' <span style="font-size:10px;font-weight:400;color:var(--red);">(horizon: ' + formatLy(r.d_horizon) + ')</span>';
          distSub = 'This is the equivalent Poisson nearest-detectable distance scale, not a literal source. Because it exceeds the current detection horizon, fewer than one active detectable transmitter is expected on average inside the current horizon. It is also not the light-travel time used by the waiting-time estimate.';
        } else {
          distSub = 'The nearest-detectable transmitter distance scale is about ' + formatLy(d) + ' within the current detection horizon of ' + formatLy(r.d_horizon) + '.';
        }
      }
      return '<div style="background:var(--bg);border:1px solid var(--border);border-left:3px solid var(--accent3);border-radius:6px;padding:10px 12px;margin-bottom:8px;">' +
        '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:4px;">' + distTitle + '</div>' +
        '<div style="font-size:15px;font-weight:800;color:' + (r.nearest_beyond_horizon ? 'var(--red)' : 'var(--accent3)') + ';">' + distLabel + '</div>' +
        '<div style="font-size:9.5px;color:var(--text-dim);margin-top:3px;">' + distSub + '</div>' +
        subPoissonWarning +
        '<div style="font-size:8.5px;color:var(--text-dim);margin-top:4px;opacity:.7;">' + (r.is_external_reference
          ? 'For external galaxies this is treated as an Earth-reference distance gate, not an internal GHZ nearest-neighbour gap.'
          : 'd̄ = Γ(3/2) / (ρ<sub>det</sub>·π)<sup>½</sup>, ρ<sub>det</sub> = N̂<sub>det</sub> / A<sub>horizon</sub> (spatial density within the observer-centred detection area)') + '</div>' +
      '</div>';
    })() +
    '<div style="background:var(--bg);border:1px solid var(--border);border-left:3px solid ' + gaugeColor + ';border-radius:6px;padding:10px 12px;margin-bottom:10px;">' +
      '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim);margin-bottom:4px;">Combined result · Poisson mean of detectable transmitters now</div>' +
      '<div style="font-size:16px;font-weight:800;color:' + gaugeColor + ';">' + fmtHuman(r.N_det) + '</div>' +
      '<div style="font-size:9.5px;color:var(--text-dim);margin-top:2px;">' + combinedResultCopy + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:5px;margin-top:7px;font-size:9.2px;color:var(--text-dim);">' +
        '<span><strong style="color:var(--text-bright);">N<sub>Earth-like</sub></strong> = ' + fmtHuman(r.N_planets) + '</span>' +
        '<span><strong style="color:var(--text-bright);">f<sub>tx</sub></strong> = ' + r.f_tx.toFixed(4).replace(/\.?0+$/, '') + '</span>' +
        '<span><strong style="color:var(--text-bright);">' + geometryFactorLabel + '</strong> = ' + geometryFactorText + '</span>' +
        '<span><strong style="color:var(--text-bright);">L / T<sub>galaxy</sub></strong> = ' + fmtPct(r.p_temporal_pct) + '</span>' +
        '<span><strong style="color:var(--text-bright);">N̂</strong> = ' + rawExpectedText + '</span>' +
      '</div>' +
      '<div style="font-size:9px;color:var(--text-dim);margin-top:6px;line-height:1.45;">N̂ is an expected value, not a counted object. If N̂ is far below 1, the calculator displays the inverse form "1 in X" to make the small Poisson mean readable.</div>' +
    '</div>' +
    '<div style="margin-bottom:6px;font-size:10px;font-weight:700;color:var(--text-dim);">Probability of at least one active transmitter existing within detection range right now:</div>' +
    '<div class="det-gauge">' +
      '<div class="det-gauge-track"><div class="det-gauge-fill" style="width:' + gaugePct + '%;background:' + gaugeColor + ';"></div></div>' +
      '<div class="det-gauge-label" style="color:' + gaugeColor + ';">' + pDetStr + '</div>' +
    '</div>' +
    '<div style="font-size:10.5px;color:var(--text-dim);margin-top:10px;line-height:1.65;border-top:1px solid var(--border);padding-top:8px;">' +
      verdictText +
      ' <span style="opacity:.7;">Try changing <strong>L</strong> above 〰 even a tenfold increase can shift the result by orders of magnitude.</span>' +
    '</div>' +
    '<div style="font-size:8.5px;color:var(--text-dim);margin-top:6px;opacity:.65;line-height:1.6;">' +
      formulaCopy +
      '<span style="color:var(--yellow);opacity:.9;">⚠ f<sub>tx</sub> is user-supplied. This panel is now explicit about the civilisation prior instead of silently assuming that every Earth-like planet eventually transmits.</span>' +
    '</div>';
}
