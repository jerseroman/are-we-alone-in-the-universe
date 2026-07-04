import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

function localBin(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const file = path.join(repoRoot, 'node_modules', '.bin', `${name}${suffix}`);
  return fs.existsSync(file) ? file : null;
}

function parseCoverageSummary(text) {
  const readPct = label => {
    const match = text.match(new RegExp(`^${label}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)%`, 'im'));
    return match ? Number(match[1]) : null;
  };
  return {
    statement_coverage: readPct('Statements'),
    branch_coverage: readPct('Branches'),
    function_coverage: readPct('Functions'),
    line_coverage: readPct('Lines')
  };
}

export async function runCoverage(outDir) {
  await ensureDir(outDir);
  const c8 = localBin('c8');
  const nyc = localBin('nyc');
  if (!c8 && !nyc) {
    const summary = {
      status: 'SKIPPED',
      reason: 'Neither c8 nor nyc is installed in local node_modules/.bin.',
      statement_coverage: null,
      branch_coverage: null,
      function_coverage: null,
      line_coverage: null
    };
    await writeJson(path.join(outDir, 'coverage-summary.json'), summary);
    await writeText(path.join(outDir, 'coverage-report.md'), [
      '# Coverage Report',
      '',
      'Status: **SKIPPED**',
      '',
      summary.reason,
      '',
      'Install or vendor `c8` or `nyc` before treating coverage as measured evidence.'
    ].join('\n'));
    return summary;
  }

  const tool = c8 ? 'c8' : 'nyc';
  const command = c8 || nyc;
  const reportsDir = path.join(outDir, 'coverage');
  const args = tool === 'c8'
    ? ['--reporter=text-summary', '--reporter=json-summary', `--reports-dir=${reportsDir}`, 'npm', 'run', 'test:all']
    : ['--reporter=text-summary', '--reporter=json-summary', `--report-dir=${reportsDir}`, 'npm', 'run', 'test:all'];
  const result = await runCommand(command, args, { timeoutMs: 300000 });
  const parsed = parseCoverageSummary(`${result.stdout}\n${result.stderr}`);
  const summary = {
    status: result.status,
    tool,
    command: result.commandLine,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    ...parsed,
    reports_dir: reportsDir,
    stdout: result.stdout,
    stderr: result.stderr
  };
  await writeJson(path.join(outDir, 'coverage-summary.json'), summary);
  await writeText(path.join(outDir, 'coverage-report.md'), [
    '# Coverage Report',
    '',
    `Status: **${summary.status}**`,
    '',
    `Tool: ${tool}`,
    `Statements: ${summary.statement_coverage ?? 'n/a'}%`,
    `Branches: ${summary.branch_coverage ?? 'n/a'}%`,
    `Functions: ${summary.function_coverage ?? 'n/a'}%`,
    `Lines: ${summary.line_coverage ?? 'n/a'}%`,
    '',
    '```text',
    result.stdout,
    result.stderr,
    '```'
  ].join('\n'));
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `coverage-${Date.now()}`);
  const summary = await runCoverage(outDir);
  process.stdout.write(`COVERAGE ${summary.status}\n`);
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
