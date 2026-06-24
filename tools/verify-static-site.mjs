#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'index.html', 'README.md', 'LICENSE.md', 'NOTICE.md', 'CITATION.cff', '404.html',
  '.nojekyll', '.gitignore', '.gitattributes', 'src/scientific-parameters.js', 'src/calculator-core.js', 'src/app.js',
  'src/charts.js', 'src/share.js', 'src/accessibility.js', 'src/styles.css',
  'docs/MODEL_SCOPE.md', 'docs/REUSE_AND_ATTRIBUTION.md',
  'docs/MONTE_CARLO_METHOD.md', 'docs/PARAMETER_REGISTRY.md'
];
const refs = ['src/styles.css', 'src/scientific-parameters.js', 'src/calculator-core.js', 'src/charts.js', 'src/share.js', 'src/accessibility.js', 'src/app.js'];
const markers = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'localhost', 'C:\\', 'TODO', 'FIXME', 'console.log', 'debugger'];
const markerScanExcluded = new Set(['tools/verify-static-site.mjs']);
// console.log is permitted ONLY inside these explicit browser-console development
// helper functions (they must match the standalone reference). Accidental console.log
// anywhere else in production source is still flagged.
const consoleLogAllowlist = {
  'src/share.js': ['runGalaxySettingsTests', 'runHistoricalContextTests', 'runAllOccurrenceTests', 'runMonteCarloDisplayConfigTests', 'runExceedanceChartTests']
};
// Identifier-style placeholder markers must match as standalone tokens, not as a
// substring of a longer valid identifier (e.g. TOKEN inside MC_BASIS_INTERVAL_TOKENS).
// Markers containing non-identifier characters (console.log, C:\) keep substring matching.
function markerPresent(text, marker) {
  if (/^[A-Za-z0-9_]+$/.test(marker)) {
    return new RegExp('(?<![A-Za-z0-9_])' + marker + '(?![A-Za-z0-9_])').test(text);
  }
  return text.includes(marker);
}
// Returns a Set of allowed line indices for console.log in `rel`, or null if the file
// has no allowlist. A function body spans from its `function <name>(` signature line
// through the first subsequent line that is a bare closing brace at column 0
// (the top-level function terminator used throughout the source).
function consoleLogAllowedLines(rel, text) {
  const fns = consoleLogAllowlist[rel];
  if (!fns) return null;
  const lines = text.split(/\r?\n/);
  const sigRe = new RegExp('^\\s*function\\s+(?:' + fns.join('|') + ')\\b');
  const allowed = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!sigRe.test(lines[i])) continue;
    let j = i;
    for (; j < lines.length; j++) {
      allowed.add(j);
      if (j > i && /^\}\s*$/.test(lines[j])) break;
    }
    i = j;
  }
  return allowed;
}
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.cache']);
let failures = 0;
function fail(message) { failures += 1; process.stderr.write('FAIL: ' + message + '\n'); }
function pass(message) { process.stdout.write('PASS: ' + message + '\n'); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function walk(dir = root, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) fail('Missing required file: ' + file);
if (failures === 0) pass('Required files exist');
const index = fs.existsSync(path.join(root, 'index.html')) ? read('index.html') : '';
for (const ref of refs) if (!index.includes(ref)) fail('index.html does not reference ' + ref);
if (refs.every(ref => index.includes(ref))) pass('index.html references required CSS and JavaScript');
const basicHtmlChecks = [['DOCTYPE', /^<!DOCTYPE html>/i.test(index.trim())], ['html element', /<html\b[\s\S]*<\/html>/i.test(index)], ['head element', /<head\b[\s\S]*<\/head>/i.test(index)], ['body element', /<body\b[\s\S]*<\/body>/i.test(index)]];
for (const [name, ok] of basicHtmlChecks) if (!ok) fail('Basic HTML structure check failed: ' + name);
if (basicHtmlChecks.every(([, ok]) => ok)) pass('Basic HTML structure looks valid');
const idMatches = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplicates = [...new Set(idMatches.filter((id, i) => idMatches.indexOf(id) !== i))];
if (duplicates.length) fail('Duplicate IDs in index.html: ' + duplicates.join(', ')); else pass('No duplicate IDs found');
const blankTargets = [...index.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)].map(match => match[0]);
const insecureTargets = blankTargets.filter(tag => !/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i.test(tag));
if (insecureTargets.length) fail('External target blank links without rel noopener noreferrer: ' + insecureTargets.length); else pass('target blank links include rel noopener noreferrer');
const externalScripts = [...index.matchAll(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi)].map(match => match[0]);
const scriptsMissingSri = externalScripts.filter(tag => !/\bintegrity=["']sha(256|384|512)-[^"']+["']/i.test(tag));
const scriptsMissingCrossorigin = externalScripts.filter(tag => !/\bcrossorigin=["']anonymous["']/i.test(tag));
if (scriptsMissingSri.length) fail('External script tags without SRI: ' + scriptsMissingSri.length); else pass('External script tags include SRI');
if (scriptsMissingCrossorigin.length) fail('External script tags without crossorigin anonymous: ' + scriptsMissingCrossorigin.length); else pass('External script tags include crossorigin anonymous');
const hashLinks = [...index.matchAll(/<a\b[^>]*href=["']#["'][^>]*>/gi)].map(match => match[0]);
if (hashLinks.length) fail('Dead hash href placeholders found: ' + hashLinks.length); else pass('No dead href placeholders found');
const allFiles = walk();
const textExts = new Set(['.html', '.css', '.js', '.md', '.cff', '.txt', '.json', '.mjs', '.gitattributes', '.gitignore']);
for (const file of allFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const ext = path.extname(file) || path.basename(file);
  if (!textExts.has(ext)) continue;
  if (markerScanExcluded.has(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const allowedConsoleLines = consoleLogAllowedLines(rel, text);
  for (const marker of markers) {
    if (marker === 'console.log' && allowedConsoleLines) {
      const fileLines = text.split(/\r?\n/);
      const strayLine = fileLines.findIndex((line, i) => line.includes('console.log') && !allowedConsoleLines.has(i));
      if (strayLine !== -1) fail('Marker found in ' + rel + ': ' + marker + ' (line ' + (strayLine + 1) + ', outside allowed dev helpers)');
      continue;
    }
    if (markerPresent(text, marker)) fail('Marker found in ' + rel + ': ' + marker);
  }
}
if (failures === 0) pass('Static site verification completed');
else { process.stderr.write(String(failures) + ' verification issue(s) found.\n'); process.exitCode = 1; }
