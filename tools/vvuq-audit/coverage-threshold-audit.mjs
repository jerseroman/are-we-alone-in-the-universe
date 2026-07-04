import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

const DEFAULT_THRESHOLDS = {
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90
};

const CRITICAL_FILES = [
  'src/calculator-core.js',
  'src/scientific-parameters.js',
  'src/share.js'
];

function localBin(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const file = path.join(repoRoot, 'node_modules', '.bin', `${name}${suffix}`);
  return fs.existsSync(file) ? file : null;
}

async function readJson(file) {
  return JSON.parse(await fsp.readFile(file, 'utf8'));
}

function normalizeRel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function metricPct(item, metric) {
  return Number(item?.[metric]?.pct ?? 0);
}

function thresholdFailures(coverage, thresholds) {
  const failures = [];
  const total = coverage.total || {};
  for (const [metric, threshold] of Object.entries(thresholds)) {
    const pct = metricPct(total, metric);
    if (pct < threshold) failures.push({ scope: 'total', metric, pct, threshold });
  }
  return failures;
}

function fileRows(coverage) {
  return Object.entries(coverage)
    .filter(([key]) => key !== 'total')
    .map(([file, item]) => ({
      file: normalizeRel(file),
      statements: metricPct(item, 'statements'),
      branches: metricPct(item, 'branches'),
      functions: metricPct(item, 'functions'),
      lines: metricPct(item, 'lines')
    }))
    .sort((a, b) => a.lines - b.lines);
}

export async function runCoverageThresholdAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const c8 = localBin('c8');
  if (!c8) {
    const summary = { status: 'SKIPPED', reason: 'local c8 binary is not installed', thresholds: DEFAULT_THRESHOLDS };
    await writeJson(path.join(outDir, 'coverage-threshold-summary.json'), summary);
    await writeText(path.join(outDir, 'coverage-threshold-report.md'), '# Coverage Threshold Audit\n\nStatus: **SKIPPED**\n');
    return summary;
  }

  const reportsDir = path.join(outDir, 'coverage');
  const command = [
    '--reporter=text-summary',
    '--reporter=json-summary',
    `--reports-dir=${reportsDir}`,
    'npm',
    'run',
    'test:all'
  ];
  const result = await runCommand(c8, command, { timeoutMs: Number(options.timeoutMs || 360000) });
  const summaryFile = path.join(reportsDir, 'coverage-summary.json');
  const coverage = fs.existsSync(summaryFile) ? await readJson(summaryFile) : { total: {} };
  const thresholds = { ...DEFAULT_THRESHOLDS };
  const failures = thresholdFailures(coverage, thresholds);
  const rows = fileRows(coverage);
  const criticalFiles = CRITICAL_FILES.map(file => {
    const row = rows.find(item => item.file === file);
    return row || { file, missing: true, statements: 0, branches: 0, functions: 0, lines: 0 };
  });
  const missingCritical = criticalFiles.filter(item => item.missing);

  const status = result.status === 'FAIL'
    ? 'FAIL'
    : failures.length || missingCritical.length
      ? 'PARTIAL'
      : 'PASS';
  const summary = {
    status,
    command: result.commandLine,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    thresholds,
    total: {
      statements: metricPct(coverage.total, 'statements'),
      branches: metricPct(coverage.total, 'branches'),
      functions: metricPct(coverage.total, 'functions'),
      lines: metricPct(coverage.total, 'lines')
    },
    threshold_failures: failures,
    critical_files: criticalFiles,
    weakest_files_by_line_coverage: rows.slice(0, 15),
    reports_dir: reportsDir
  };

  await writeJson(path.join(outDir, 'coverage-threshold-summary.json'), summary);
  await writeText(path.join(outDir, 'coverage-threshold-report.md'), [
    '# Coverage Threshold Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Command: \`${summary.command}\``,
    '',
    '| Metric | Actual | Threshold |',
    '| --- | ---: | ---: |',
    ...Object.entries(thresholds).map(([metric, threshold]) => `| ${metric} | ${summary.total[metric]}% | ${threshold}% |`),
    '',
    '## Critical Files',
    '',
    '| File | Statements | Branches | Functions | Lines |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...criticalFiles.map(row => `| ${row.file} | ${row.statements}% | ${row.branches}% | ${row.functions}% | ${row.lines}% |`),
    '',
    '## Weakest Files By Line Coverage',
    '',
    '| File | Lines | Branches | Functions |',
    '| --- | ---: | ---: | ---: |',
    ...summary.weakest_files_by_line_coverage.map(row => `| ${row.file} | ${row.lines}% | ${row.branches}% | ${row.functions}% |`)
  ].join('\n'));

  process.stdout.write(`COVERAGE_THRESHOLD ${summary.status}: lines=${summary.total.lines}%, branches=${summary.total.branches}%\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `coverage-threshold-${Date.now()}`);
  const summary = await runCoverageThresholdAudit(outDir, { timeoutMs: args['timeout-ms'] || args.timeoutMs });
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
