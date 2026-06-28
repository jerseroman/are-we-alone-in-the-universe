import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..', '..', '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._ = out._ || [];
      out._.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function timestampId(prefix = 'run') {
  const d = new Date();
  const stamp = d.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
    .replace('T', '-');
  return `${stamp}-${prefix}`;
}

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

export async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeText(file, text) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

export function commandLine(command, args = []) {
  return [command, ...args].map(part => {
    const s = String(part);
    return /\s/.test(s) ? JSON.stringify(s) : s;
  }).join(' ');
}

function spawnSpec(command, args) {
  if (process.platform !== 'win32') return { command, args };
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine(command, args)]
  };
}

export function sanitizeFilePart(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

export async function runCommand(command, args = [], options = {}) {
  const cwd = options.cwd || repoRoot;
  const timeoutMs = Number(options.timeoutMs || 120000);
  const startedAt = new Date();
  const start = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const live = !!options.live;
  const livePrefix = options.livePrefix ? `[${options.livePrefix}] ` : '';
  const liveLogFile = options.liveLogFile || null;

  function writeLive(chunk, streamName) {
    if (!live) return;
    const text = chunk.toString();
    const prefixed = text
      .split(/(\r?\n)/)
      .map(part => (/^\r?\n$/.test(part) || part === '' ? part : `${livePrefix}${part}`))
      .join('');
    if (streamName === 'stderr') process.stderr.write(prefixed);
    else process.stdout.write(prefixed);
    if (liveLogFile) {
      fs.mkdirSync(path.dirname(liveLogFile), { recursive: true });
      fs.appendFileSync(liveLogFile, prefixed, 'utf8');
    }
  }

  return await new Promise(resolve => {
    const spec = spawnSpec(command, args);
    const child = spawn(spec.command, spec.args, {
      cwd,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      windowsHide: true
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore kill failures; the close handler records the result
      }
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      writeLive(chunk, 'stdout');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      writeLive(chunk, 'stderr');
    });
    child.on('error', err => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        commandLine: commandLine(command, args),
        cwd,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        exitCode: null,
        signal: null,
        timedOut,
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}${err.stack || err.message}`,
        status: 'FAIL'
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        commandLine: commandLine(command, args),
        cwd,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        exitCode: code,
        signal,
        timedOut,
        stdout,
        stderr,
        status: timedOut || code !== 0 ? 'FAIL' : 'PASS'
      });
    });
  });
}

export async function recordCommandResult(runDir, name, result) {
  const safe = sanitizeFilePart(name);
  const dir = path.join(runDir, 'commands');
  await ensureDir(dir);
  await writeJson(path.join(dir, `${safe}.json`), result);
  await writeText(path.join(dir, `${safe}.stdout.txt`), result.stdout || '');
  await writeText(path.join(dir, `${safe}.stderr.txt`), result.stderr || '');
}

export async function collectEnvironment(runDir) {
  const gitStatus = await runCommand('git', ['status', '--short'], { timeoutMs: 15000 });
  const gitHead = await runCommand('git', ['rev-parse', 'HEAD'], { timeoutMs: 15000 });
  const gitBranch = await runCommand('git', ['branch', '--show-current'], { timeoutMs: 15000 });
  const nodeVersion = await runCommand('node', ['--version'], { timeoutMs: 15000 });
  const npmVersion = await runCommand('npm', ['--version'], { timeoutMs: 15000 });
  const pkg = await readJson(path.join(repoRoot, 'package.json'), {});

  const environment = {
    recorded_at: new Date().toISOString(),
    cwd: repoRoot,
    git: {
      branch: (gitBranch.stdout || '').trim(),
      commit: (gitHead.stdout || '').trim(),
      status_short: gitStatus.stdout || '',
      clean: (gitStatus.stdout || '').trim().length === 0
    },
    node: (nodeVersion.stdout || '').trim(),
    npm: (npmVersion.stdout || '').trim(),
    os: {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch()
    },
    package: {
      name: pkg.name || null,
      version: pkg.version || null,
      scripts: pkg.scripts || {}
    }
  };

  await writeJson(path.join(runDir, 'environment.json'), environment);
  return environment;
}

export function summarizeOutput(result) {
  const text = `${result.stdout || ''}\n${result.stderr || ''}`;
  const passLines = (text.match(/^PASS:/gm) || []).length;
  const failLines = (text.match(/^FAIL:/gm) || []).length;
  const assertions = [...text.matchAll(/Total assertions:\s*([0-9,]+)/gi)]
    .map(m => Number(m[1].replace(/,/g, '')))
    .filter(Number.isFinite)
    .at(-1);
  const failures = [...text.matchAll(/Total failures:\s*([0-9,]+)/gi)]
    .map(m => Number(m[1].replace(/,/g, '')))
    .filter(Number.isFinite)
    .at(-1);
  return {
    status: result.status,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    passLines,
    failLines,
    assertions: assertions ?? null,
    failures: failures ?? null
  };
}

export async function appendJsonl(file, value) {
  await ensureDir(path.dirname(file));
  await fsp.appendFile(file, `${JSON.stringify(value)}\n`, 'utf8');
}

export async function findLatestRunDir(baseDir = path.join(repoRoot, 'audit-output')) {
  if (!fs.existsSync(baseDir)) return null;
  const entries = await fsp.readdir(baseDir, { withFileTypes: true });
  const dirs = entries
    .filter(e => e.isDirectory())
    .map(e => ({ name: e.name, full: path.join(baseDir, e.name), mtimeMs: fs.statSync(path.join(baseDir, e.name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return dirs[0]?.full || null;
}
