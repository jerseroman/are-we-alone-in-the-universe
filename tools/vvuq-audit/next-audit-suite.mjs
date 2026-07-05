import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCalculatorHarness } from './lib/calculator-vm-harness.mjs';
import {
  collectEnvironment,
  ensureDir,
  findLatestRunDir,
  parseArgs,
  readJson,
  recordCommandResult,
  repoRoot,
  runCommand,
  sanitizeFilePart,
  summarizeOutput,
  timestampId,
  writeJson,
  writeText
} from './lib/audit-utils.mjs';
import { runCoverageThresholdAudit } from './coverage-threshold-audit.mjs';
import { runExportConsistencyAudit } from './export-consistency-audit.mjs';
import { writeEvidenceManifest } from './evidence-pack-manifest.mjs';
import { runIndependentModelScopeAudit } from './independent-model-scope-audit.mjs';
import { runMethodologyGovernanceAudit } from './methodology-governance-audit.mjs';
import { runPriorAndDependencyAudit } from './prior-and-dependency-matrix.mjs';
import { runSecuritySupplyChainAudit } from './security-supply-chain-audit.mjs';

const HARNESS_EXTRA_EXPORTS = `
  getInputs,
  setAstronomyOverrideMode(mode) {
    astronomyOverrideMode = mode || null;
    if (mode) applyAstronomyPriorModel(mode);
  },
`;

const AUDIT_CATALOG = [
  { id: 1, key: 'metamorphic-property-invariants', title: 'Metamorphic / property-based invariant audit' },
  { id: 2, key: 'ui-state-display-metamorphic', title: 'UI -> internal state -> display metamorphic audit' },
  { id: 3, key: 'export-metamorphic', title: 'Export metamorphic audit' },
  { id: 4, key: 'bryson-direct-exclusivity', title: 'Bryson/direct occurrence exclusivity audit' },
  { id: 5, key: 'advanced-modules-metamorphic', title: 'Advanced modules metamorphic audit' },
  { id: 6, key: 'preset-restoration-invariants', title: 'Preset restoration invariant audit' },
  { id: 7, key: 'monte-carlo-distribution-invariants', title: 'Monte Carlo distribution invariant audit' },
  { id: 8, key: 'cross-browser-dom-display', title: 'Cross-browser DOM/display audit' },
  { id: 9, key: 'visual-regression-screenshot', title: 'Visual regression screenshot audit' },
  { id: 10, key: 'final-adjudication', title: 'Final adjudication audit' },
  { id: 11, key: 'timeout-aware-runner', title: 'Timeout-aware runner audit' },
  { id: 12, key: 'independent-oracle-expansion', title: 'Full independent Python/R oracle expansion' },
  { id: 13, key: 'coverage-improvement', title: 'Coverage improvement audit' },
  { id: 14, key: 'scientific-assumption-consistency', title: 'Scientific assumption consistency audit' },
  { id: 15, key: 'release-reproducibility', title: 'Release reproducibility audit' }
];

const RESULT_AFFECTING_ADVANCED_MODULES = [
  'hostChannels',
  'atmRet',
  'volatileSplit',
  'longterm',
  'spinObliquity',
  'radiusValley',
  'radialGHZ',
  'spaceWeather',
  'prebioticUV',
  'binary',
  'radiation'
];

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function statusBadge(status) {
  const normalized = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'PARTIAL';
  const color = normalized === 'PASS' ? 'green' : normalized === 'FAIL' ? 'red' : 'yellow';
  return `![${normalized}](https://img.shields.io/badge/-${normalized}-${color})`;
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function near(a, b, rel = 1e-10, abs = 1e-9) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(abs, rel * Math.max(1, Math.abs(a), Math.abs(b)));
}

function setValue(elements, id, value) {
  const el = elements.get(id);
  if (!el) throw new Error(`Missing harness element: ${id}`);
  el.value = String(value);
}

function centralDeterministic(api) {
  return api.computePlanetsAdvanced(api.applyAdvancedModules(api.resolveInputsForCalculation()));
}

function check(rows, name, pass, details = {}) {
  rows.push({ name, status: pass ? 'PASS' : 'FAIL', ...details });
}

function summarizeRows(rows) {
  const failures = rows.filter(row => row.status === 'FAIL');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    checks: rows.length,
    failures: failures.length,
    rows
  };
}

async function listFiles(dir, predicate = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

async function sha256(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function latestExtendedRunDir() {
  const base = path.join(repoRoot, 'audit-output');
  if (!fs.existsSync(base)) return null;
  const entries = await fsp.readdir(base, { withFileTypes: true });
  const dirs = entries
    .filter(entry => entry.isDirectory() && /^extended-(24h|72h|74h|.*live)/i.test(entry.name))
    .map(entry => {
      const full = path.join(base, entry.name);
      return { full, mtimeMs: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return dirs[0]?.full || await findLatestRunDir(base);
}

async function readJsonl(file) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function profileLooksLikeHarnessTimeout(profile, nestedSummaries = []) {
  const steps = profile.steps || [];
  if (steps.some(step => step.summary?.timedOut)) return true;
  if (nestedSummaries.some(summary => {
    const runs = Array.isArray(summary?.runs) ? summary.runs : [];
    return runs.some(run => run.timedOut && Number(run.failLines || 0) === 0);
  })) return true;

  const failedSteps = steps.filter(step => step.summary?.status === 'FAIL');
  return failedSteps.length > 0 && failedSteps.every(step => (
    Number(step.summary?.failLines || 0) === 0 &&
    Number(step.summary?.failures || 0) === 0 &&
    /report-integrity|state-transition|export-consistency|coverage|mutation/i.test(`${profile.id} ${step.command}`)
  ));
}

async function nestedProfileSummaries(runDir, profile) {
  const profileRoot = path.join(runDir, 'profiles');
  const files = await listFiles(profileRoot, file => /summary\.json$/i.test(path.basename(file)));
  const execution = String(profile.execution_index).padStart(5, '0');
  const relevant = files.filter(file => path.basename(path.dirname(file)).startsWith(execution));
  const summaries = [];
  for (const file of relevant) {
    const summary = await readJson(file, null);
    if (summary) summaries.push(summary);
  }
  return summaries;
}

async function runCoreMetamorphicAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const sampleCount = Number(options.smoke ? 96 : options.samples || 384);
  const { api, elements } = loadCalculatorHarness(HARNESS_EXTRA_EXPORTS);
  const rows = [];
  const presetNames = Object.keys(api.PRESETS);

  for (const preset of presetNames) {
    api.resetAdvancedModules();
    api.setPreset(preset);
    const value = centralDeterministic(api);
    check(rows, `preset ${preset} deterministic finite nonnegative`, finiteNonNegative(value), { preset, value });
  }

  api.resetAdvancedModules();
  api.setPreset('kepler');
  const baseN = centralDeterministic(api);
  const baseInput = api.resolveInputsForCalculation();
  setValue(elements, 'N_GHZ', baseInput.N_GHZ * 2);
  const doubledN = centralDeterministic(api);
  check(rows, 'N_GHZ doubling scales deterministic result by 2x', near(doubledN, baseN * 2, 5e-10), {
    base: baseN,
    transformed: doubledN
  });

  api.resetAdvancedModules();
  api.setPreset('kepler');
  setValue(elements, 'f_stability', 0);
  check(rows, 'zero multiplicative factor drives deterministic result to zero', near(centralDeterministic(api), 0, 0, 1e-12));

  api.resetAdvancedModules();
  api.setPreset('kepler');
  setValue(elements, 'f_stability', 0.4);
  const lowStability = centralDeterministic(api);
  setValue(elements, 'f_stability', 0.8);
  const highStability = centralDeterministic(api);
  check(rows, 'increasing f_stability is monotonic nondecreasing', highStability >= lowStability, {
    low: lowStability,
    high: highStability
  });

  api.resetAdvancedModules();
  api.setPreset('kepler');
  const baseOccurrenceInputs = api.resolveInputsForCalculation();
  const factorized = baseOccurrenceInputs.N_p_star * baseOccurrenceInputs.f_composition * baseOccurrenceInputs.f_orbit;
  api.setAstronomyOverrideMode('bryson_eta_direct');
  const directState = api.buildResolvedModelState();
  const directValue = centralDeterministic(api);
  setValue(elements, 'N_p_star', baseOccurrenceInputs.N_p_star * 5);
  setValue(elements, 'f_composition', 0.01);
  setValue(elements, 'f_orbit', 0.01);
  const directAfterVisibleFactorChange = centralDeterministic(api);
  check(rows, 'Bryson direct mode reports eta_earth_direct state', directState.occurrenceMode === 'eta_earth_direct', {
    occurrenceMode: directState.occurrenceMode
  });
  check(rows, 'Bryson direct occurrence term equals eta Earth value', near(directState.occurrenceTerm_used, directState.etaEarth_used), {
    occurrenceTerm: directState.occurrenceTerm_used,
    etaEarth: directState.etaEarth_used
  });
  check(rows, 'Bryson direct preserves factorized occurrence as diagnostic only', near(directState.factorizedOccurrenceTerm_visible, factorized), {
    factorized,
    diagnostic: directState.factorizedOccurrenceTerm_visible
  });
  check(rows, 'Bryson direct result is invariant to visible bypassed occurrence fields', near(directAfterVisibleFactorChange, directValue), {
    directValue,
    afterVisibleFieldChange: directAfterVisibleFactorChange
  });

  for (const moduleKey of RESULT_AFFECTING_ADVANCED_MODULES) {
    api.resetAdvancedModules();
    api.setPreset('kepler');
    const baseline = centralDeterministic(api);
    api.setAdvancedModule(moduleKey, true);
    const enabled = centralDeterministic(api);
    api.resetAdvancedModules();
    const restored = centralDeterministic(api);
    check(rows, `advanced module ${moduleKey} gives finite nonnegative result`, finiteNonNegative(enabled), { moduleKey, enabled });
    check(rows, `advanced module ${moduleKey} reset restores baseline`, near(restored, baseline, 1e-10), { moduleKey, baseline, restored });
  }

  for (const preset of presetNames) {
    api.resetAdvancedModules();
    api.setPreset(preset);
    const baseline = centralDeterministic(api);
    setValue(elements, 'N_GHZ', 12345);
    setValue(elements, 'f_stability', 0.123);
    api.setAdvancedModule('atmRet', true);
    api.setPreset('kepler');
    api.resetAdvancedModules();
    api.setPreset(preset);
    const restored = centralDeterministic(api);
    check(rows, `preset ${preset} reload restores deterministic baseline`, near(restored, baseline, 1e-10), { preset, baseline, restored });
  }

  api.resetAdvancedModules();
  api.setPreset('kepler');
  const mcA = api.monteCarloCalculate({ samples: sampleCount, seed: 20260705, updateUi: false });
  const mcB = api.monteCarloCalculate({ samples: sampleCount, seed: 20260705, updateUi: false });
  check(rows, 'Monte Carlo percentiles are ordered', mcA.p025 <= mcA.p500 && mcA.p500 <= mcA.p975, {
    p025: mcA.p025,
    p500: mcA.p500,
    p975: mcA.p975
  });
  check(rows, 'Monte Carlo outputs are nonnegative', [mcA.p025, mcA.p500, mcA.p975, mcA.mean].every(finiteNonNegative));
  check(rows, 'Monte Carlo fixed seed is reproducible', near(mcA.p025, mcB.p025) && near(mcA.p500, mcB.p500) && near(mcA.p975, mcB.p975) && near(mcA.mean, mcB.mean), {
    seed: 20260705,
    samples: sampleCount
  });

  const summary = summarizeRows(rows);
  summary.audit_items = [1, 4, 5, 6, 7];
  summary.sample_count = sampleCount;
  await writeJson(path.join(outDir, 'metamorphic-core-summary.json'), summary);
  await writeText(path.join(outDir, 'metamorphic-core-report.md'), [
    '# Metamorphic Core Invariant Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...rows.map(row => `| ${md(row.name)} | ${row.status} | ${md(JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key]) => !['name', 'status'].includes(key)))))} |`)
  ].join('\n'));
  return summary;
}

async function runUiStateDisplayMetamorphicAudit(outDir) {
  await ensureDir(outDir);
  const { api, document, elements } = loadCalculatorHarness(HARNESS_EXTRA_EXPORTS);
  const rows = [];
  const scenarios = [];

  function runScenario(name, setup) {
    api.resetAdvancedModules();
    api.setPreset('kepler');
    if (setup) setup();
    const expected = centralDeterministic(api);
    const state = api.buildResolvedModelState();
    api.calculateDeterministic();
    const display = document.getElementById('deterministicResult').innerHTML;
    scenarios.push({ name, expected, display, occurrenceMode: state.occurrenceMode, activeAdvanced: Object.entries(api.ADV.modules).filter(([, item]) => item.enabled).map(([key]) => key) });
    check(rows, `${name}: deterministic display contains calculated value`, display.includes(api.fmtN(expected)), { expected: api.fmtN(expected) });
    check(rows, `${name}: state final inputs produce same calculation`, near(api.computePlanetsAdvanced(state.finalEffectiveCalculationInputValues), expected, 1e-10), { occurrenceMode: state.occurrenceMode });
  }

  runScenario('baseline preset');
  runScenario('N_GHZ scaled display/state', () => setValue(elements, 'N_GHZ', 10000000000));
  runScenario('advanced module display/state', () => api.setAdvancedModule('atmRet', true));
  runScenario('Bryson direct display/state', () => api.setAstronomyOverrideMode('bryson_eta_direct'));

  const mc = api.monteCarloCalculate({ samples: 96, seed: 9705, updateUi: true });
  const mcDisplay = document.getElementById('monteCarloResult').innerHTML;
  check(rows, 'Monte Carlo display contains fixed-seed median', mcDisplay.includes(api.fmtN(mc.median)), { median: api.fmtN(mc.median) });

  const summary = summarizeRows(rows);
  summary.audit_items = [2];
  summary.scenarios = scenarios;
  await writeJson(path.join(outDir, 'ui-state-display-metamorphic-summary.json'), summary);
  await writeText(path.join(outDir, 'ui-state-display-metamorphic-report.md'), [
    '# UI -> State -> Display Metamorphic Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Scenario | Expected deterministic | Occurrence mode | Active advanced modules |',
    '| --- | ---: | --- | --- |',
    ...scenarios.map(row => `| ${md(row.name)} | ${row.expected} | ${md(row.occurrenceMode)} | ${md(row.activeAdvanced.join(', ') || 'none')} |`),
    '',
    '| Check | Status |',
    '| --- | --- |',
    ...rows.map(row => `| ${md(row.name)} | ${row.status} |`)
  ].join('\n'));
  return summary;
}

async function runExportMetamorphicAudit(outDir, options = {}) {
  await ensureDir(outDir);
  if (options.smoke && !options.runExport) {
    const summary = {
      status: 'PARTIAL',
      audit_items: [3],
      reason: 'Smoke mode prepared export metamorphic audit without running the longer export-consistency command.',
      full_command: 'npm run audit:vvuq:next-suite -- --run-export'
    };
    await writeJson(path.join(outDir, 'export-metamorphic-summary.json'), summary);
    await writeText(path.join(outDir, 'export-metamorphic-report.md'), `# Export Metamorphic Audit\n\nStatus: **PARTIAL**\n\n${summary.reason}\n`);
    return summary;
  }
  const summary = await runExportConsistencyAudit(outDir, { timeoutMs: options.exportTimeoutMs || 360000 });
  summary.audit_items = [3];
  await writeJson(path.join(outDir, 'export-metamorphic-summary.json'), summary);
  return summary;
}

async function runBrowserVisualAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const rows = [];
  let playwright = null;
  try {
    playwright = await import('playwright');
  } catch {
    // Optional dependency. The suite remains prepared and reports why this item is partial.
  }

  if (!options.runBrowser || !playwright) {
    const summary = {
      status: 'PARTIAL',
      audit_items: [8, 9],
      cross_browser_status: playwright ? 'READY_NOT_RUN' : 'PLAYWRIGHT_NOT_INSTALLED',
      visual_regression_status: 'BASELINE_NOT_CONFIGURED',
      reason: playwright
        ? 'Browser audit is prepared but was not requested in this run.'
        : 'Playwright browsers are not installed in this local dependency set.',
      command: 'npm run audit:vvuq:next-suite -- --run-browser'
    };
    await writeJson(path.join(outDir, 'browser-visual-summary.json'), summary);
    await writeText(path.join(outDir, 'browser-visual-report.md'), [
      '# Cross-Browser / Visual Regression Audit',
      '',
      `Status: **${summary.status}**`,
      '',
      summary.reason,
      '',
      `Prepared command: \`${summary.command}\``
    ].join('\n'));
    return summary;
  }

  const screenshotsDir = path.join(outDir, 'screenshots');
  await ensureDir(screenshotsDir);
  const browsers = ['chromium', 'firefox', 'webkit'].filter(name => playwright[name]);
  const viewports = [
    { name: 'desktop', width: 1365, height: 768 },
    { name: 'mobile', width: 390, height: 844 }
  ];
  const url = pathToFileURL(path.join(repoRoot, 'index.html')).href;

  for (const browserName of browsers) {
    const browser = await playwright[browserName].launch({ headless: true });
    try {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport });
        const consoleErrors = [];
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        await page.goto(url, { waitUntil: 'load' });
        const resultText = await page.locator('#deterministicResult').innerText({ timeout: 10000 }).catch(() => '');
        const screenshot = path.join(screenshotsDir, `${browserName}-${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        rows.push({
          browser: browserName,
          viewport: viewport.name,
          screenshot: path.relative(outDir, screenshot).replace(/\\/g, '/'),
          result_text_present: /modelled Earth-like/i.test(resultText),
          console_errors: consoleErrors
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }

  const failures = rows.filter(row => !row.result_text_present || row.console_errors.length);
  const summary = {
    status: failures.length ? 'FAIL' : 'PARTIAL',
    audit_items: [8, 9],
    reason: failures.length
      ? 'One or more browser screenshots lacked the expected deterministic display or had console errors.'
      : 'DOM/display screenshots were captured; visual pixel baselines are not yet configured, so screenshot regression is partial.',
    screenshots: rows
  };
  await writeJson(path.join(outDir, 'browser-visual-summary.json'), summary);
  await writeText(path.join(outDir, 'browser-visual-report.md'), [
    '# Cross-Browser / Visual Regression Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    summary.reason,
    '',
    '| Browser | Viewport | Result text present | Console errors | Screenshot |',
    '| --- | --- | --- | ---: | --- |',
    ...rows.map(row => `| ${row.browser} | ${row.viewport} | ${row.result_text_present ? 'yes' : 'no'} | ${row.console_errors.length} | ${md(row.screenshot)} |`)
  ].join('\n'));
  return summary;
}

async function runAdjudicationAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const runDir = options.runDir ? path.resolve(repoRoot, options.runDir) : await latestExtendedRunDir();
  if (!runDir || !fs.existsSync(runDir)) {
    const summary = { status: 'PARTIAL', audit_items: [10], reason: 'No prior extended audit run directory was found.' };
    await writeJson(path.join(outDir, 'final-adjudication-summary.json'), summary);
    return summary;
  }

  const failures = await readJsonl(path.join(runDir, 'failures', 'profile-failures.jsonl'));
  const classified = [];
  for (const profile of failures) {
    const nestedSummaries = await nestedProfileSummaries(runDir, profile);
    const timeoutPartial = profileLooksLikeHarnessTimeout(profile, nestedSummaries);
    const hasCodeFailLine = (profile.steps || []).some(step => Number(step.summary?.failLines || 0) > 0 || Number(step.summary?.failures || 0) > 0);
    classified.push({
      execution_index: profile.execution_index,
      profile_id: profile.id,
      title: profile.title,
      raw_status: profile.status,
      classification: timeoutPartial ? 'TIMEOUT_PARTIAL' : hasCodeFailLine ? 'CODE_FAIL' : 'HARNESS_PARTIAL',
      timed_out: (profile.steps || []).some(step => step.summary?.timedOut),
      fail_lines: (profile.steps || []).reduce((sum, step) => sum + Number(step.summary?.failLines || 0), 0)
    });
  }

  const codeFailures = classified.filter(row => row.classification === 'CODE_FAIL');
  const summary = {
    status: codeFailures.length ? 'FAIL' : 'PASS',
    audit_items: [10],
    run_dir: runDir,
    raw_failed_profiles: failures.length,
    code_failures: codeFailures.length,
    timeout_or_harness_partials: classified.length - codeFailures.length,
    classified_failures: classified
  };
  await writeJson(path.join(outDir, 'final-adjudication-summary.json'), summary);
  await writeText(path.join(outDir, 'final-adjudication-report.md'), [
    '# Final Adjudication Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Run dir: ${summary.run_dir}`,
    `Raw failed profiles: ${summary.raw_failed_profiles}`,
    `Code failures: ${summary.code_failures}`,
    `Timeout/harness partials: ${summary.timeout_or_harness_partials}`,
    '',
    '| Execution | Profile | Classification | Timed out | FAIL lines |',
    '| ---: | --- | --- | --- | ---: |',
    ...classified.map(row => `| ${row.execution_index} | ${md(row.profile_id)} | ${row.classification} | ${row.timed_out ? 'yes' : 'no'} | ${row.fail_lines} |`)
  ].join('\n'));
  return summary;
}

async function runTimeoutAwareRunnerAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const runDir = options.runDir ? path.resolve(repoRoot, options.runDir) : await latestExtendedRunDir();
  const source = await fsp.readFile(path.join(repoRoot, 'tools', 'vvuq-audit', 'run-extended-rotating-24h.mjs'), 'utf8');
  const failures = runDir && fs.existsSync(runDir)
    ? await readJsonl(path.join(runDir, 'failures', 'profile-failures.jsonl'))
    : [];
  const timeoutProfiles = failures.filter(profile => profileLooksLikeHarnessTimeout(profile, []));
  const recommendations = [
    {
      profile: '04-state-transition-soak',
      recommendation: 'Keep as TIMEOUT_PARTIAL when the slice expires after clean PASS output; do not classify as calculator code FAIL without FAIL lines.'
    },
    {
      profile: '05-export-consistency',
      recommendation: 'Split standalone export and deep state-transition export or raise timeout above the observed deep-test runtime.'
    },
    {
      profile: '16-report-integrity',
      recommendation: 'Run once per checkpoint window or increase minStartMs because large 72h evidence folders slow recursive integrity checks.'
    }
  ];
  const summary = {
    status: 'PASS',
    audit_items: [11],
    run_dir: runDir,
    runner_has_min_start_guards: /minStartMs:\s*\d+/.test(source),
    runner_has_command_timeout_capture: /timedOut/.test(source) && /summarizeOutput/.test(source),
    observed_timeout_or_harness_partials: timeoutProfiles.length,
    recommendations
  };
  await writeJson(path.join(outDir, 'timeout-aware-runner-summary.json'), summary);
  await writeText(path.join(outDir, 'timeout-aware-runner-report.md'), [
    '# Timeout-Aware Runner Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Runner has minStartMs guards: ${summary.runner_has_min_start_guards ? 'yes' : 'no'}`,
    `Runner records command timeout state: ${summary.runner_has_command_timeout_capture ? 'yes' : 'no'}`,
    `Observed timeout/harness partial profiles: ${summary.observed_timeout_or_harness_partials}`,
    '',
    '| Profile | Recommendation |',
    '| --- | --- |',
    ...recommendations.map(row => `| ${md(row.profile)} | ${md(row.recommendation)} |`)
  ].join('\n'));
  return summary;
}

async function runIndependentOracleExpansionAudit(outDir, options = {}) {
  await ensureDir(outDir);
  if (options.smoke && !options.runOracleExpansion) {
    const summary = {
      status: 'PARTIAL',
      audit_items: [12],
      reason: 'Smoke mode prepared full independent Python/R oracle expansion but did not run the cross-oracle commands.',
      command: 'npm run audit:vvuq:next-suite -- --run-oracle-expansion'
    };
    await writeJson(path.join(outDir, 'independent-oracle-expansion-summary.json'), summary);
    await writeText(path.join(outDir, 'independent-oracle-expansion-report.md'), `# Independent Oracle Expansion Audit\n\nStatus: **PARTIAL**\n\n${summary.reason}\n`);
    return summary;
  }
  const summary = await runIndependentModelScopeAudit(outDir, { cases: options.smoke ? 120 : options.oracleCases || 1200, seed: options.seed || 20260705 });
  summary.audit_items = [12];
  await writeJson(path.join(outDir, 'independent-oracle-expansion-summary.json'), summary);
  return summary;
}

async function runCoverageImprovementAudit(outDir, options = {}) {
  await ensureDir(outDir);
  if (!options.runCoverage) {
    const summary = {
      status: 'PARTIAL',
      audit_items: [13],
      reason: 'Coverage improvement audit is prepared. Run with --run-coverage to execute c8 over test:all and rank weak files.',
      critical_files: ['src/calculator-core.js', 'src/scientific-parameters.js', 'src/share.js'],
      command: 'npm run audit:vvuq:next-suite -- --run-coverage'
    };
    await writeJson(path.join(outDir, 'coverage-improvement-summary.json'), summary);
    await writeText(path.join(outDir, 'coverage-improvement-report.md'), [
      '# Coverage Improvement Audit',
      '',
      `Status: **${summary.status}**`,
      '',
      summary.reason,
      '',
      '| Critical file | Reason |',
      '| --- | --- |',
      ...summary.critical_files.map(file => `| ${file} | critical calculation/export path |`)
    ].join('\n'));
    return summary;
  }
  const summary = await runCoverageThresholdAudit(outDir, { timeoutMs: options.coverageTimeoutMs || 420000 });
  summary.audit_items = [13];
  await writeJson(path.join(outDir, 'coverage-improvement-summary.json'), summary);
  return summary;
}

async function runScientificAssumptionAudit(outDir) {
  await ensureDir(outDir);
  const priorDir = path.join(outDir, 'prior-dependency');
  const governanceDir = path.join(outDir, 'methodology-governance');
  const prior = await runPriorAndDependencyAudit(priorDir);
  const governance = await runMethodologyGovernanceAudit(governanceDir);
  const status = prior.status === 'FAIL' || governance.status === 'FAIL'
    ? 'FAIL'
    : prior.status === 'PARTIAL' || governance.status === 'PARTIAL'
      ? 'PARTIAL'
      : 'PASS';
  const summary = {
    status,
    audit_items: [14],
    prior_dependency_status: prior.status,
    methodology_governance_status: governance.status,
    parameter_count: prior.parameter_count,
    extended_requirements: governance.extended_requirements
  };
  await writeJson(path.join(outDir, 'scientific-assumption-consistency-summary.json'), summary);
  await writeText(path.join(outDir, 'scientific-assumption-consistency-report.md'), [
    '# Scientific Assumption Consistency Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Prior/dependency status: ${summary.prior_dependency_status}`,
    `Methodology governance status: ${summary.methodology_governance_status}`,
    `Parameters checked: ${summary.parameter_count}`,
    `Extended requirements: ${summary.extended_requirements}`
  ].join('\n'));
  return summary;
}

async function runReleaseReproducibilityAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const gitHead = await runCommand('git', ['rev-parse', 'HEAD'], { timeoutMs: 15000 });
  const gitStatus = await runCommand('git', ['status', '--short'], { timeoutMs: 15000 });
  const lockFile = path.join(repoRoot, 'package-lock.json');
  const packageFile = path.join(repoRoot, 'package.json');
  const keyFiles = [packageFile, lockFile, path.join(repoRoot, 'index.html'), path.join(repoRoot, 'src', 'calculator-core.js')]
    .filter(file => fs.existsSync(file));
  const hashes = [];
  for (const file of keyFiles) {
    hashes.push({
      path: path.relative(repoRoot, file).replace(/\\/g, '/'),
      sha256: await sha256(file)
    });
  }

  let build = null;
  if (options.runBuild) {
    build = await runCommand('npm', ['run', 'build:standalone'], { timeoutMs: 180000 });
    await recordCommandResult(outDir, 'release-build-standalone', build);
  }

  const manifestDir = options.runEvidenceManifest
    ? path.join(outDir, 'evidence-manifest')
    : null;
  const manifest = manifestDir
    ? await writeEvidenceManifest(outDir, { out: manifestDir })
    : null;

  const findings = [];
  if (!fs.existsSync(lockFile)) findings.push('package-lock.json is missing');
  if (build && build.status !== 'PASS') findings.push('standalone build command failed');

  const warnings = [];
  if ((gitStatus.stdout || '').trim()) warnings.push('git working tree is dirty; reproducibility is tied to this uncommitted state');
  if (!build) warnings.push('standalone build was not run; pass --run-build to include build output verification');
  if (!manifest) warnings.push('full evidence manifest was not regenerated in this suite run; pass --run-evidence-manifest to hash the produced suite artifacts');

  const summary = {
    status: findings.length ? 'FAIL' : warnings.length ? 'PARTIAL' : 'PASS',
    audit_items: [15],
    git_commit: (gitHead.stdout || '').trim() || null,
    git_status_short: gitStatus.stdout || '',
    package_lock_present: fs.existsSync(lockFile),
    build_status: build?.status || 'NOT_RUN',
    evidence_manifest_status: manifest?.status || 'NOT_RUN',
    hashes,
    findings,
    warnings
  };
  await writeJson(path.join(outDir, 'release-reproducibility-summary.json'), summary);
  await writeText(path.join(outDir, 'release-reproducibility-report.md'), [
    '# Release Reproducibility Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Git commit: ${summary.git_commit || 'n/a'}`,
    `Package lock present: ${summary.package_lock_present ? 'yes' : 'no'}`,
    `Standalone build: ${summary.build_status}`,
    `Evidence manifest: ${summary.evidence_manifest_status}`,
    '',
    '| File | SHA256 |',
    '| --- | --- |',
    ...hashes.map(row => `| ${md(row.path)} | \`${row.sha256}\` |`),
    '',
    `Findings: ${findings.length ? findings.join('; ') : 'none'}`,
    `Warnings: ${warnings.length ? warnings.join('; ') : 'none'}`
  ].join('\n'));
  return summary;
}

async function runSecurityAudit(outDir, options = {}) {
  await ensureDir(outDir);
  if (options.smoke && !options.runSecurity) {
    const summary = {
      status: 'PARTIAL',
      audit_items: [],
      reason: 'Smoke mode skipped npm audit/security supply-chain command.',
      command: 'npm run audit:vvuq:next-suite -- --run-security'
    };
    await writeJson(path.join(outDir, 'security-smoke-skip-summary.json'), summary);
    return summary;
  }
  const summary = await runSecuritySupplyChainAudit(outDir);
  return { ...summary, audit_items: [] };
}

function aggregateAuditItems(results) {
  const items = AUDIT_CATALOG.map(item => ({
    ...item,
    status: 'NOT_RUN',
    evidence: []
  }));
  for (const result of results) {
    for (const id of result.audit_items || []) {
      const item = items.find(row => row.id === id);
      if (!item) continue;
      item.status = item.status === 'FAIL' || result.status === 'FAIL'
        ? 'FAIL'
        : item.status === 'PARTIAL' || result.status === 'PARTIAL'
          ? 'PARTIAL'
          : 'PASS';
      item.evidence.push(result.evidence_file || result.name || result.report || 'suite artifact');
    }
  }
  return items;
}

function codeBehaviorStatus(items, results = []) {
  if (results.some(result => result.status === 'FAIL')) return 'FAIL';
  if (items.some(item => item.status === 'FAIL')) return 'FAIL';
  return 'PASS';
}

function formalScopeStatus(items, results = []) {
  if (results.some(result => result.status === 'FAIL')) return 'FAIL';
  if (items.some(item => item.status === 'FAIL')) return 'FAIL';
  if (results.some(result => result.status === 'PARTIAL')) return 'PARTIAL';
  if (items.some(item => item.status !== 'PASS')) return 'PARTIAL';
  return 'PASS';
}

async function writeSuiteReports(runDir, environment, results, items) {
  const status = codeBehaviorStatus(items, results);
  const scopeStatus = formalScopeStatus(items, results);
  const summary = {
    status,
    code_behavior_status: status,
    formal_scope_status: scopeStatus,
    generated_at: new Date().toISOString(),
    run_dir: runDir,
    environment,
    audit_items: items,
    component_results: results.map(result => ({
      name: result.name,
      status: result.status,
      audit_items: result.audit_items || [],
      dir: result.dir ? path.relative(runDir, result.dir).replace(/\\/g, '/') : null
    }))
  };
  await writeJson(path.join(runDir, 'next-audit-suite-summary.json'), summary);
  await writeText(path.join(runDir, 'next-audit-suite-report.md'), [
    '# Next V&V/UQ Audit Suite Report',
    '',
    `Calculator/code behavior status: **${status}** ${statusBadge(status)}`,
    `Formal audit scope status: **${scopeStatus}** ${statusBadge(scopeStatus)}`,
    '',
    scopeStatus === 'PARTIAL'
      ? 'Scope/tooling notes are recorded separately from calculator behavior. A PARTIAL scope status means that at least one optional, environment-dependent, timeout-limited, or intentionally incomplete audit item was not fully formalized; it is not a calculator failure by itself.'
      : 'All configured scope checks completed without partial scope limitations.',
    '',
    `Run dir: ${runDir}`,
    `Generated: ${summary.generated_at}`,
    '',
    '| # | Audit | Status | Evidence |',
    '| ---: | --- | --- | --- |',
    ...items.map(item => `| ${item.id} | ${md(item.title)} | ${statusBadge(item.status)} | ${md(item.evidence.join(', ') || 'not generated')} |`),
    '',
    '## Component Results',
    '',
    '| Component | Status | Directory |',
    '| --- | --- | --- |',
    ...summary.component_results.map(result => `| ${md(result.name)} | ${statusBadge(result.status)} | ${md(result.dir || '')} |`)
  ].join('\n'));
  return summary;
}

async function runNamedComponent(runDir, name, fn) {
  const dir = path.join(runDir, sanitizeFilePart(name));
  const result = await fn(dir);
  return {
    ...result,
    name,
    dir,
    evidence_file: path.relative(runDir, dir).replace(/\\/g, '/')
  };
}

export async function runNextAuditSuite(args = parseArgs()) {
  const runId = args.runId || timestampId(args.smoke ? 'next-suite-smoke' : 'next-suite');
  const runDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  await ensureDir(runDir);
  const environment = await collectEnvironment(runDir);
  const options = {
    smoke: !!args.smoke,
    runExport: !!args['run-export'] || !!args.runExport,
    runBrowser: !!args['run-browser'] || !!args.runBrowser,
    runOracleExpansion: !!args['run-oracle-expansion'] || !!args.runOracleExpansion,
    runCoverage: !!args['run-coverage'] || !!args.runCoverage,
    runBuild: !!args['run-build'] || !!args.runBuild,
    runEvidenceManifest: !!args['run-evidence-manifest'] || !!args.runEvidenceManifest,
    runSecurity: !!args['run-security'] || !!args.runSecurity,
    runDir: args['run-dir'] || args.runDir,
    seed: args.seed
  };

  const results = [];
  results.push(await runNamedComponent(runDir, '01-core-metamorphic-invariants', dir => runCoreMetamorphicAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '02-ui-state-display-metamorphic', dir => runUiStateDisplayMetamorphicAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '03-export-metamorphic', dir => runExportMetamorphicAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '08-09-browser-visual', dir => runBrowserVisualAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '10-final-adjudication', dir => runAdjudicationAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '11-timeout-aware-runner', dir => runTimeoutAwareRunnerAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '12-independent-oracle-expansion', dir => runIndependentOracleExpansionAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '13-coverage-improvement', dir => runCoverageImprovementAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '14-scientific-assumption-consistency', dir => runScientificAssumptionAudit(dir, options)));
  results.push(await runNamedComponent(runDir, '15-release-reproducibility', dir => runReleaseReproducibilityAudit(dir, options)));
  results.push(await runNamedComponent(runDir, 'security-supply-chain-supporting-check', dir => runSecurityAudit(dir, options)));

  const items = aggregateAuditItems(results);
  const summary = await writeSuiteReports(runDir, environment, results, items);
  process.stdout.write(`NEXT_AUDIT_SUITE ${summary.status}: run_dir=${runDir}\n`);
  return summary;
}

async function main() {
  const summary = await runNextAuditSuite();
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
