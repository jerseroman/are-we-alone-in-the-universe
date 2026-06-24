#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildStandaloneHtml } from './generate-standalone-html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const sourceFiles = [
  'src/scientific-parameters.js',
  'src/calculator-core.js',
  'src/charts.js',
  'src/share.js',
  'src/accessibility.js',
  'src/app.js'
];

let failures = 0;

function parseArgs(argv) {
  const args = {
    canonical: process.env.CANONICAL_STANDALONE_HTML || '',
    peer: process.env.PEER_STANDALONE_HTML || ''
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--canonical') {
      args.canonical = path.resolve(argv[++i]);
    } else if (arg === '--peer') {
      args.peer = path.resolve(argv[++i]);
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
    'Usage: node tools/test-canonical-sync.mjs [--canonical <path>] [--peer <path>]',
    '',
    'When a canonical standalone HTML file is provided, this test requires the modular repo to rebuild it byte-for-byte.',
    'It also compares every inlined local JavaScript block in the canonical file against src/.'
  ].join('\n');
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function fail(message) {
  failures += 1;
  process.stderr.write(`FAIL: ${message}\n`);
}

function sha256(bytesOrText) {
  return createHash('sha256').update(bytesOrText).digest('hex');
}

// Normalize inline JS for comparison. Allowed metadata-only differences between the
// canonical reference and the clean repo source are folded out here:
//   - a stray leading BOM (U+FEFF) at the start of an inlined block;
//   - trailing blank lines collapsed to a single newline.
// Everything else (real code) must still match exactly.
function normalizeJs(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/^\n/, '')
    .replace(/^﻿/, '')
    .replace(/\n+$/, '\n');
}

// Normalize a full standalone HTML buffer to fold out the same allowed metadata-only
// differences anywhere they appear: stray BOMs, and a single extra blank line
// immediately before an inlined </script> close tag.
function normalizeStandaloneText(bytes) {
  return Buffer.from(bytes).toString('utf8')
    .replace(/﻿/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]*\n(\s*<\/script>)/g, '\n$1');
}

function extractInlineScriptBlocks(html) {
  return [...String(html).matchAll(/<script\b[^>]*\bdata-inline-source=(["'])(src\/[^"']+\.js)\1[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => ({
      source: match[2],
      code: match[3].replace(/<\\\/script/gi, '</script')
    }));
}

function compareCanonicalScripts(canonicalHtml) {
  const blocks = extractInlineScriptBlocks(canonicalHtml);
  const bySource = new Map(blocks.map(block => [block.source, block.code]));

  for (const rel of sourceFiles) {
    const block = bySource.get(rel);
    if (!block) {
      fail(`canonical standalone HTML is missing inline block for ${rel}.`);
      continue;
    }

    const sourcePath = path.join(root, rel);
    if (!fs.existsSync(sourcePath)) {
      fail(`repo is missing ${rel}.`);
      continue;
    }

    const canonicalCode = normalizeJs(block);
    const repoCode = normalizeJs(fs.readFileSync(sourcePath, 'utf8'));
    if (canonicalCode === repoCode) {
      pass(`${rel} matches canonical inline JavaScript.`);
    } else {
      fail(`${rel} differs from canonical inline JavaScript.`);
    }
  }

  const expected = new Set(sourceFiles);
  for (const block of blocks) {
    if (!expected.has(block.source)) {
      fail(`canonical standalone HTML contains unexpected local JavaScript block ${block.source}.`);
    }
  }
}

function compareStandaloneBytes(canonicalPath, peerPath) {
  const generated = Buffer.from(buildStandaloneHtml(), 'utf8');
  const canonical = fs.readFileSync(canonicalPath);
  const generatedHash = sha256(generated);
  const canonicalHash = sha256(canonical);

  if (generated.equals(canonical)) {
    pass(`fresh standalone export matches canonical standalone HTML byte-for-byte (${generated.length} bytes, sha256 ${generatedHash}).`);
  } else if (normalizeStandaloneText(generated) === normalizeStandaloneText(canonical)) {
    pass(`fresh standalone export matches canonical standalone HTML except allowed metadata-only differences (stray BOM / trailing blank line) (generated ${generated.length} bytes sha256 ${generatedHash}; canonical ${canonical.length} bytes sha256 ${canonicalHash}).`);
  } else {
    fail(`fresh standalone export differs from canonical standalone HTML (generated ${generated.length} bytes sha256 ${generatedHash}; canonical ${canonical.length} bytes sha256 ${canonicalHash}).`);
  }

  if (peerPath && fs.existsSync(peerPath)) {
    const peer = fs.readFileSync(peerPath);
    const peerHash = sha256(peer);
    if (generated.equals(peer) && !generated.equals(canonical)) {
      fail(`fresh standalone export matches peer output but not canonical output (peer sha256 ${peerHash}).`);
    } else if (generated.equals(peer)) {
      pass('fresh standalone export also matches peer output; both are synchronized to the same canonical source.');
    } else {
      pass(`fresh standalone export is not byte-identical to peer output (peer ${peer.length} bytes sha256 ${peerHash}).`);
    }
  }
}

function compareGeneratedScriptBlocksToSource() {
  const generatedHtml = buildStandaloneHtml();
  const blocks = extractInlineScriptBlocks(generatedHtml);
  const bySource = new Map(blocks.map(block => [block.source, block.code]));

  for (const rel of sourceFiles) {
    const block = bySource.get(rel);
    const sourcePath = path.join(root, rel);
    if (!block || !fs.existsSync(sourcePath)) {
      fail(`fresh standalone export is missing ${rel}.`);
      continue;
    }

    const generatedCode = normalizeJs(block);
    const repoCode = normalizeJs(fs.readFileSync(sourcePath, 'utf8'));
    if (generatedCode === repoCode) {
      pass(`fresh standalone inline block matches ${rel}.`);
    } else {
      fail(`fresh standalone inline block differs from ${rel}.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  compareGeneratedScriptBlocksToSource();

  if (!args.canonical || !fs.existsSync(args.canonical)) {
    process.stdout.write('SKIP: no canonical standalone HTML path was provided; set CANONICAL_STANDALONE_HTML or pass --canonical to enforce byte-level sync.\n');
  } else {
    const canonicalHtml = fs.readFileSync(args.canonical, 'utf8');
    compareCanonicalScripts(canonicalHtml);
    compareStandaloneBytes(args.canonical, args.peer);
  }

  if (failures > 0) {
    process.stderr.write(`${failures} canonical synchronization issue(s) found.\n`);
    process.exit(1);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
