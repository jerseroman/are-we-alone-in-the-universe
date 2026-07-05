import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findLatestRunDir, parseArgs, readJson, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';
import { ROTATING_PROFILES } from './profile-definitions.mjs';

function statusRank(status) {
  return { FAIL: 3, RED: 3, PARTIAL: 2, SKIPPED: 1, PASS: 0, GREEN: 0, YELLOW: 2 }[status] ?? 1;
}

async function readOptional(runDir, rel) {
  return await readJson(path.join(runDir, rel), null);
}

function md(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '/');
}

function statusBadge(status) {
  const value = String(status ?? '').toUpperCase();
  const colors = {
    PASS: 'green',
    GREEN: 'green',
    FAIL: 'red',
    RED: 'red',
    PARTIAL: 'yellow',
    YELLOW: 'yellow',
    SKIPPED: 'yellow',
    NOT_RUN: 'lightgrey',
    INFO: 'blue'
  };
  const color = colors[value] || 'lightgrey';
  const label = encodeURIComponent(value);
  return `![${md(value)}](https://img.shields.io/badge/${label}-${color})`;
}

function colorLeadingStatus(line) {
  const text = md(line);
  return text.replace(/^(PASS|FAIL|SKIP|SKIPPED|STATIC_SCAN|TRACEABILITY|ORACLE|MUTATION|COVERAGE|PERFORMANCE)\b:?/i, match => {
    const normalized = match.replace(/:$/, '').toUpperCase();
    const suffix = match.endsWith(':') ? ':' : '';
    const mapped = normalized === 'SKIP' ? 'SKIPPED' : normalized;
    return `${statusBadge(mapped)}${suffix}`;
  });
}

function evidenceLines(command) {
  const text = `${command.stdout || ''}\n${command.stderr || ''}`;
  return text
    .split(/\r?\n/)
    .filter(line => /^(PASS|FAIL|SKIP|STATIC_SCAN|TRACEABILITY|ORACLE|MUTATION|COVERAGE|PERFORMANCE|ABSOLUTE DEEP AUDIT REPORT)/.test(line.trim()))
    .slice(0, 600);
}

function commandEvidenceRows(commands) {
  const rows = [];
  for (const command of commands) {
    const lines = evidenceLines(command);
    lines.forEach((line, index) => {
      rows.push(`| ${md(command.commandLine)} | ${index + 1} | ${colorLeadingStatus(line.trim())} |`);
    });
  }
  return rows;
}

function configuredProfileRows() {
  const rows = [];
  ROTATING_PROFILES.forEach(profile => {
    profile.steps.forEach((step, index) => {
      rows.push(`| ${profile.id} | ${md(profile.title)} | ${index + 1} | \`${md([step.command, ...(step.args || [])].join(' '))}\` |`);
    });
  });
  return rows;
}

function timeboxedExecutionRows(timeboxed) {
  if (!timeboxed?.executions?.length) return [];
  return timeboxed.executions.map(execution => (
    `| ${execution.execution_index} | ${execution.id} | ${md(execution.title)} | ${statusBadge(execution.status)} | ${execution.started_at} | ${execution.ended_at} |`
  ));
}

function traceabilityRows(traceability) {
  if (!traceability?.rows?.length) return [];
  return traceability.rows.map(row => (
    `| ${md(row.requirement)} | ${md(row.formula)} | ${md(row.source)} | ${md(row.ui)} | ${md(row.exportField)} | ${md(row.evidence)} |`
  ));
}

function oracleRows(oracle) {
  if (!oracle?.checks?.length) return [];
  return oracle.checks.map(check => (
    `| ${md(check.name)} | ${statusBadge(check.status)} | ${md(check.expected)} | ${md(check.actual)} |`
  ));
}

function staticMetricRows(staticScan) {
  if (!staticScan?.counters) return [];
  return Object.entries(staticScan.counters).map(([key, value]) => `| ${md(key)} | ${md(value)} |`);
}

function staticFindingRows(staticScan) {
  if (!staticScan?.findings?.length) return [];
  return staticScan.findings.slice(0, 200).map(finding => (
    `| ${finding.severity} | ${md(finding.category)} | ${md(finding.file)}:${md(finding.line ?? '')} | ${md(finding.message)} |`
  ));
}

export async function compileReport(runDir) {
  if (!fs.existsSync(runDir)) {
    throw new Error(`Run directory does not exist: ${runDir}`);
  }
  const environment = await readOptional(runDir, 'environment.json');
  const staticScan = await readOptional(runDir, 'static-scan-summary.json');
  const traceability = await readOptional(runDir, 'requirements-traceability-matrix.json');
  const oracle = await readOptional(runDir, 'oracle-comparison-summary.json');
  const timeboxed = await readOptional(runDir, 'timeboxed-summary.json');
  const mutation = await readOptional(runDir, 'mutation-summary.json');
  const coverage = await readOptional(runDir, 'coverage-summary.json');
  const performance = await readOptional(runDir, 'performance-summary.json');

  const commandDir = path.join(runDir, 'commands');
  const commands = fs.existsSync(commandDir)
    ? fs.readdirSync(commandDir)
      .filter(name => name.endsWith('.json'))
      .map(name => JSON.parse(fs.readFileSync(path.join(commandDir, name), 'utf8')))
    : [];

  const statuses = [
    ...commands.map(c => c.status),
    staticScan?.status,
    traceability?.status,
    oracle?.status,
    timeboxed?.status,
    mutation?.status,
    coverage?.status,
    performance?.status
  ].filter(Boolean);

  const failed = statuses.filter(s => statusRank(s) >= 3);
  const partial = statuses.filter(s => statusRank(s) === 2);
  const skipped = statuses.filter(s => s === 'SKIPPED');
  const evidenceChannels = commands.length
    + [staticScan, traceability, oracle, timeboxed, mutation, coverage, performance].filter(Boolean).length;
  const limitedByMaxProfiles = !!timeboxed?.max_profiles;
  const finalStatus = failed.length
    ? 'RED'
    : (partial.length || skipped.length || evidenceChannels === 0 || limitedByMaxProfiles ? 'YELLOW' : 'GREEN');

  const summary = {
    status: finalStatus,
    generated_at: new Date().toISOString(),
    run_dir: runDir,
    evidence_channels: evidenceChannels,
    command_count: commands.length,
    failed_command_count: commands.filter(c => c.status !== 'PASS').length,
    static_scan_status: staticScan?.status ?? 'NOT_RUN',
    traceability_rows: traceability?.rows?.length ?? null,
    oracle_status: oracle?.status ?? 'NOT_RUN',
    oracle_checks: oracle?.check_count ?? null,
    timeboxed_profile_executions: timeboxed?.profile_executions ?? null,
    mutation_score: mutation?.mutation_score ?? null,
    coverage_status: coverage?.status ?? 'NOT_RUN',
    performance_status: performance?.status ?? 'NOT_RUN',
    final_status_basis: {
      failed_statuses: failed.length,
      partial_statuses: partial.length,
      skipped_statuses: skipped.length
    },
    limited_by_max_profiles: limitedByMaxProfiles
  };

  const commandRows = commands.map(c => `| ${c.commandLine} | ${statusBadge(c.status)} | ${c.exitCode ?? ''} | ${c.durationMs ?? ''} |`).join('\n');
  const profileCatalogRows = configuredProfileRows();
  const profileExecutionRows = timeboxedExecutionRows(timeboxed);
  const commandEvidence = commandEvidenceRows(commands);
  const traceRows = traceabilityRows(traceability);
  const oracleCheckRows = oracleRows(oracle);
  const staticRows = staticMetricRows(staticScan);
  const staticFindRows = staticFindingRows(staticScan);
  const lines = [
    '# Full V&V/UQ Model Audit Report',
    '',
    `Final status: ${statusBadge(finalStatus)}`,
    '',
    'This audit verifies implementation robustness and internal consistency. It does not constitute empirical astronomical validation, peer review, proof of life, confirmed Earth-like planets, or SETI detection evidence.',
    '',
    '## Local Repository State',
    '',
    environment
      ? `Branch: \`${environment.git.branch}\`  \nCommit: \`${environment.git.commit}\`  \nClean tree at capture: \`${environment.git.clean}\`  \nNode: \`${environment.node}\`  \nnpm: \`${environment.npm}\`  \nOS: \`${environment.os.type} ${environment.os.release} ${environment.os.arch}\``
      : 'Environment capture was not found.',
    '',
    '## Existing Test Execution Summary',
    '',
    commands.length
      ? '| Command | Status | Exit | Duration ms |\n| --- | --- | ---: | ---: |\n' + commandRows
      : 'No command summaries were found.',
    '',
    '## Detailed Command Evidence',
    '',
    commandEvidence.length
      ? '| Command | Evidence # | Evidence line |\n| --- | ---: | --- |\n' + commandEvidence.join('\n')
      : 'No PASS/FAIL/SKIP evidence lines were found in captured command output.',
    '',
    '## Configured 24-Profile Rotating Audit Catalog',
    '',
    '| Profile | Title | Step | Command |',
    '| --- | --- | ---: | --- |',
    ...profileCatalogRows,
    '',
    '## Requirements Traceability Matrix',
    '',
    traceability ? `Status: ${statusBadge(traceability.status)}; rows: ${traceability.rows.length}.` : 'Not run.',
    '',
    traceRows.length
      ? '| Requirement | Formula | Source file/function | UI field | Export field | Test evidence |\n| --- | --- | --- | --- | --- | --- |\n' + traceRows.join('\n')
      : '',
    '',
    '## Static Scan Summary',
    '',
    staticScan ? `Status: ${statusBadge(staticScan.status)}; files scanned: ${staticScan.counters?.files_scanned}; blocking findings: ${staticScan.blocking_findings_count}.` : 'Not run.',
    '',
    staticRows.length
      ? '| Metric | Value |\n| --- | ---: |\n' + staticRows.join('\n')
      : '',
    '',
    staticFindRows.length
      ? '### Static Scan Findings\n\n| Severity | Category | Location | Message |\n| --- | --- | --- | --- |\n' + staticFindRows.join('\n')
      : 'No static scan findings were recorded.',
    '',
    '## Independent Oracle Summary',
    '',
    oracle ? `Status: ${statusBadge(oracle.status)}; checks: ${oracle.check_count ?? 'n/a'}; failures: ${oracle.failure_count ?? 'n/a'}.` : 'Not run.',
    '',
    oracleCheckRows.length
      ? '| Check | Status | Expected | Actual |\n| --- | --- | ---: | ---: |\n' + oracleCheckRows.join('\n')
      : '',
    '',
    '## Randomized Timeboxed Stress Summary',
    '',
    timeboxed ? `Status: ${statusBadge(timeboxed.status)}; profile executions: ${timeboxed.profile_executions}; failures: ${timeboxed.failed_profile_executions}.` : 'Not run.',
    '',
    profileExecutionRows.length
      ? '| Execution | Profile | Title | Status | Started | Ended |\n| ---: | --- | --- | --- | --- | --- |\n' + profileExecutionRows.join('\n')
      : 'No timeboxed profile executions were recorded in this run.',
    '',
    '## Mutation Testing Summary',
    '',
    mutation ? `Status: ${statusBadge(mutation.status)}; mutation score: ${mutation.mutation_score === null ? 'n/a' : mutation.mutation_score}.` : 'Not run.',
    '',
    '## Coverage Summary',
    '',
    coverage ? `Status: ${statusBadge(coverage.status)}; ${coverage.reason || coverage.tool || ''}` : 'Not run.',
    '',
    '## Performance Summary',
    '',
    performance ? `Status: ${statusBadge(performance.status)}; executions: ${performance.executions ?? 'n/a'}.` : 'Not run.',
    '',
    '## Findings And Severity Table',
    '',
    '| Severity | Finding |',
    '| --- | --- |',
    ...(failed.length ? ['| HIGH | One or more executed audit commands/checks failed. |'] : []),
    ...(limitedByMaxProfiles ? ['| MEDIUM | This run used max_profiles and is a shortened rotating-run check, not a complete timeboxed audit. |'] : []),
    ...(skipped.length ? ['| MEDIUM | One or more optional evidence channels were skipped or unavailable. |'] : []),
    ...(partial.length ? ['| MEDIUM | One or more checks completed with limitations. |'] : []),
    ...(!failed.length && !skipped.length && !partial.length ? ['| INFO | No critical/high findings were recorded by the executed checks. |'] : []),
    '',
    '## Reproducibility Artifacts',
    '',
    `Run directory: \`${runDir}\``,
    '',
    '## Verification Boundaries',
    '',
    'The report covers only executed audit scripts and generated summaries present in this run directory. It does not claim empirical astronomical validation or peer-reviewed astrophysical correctness.',
    '',
    '## Final Status',
    '',
    statusBadge(finalStatus)
  ];

  await writeJson(path.join(runDir, 'full-vvuq-summary.json'), summary);
  await writeText(path.join(runDir, 'FULL_VVUQ_MODEL_AUDIT_REPORT.md'), lines.join('\n'));
  return summary;
}

async function main() {
  const args = parseArgs();
  const runDir = args.run
    ? path.resolve(repoRoot, args.run)
    : args.out
      ? path.resolve(repoRoot, args.out)
      : await findLatestRunDir();
  if (!runDir) throw new Error('No run directory found. Pass --run audit-output/<run>.');
  const summary = await compileReport(runDir);
  process.stdout.write(`COMPILE ${summary.status}: ${path.join(runDir, 'FULL_VVUQ_MODEL_AUDIT_REPORT.md')}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
