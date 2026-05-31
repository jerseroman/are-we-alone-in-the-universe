#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, 'wix-embed-calculator.html');

const localStylesheet = 'src/styles.css';
const localScripts = [
  'src/scientific-parameters.js',
  'src/calculator-core.js',
  'src/charts.js',
  'src/share.js',
  'src/accessibility.js',
  'src/app.js'
];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeInlineStyle(css) {
  return css.replace(/<\/style/gi, '<\\/style');
}

function escapeInlineScript(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

let html = read('index.html');

const stylesheetTag = /<link\b(?=[^>]*\bhref=["']src\/styles\.css(?:\?[^"']*)?["'])(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i;
if (!stylesheetTag.test(html)) {
  throw new Error(`Could not find ${localStylesheet} stylesheet tag in index.html`);
}

html = html.replace(
  stylesheetTag,
  () => `<style data-inline-source="${localStylesheet}">\n${escapeInlineStyle(read(localStylesheet))}\n</style>`
);

for (const scriptPath of localScripts) {
  const scriptTag = new RegExp(
    `<script\\b(?=[^>]*\\bsrc=["']${escapeRegExp(scriptPath)}["'])[^>]*>\\s*<\\/script>`,
    'i'
  );

  if (!scriptTag.test(html)) {
    throw new Error(`Could not find ${scriptPath} script tag in index.html`);
  }

  html = html.replace(
    scriptTag,
    () => `<script data-inline-source="${scriptPath}">\n${escapeInlineScript(read(scriptPath))}\n</script>`
  );
}

html = html.replace(
  '<!DOCTYPE html>',
  '<!DOCTYPE html>\n<!-- Self-contained Wix embed export: local CSS and JS are inlined. External CDN libraries and hosted images remain as URLs. -->'
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, html, 'utf8');

const sizeKb = Math.round(fs.statSync(outputFile).size / 1024);
process.stdout.write(`Wrote ${path.relative(root, outputFile)} (${sizeKb} KB)\n`);
