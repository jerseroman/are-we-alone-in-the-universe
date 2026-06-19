#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const defaultSource = path.join(root, 'index.html');

const mimeTypes = new Map([
  ['.css', 'text/css'],
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function parseArgs(argv) {
  const args = {
    source: defaultSource,
    out: null,
    embedAssets: true
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source') {
      args.source = path.resolve(argv[++i]);
    } else if (arg === '--out') {
      args.out = path.resolve(argv[++i]);
    } else if (arg === '--no-embed-assets') {
      args.embedAssets = false;
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
    'Usage: node tools/generate-standalone-html.mjs [--source index.html] [--out standalone.html] [--no-embed-assets]',
    '',
    'Builds a self-contained HTML export from the modular source.',
    'Local CSS and JavaScript are inlined. External CDN URLs are preserved.'
  ].join('\n');
}

function stripQueryAndHash(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || ''));
}

function htmlAttrEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveLocalPath(urlValue, baseDir) {
  if (!urlValue || isExternalUrl(urlValue) || urlValue.startsWith('#')) return null;
  const clean = stripQueryAndHash(urlValue);
  if (!clean || clean.startsWith('#')) return null;
  return path.resolve(baseDir, clean.replace(/\//g, path.sep));
}

function toPosixRelative(file, baseDir) {
  return path.relative(baseDir, file).replace(/\\/g, '/');
}

function dataUriForFile(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = mimeTypes.get(ext) || 'application/octet-stream';
  const bytes = fs.readFileSync(file);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function inlineCssUrls(css, cssFile, sourceDir, embedAssets) {
  if (!embedAssets) return css;
  const cssDir = path.dirname(cssFile);
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, urlValue) => {
    const trimmed = urlValue.trim();
    if (!trimmed || isExternalUrl(trimmed) || trimmed.startsWith('#')) return match;
    const file = resolveLocalPath(trimmed, cssDir);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return match;
    return `url("${dataUriForFile(file)}")`;
  });
}

function inlineStylesheets(html, sourceDir, embedAssets) {
  return html.replace(/<link\b([^>]*?)\bhref=(["'])([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    const attrs = `${before} ${after}`;
    if (!/\brel=(["'])[^"']*\bstylesheet\b[^"']*\1/i.test(attrs)) return match;
    if (isExternalUrl(href)) return match;

    const file = resolveLocalPath(href, sourceDir);
    if (!file || path.extname(file).toLowerCase() !== '.css' || !fs.existsSync(file)) return match;

    const rel = toPosixRelative(file, sourceDir);
    const css = inlineCssUrls(fs.readFileSync(file, 'utf8'), file, sourceDir, embedAssets);
    const canonicalCss = css.endsWith('\n') ? css.slice(0, -1) : css;
    return `<style data-inline-source="${htmlAttrEscape(rel)}">\n${canonicalCss}</style>`;
  });
}

function inlineScripts(html, sourceDir) {
  return html.replace(/<script\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*)>\s*<\/script>/gi, (match, before, quote, src, after) => {
    if (isExternalUrl(src)) return match;

    const file = resolveLocalPath(src, sourceDir);
    if (!file || path.extname(file).toLowerCase() !== '.js' || !fs.existsSync(file)) return match;

    const rel = toPosixRelative(file, sourceDir);
    const js = fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
    const spacing = before && /^\s+$/.test(before) ? before : ' ';
    return `<script${spacing}data-inline-source="${htmlAttrEscape(rel)}">\n${js}</script>`;
  });
}

function embedHtmlAssets(html, sourceDir, embedAssets) {
  if (!embedAssets) return html;
  return html.replace(/\b(src|href)=(["'])([^"']+)\2/gi, (match, attr, quote, value) => {
    if (isExternalUrl(value) || value.startsWith('#')) return match;
    const file = resolveLocalPath(value, sourceDir);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return match;

    const ext = path.extname(file).toLowerCase();
    if (!mimeTypes.has(ext) || ext === '.css' || ext === '.js') return match;
    return `${attr}="${dataUriForFile(file)}"`;
  });
}

function addExportComment(html) {
  const comment = '<!-- Self-contained HTML export: local CSS, JS, and local image assets are inlined. External CDN libraries remain external. -->';
  if (/Self-contained HTML export/i.test(html)) return html;
  return html.replace(/^<!DOCTYPE html>\s*/i, `<!DOCTYPE html>\n${comment}\n`);
}

export function buildStandaloneHtml(options = {}) {
  const source = path.resolve(options.source || defaultSource);
  const sourceDir = path.dirname(source);
  const embedAssets = options.embedAssets !== false;
  let html = fs.readFileSync(source, 'utf8');

  html = inlineStylesheets(html, sourceDir, embedAssets);
  html = inlineScripts(html, sourceDir);
  html = embedHtmlAssets(html, sourceDir, embedAssets);
  html = addExportComment(html);

  return html;
}

export function extractInlineScriptBlocks(html) {
  return [...String(html).matchAll(/<script\b[^>]*\bdata-inline-source=(["'])([^"']+)\1[^>]*>\n?([\s\S]*?)<\/script>/gi)]
    .map(match => ({
      source: match[2],
      code: match[3].replace(/<\\\/script/gi, '</script')
    }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const html = buildStandaloneHtml(args);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, html, 'utf8');
    process.stdout.write(`Generated standalone HTML: ${args.out}\n`);
  } else {
    process.stdout.write(html);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
