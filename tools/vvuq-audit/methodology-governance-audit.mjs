import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';
import { writeTraceability } from './traceability.mjs';

const VERSION_SEQUENCE = ['2.13', '2.14', '2.15', '2.16', '2.17', '2.18'];

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

async function readOptional(file) {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

function severityFor(requirement) {
  if (/deterministic|Monte Carlo|SETI|universe|export|state/i.test(requirement)) return 'HIGH';
  if (/wording|label|source/i.test(requirement)) return 'MEDIUM';
  return 'MEDIUM';
}

function toleranceFor(requirement) {
  if (/wording|label|export/i.test(requirement)) return 'exact text/key parity unless documented';
  if (/Monte Carlo/i.test(requirement)) return 'seeded reproducibility or defined statistical tolerance';
  return 'relative <= 1e-10 unless command defines tighter tolerance';
}

function buildExtendedTraceability(baseRows) {
  return baseRows.map((row, index) => ({
    id: `REQ-${String(index + 1).padStart(3, '0')}`,
    scientific_claim: row.requirement,
    formula: row.formula,
    code_function: row.source,
    ui_element: row.ui,
    export_field: row.exportField,
    test_command: row.evidence,
    expected_output: 'See command-specific PASS evidence and generated JSON/Markdown artifacts.',
    tolerance: toleranceFor(row.requirement),
    failure_severity: severityFor(row.requirement),
    source_document: 'VVUQ_CODE_AUDIT.md / generated traceability matrix'
  }));
}

function buildUiTraceRows() {
  return [
    {
      step: 'UI input/change',
      source: 'input/select/toggle controls',
      target: 'resolved model state',
      evidence: 'random-ui-oracle-fuzz; test:state-transition:core; test:preset-state-reset'
    },
    {
      step: 'Resolved model state',
      source: 'buildResolvedModelState()',
      target: 'calculation input object',
      evidence: 'test:numerics; random UI oracle resolved-state cases'
    },
    {
      step: 'Calculation',
      source: 'computePlanetsAdvanced(); monteCarloCalculate()',
      target: 'display result cards',
      evidence: 'random GUI deterministic checks; MC GUI checks'
    },
    {
      step: 'Display',
      source: 'deterministicResult / monteCarloResult / stats',
      target: 'export/share state',
      evidence: 'test:standalone-export; export-consistency audit'
    },
    {
      step: 'Export',
      source: 'JSON/Markdown/LaTeX export builders',
      target: 'reproducibility artifacts',
      evidence: 'test:standalone-export; export-consistency audit'
    }
  ];
}

function buildGoldenRules() {
  return [
    'Golden outputs may change only when the formula, source parameter, documented preset, or display contract intentionally changes.',
    'A version note must explain why the output changed.',
    'Old and new values must be shown side by side for critical deterministic and Monte Carlo outputs.',
    'Scientific interpretation and user-facing wording must be reviewed when the output change affects meaning.',
    'Regression tests must fail before the golden value is updated, unless the change is purely metadata/documentation.'
  ];
}

function buildGreenMeaningRows() {
  return [
    { area: 'GREEN means', statement: 'Executed internal checks passed for the recorded repository state.' },
    { area: 'GREEN means', statement: 'No blocking numerical regression was detected inside the tested scope.' },
    { area: 'GREEN means', statement: 'Generated artifacts are internally consistent with the executed audit commands.' },
    { area: 'GREEN does not mean', statement: 'The model is empirically true or scientifically validated against astronomical reality.' },
    { area: 'GREEN does not mean', statement: 'All assumptions, priors, correlations, and dependencies are correct.' },
    { area: 'GREEN does not mean', statement: 'All code paths are covered or defect-free.' },
    { area: 'GREEN does not mean', statement: 'External peer review, formal certification, or independent software assurance has occurred.' }
  ];
}

function buildVvuqStructureRows() {
  return [
    { section: 'Code verification', status: 'implemented', evidence: 'test:all, syntax, static scan, mutation audit' },
    { section: 'Numerical verification', status: 'implemented', evidence: 'deterministic regression, Python oracle, cross-oracle' },
    { section: 'Solution verification', status: 'partial', evidence: 'Monte Carlo reproducibility and convergence checks; no empirical data validation' },
    { section: 'Scientific validation', status: 'not claimed', evidence: 'explicit audit disclaimer' },
    { section: 'Uncertainty quantification', status: 'partial', evidence: 'MC intervals, convergence audit, UQ limitations' },
    { section: 'Sensitivity analysis', status: 'partial', evidence: 'Sobol audit and existing UI checks' },
    { section: 'Model credibility assessment', status: 'partial', evidence: 'limitations table, GREEN means/does-not-mean table' },
    { section: 'Known limitations', status: 'implemented', evidence: 'audit limitations and scope statements' }
  ];
}

async function buildVersionDeltaRows() {
  const rows = [];
  for (let i = 1; i < VERSION_SEQUENCE.length; i += 1) {
    const from = VERSION_SEQUENCE[i - 1];
    const to = VERSION_SEQUENCE[i];
    const file = path.join(repoRoot, `RELEASE_NOTES_v${to}.md`);
    const text = await readOptional(file);
    rows.push({
      transition: `v${from} -> v${to}`,
      release_notes: fs.existsSync(file),
      formula_mentions: (text.match(/formula|equation|calculation|deterministic/gi) || []).length,
      prior_mentions: (text.match(/prior|parameter|source|citation|Bryson|Lineweaver/gi) || []).length,
      ui_mentions: (text.match(/UI|label|display|card|button|tooltip/gi) || []).length,
      test_mentions: (text.match(/test|audit|regression|PASS|verification/gi) || []).length,
      source_file: `RELEASE_NOTES_v${to}.md`
    });
  }
  return rows;
}

export async function runMethodologyGovernanceAudit(outDir) {
  await ensureDir(outDir);
  const traceOut = path.join(outDir, 'base-traceability');
  const baseTrace = await writeTraceability(traceOut);
  const extendedTrace = buildExtendedTraceability(baseTrace.rows);
  const uiTrace = buildUiTraceRows();
  const goldenRules = buildGoldenRules();
  const greenRows = buildGreenMeaningRows();
  const structureRows = buildVvuqStructureRows();
  const versionDelta = await buildVersionDeltaRows();
  const missingReleaseNotes = versionDelta.filter(row => !row.release_notes);

  await writeJson(path.join(outDir, 'requirements-traceability-extended.json'), extendedTrace);
  await writeText(path.join(outDir, 'requirements-traceability-extended.md'), [
    '# Extended Requirements Traceability Matrix',
    '',
    '| ID | Scientific claim | Formula | Code function | UI element | Export field | Test command | Expected output | Tolerance | Severity | Source document |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...extendedTrace.map(row => `| ${row.id} | ${md(row.scientific_claim)} | ${md(row.formula)} | ${md(row.code_function)} | ${md(row.ui_element)} | ${md(row.export_field)} | ${md(row.test_command)} | ${md(row.expected_output)} | ${md(row.tolerance)} | ${md(row.failure_severity)} | ${md(row.source_document)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'ui-state-calculation-display-export-trace.json'), uiTrace);
  await writeText(path.join(outDir, 'ui-state-calculation-display-export-trace.md'), [
    '# UI -> State -> Calculation -> Display -> Export Trace Audit',
    '',
    '| Step | Source | Target | Evidence |',
    '| --- | --- | --- | --- |',
    ...uiTrace.map(row => `| ${md(row.step)} | ${md(row.source)} | ${md(row.target)} | ${md(row.evidence)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'golden-output-governance.json'), goldenRules);
  await writeText(path.join(outDir, 'golden-output-governance.md'), [
    '# Golden Output Governance',
    '',
    ...goldenRules.map((rule, index) => `${index + 1}. ${rule}`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'green-means-does-not-mean.json'), greenRows);
  await writeText(path.join(outDir, 'green-means-does-not-mean.md'), [
    '# GREEN Means / Does Not Mean',
    '',
    '| Area | Statement |',
    '| --- | --- |',
    ...greenRows.map(row => `| ${md(row.area)} | ${md(row.statement)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'formal-vvuq-structure.json'), structureRows);
  await writeText(path.join(outDir, 'formal-vvuq-structure.md'), [
    '# Formal V&V/UQ-Informed Structure',
    '',
    '| Section | Status | Evidence |',
    '| --- | --- | --- |',
    ...structureRows.map(row => `| ${md(row.section)} | ${md(row.status)} | ${md(row.evidence)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'version-to-version-delta-summary.json'), versionDelta);
  await writeText(path.join(outDir, 'version-to-version-delta-summary.md'), [
    '# Version-To-Version Scientific Delta Audit',
    '',
    '| Transition | Release notes | Formula mentions | Prior/source mentions | UI mentions | Test/audit mentions | Source file |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...versionDelta.map(row => `| ${md(row.transition)} | ${row.release_notes ? 'yes' : 'no'} | ${row.formula_mentions} | ${row.prior_mentions} | ${row.ui_mentions} | ${row.test_mentions} | ${md(row.source_file)} |`)
  ].join('\n'));

  const summary = {
    status: missingReleaseNotes.length ? 'PARTIAL' : 'PASS',
    generated_at: new Date().toISOString(),
    extended_requirements: extendedTrace.length,
    ui_trace_rows: uiTrace.length,
    golden_rules: goldenRules.length,
    green_rows: greenRows.length,
    vvuq_structure_rows: structureRows.length,
    version_delta_rows: versionDelta.length,
    missing_release_notes: missingReleaseNotes.map(row => row.source_file),
    artifacts: [
      'requirements-traceability-extended.md',
      'ui-state-calculation-display-export-trace.md',
      'golden-output-governance.md',
      'green-means-does-not-mean.md',
      'formal-vvuq-structure.md',
      'version-to-version-delta-summary.md'
    ]
  };

  await writeJson(path.join(outDir, 'methodology-governance-summary.json'), summary);
  await writeText(path.join(outDir, 'methodology-governance-report.md'), [
    '# Methodology Governance Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Extended requirements: ${summary.extended_requirements}`,
    `UI trace rows: ${summary.ui_trace_rows}`,
    `Golden rules: ${summary.golden_rules}`,
    `GREEN meaning rows: ${summary.green_rows}`,
    `V&V/UQ structure rows: ${summary.vvuq_structure_rows}`,
    `Version delta rows: ${summary.version_delta_rows}`,
    '',
    summary.missing_release_notes.length
      ? `Missing release notes: ${summary.missing_release_notes.join(', ')}`
      : 'Missing release notes: none'
  ].join('\n'));

  process.stdout.write(`METHODOLOGY_GOVERNANCE ${summary.status}: requirements=${summary.extended_requirements}, versionDeltas=${summary.version_delta_rows}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `methodology-governance-${Date.now()}`);
  const summary = await runMethodologyGovernanceAudit(outDir);
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
