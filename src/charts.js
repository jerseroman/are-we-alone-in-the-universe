let monteCarloChart = null;

// Second chart renders the empirical exceedance-probability curve P(N >= threshold)
// from the same Monte Carlo candidate-count samples (formerly a redundant KDE/Gaussian
// relative-density view). The DOM container id is exceedanceChart.
let exceedanceChart = null;

// Closure state for the exceedance chart's custom tooltip: numeric thresholds,
// exceedance percentages, and the resolved runtime sampling-engine label.
let exceedanceState = { thresholds: [], exceedance: [], labels: [], refFlags: [], points: [], refMarkers: [], engineLabel: '' };

const EXCEEDANCE_REFERENCE_THRESHOLDS = [10, 100, 1000, 10000, 100000, 1000000, 10000000];
const EXCEEDANCE_EMPTY_MESSAGE = 'Run Monte Carlo to generate exceedance probabilities.';
const EXCEEDANCE_INVALID_MESSAGE = 'Exceedance chart unavailable: too few finite candidate-count samples.';

// Count of samples (sorted ascending) with value >= x, via binary search.
function countSamplesAtLeast(sortedAsc, x) {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return sortedAsc.length - lo;
}

// Quantile of a sorted-ascending array (nearest-rank, p in [0,1]).
function exceedanceQuantile(sortedAsc, p) {
  if (!sortedAsc.length) return NaN;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(p * (sortedAsc.length - 1))));
  return sortedAsc[idx];
}

// Format a real candidate-count threshold for axis labels and tooltips. The numeric
// x-axis stores log10(threshold); this converts a real value back to display units.
function formatExceedanceThreshold(v) {
  if (!Number.isFinite(v)) return '';
  if (v >= 1) return Math.round(v).toLocaleString();
  return v.toExponential(1);
}

// Build the exceedance series from raw Monte Carlo candidate-count samples.
// Independent of the chart so it can be unit-tested. Returns { ok, reason, ... }.
function buildExceedanceSeries(rawResults) {
  const samples = (Array.isArray(rawResults) ? rawResults : [])
    .filter(v => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
  const n = samples.length;

  if (n < 20) {
    // Distinguish "no/too-few finite samples at all" from a populated-but-degenerate run.
    const reason = n === 0 ? 'invalid' : 'few';
    return { ok: false, reason, samples, thresholds: [], exceedance: [], labels: [], refFlags: [], points: [], refMarkers: [] };
  }

  const maxSample = samples[n - 1];
  const minPositive = samples.find(v => v > 0);
  if (!(maxSample > 0) || minPositive === undefined) {
    return { ok: false, reason: 'invalid', samples, thresholds: [], exceedance: [], labels: [], refFlags: [], points: [], refMarkers: [] };
  }

  // Log-spaced thresholds across the useful range: max(1, q0.5%) .. q99.5% (falling
  // back to the positive min / finite max), trimming extreme tails.
  const qLow = exceedanceQuantile(samples, 0.005);
  const qHigh = exceedanceQuantile(samples, 0.995);
  let lo = Math.max(1, qLow > 0 ? qLow : minPositive);
  let hi = qHigh > lo ? qHigh : maxSample;
  if (!(hi > lo)) hi = Math.max(lo * 10, maxSample, lo + 1);

  const numPts = 60;
  const logLo = Math.log10(lo);
  const logHi = Math.log10(hi);
  const step = (logHi - logLo) / (numPts - 1) || 1;

  const thresholdSet = new Map(); // key -> numeric threshold (dedupe)
  for (let i = 0; i < numPts; i++) {
    const x = Math.pow(10, logLo + i * step);
    thresholdSet.set(x.toFixed(6), x);
  }
  // Merge in reference markers that fall inside the plotted range.
  const refsInRange = EXCEEDANCE_REFERENCE_THRESHOLDS.filter(x => x >= lo && x <= hi);
  const refKeys = new Set(refsInRange.map(x => Number(x).toFixed(6)));
  refsInRange.forEach(x => thresholdSet.set(Number(x).toFixed(6), x));

  const thresholds = Array.from(thresholdSet.values()).sort((a, b) => a - b);
  const exceedance = thresholds.map(x =>
    parseFloat(((100 * countSamplesAtLeast(samples, x)) / n).toFixed(2))
  );
  const labels = thresholds.map(x => formatExceedanceThreshold(x));
  const refFlags = thresholds.map(x => refKeys.has(x.toFixed(6)));

  // Numeric log10 x-axis points: x = log10(threshold) for true log spacing,
  // while threshold/exceedancePercent are kept in real candidate-count units for
  // labels, tooltips and export.
  const points = thresholds.map((t, i) => ({
    x: Math.log10(t),
    y: exceedance[i],
    threshold: t,
    logThreshold: Math.log10(t),
    exceedancePercent: exceedance[i]
  }));

  // Reference markers positioned by log10(threshold), displaying the real threshold.
  const refMarkers = refsInRange
    .slice()
    .sort((a, b) => a - b)
    .map(r => ({
      x: Math.log10(r),
      threshold: r,
      label: '≥' + formatExceedanceThreshold(r)
    }));

  return { ok: true, reason: 'ok', samples, thresholds, exceedance, labels, refFlags, points, refMarkers };
}
window.buildExceedanceSeries = buildExceedanceSeries;

// Custom ApexCharts tooltip for the exceedance chart. Shows the REAL candidate-count
// threshold (never log10), derived from the stored point objects.
function exceedanceTooltip(ctx) {
  const i = ctx && ctx.dataPointIndex;
  const st = exceedanceState || {};
  if (i == null || i < 0 || !st.points || i >= st.points.length) return '';
  const pt = st.points[i];
  const tLabel = formatExceedanceThreshold(pt.threshold);
  let html = '<div style="padding:6px 9px;font-family:Nunito,sans-serif;font-size:10px;line-height:1.5;">';
  html += `<div><strong>Threshold:</strong> &ge;${tLabel} candidates</div>`;
  html += `<div><strong>Exceedance:</strong> ${pt.exceedancePercent}%</div>`;
  if (st.engineLabel) html += `<div><strong>Sampling:</strong> ${st.engineLabel}</div>`;
  html += '</div>';
  return html;
}

// Refresh the static caption under the charts with the dynamic sampling-engine label.
function updateExceedanceCaption(cfg) {
  const el = byId('exceedance-caption');
  if (!el) return;
  const engineLabel = (cfg && cfg.samplingEngineLabel) || '';
  const base = 'This curve shows the share of Monte Carlo samples whose modelled candidate count equals or '
    + 'exceeds each threshold. It is derived from the current sampled model output and does not represent '
    + 'observational confidence or detected planets.';
  el.innerHTML = base + (engineLabel ? ` <span class="exceedance-engine">Sampling: ${engineLabel}.</span>` : '');
  el.style.display = 'block';
}

// Render/update the exceedance chart from raw MC samples. Uses the stored runtime
// MC display config (never live DOM controls) for the engine label.
function updateExceedanceChart(rawResults) {
  if (!exceedanceChart) return;
  const cfg = (typeof lastMonteCarloDisplayConfig !== 'undefined') ? lastMonteCarloDisplayConfig : null;
  const engineLabel = (cfg && cfg.samplingEngineLabel) || '';
  const series = buildExceedanceSeries(rawResults);

  if (!series.ok) {
    exceedanceState = { thresholds: [], exceedance: [], labels: [], refFlags: [], points: [], refMarkers: [], engineLabel };
    const msg = series.reason === 'invalid' ? EXCEEDANCE_INVALID_MESSAGE : EXCEEDANCE_EMPTY_MESSAGE;
    exceedanceChart.updateOptions(
      { noData: { text: msg }, markers: { size: 0, discrete: [] } },
      false,
      false
    );
    exceedanceChart.updateSeries([{ name: 'P(N ≥ threshold)', data: [] }], true);
    updateExceedanceCaption(cfg);
    return;
  }

  exceedanceState = {
    thresholds: series.thresholds,
    exceedance: series.exceedance,
    labels: series.labels,
    refFlags: series.refFlags,
    points: series.points,
    refMarkers: series.refMarkers,
    engineLabel
  };

  // Highlight reference-threshold points with discrete markers (positioned by their
  // log10 x because they are merged into the plotted point set).
  const discrete = [];
  series.refFlags.forEach((isRef, i) => {
    if (isRef) discrete.push({ seriesIndex: 0, dataPointIndex: i, fillColor: '#5b9cf6', strokeColor: '#fff', size: 4 });
  });

  // Series data are {x: log10(threshold), y: exceedance%} for a true numeric log axis.
  const seriesData = series.points.map(p => ({ x: p.x, y: p.y }));
  exceedanceChart.updateSeries([{ name: 'P(N ≥ threshold)', data: seriesData }], false);
  exceedanceChart.updateOptions(
    { markers: { size: 0, discrete } },
    false,
    true
  );
  updateExceedanceCaption(cfg);
}
window.updateExceedanceChart = updateExceedanceChart;

function markChartStale(stale) {
  ['monteCarloChart', 'exceedanceChart'].forEach(id => {
    const el = byId(id);
    if (!el) return;
    if (!el.dataset) el.dataset = {};
    el.dataset.stale = stale ? 'true' : 'false';
  });
}

const SENS = {
  storage: {},
  init(names) {
    this.storage = {};
    names.forEach(n => (this.storage[n] = []));
    this.storage.N = [];
  },
  record(vals, N) {
    for (const [k, v] of Object.entries(vals)) {
      if (this.storage[k]) this.storage[k].push(v);
    }
    this.storage.N.push(N);
  },
  pearson(x, y) {
    const n = x.length;
    if (n < 3) return 0;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;

    for (let i = 0; i < n; i++) {
      sx += x[i];
      sy += y[i];
      sxy += x[i] * y[i];
      sx2 += x[i] * x[i];
      sy2 += y[i] * y[i];
    }

    const d = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
    if (d === 0) return 0;
    return (n * sxy - sx * sy) / d;
  },
  compute() {
    if (!this.storage.N || !this.storage.N.length) return [];
    const logN = this.storage.N.map(v => Math.log10(Math.max(1e-20, v)));
    const out = [];

    for (const [param, vals] of Object.entries(this.storage)) {
      if (param === 'N') continue;
      if (vals.length !== logN.length) continue;
      if (new Set(vals.map(v => Number(v).toFixed(12))).size < 3) continue;

      const logV = vals.map(v => Math.log10(Math.max(1e-20, v)));
      const r = this.pearson(logV, logN);
      out.push({
        param,
        label: SENS_LABELS[param] || param,
        r,
        abs: Math.abs(r),
        score: Math.abs(r) * 100,
        direction: r >= 0 ? 'positive' : 'negative'
      });
    }

    out.sort((a, b) => b.abs - a.abs);
    return out;
  },
  render(id) {
    const data = this.compute().slice(0, 14);
    const el = byId(id);
    if (!el) return;

    if (!data.length) {
      el.innerHTML =
        '<div style="font-size:10px;color:var(--text-dim);margin-top:6px;">Run Monte Carlo with this module enabled to populate sensitivity output.</div>';
      return;
    }

    const topDrivers = data.slice(0, 5);
    const maxAbs = data[0].abs || 1;
    let html = '<div class="sens-summary-title">Top 5 dominant drivers</div>';
    html += '<div class="sens-driver-grid">';

    topDrivers.forEach((d, idx) => {
      html += `
        <div class="sens-driver ${d.direction}">
          <div class="sens-rank">Rank #${idx + 1}</div>
          <div class="sens-name">${d.label}</div>
          <div class="sens-impact">${d.direction === 'positive' ? 'Positive impact on log₁₀(N)' : 'Negative impact on log₁₀(N)'}</div>
          <div class="sens-score">Log-sensitivity score: ${d.score.toFixed(0)} / signed correlation ${d.r >= 0 ? '+' : ''}${(d.r * 100).toFixed(0)}%</div>
        </div>
      `;
    });

    html += '</div>';
    html += '<div class="sens-bars-title">Log-space tornado ranking</div>';
    html += '<div class="sens-bars-wrap">';

    data.forEach(d => {
      const pct = (d.abs / maxAbs * 100).toFixed(0);
      const color = d.r >= 0 ? 'var(--accent)' : 'var(--red)';
      html += `
        <div class="sens-bar-row">
          <span class="sens-bar-label">
            ${d.label}
          </span>
          <div class="sens-bar-track">
            <div class="sens-bar-fill" style="width:${pct}%;background:${color};"></div>
          </div>
          <span class="sens-bar-meta">
            ${d.r >= 0 ? '+' : ''}${(d.r * 100).toFixed(0)}% / score ${d.score.toFixed(0)}
          </span>
        </div>
      `;
    });

    html += '</div>';
    el.innerHTML = html;
  }
};

function getModeEstimate(results, useLogScale) {
  const n = results.length;
  const numBins = Math.max(20, Math.ceil(1 + Math.log2(n)) * 3);

  if (useLogScale) {
    const logVals = results.map(r => Math.log10(Math.max(1e-12, r)));
    const lMin = logVals[0];
    const lMax = logVals[logVals.length - 1];
    const binSz = (lMax - lMin) / numBins || 1;
    const bins = Array(numBins).fill(0);

    logVals.forEach(v => {
      const bi = Math.max(0, Math.min(numBins - 1, Math.floor((v - lMin) / binSz)));
      bins[bi]++;
    });

    let maxCount = 0;
    let maxIdx = 0;
    bins.forEach((count, i) => {
      if (count > maxCount) {
        maxCount = count;
        maxIdx = i;
      }
    });

    const center = lMin + (maxIdx + 0.5) * binSz;
    return Math.pow(10, center);
  }

  const histMin = results[0];
  const histMax = results[n - 1];
  const binSz = (histMax - histMin) / numBins || 1;
  const bins = Array(numBins).fill(0);

  results.forEach(r => {
    const bi = Math.max(0, Math.min(numBins - 1, Math.floor((r - histMin) / binSz)));
    bins[bi]++;
  });

  let maxCount = 0;
  let maxIdx = 0;
  bins.forEach((count, i) => {
    if (count > maxCount) {
      maxCount = count;
      maxIdx = i;
    }
  });

  return histMin + (maxIdx + 0.5) * binSz;
}

function rebuildCharts(results) {
  const n = results.length;
  if (!n || !monteCarloChart || !exceedanceChart) {
    if (!n) markChartStale(true);
    return;
  }
  markChartStale(false);

  const canUseLog = currentScale === 'log' && results.every(v => v > 0);
  const numBins = Math.max(20, Math.ceil(1 + Math.log2(n)) * 3);

  const histLabels = [];
  const histData = [];

  if (canUseLog) {
    const logVals = results.map(r => Math.log10(Math.max(1e-12, r)));
    const lMin = logVals[0];
    const lMax = logVals[logVals.length - 1];
    const binSz = (lMax - lMin) / numBins || 1;
    const bins = Array(numBins).fill(0);

    logVals.forEach(v => {
      const bi = Math.max(0, Math.min(numBins - 1, Math.floor((v - lMin) / binSz)));
      bins[bi]++;
    });

    bins.forEach((count, i) => {
      const center = lMin + (i + 0.5) * binSz;
      histLabels.push('10^' + center.toFixed(1));
      histData.push(parseFloat(((count / n) * 100).toFixed(2)));
    });
  } else {
    const histMin = results[0];
    const histMax = results[n - 1];
    const binSz = (histMax - histMin) / numBins || 1;
    const bins = Array(numBins).fill(0);

    results.forEach(r => {
      const bi = Math.max(0, Math.min(numBins - 1, Math.floor((r - histMin) / binSz)));
      bins[bi]++;
    });

    bins.forEach((count, i) => {
      const center = histMin + (i + 0.5) * binSz;
      histLabels.push(center < 1 ? center.toExponential(1) : Math.round(center).toLocaleString());
      histData.push(parseFloat(((count / n) * 100).toFixed(2)));
    });
  }

  monteCarloChart.updateSeries([{ name: 'Frequency (%)', data: histData }]);
  monteCarloChart.updateOptions(
    {
      xaxis: {
        categories: histLabels,
        tickAmount: 6,
        title: {
          text: canUseLog ? 'log-scaled candidate-count bins' : 'Model-selected candidate count',
          style: {
            fontSize: '9px',
            fontFamily: 'Nunito,sans-serif',
            color: '#6b7280'
          }
        },
        labels: {
          rotate: -30,
          style: {
            colors: '#6b7280',
            fontSize: '7px',
            fontFamily: 'Nunito,sans-serif'
          }
        }
      }
    },
    true
  );

  // Second chart: empirical exceedance probability P(N >= threshold) from the
  // same MC candidate-count samples (handles its own empty/invalid states).
  updateExceedanceChart(results);
}

function clearCharts() {
  markChartStale(true);

  if (monteCarloChart && typeof monteCarloChart.updateSeries === 'function') {
    monteCarloChart.updateSeries([{ name: 'Frequency (%)', data: [] }], true);
    if (typeof monteCarloChart.updateOptions === 'function') {
      monteCarloChart.updateOptions({ xaxis: { categories: [] } }, true);
    }
  }

  if (exceedanceChart && typeof exceedanceChart.updateSeries === 'function') {
    exceedanceState = { thresholds: [], exceedance: [], labels: [], refFlags: [], points: [], refMarkers: [], engineLabel: '' };
    if (typeof exceedanceChart.updateOptions === 'function') {
      exceedanceChart.updateOptions(
        { noData: { text: EXCEEDANCE_EMPTY_MESSAGE }, markers: { size: 0, discrete: [] } },
        false,
        false
      );
    }
    exceedanceChart.updateSeries([{ name: 'P(N ≥ threshold)', data: [] }], true);
    const cap = byId('exceedance-caption');
    if (cap) cap.style.display = 'none';
  }
}
window.clearCharts = clearCharts;

function initCharts() {
  monteCarloChart = new ApexCharts(byId('monteCarloChart'), {
    chart: {
      type: 'bar',
      foreColor: '#6b7280',
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 800 },
      toolbar: { show: false }
    },
    series: [{ name: 'Frequency (%)', data: [] }],
    plotOptions: { bar: { columnWidth: '95%', borderRadius: 1 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: [],
      title: {
        text: 'Model-selected candidate count',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        rotate: -30,
        style: { colors: '#6b7280', fontSize: '7px', fontFamily: 'Nunito,sans-serif' }
      },
      tickAmount: 6
    },
    yaxis: {
      title: {
        text: 'Frequency (%)',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        style: { colors: '#6b7280', fontSize: '8px', fontFamily: 'Nunito,sans-serif' },
        formatter: v => v.toFixed(1) + '%'
      },
      tickAmount: 4
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        colorStops: [
          { offset: 0, color: '#5b9cf6', opacity: 0.8 },
          { offset: 100, color: '#4ecca3', opacity: 0.4 }
        ]
      }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.05)',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    tooltip: { theme: 'dark' }
  });

  exceedanceChart = new ApexCharts(byId('exceedanceChart'), {
    chart: {
      type: 'line',
      foreColor: '#6b7280',
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 800 },
      toolbar: { show: false }
    },
    series: [{ name: 'P(N ≥ threshold)', data: [] }],
    dataLabels: { enabled: false },
    title: {
      text: 'MODEL EXCEEDANCE PROBABILITY',
      align: 'left',
      style: { fontSize: '11px', fontFamily: 'Nunito,sans-serif', color: '#9aa4b2', fontWeight: 700 }
    },
    subtitle: {
      text: 'P(N ≥ threshold). Share of Monte Carlo samples exceeding each candidate-count threshold.',
      align: 'left',
      style: { fontSize: '8px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
    },
    xaxis: {
      type: 'numeric',
      title: {
        text: 'Candidate-count threshold N, log scale',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        rotate: -30,
        style: { colors: '#6b7280', fontSize: '7px', fontFamily: 'Nunito,sans-serif' },
        formatter: value => formatExceedanceThreshold(Math.pow(10, value))
      },
      tickAmount: 6
    },
    yaxis: {
      title: {
        text: 'P(N ≥ threshold) (%)',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        style: { colors: '#6b7280', fontSize: '8px', fontFamily: 'Nunito,sans-serif' },
        formatter: v => Math.round(v) + '%'
      },
      min: 0,
      max: 100,
      tickAmount: 4
    },
    markers: { size: 0, discrete: [] },
    stroke: { curve: 'smooth', width: 2, colors: ['#4ecca3'] },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    tooltip: { theme: 'dark', custom: exceedanceTooltip },
    noData: {
      text: EXCEEDANCE_EMPTY_MESSAGE,
      style: { color: '#6b7280', fontSize: '11px', fontFamily: 'Nunito,sans-serif' }
    }
  });

  monteCarloChart.render();
  exceedanceChart.render();
}

