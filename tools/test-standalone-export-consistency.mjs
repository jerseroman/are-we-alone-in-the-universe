#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildStandaloneHtml, extractInlineScriptBlocks } from './generate-standalone-html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function parseArgs(argv) {
  const args = {
    standalone: null,
    keepTemp: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--standalone') {
      args.standalone = path.resolve(argv[++i]);
    } else if (arg === '--keep-temp') {
      args.keepTemp = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return [
    'Usage: node tools/test-standalone-export-consistency.mjs [--standalone standalone.html] [--keep-temp]',
    '',
    'Without --standalone, the test validates a fresh standalone export generated from index.html.',
    'With --standalone, it also validates that supplied standalone file.'
  ].join('\n');
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function countOccurrences(text, needle) {
  return String(text).split(needle).length - 1;
}

function assertIncludes(label, text, needle) {
  if (String(text).includes(needle)) pass(`${label}: found "${needle}".`);
  else fail(`${label}: missing "${needle}".`);
}

function assertNotMatches(label, text, pattern, description) {
  if (pattern.test(String(text))) fail(`${label}: found ${description}.`);
  else pass(`${label}: no ${description}.`);
}

function assertMatches(label, text, pattern, description) {
  if (pattern.test(String(text))) pass(`${label}: found ${description}.`);
  else fail(`${label}: missing ${description}.`);
}

function validateOperatorParity(label, html, sourceBundle) {
  const requiredSlashSeparatorStrings = [
    'Kepler/Gaia / Bryson',
    'Consensus / Lineweaver',
    'High-End / Literature Bounds',
    'Modified preset-local uncertainty / Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields',
    'Custom input uncertainty / Uses visible input bounds',
    'Global exploratory envelope / Not local preset uncertainty',
    'Log-sensitivity score: ${d.score.toFixed(0)} / signed correlation',
    '${summary.engineLabel} / ${summary.distributionShort} / ${summary.correlationLabel} / ${summary.boundsLabel}',
    "result.N_samples + ' base samples / ' + result.activeIds.length + ' uncertain params'",
    'Computed N_GHZ = ${details.N_GHZ.toLocaleString()} stars / GHZ = ${details.innerKpc.toFixed(1)}~${details.outerKpc.toFixed(1)} kpc',
    'Formula: N̂ = (N<sub>Earth-like</sub> × f<sub>tx</sub> × range-gate) × (L / T<sub>galaxy</sub>) / P(≥1) = 1 − e<sup>−N̂</sup><br>',
    '1 / within light-travel reach',
    '0 / outside light-travel reach',
    'Step 0 / Civilisation prior',
    'Step 1 / Distance barrier',
    'Step 2 / Timing barrier',
    'Combined result / Poisson mean of detectable transmitters now'
  ];

  for (const needle of requiredSlashSeparatorStrings) {
    if (!sourceBundle.includes(needle)) {
      fail(`source bundle is missing slash-separator regression string: "${needle}".`);
    } else {
      assertIncludes(label, html, needle);
    }
  }

  const middleDot = String.fromCharCode(0x00B7);
  const sourceDotCount = countOccurrences(sourceBundle, middleDot);
  const htmlDotCount = countOccurrences(html, middleDot);
  if (sourceDotCount || htmlDotCount) {
    fail(`${label}: middle-dot separator remains (${sourceDotCount} in source, ${htmlDotCount} in export).`);
  } else {
    pass(`${label}: no middle-dot separators remain in source or export.`);
  }

  const intendedFormula = 'ρ<sub>det</sub>/π';
  assertIncludes(label, html, intendedFormula);
}

function validateSeedAndDuplicateLogic(label, html, sourceBundle) {
  assertIncludes(label, html, "const cryptoProvider = typeof globalThis !== 'undefined' ? globalThis.crypto : null;");
  assertNotMatches(label, html, /\bwindow\.crypto\b/, 'direct window.crypto Monte Carlo seed dependency');
  assertIncludes(
    label,
    html,
    "seed_mode: lastMonteCarloRunMetadata?.seedMode || (typeof getMonteCarloSeedMode === 'function' ? getMonteCarloSeedMode() : null)"
  );
  assertNotMatches(label, html, /seed_mode:\s*lastMonteCarloRunMetadata\?\.seedMode\s*\|\|\s*getMonteCarloSeedMode\(\)/, 'unsafe getMonteCarloSeedMode call');

  for (const fn of [
    'updateShareButtons',
    'buildJSONExportSnapshot',
    'generateMonteCarloSeed',
    'getMonteCarloSeedMode'
  ]) {
    const needle = `function ${fn}(`;
    const sourceCount = countOccurrences(sourceBundle, needle);
    const htmlCount = countOccurrences(html, needle);
    if (sourceCount !== 1) fail(`source bundle has ${sourceCount} definitions for ${fn}, expected 1.`);
    if (htmlCount !== 1) fail(`${label}: generated standalone has ${htmlCount} definitions for ${fn}, expected 1.`);
    if (sourceCount === 1 && htmlCount === 1) pass(`${label}: ${fn} is defined once.`);
  }
}

function validateMonteCarloChartExport(label, html, sourceBundle) {
  const sourceLabel = 'Source: arewealoneintheuniverse.com';
  assertIncludes('source bundle', sourceBundle, sourceLabel);
  assertIncludes(label, html, sourceLabel);
  assertIncludes(label, html, 'source: spec.sourceUrl || MONTE_CARLO_CHART_SOURCE_URL');
  assertIncludes(label, html, 'text(spec.yAxisLabel, plot.x, plot.y - 54');
  assertNotMatches(label, html, /text\(spec\.yAxisLabel,\s*28,\s*plot\.y\s*\+\s*40/, 'old clipped PDF y-axis label placement');
}

function validateFermiPanelExport(label, html) {
  const thereforeSymbol = String.fromCharCode(8756);
  if (String(html).includes(thereforeSymbol)) fail(`${label}: found therefore symbol in Fermi panel heading.`);
  else pass(`${label}: no therefore symbol in Fermi panel heading.`);
  assertIncludes(label, html, 'Interpretation &amp; Fermi Context');
  assertMatches(label, html, /id="fermi-mode-mc"[^>]*class="fermi-toggle-btn active"|class="fermi-toggle-btn active"[^>]*id="fermi-mode-mc"/, 'MC Fermi button starts active');
  assertIncludes(label, html, "let fermiMode = 'mc';");
  assertIncludes(label, html, "renderFermiBox(hasCurrentMc ? 'mc' : 'dt');");
  assertIncludes(label, html, 'justify-content:flex-start;');
}

function checkExtractedScriptSyntax(label, html, keepTemp) {
  const blocks = extractInlineScriptBlocks(html);
  if (blocks.length < 6) {
    fail(`${label}: expected at least 6 inlined local JS blocks, found ${blocks.length}.`);
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-js-'));
  try {
    for (const block of blocks) {
      const safeName = block.source.replace(/[^\w.-]+/g, '_');
      const tmpFile = path.join(tmpDir, `${safeName}.js`);
      fs.writeFileSync(tmpFile, block.code, 'utf8');
      const result = spawnSync(process.execPath, ['--check', tmpFile], {
        cwd: root,
        encoding: 'utf8'
      });
      if (result.status !== 0) {
        const output = [result.stdout, result.stderr].filter(Boolean).join('').trim();
        fail(`${label}: syntax check failed for ${block.source}${output ? `\n${output}` : ''}`);
      } else {
        pass(`${label}: extracted JS syntax passed for ${block.source}.`);
      }
    }
  } finally {
    if (!keepTemp) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } else {
      process.stdout.write(`Kept extracted JS temp directory: ${tmpDir}\n`);
    }
  }
}

function smokeTestShareSeedMetadata() {
  const shareJs = read('src/share.js');
  const context = {
    console,
    Date,
    Math,
    Number,
    Object,
    Array,
    String,
    setTimeout() {},
    navigator: { clipboard: null },
    BASE_SAMPLE_IDS: ['N_GHZ'],
    SENS_LABELS: { N_GHZ: 'GHZ stars' },
    MONTE_CARLO_PRNG: 'Mulberry32',
    MONTE_CARLO_PRNG_DESCRIPTION: 'Mulberry32 32-bit deterministic PRNG',
    lastMonteCarloRunMetadata: null,
    simulationCompleted: false,
    activePreset: 'test-preset',
    galaxyName: 'Milky Way',
    astronomyOverrideMode: null,
    currentScale: 'galaxy',
    fermiMode: 'dt',
    intervalsVisible: true,
    isH2OEnabled: false,
    isCHNOPSEnabled: false,
    isComplexLifeEnabled: false,
    isXEnabled: false,
    ADV: { enabled: false, modules: {} },
    isGalaxySettingsEnabled: false,
    galaxyScalingMode: 'manual',
    MW_TOTAL_STARS: 200000000000,
    MW_DEFAULT_GHZ_FRACTION: 0.05,
    getEffectiveNGHZ() {
      return { value: 1e10, source: 'manual_raw_N_GHZ', metadata: null };
    },
    getNGHZSource() {
      return 'manual_raw_N_GHZ';
    },
    sanitizePositiveInput() {
      return 1e10;
    },
    pf(id, fallback) {
      return fallback;
    },
    monteCarloBoundsMode: null,
    monteCarloUncertaintyBasisLabel: null,
    deterministicPlanets: 12,
    mcMedianQ50: null,
    mcArithmeticMean: null,
    mcQ025: null,
    mcQ975: null,
    stdDev: null,
    fermiContexts: {},
    rawNumber(id, fallback) {
      if (id === 'sampling_uncertainty') return 50;
      return fallback;
    },
    byId(id) {
      const values = {
        iterations: { value: '25' },
        'simulation-engine': { value: 'standard' },
        distribution: { value: 'lognormal' },
        'correlation-model': { value: 'independent' },
        'robust-bounds': { checked: false },
        deterministicResult: { textContent: 'deterministic result' },
        monteCarloResult: { textContent: '' },
        simulationModel: { textContent: '' },
        distance: { textContent: '' }
      };
      return values[id] || null;
    },
    serializeControlTree() {
      return {};
    },
    getActiveDistanceSnapshot() {
      return {};
    },
    getMonteCarloState() {
      return 'not-run';
    },
    getScenarioExportLabel() {
      return 'Test scenario';
    },
    getScenarioState() {
      return { label: 'test' };
    },
    getAstronomyPriorExportSnapshot() {
      return {
        astronomy_override_mode: null,
        source_label: 'Scenario astronomy values',
        astronomy_model_type: 'scenario_factorized',
        occurrence_mode: 'factorized'
      };
    },
    downloadBlob() {}
  };
  context.window = context;

  vm.runInContext(shareJs, vm.createContext(context), { filename: 'src/share.js' });

  try {
    const noSeedFunction = vm.runInContext('buildJSONExportSnapshot()', context, { filename: 'share-seed-smoke-no-function.js' });
    if (noSeedFunction.simulation.seed_mode !== null) {
      fail(`share seed metadata smoke: expected null seed_mode without getMonteCarloSeedMode, got ${noSeedFunction.simulation.seed_mode}.`);
    } else {
      pass('share seed metadata smoke: missing getMonteCarloSeedMode does not throw and exports null seed_mode.');
    }

    context.lastMonteCarloRunMetadata = {
      seed: 12345,
      seedMode: 'fixed',
      prng: 'Mulberry32',
      prngDescription: 'Mulberry32 32-bit deterministic PRNG'
    };
    const withRunMeta = vm.runInContext('buildJSONExportSnapshot()', context, { filename: 'share-seed-smoke-run-meta.js' });
    if (
      withRunMeta.simulation.seed !== 12345 ||
      withRunMeta.simulation.seed_mode !== 'fixed' ||
      withRunMeta.simulation.prng !== 'Mulberry32'
    ) {
      fail('share seed metadata smoke: run metadata seed fields were not preserved.');
    } else {
      pass('share seed metadata smoke: run metadata seed fields are preserved.');
    }
  } catch (error) {
    fail(`share seed metadata smoke threw unexpectedly: ${error.stack || error.message}`);
  }
}

function validateStandalone(label, html, sourceBundle, keepTemp) {
  validateOperatorParity(label, html, sourceBundle);
  validateSeedAndDuplicateLogic(label, html, sourceBundle);
  validateMonteCarloChartExport(label, html, sourceBundle);
  validateFermiPanelExport(label, html);
  checkExtractedScriptSyntax(label, html, keepTemp);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const sourceBundle = [
    read('index.html'),
    read('src/styles.css'),
    read('src/scientific-parameters.js'),
    read('src/calculator-core.js'),
    read('src/charts.js'),
    read('src/share.js'),
    read('src/accessibility.js'),
    read('src/app.js')
  ].join('\n');

  const generatedHtml = buildStandaloneHtml();
  validateStandalone('fresh standalone export', generatedHtml, sourceBundle, args.keepTemp);

  if (args.standalone) {
    const standaloneHtml = fs.readFileSync(args.standalone, 'utf8');
    validateStandalone(path.basename(args.standalone), standaloneHtml, sourceBundle, args.keepTemp);
  }

  smokeTestShareSeedMetadata();

  if (failures > 0) {
    process.stderr.write(`${failures} standalone export consistency issue(s) found.\n`);
    process.exit(1);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
