#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'index.html', 'README.md', 'LICENSE.md', 'NOTICE.md', 'CITATION.cff', '404.html',
  '.nojekyll', '.gitignore', '.gitattributes', 'src/calculator-core.js', 'src/app.js',
  'src/charts.js', 'src/share.js', 'src/accessibility.js', 'src/styles.css',
  'docs/MODEL_SCOPE.md', 'docs/REUSE_AND_ATTRIBUTION.md'
];
const refs = ['src/styles.css', 'src/calculator-core.js', 'src/charts.js', 'src/share.js', 'src/accessibility.js', 'src/app.js'];
const markerParts = [['API', '_KEY'], ['SEC', 'RET'], ['TO', 'KEN'], ['PASS', 'WORD'], ['local', 'host'], ['C:', '\\'], ['TO', 'DO'], ['FIX', 'ME'], ['console.', 'log'], ['debug', 'ger']];
const markers = markerParts.map(parts => parts.join(''));
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
const hashLinks = [...index.matchAll(/href=["']#["']/gi)];
if (hashLinks.length) fail('Dead hash href placeholders found: ' + hashLinks.length); else pass('No dead href placeholders found');
const allFiles = walk();
const textExts = new Set(['.html', '.css', '.js', '.md', '.cff', '.txt', '.json', '.mjs', '.gitattributes', '.gitignore']);
for (const file of allFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const ext = path.extname(file) || path.basename(file);
  if (!textExts.has(ext)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of markers) if (text.includes(marker)) fail('Marker found in ' + rel + ': ' + marker);
}
if (failures === 0) pass('Static site verification completed');
else { process.stderr.write(String(failures) + ' verification issue(s) found.\n'); process.exitCode = 1; }
