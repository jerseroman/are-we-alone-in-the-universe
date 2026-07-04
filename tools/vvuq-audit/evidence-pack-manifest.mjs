import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

async function listFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    else files.push(full);
  }
  return files;
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

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

export async function writeEvidenceManifest(runDir, options = {}) {
  const root = path.resolve(repoRoot, runDir);
  const outDir = options.out ? path.resolve(repoRoot, options.out) : root;
  await ensureDir(outDir);
  const manifestJson = path.join(outDir, 'evidence-pack-manifest.json');
  const manifestMd = path.join(outDir, 'evidence-pack-manifest.md');
  const excluded = new Set([path.resolve(manifestJson), path.resolve(manifestMd)]);
  const files = (await listFiles(root))
    .filter(file => !excluded.has(path.resolve(file)))
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  for (const file of files) {
    const stat = await fsp.stat(file);
    entries.push({
      path: path.relative(root, file).replace(/\\/g, '/'),
      bytes: stat.size,
      sha256: await sha256(file)
    });
  }

  const gitHead = await runCommand('git', ['rev-parse', 'HEAD'], { timeoutMs: 15000 });
  const gitStatus = await runCommand('git', ['status', '--short'], { timeoutMs: 15000 });
  const summary = {
    status: entries.length ? 'PASS' : 'FAIL',
    generated_at: new Date().toISOString(),
    run_dir: root,
    file_count: entries.length,
    git_commit: (gitHead.stdout || '').trim() || null,
    git_status_short: gitStatus.stdout || '',
    entries
  };

  await writeJson(manifestJson, summary);
  await writeText(manifestMd, [
    '# Evidence Pack Manifest',
    '',
    `Status: **${summary.status}**`,
    '',
    `Run dir: ${summary.run_dir}`,
    `Git commit: ${summary.git_commit ?? 'n/a'}`,
    `Files: ${summary.file_count}`,
    '',
    '| File | Bytes | SHA256 |',
    '| --- | ---: | --- |',
    ...entries.map(entry => `| ${md(entry.path)} | ${entry.bytes} | \`${entry.sha256}\` |`)
  ].join('\n'));

  process.stdout.write(`EVIDENCE_MANIFEST ${summary.status}: files=${summary.file_count}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const runDir = args['run-dir'] || args.runDir || args.run || args._?.[0];
  if (!runDir) throw new Error('Pass --run-dir <audit-output/run-dir>');
  const summary = await writeEvidenceManifest(runDir, { out: args.out });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
