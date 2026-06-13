#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const banned = [
  ['Post', 'JWST'].join('-'),
  ['Pre', 'JWST'].join('-'),
  ['Bryson', 'JWST'].join(' + '),
  ['Dissolving', 'Fermi'].join(' '),
  ['published', 'scenario'].join(' '),
  ['Petigura', '2013: 1.6'].join(' '),
  ['data-preset=', '"jwst"'].join(''),
  ['loadPreset(', "'jwst'", ')'].join(''),
  ['preset-btn', 'jwst'].join('.'),
  ['setPreset', 'Bounds'].join('')
];

const governancePatterns = [
  {
    label: 'proves extraterrestrial life',
    pattern: /\bproves?\s+(?:the\s+existence\s+of\s+)?extraterrestrial\s+life\b/i
  },
  {
    label: 'predicts life in the galaxy',
    pattern: /\bpredicts?\s+life\s+in\s+the\s+galaxy\b/i
  },
  {
    label: 'empirical census of life',
    pattern: /\bempirical\s+census\s+of\s+life\b/i
  },
  {
    label: 'definitive estimate',
    pattern: /\bdefinitive\s+estimate\b/i
  }
];

const explicitDisclaimerPattern =
  /\b(not|does\s+not|do\s+not|is\s+not|are\s+not|should\s+not|never|no)\b/i;
const misleadingPosteriorPatterns = [
  {
    label: 'misleading broad posterior wording',
    pattern: /\b(?:the\s+)?posterior\s+is\s+(?:still\s+)?broad\b/gi
  }
];
const misleadingPublicFacingPatterns = [
  {
    label: 'old sampled interval quantile separator',
    pattern: /q2\.5~q97\.5/gi
  },
  {
    label: 'misleading broad posterior wording',
    pattern: /\b(?:the\s+)?posterior\s+is\s+(?:still\s+)?broad\b/gi
  },
  {
    label: 'misleading nearest-planet wording',
    pattern: /\bnearest Earth-like planet\b/gi
  },
  {
    label: 'over-broad Earth-like planet count wording',
    pattern: /\bnumber of Earth-like planets\b/gi
  },
  {
    label: 'misleading direct-count wording',
    pattern: /\bdirect count of Earth-like planets\b/gi
  },
  {
    label: 'over-broad multiplicative-model wording',
    pattern: /\bfull multiplicative model\b/gi
  },
  {
    label: 'over-broad Monte Carlo sampling wording',
    pattern: /\bfor each enabled parameter\b/gi
  }
];
const directCensusPattern = /\bdirect census of Earth-like planets\b/gi;
const negativeDirectCensusPattern =
  /\bnot\s+(?:as\s+)?a\s+direct\s+census\s+of\s+Earth-like\s+planets\b/i;

let failures = 0;

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, acc);
    } else if (predicate(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function scanFiles() {
  const files = [
    path.join(root, 'index.html'),
    path.join(root, 'README.md'),
    path.join(root, 'CHANGELOG.md'),
    path.join(root, 'RELEASE_NOTES_v2.14.md'),
    path.join(root, 'RELEASE_NOTES_v2.15.md')
  ];

  files.push(...walk(path.join(root, 'src'), file => file.endsWith('.js')));
  files.push(...walk(path.join(root, 'docs'), file => file.endsWith('.md')));

  return [...new Set(files)].sort((a, b) => rel(a).localeCompare(rel(b)));
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function sentenceAround(text, index) {
  const startCandidates = [
    text.lastIndexOf('.', index - 1),
    text.lastIndexOf('\n', index - 1)
  ];
  const endCandidates = [
    text.indexOf('.', index),
    text.indexOf('\n', index)
  ].filter(value => value !== -1);
  const start = Math.max(-1, ...startCandidates) + 1;
  const end = endCandidates.length ? Math.min(...endCandidates) + 1 : text.length;
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function getDivById(text, id) {
  const startRe = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
  const startMatch = startRe.exec(text);
  if (!startMatch) return '';
  let depth = 1;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = startMatch.index + startMatch[0].length;
  let match;
  while ((match = tagRe.exec(text)) !== null) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return text.slice(startMatch.index, match.index + match[0].length);
    } else {
      depth += 1;
    }
  }
  return '';
}

function makeFixedDate(isoTimestamp) {
  const RealDate = Date;
  function FixedDate(...args) {
    if (new.target) {
      return args.length ? new RealDate(...args) : new RealDate(isoTimestamp);
    }
    return args.length ? RealDate(...args) : new RealDate(isoTimestamp).toString();
  }
  FixedDate.UTC = RealDate.UTC;
  FixedDate.parse = RealDate.parse;
  FixedDate.now = () => new RealDate(isoTimestamp).getTime();
  FixedDate.prototype = RealDate.prototype;
  return FixedDate;
}

function runHistoricalSignalContextRegression() {
  const historyStart = coreJs.indexOf('const HISTORY_DB = [');
  const historyEnd = coreJs.indexOf('function getNearestStar', historyStart);
  const wrapperStart = coreJs.indexOf('function getHistoricalContext', historyEnd);
  const wrapperEnd = coreJs.indexOf('function getConfigurationWarnings', wrapperStart);

  if (historyStart === -1 || historyEnd === -1 || wrapperStart === -1 || wrapperEnd === -1) {
    fail('Historical signal-context code blocks could not be located in calculator-core.js.');
    return;
  }

  const sandbox = {
    globalThis: {},
    Date: makeFixedDate('2026-06-06T12:00:00Z'),
    Math,
    Number,
    Array,
    Object,
    String,
    parseFloat,
    parseInt,
    isNaN,
    Infinity,
    NaN
  };
  vm.createContext(sandbox);

  try {
    vm.runInContext(
      `${coreJs.slice(historyStart, historyEnd)}
${coreJs.slice(wrapperStart, wrapperEnd)}
globalThis.__historicalRegression = {
  HISTORICAL_SIGNAL_CONTEXT,
  findNearestHistoricalAnchor,
  formatHistoricalYear,
  getHistoricalContextForLookback,
  getHistoricalContext
};`,
      sandbox,
      { filename: 'calculator-core-historical-context.js' }
    );
  } catch (error) {
    fail(`Historical signal-context runtime regression could not execute: ${error.message}`);
    return;
  }

  const api = sandbox.globalThis.__historicalRegression;
  if (!api) {
    fail('Historical signal-context runtime regression did not expose helper functions.');
    return;
  }

  const nearPresent = api.getHistoricalContextForLookback(11.77, 2026.43);
  const wrappedNearPresent = api.getHistoricalContext(11.77);
  const around2000 = api.getHistoricalContextForLookback(26, 2026.43);

  if (nearPresent?.nearestAnchor?.periodLabel !== 'the early 2010s') {
    fail('Historical context regression: 11.77-year lookback no longer maps to the early 2010s.');
  }
  if (!wrappedNearPresent?.text?.includes('the early 2010s')) {
    fail('Historical context regression: legacy getHistoricalContext wrapper does not use the corrected v2 lookup.');
  }
  if (/around 2000|human[- ]genome draft/i.test(wrappedNearPresent?.text || '')) {
    fail('Historical context regression: near-present lookback still falls through to the old around-2000 anchor.');
  }
  if (!around2000?.text?.includes('around 2000')) {
    fail('Historical context regression: genuine around-2000 lookbacks no longer map to the around-2000 anchor.');
  }
  if (api.formatHistoricalYear(0) !== 'around the 1 BCE / 1 CE boundary') {
    fail('Historical context regression: BCE/CE boundary formatting reintroduced year-zero wording.');
  }
  if (api.HISTORICAL_SIGNAL_CONTEXT.some(anchor => Object.prototype.hasOwnProperty.call(anchor, 'y') && anchor.y === 2000)) {
    fail('Historical context regression: legacy modern HISTORY_DB anchors were not filtered out of the active lookup.');
  }
}

const files = scanFiles();
const combinedText = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const coreJs = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
const shareJs = fs.readFileSync(path.join(root, 'src', 'share.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
const publicFacingFiles = [
  path.join(root, 'index.html'),
  ...walk(path.join(root, 'src'), file => file.endsWith('.js'))
].filter(file => fs.existsSync(file));

runHistoricalSignalContextRegression();

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);

  for (const phrase of banned) {
    let fromIndex = 0;
    while (true) {
      const index = text.indexOf(phrase, fromIndex);
      if (index === -1) break;
      const loc = lineAndColumn(text, index);
      fail(`${relative}:${loc.line}:${loc.column} contains banned phrase "${phrase}".`);
      fromIndex = index + phrase.length;
    }
  }

  for (const check of governancePatterns) {
    const pattern = new RegExp(check.pattern.source, check.pattern.flags.includes('g') ? check.pattern.flags : `${check.pattern.flags}g`);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const sentence = sentenceAround(text, match.index);
      if (!explicitDisclaimerPattern.test(sentence)) {
        const loc = lineAndColumn(text, match.index);
        fail(
          `${relative}:${loc.line}:${loc.column} contains strong governance phrase ` +
          `"${check.label}" outside an explicit disclaimer: "${sentence}"`
        );
      }
    }
  }

  for (const check of misleadingPosteriorPatterns) {
    let match;
    while ((match = check.pattern.exec(text)) !== null) {
      const loc = lineAndColumn(text, match.index);
      fail(`${relative}:${loc.line}:${loc.column} contains ${check.label}: "${match[0]}".`);
    }
  }
}

for (const file of publicFacingFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);

  for (const check of misleadingPublicFacingPatterns) {
    check.pattern.lastIndex = 0;
    let match;
    while ((match = check.pattern.exec(text)) !== null) {
      const loc = lineAndColumn(text, match.index);
      fail(`${relative}:${loc.line}:${loc.column} contains ${check.label}: "${match[0]}".`);
    }
  }

  directCensusPattern.lastIndex = 0;
  let match;
  while ((match = directCensusPattern.exec(text)) !== null) {
    const sentence = sentenceAround(text, match.index);
    if (!negativeDirectCensusPattern.test(sentence)) {
      const loc = lineAndColumn(text, match.index);
      fail(
        `${relative}:${loc.line}:${loc.column} contains direct-census wording ` +
        `outside the approved negative disclaimer: "${sentence}"`
      );
    }
  }
}

const forbiddenSourceFragments = [
  { label: 'old Henry DOI', value: ['10.1086', '507268'].join('/') },
  { label: 'old Driscoll/Bercovici DOI', value: ['10.1016', 'j.pepi.2014.07.007'].join('/') },
  { label: 'broken Cirkovic DOI', value: ['10.1007', 's10701-018-0170-6'].join('/') },
  { label: 'broken Matteucci DOI', value: ['10.1017', 'CBO9781139020739'].join('/') },
  { label: 'old Monte Carlo CI label', value: '95% CI' },
  {
    label: 'obsolete active-transmitter timing wording',
    value: ['Probability any given planet hosts an active', 'transmitter right now'].join(' ')
  },
  {
    label: 'old universe-scale galaxy multiplier wording',
    value: 'Naive scaling from the current'
  },
  {
    label: 'old historical signal-time wording',
    value: 'that is roughly the time since'
  },
  {
    label: 'user-facing historical year zero',
    value: 'year 0'
  },
  {
    label: 'misleading no-expected active detectable transmitter wording',
    value: 'no expected active detectable transmitter inside the current horizon'
  },
  {
    label: 'double-period historical fallback risk',
    value: "no contextual anchor is available for this lookback.'}."
  }
];

for (const check of forbiddenSourceFragments) {
  if (combinedText.includes(check.value)) {
    fail(`Forbidden source/text fragment remains: ${check.label}.`);
  }
}

const requiredSourceFragments = [
  { label: 'correct Henry DOI', value: ['10.1086', '508233'].join('/') },
  { label: 'correct Driscoll/Bercovici DOI', value: ['10.1016', 'j.pepi.2014.08.004'].join('/') },
  { label: 'Bryson 2021 DOI for f_orbit', value: ['10.3847', '1538-3881/abc418'].join('/') },
  { label: 'Kopparapu 2013 DOI for f_orbit', value: ['10.1088', '0004-637X/765/2/131'].join('/') },
  {
    label: 'correct detection timing wording',
    value: 'Temporal overlap term'
  },
  {
    label: 'corrected historical signal context helper',
    value: 'getHistoricalContextForLookback'
  },
  {
    label: 'corrected historical signal context wording',
    value: 'In historical terms, that points roughly to'
  },
  {
    label: 'single-period historical context sentence helper',
    value: 'historicalContextText'
  },
  {
    label: 'sub-Poisson detectable-transmitter wording',
    value: 'fewer than one expected active detectable transmitter inside the current horizon'
  },
  {
    label: 'detection panel Fermi-basis alignment helper',
    value: 'getDetectionPanelBasis'
  },
  {
    label: 'detection panel basis disclosure',
    value: 'same count basis as the current Fermi DT view'
  },
  {
    label: 'historical BCE/CE boundary label',
    value: 'around the 1 BCE / 1 CE boundary'
  },
  {
    label: 'LaTeX neutral range heading',
    value: 'Range / uncertainty interval'
  },
  {
    label: 'galaxy preset model note',
    value: 'Galaxy presets are model inputs'
  },
  {
    label: 'sampled model interval wording',
    value: '95% sampled model interval'
  },
  {
    label: 'radial density distance model',
    value: 'Radial density model'
  },
  {
    label: 'Fermi-tension heuristic UI bucket clarification',
    value: 'Fermi-tension labels are heuristic UI buckets'
  },
  {
    label: 'binary module overlap note (stacking with f_stability)',
    value: 'restrictive values can stack with f_stability'
  },
  {
    label: 'space weather overlap note (magnetosphere/radiation)',
    value: 'overlap conceptually with magnetosphere and radiation-survival'
  },
  {
    label: 'radiation survival overlap note (magnetosphere/space-weather)',
    value: 'overlap conceptually with magnetosphere and space-weather'
  },
  {
    label: 'atmospheric retention overlap note (surface water)',
    value: 'Atmospheric retention can overlap conceptually with surface-water retention'
  },
  {
    label: 'surface water overlap note (atmospheric retention)',
    value: 'Surface-water availability depends partly on atmospheric retention'
  },
  {
    label: 'magnetosphere overlap note (radiation/space-weather stacking)',
    value: 'Related radiation and space-weather modules may stack with this factor'
  },
  {
    label: 'BibTeX maintenance comment in share.js',
    value: 'Maintenance note: this BibTeX list duplicates source metadata'
  },
  {
    label: 'GHZ inner fraction named constant',
    value: 'GHZ_INNER_FRAC'
  },
  {
    label: 'GHZ outer fraction named constant',
    value: 'GHZ_OUTER_FRAC'
  },
  {
    label: 'cross-module compound atmosphere/shielding warning text',
    value: 'compound-stress scenario'
  },
  {
    label: 'noscript fallback notice',
    value: 'JavaScript is required.'
  },
  {
    label: 'observable-universe star-count scaling wording',
    value: 'Observable-universe star-count scaling'
  },
  {
    label: 'observable-universe star-count range',
    value: '10<sup>22</sup>~10<sup>24</sup> stars'
  },
  {
    label: 'ESA universe star-count source',
    value: 'www.esa.int/Science_Exploration/Space_Science/How_many_stars_are_there_in_the_Universe'
  },
  {
    label: 'NASA Star Basics source',
    value: 'science.nasa.gov/universe/stars/'
  },
  {
    label: 'Liske et al. 2003 / Driver IAU 2003 extrapolation source',
    value: 'doi.org/10.1046/j.1365-8711.2003.06826.x'
  },
  {
    label: 'van Dokkum and Conroy source',
    value: 'arxiv.org/abs/1009.5992'
  }
];

for (const check of requiredSourceFragments) {
  if (!combinedText.includes(check.value)) {
    fail(`Required source/text fragment missing: ${check.label}.`);
  }
}

const shortRangeLabel = ['Lit', ' range'].join('.');
for (const [cardId, label] of [
  ['card-f_complex_life', 'f_complex_life'],
  ['card-f_x', 'f_x']
]) {
  const card = getDivById(indexHtml, cardId);
  if (!card) {
    fail(`Required card missing for source text check: ${label}`);
  } else if (card.includes(shortRangeLabel)) {
    fail(`${label} still uses the short literature-range label.`);
  }
}

if (shareJs.includes(['Literature', 'range'].join(' '))) {
  fail('LaTeX export still uses the old literature-range column heading.');
}

const detectionTraceStart = appJs.indexOf('function buildConsoleDetectionTrace');
const detectionTraceEnd = appJs.indexOf('function renderCalculationConsole', detectionTraceStart);
const detectionTraceBlock =
  detectionTraceStart !== -1 && detectionTraceEnd !== -1
    ? appJs.slice(detectionTraceStart, detectionTraceEnd)
    : '';
if (!detectionTraceBlock) {
  fail('buildConsoleDetectionTrace block could not be located for GHZ constant regression check.');
} else if (detectionTraceBlock.includes('outerLy / 0.85') || detectionTraceBlock.includes('/ 0.85')) {
  fail('buildConsoleDetectionTrace hardcodes the GHZ outer fraction instead of GHZ_OUTER_FRAC.');
} else if (!detectionTraceBlock.includes('outerLy / GHZ_OUTER_FRAC')) {
  fail('buildConsoleDetectionTrace does not reference GHZ_OUTER_FRAC when recovering galaxy diameter.');
} else if (
  !detectionTraceBlock.includes("'external-range-gate'") ||
  !detectionTraceBlock.includes('range_gate') ||
  !detectionTraceBlock.includes('earth_distance')
) {
  fail('buildConsoleDetectionTrace does not expose the external-galaxy range-gate branch.');
}

if (/<a\b[^>]*href=["']#["']/i.test(indexHtml)) {
  fail('index.html still contains a placeholder hash anchor.');
}

if (/\b(?:Monte Carlo mean|MC mean)\b/i.test(combinedText)) {
  fail('Monte Carlo q50/median is still ambiguously labelled as mean somewhere in public text or docs.');
}

if (
  !shareJs.includes('mc_median_q50') ||
  !shareJs.includes('mcArithmeticMean') ||
  !shareJs.includes('distance_radial_ly') ||
  !shareJs.includes('mcMode') ||
  !shareJs.includes('uncertaintyBasisLabel') ||
  !shareJs.includes('detection_count_basis') ||
  !shareJs.includes('detection_count') ||
  !shareJs.includes('fermi_context') ||
  !shareJs.includes('historical_context')
) {
  fail('JSON export is missing explicit MC, detection-basis, Fermi, historical-context, uncertainty-basis, or radial-distance fields.');
}

if (!shareJs.includes('MC q50 median') || !shareJs.includes('MC arithmetic mean')) {
  fail('LaTeX/share export does not expose separate MC q50 median and arithmetic mean labels.');
}

if (!shareJs.includes('LaTeX export is a compact parameter/result table')) {
  fail('LaTeX export does not document its compact table-only scope.');
}

if (/nearest habitable planet estimate/i.test(appJs + '\n' + coreJs + '\n' + indexHtml + '\n' + shareJs)) {
  fail('Public UI/export text still contains unqualified "nearest habitable planet estimate".');
}

if (!coreJs.includes('modelled Earth-like candidates in') || !shareJs.includes('modelled Earth-like candidate estimate')) {
  fail('Headline result/export labels do not qualify Earth-like planet outputs as modelled candidates.');
}

if (!coreJs.includes('nearest-neighbour distance scale, not a detected planet distance')) {
  fail('Distance panel basis label does not identify nearest-neighbour scale as not a detected planet distance.');
}

if (appJs.includes('buildFermiCommunicationSupplementHtml(fermiMode)')) {
  fail('Fermi panel still renders the legacy Detectability now / Contact threshold supplement.');
}

if (coreJs.includes('(100 * pAtLeastOne).toFixed(1)') || !coreJs.includes('fmtExistencePct(pAtLeastOne)')) {
  fail('Sparse Poisson probability display does not use fmtExistencePct(pAtLeastOne).');
}

if (/no such planet at all/i.test(coreJs)) {
  fail('Sparse Fermi wording still says "no such planet at all".');
}

if (/detection sphere/i.test(appJs + '\n' + coreJs + '\n' + indexHtml + '\n' + shareJs)) {
  fail('2D SETI density wording still refers to a detection sphere.');
}

if (/Detectability now|Contact threshold/i.test(appJs + '\n' + coreJs + '\n' + indexHtml + '\n' + shareJs)) {
  fail('Legacy visible SETI supplement labels remain in public source.');
}

if (/detectable civilisations?|detectable civilizations?|active detectable civilisation|active detectable civilization|civilisation exists|civilization exists|civilisation in range|civilization in range/i.test(appJs + '\n' + coreJs + '\n' + indexHtml + '\n' + shareJs)) {
  fail('Public UI/export SETI text still uses civilisation-existence wording instead of active-detectable-transmitter wording.');
}

if (
  !shareJs.includes('getMonteCarloState') ||
  !shareJs.includes('mcState') ||
  !shareJs.includes('simulationCompleted') ||
  !shareJs.includes("'not-run'") ||
  !shareJs.includes("'stale'") ||
  !shareJs.includes("'current'")
) {
  fail('Export code does not expose the explicit not-run/current/stale MC state.');
}

// "Earth-like planets" used as model output must be immediately qualified
// (modelled / candidate / scenario-dependent) or sit inside an explicit
// disclaimer. Quoted scientific source titles live in scientific-parameters.js
// (excluded) and historical audit records under docs/audits/ are excluded.
const earthLikeQualifiers = /\b(modelled|candidate|scenario-dependent)\b/i;
const earthLikePlanetsPattern = /Earth-like planets/gi;
const earthLikeScanFiles = [
  path.join(root, 'index.html'),
  path.join(root, 'README.md'),
  ...walk(path.join(root, 'src'), file => file.endsWith('.js') && !file.endsWith('scientific-parameters.js')),
  ...walk(path.join(root, 'docs'), file => file.endsWith('.md') && !rel(file).includes('docs/audits/'))
].filter(file => fs.existsSync(file));

for (const file of earthLikeScanFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);
  earthLikePlanetsPattern.lastIndex = 0;
  let match;
  while ((match = earthLikePlanetsPattern.exec(text)) !== null) {
    const preceding = text.slice(Math.max(0, match.index - 40), match.index);
    const sentence = sentenceAround(text, match.index);
    const qualified = earthLikeQualifiers.test(preceding) || explicitDisclaimerPattern.test(sentence);
    if (!qualified) {
      const loc = lineAndColumn(text, match.index);
      fail(
        `${relative}:${loc.line}:${loc.column} uses unqualified "Earth-like planets" as a ` +
        `model output; qualify as modelled/candidate/scenario-dependent: "${sentence}"`
      );
    }
  }
}

// The literal "tells you how many Earth-like planets" overclaim must not reappear.
if (/tells you how many Earth-like planets/i.test(combinedText)) {
  fail('Public text still claims the calculator "tells you how many Earth-like planets" exist.');
}

// Public-facing text must not imply confirmed, detected, or empirically counted
// planets (a positive claim outside an explicit disclaimer).
const empiricalClaimPatterns = [
  {
    label: 'confirmed/detected/observed Earth-like planet wording',
    pattern: /\b(?:confirmed|detected|observed|measured|catalogued)\s+(?:number\s+of\s+|count\s+of\s+)?Earth-like\s+(?:planets|candidates|worlds)\b/gi
  },
  {
    label: 'empirical/direct count of planets',
    pattern: /\b(?:empirically|directly)\s+(?:counts?|counted|measures?|measured|detects?|detected)\b[^.]*\bplanets\b/gi
  }
];
for (const file of earthLikeScanFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);
  for (const check of empiricalClaimPatterns) {
    check.pattern.lastIndex = 0;
    let match;
    while ((match = check.pattern.exec(text)) !== null) {
      const sentence = sentenceAround(text, match.index);
      if (!explicitDisclaimerPattern.test(sentence)) {
        const loc = lineAndColumn(text, match.index);
        fail(`${relative}:${loc.line}:${loc.column} implies ${check.label}: "${sentence}"`);
      }
    }
  }
}

// "confidence interval" in public-facing UI text must always be
// explicitly negated or clarified as not observational.
const confidenceIntervalPattern = /confidence interval/gi;
for (const file of publicFacingFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);
  confidenceIntervalPattern.lastIndex = 0;
  let match;
  while ((match = confidenceIntervalPattern.exec(text)) !== null) {
    const sentence = sentenceAround(text, match.index);
    if (!explicitDisclaimerPattern.test(sentence)) {
      const loc = lineAndColumn(text, match.index);
      fail(
        `${relative}:${loc.line}:${loc.column} presents "confidence interval" without an explicit ` +
        `not-observational disclaimer: "${sentence}"`
      );
    }
  }
}

// Core-equations panel presence checks.
// Equations are rendered with MathJax (\[ ... \]); checks match the LaTeX source.
const ceqChecks = [
  { label: 'panel title',          needle: 'Core equations used by the calculator' },
  { label: 'Poisson existence P',  needle: 'P(\\geq 1) = 1 - e^{-N}' },
  { label: 'universe Y_star',      needle: 'Y_{\\star} = \\frac{N}{N_{\\mathrm{GHZ}}}' },
  { label: 'universe N_universe',  needle: 'N_{\\mathrm{universe}} = Y_{\\star}' },
  { label: 'epistemic caution',    needle: 'not a direct census of confirmed planets' }
];
for (const check of ceqChecks) {
  if (indexHtml.includes(check.needle)) {
    pass(`Core-equations panel: ${check.label} present.`);
  } else {
    fail(`Core-equations panel: ${check.label} missing ("${check.needle}").`);
  }
}
// Ensure no unqualified model-output "Earth-like planets" was introduced by the panel.
// Extract the panel block by looking for the panel id up to the closing </details>.
const ceqPanelStart = indexHtml.indexOf('id="core-equations-panel"');
const ceqPanelEnd = ceqPanelStart !== -1 ? indexHtml.indexOf('</details>', ceqPanelStart) : -1;
const ceqPanelBlock = ceqPanelStart !== -1 && ceqPanelEnd !== -1
  ? indexHtml.slice(ceqPanelStart, ceqPanelEnd + '</details>'.length)
  : '';
if (/Earth-like planets/.test(ceqPanelBlock)) {
  fail('Core-equations panel contains unqualified "Earth-like planets" model-output phrase.');
}

// Historical signal-context text must not contain the old missing-dash artifact
// where separator dashes were stripped into three spaces.
const calculatorCoreText = fs.readFileSync(path.join(root, 'src', 'calculator-core.js'), 'utf8');
const historyTripleSpaceMatches = calculatorCoreText.match(/text:"[^"]* {3,}[^"]*"/g) || [];
if (historyTripleSpaceMatches.length > 0) {
  fail(
    `HISTORY_DB contains ${historyTripleSpaceMatches.length} text entr` +
    `${historyTripleSpaceMatches.length === 1 ? 'y' : 'ies'} with three-space dash artifacts.`
  );
} else {
  pass('HISTORY_DB dash separators are normalized.');
}

if (calculatorCoreText.includes("Roman Republic\\'s expansion")) {
  pass('Historical context includes corrected Roman Republic possessive.');
} else {
  fail('Historical context is missing corrected "Roman Republic\\\'s expansion" wording.');
}

if (calculatorCoreText.includes("history\\'s earliest empires")) {
  pass('Historical context includes corrected history possessive.');
} else {
  fail('Historical context is missing corrected "history\\\'s earliest empires" wording.');
}

if (failures) {
  process.stderr.write(`String regression test failed with ${failures} issue(s).\n`);
  process.exit(1);
}

pass(`No banned scientific-regression phrases found in ${files.length} files.`);
pass('Strong proof/prediction language only appears inside explicit disclaimers.');
