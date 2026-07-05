import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, repoRoot, runCommand, writeJson } from './lib/audit-utils.mjs';
import { writeOracleSnapshot } from './oracle/generate_snapshots.mjs';

async function findPython() {
  for (const candidate of [
    { command: 'python', args: ['--version'] },
    { command: 'py', args: ['-3', '--version'] },
    { command: 'python3', args: ['--version'] }
  ]) {
    const result = await runCommand(candidate.command, candidate.args, { timeoutMs: 15000 });
    if (result.status === 'PASS') return candidate.command === 'py'
      ? { command: 'py', prefixArgs: ['-3'] }
      : { command: candidate.command, prefixArgs: [] };
  }
  return null;
}

export async function runOracle(outDir) {
  const snapshot = await writeOracleSnapshot(outDir);
  const python = await findPython();
  if (!python) {
    const summary = {
      status: 'SKIPPED',
      reason: 'No python/python3/py -3 executable found.',
      snapshot
    };
    await writeJson(path.join(outDir, 'oracle-comparison-summary.json'), summary);
    return summary;
  }

  const script = path.join(repoRoot, 'tools', 'vvuq-audit', 'oracle', 'compare_snapshot.py');
  const result = await runCommand(
    python.command,
    [...python.prefixArgs, script, '--snapshot', snapshot, '--out', outDir],
    { timeoutMs: 120000 }
  );

  const summary = {
    status: result.status,
    command: result.commandLine,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    snapshot
  };
  await writeJson(path.join(outDir, 'oracle-command-summary.json'), summary);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : process.cwd();
  const summary = await runOracle(outDir);
  process.stdout.write(`ORACLE ${summary.status}\n`);
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

