#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const scanDirs = ['src', 'tools'];
const syntaxExts = new Set(['.js', '.mjs']);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (syntaxExts.has(path.extname(entry.name))) {
      acc.push(full);
    }
  }

  return acc;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const files = scanDirs
  .flatMap(dir => walk(path.join(root, dir)))
  .sort((a, b) => rel(a).localeCompare(rel(b)));

const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failures.push({
      file: rel(file),
      output: [result.stdout, result.stderr].filter(Boolean).join('').trim()
    });
  }
}

if (failures.length) {
  process.stderr.write(`FAIL: Syntax check failed for ${failures.length}/${files.length} file(s).\n`);
  for (const failure of failures) {
    process.stderr.write(`- ${failure.file}\n`);
    if (failure.output) process.stderr.write(`${failure.output}\n`);
  }
  process.exit(1);
}

process.stdout.write(`PASS: Syntax check passed for ${files.length} JS/MJS file(s).\n`);
