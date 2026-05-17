/*
Are We Alone in the Universe? Earth-like Planet Calculator
Author: Roman Jerše
Website: https://www.arewealoneintheuniverse.com/
Version: 2.12
License: Custom source-available attribution license. See ../LICENSE.md.
*/

let monteCarloChart = null;

let gaussianChart = null;

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
          <div class="sens-score">Log-sensitivity score: ${d.score.toFixed(0)} · signed correlation ${d.r >= 0 ? '+' : ''}${(d.r * 100).toFixed(0)}%</div>
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
            ${d.r >= 0 ? '+' : ''}${(d.r * 100).toFixed(0)}% · score ${d.score.toFixed(0)}
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
  if (!n || !monteCarloChart || !gaussianChart) return;

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

  const kdeData = canUseLog
    ? results.map(r => Math.log10(Math.max(1e-12, r)))
    : results.slice();

  const kdeMean = mean(kdeData);
  const kdeVar =
    kdeData.length > 1
      ? kdeData.reduce((a, b) => a + Math.pow(b - kdeMean, 2), 0) /
        (kdeData.length - 1)
      : 0;

  const bw = 1.06 * Math.sqrt(Math.max(kdeVar, 1e-12)) * Math.pow(n, -0.2) || 0.1;
  const kdePts = 80;
  const xMin = kdeData[0];
  const xMax = kdeData[kdeData.length - 1];
  const step = (xMax - xMin) / (kdePts - 1) || 1;

  const kdeLabels = [];
  const kdeValues = [];
  let maxKde = 0;

  for (let i = 0; i < kdePts; i++) {
    const x = xMin + i * step;
    let density = 0;

    for (let j = 0; j < n; j++) {
      const u = (x - kdeData[j]) / bw;
      density += Math.exp(-0.5 * u * u);
    }

    density /= n * bw * Math.sqrt(2 * Math.PI);
    const xOrig = canUseLog ? Math.pow(10, x) : x;

    kdeLabels.push(xOrig < 1 ? xOrig.toExponential(1) : Math.round(xOrig).toLocaleString());
    kdeValues.push(density);
    maxKde = Math.max(maxKde, density);
  }

  const kdeNorm = kdeValues.map(v =>
    parseFloat(((v / Math.max(maxKde, 1e-12)) * 100).toFixed(2))
  );

  monteCarloChart.updateSeries([{ name: 'Frequency (%)', data: histData }]);
  monteCarloChart.updateOptions(
    {
      xaxis: {
        categories: histLabels,
        tickAmount: 6,
        title: {
          text: canUseLog ? 'log-scaled planet count bins' : 'Number of Earth-like Planets',
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

  gaussianChart.updateSeries([{ name: 'KDE Density', data: kdeNorm }]);
  gaussianChart.updateOptions(
    {
      xaxis: { categories: kdeLabels, tickAmount: 5 }
    },
    true
  );
}

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
        text: 'Number of Earth-like Planets',
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

  gaussianChart = new ApexCharts(byId('gaussianChart'), {
    chart: {
      type: 'area',
      foreColor: '#6b7280',
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 1000 }
    },
    series: [{ name: 'KDE Density', data: [] }],
    dataLabels: { enabled: false },
    xaxis: {
      categories: [],
      title: {
        text: 'Number of Planets',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        style: { colors: '#6b7280', fontSize: '8px', fontFamily: 'Nunito,sans-serif' }
      },
      tickAmount: 5
    },
    yaxis: {
      title: {
        text: 'Relative Density (%)',
        style: { fontSize: '9px', fontFamily: 'Nunito,sans-serif', color: '#6b7280' }
      },
      labels: {
        style: { colors: '#6b7280', fontSize: '8px', fontFamily: 'Nunito,sans-serif' },
        formatter: v => Math.round(v)
      },
      min: 0,
      max: 100,
      tickAmount: 4
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        colorStops: [
          { offset: 0, color: '#4ecca3', opacity: 0.4 },
          { offset: 100, color: '#5b9cf6', opacity: 0.08 }
        ]
      }
    },
    stroke: { curve: 'smooth', width: 1.5, colors: ['#4ecca3'] },
    grid: { borderColor: 'rgba(255,255,255,0.05)' }
  });

  monteCarloChart.render();
  gaussianChart.render();
}
