import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';

const require = createRequire(import.meta.url);

function md(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function yes(value) {
  return value ? 'yes' : 'no';
}

function buildPriorRows(registry) {
  return registry.parameterOrder.map(key => {
    const param = registry.parameters[key];
    const measured = param?.valueType === registry.valueTypes.direct;
    const inferred = param?.valueType === registry.valueTypes.transformed || param?.valueType === registry.valueTypes.interpretiveMidpoint;
    const expertPrior = param?.valueType === registry.valueTypes.userDefined || /prior|model prior|interpretive/i.test(param?.uncertaintyNote || '');
    return {
      key,
      label: param?.label ?? null,
      central: param?.central ?? null,
      min: param?.min ?? null,
      max: param?.max ?? null,
      unit: param?.unit ?? null,
      value_type: param?.valueType ?? null,
      citation: param?.citationShort ?? null,
      doi_or_url: param?.doiOrUrl ?? null,
      literature_backed: !!param?.isLiteratureBacked,
      needs_citation_precision: !!param?.needsCitationPrecision,
      is_value_directly_measured: measured,
      is_value_inferred: inferred,
      is_value_expert_prior: expertPrior,
      distribution_assumption: param?.unit === 'fraction' ? 'bounded logit/log/normal or uniform depending MC mode' : 'positive log/lognormal or bounded normal depending MC mode',
      transformation_used: param?.valueType ?? null,
      reason_for_bounds: param?.uncertaintyNote ?? null,
      confidence_level: param?.isLiteratureBacked ? (param?.needsCitationPrecision ? 'literature-informed internal prior' : 'documented internal prior') : 'user-defined / not literature-backed',
      uncertainty_note: param?.uncertaintyNote ?? null
    };
  });
}

function buildDependencyRows(registry) {
  const bryson = registry.observationalPriors?.bryson_eta_direct;
  const replaced = new Set(bryson?.replaced_factorized_terms || []);
  return registry.parameterOrder.map(key => ({
    key,
    deterministic_product: key === 'f_complex_life' || key === 'f_x' ? 'conditional' : 'yes',
    preset_values: Object.values(registry.presets).every(preset => Object.hasOwn(preset.values || {}, key)) ? 'yes' : 'no',
    monte_carlo_sampling: 'yes',
    occurrence_overlay_replaced_by_bryson_direct: yes(replaced.has(key)),
    export_state: 'yes',
    ui_source_registry: 'yes',
    independence_assumption: replaced.has(key)
      ? 'bypassed by direct eta-Earth occurrence in Bryson mode'
      : 'factorized as conditionally independent inside the internal model',
    likely_overlap_group: key === 'f_H2O' || key === 'f_magnetosphere' || key === 'f_stability'
      ? 'habitability-retention overlap'
      : key === 'f_composition' || key === 'f_orbit' || key === 'N_p_star'
        ? 'occurrence-rate overlap'
        : key === 'f_rotation' || key === 'f_tilt' || key === 'f_lunar_stability'
          ? 'climate/dynamical-stability overlap'
          : 'none recorded'
  }));
}

function validateRegistry(registry, priorRows) {
  const failures = [];
  const warnings = [];
  const orderedKeys = new Set(registry.parameterOrder || []);

  for (const key of registry.parameterOrder || []) {
    const param = registry.parameters?.[key];
    if (!param) {
      failures.push(`missing parameter registry entry for ${key}`);
      continue;
    }
    for (const field of ['label', 'description', 'unit', 'valueType', 'uncertaintyNote']) {
      if (param[field] === undefined || param[field] === null || String(param[field]).trim() === '') {
        failures.push(`${key} is missing ${field}`);
      }
    }
    for (const field of ['central', 'min', 'max']) {
      if (typeof param[field] !== 'number' || Number.isNaN(param[field])) {
        failures.push(`${key} has non-numeric ${field}`);
      }
    }
    if (typeof param.min === 'number' && typeof param.central === 'number' && typeof param.max === 'number') {
      if (param.min > param.central || param.central > param.max) {
        failures.push(`${key} violates min <= central <= max`);
      }
    }
    if (param.isLiteratureBacked && !param.doiOrUrl) {
      failures.push(`${key} is literature-backed but has no doiOrUrl`);
    }
    if (param.needsCitationPrecision && !param.citationShort) {
      failures.push(`${key} needs citation precision but has no citationShort`);
    }
  }

  for (const [presetKey, preset] of Object.entries(registry.presets || {})) {
    const values = preset.values || {};
    for (const key of registry.parameterOrder || []) {
      if (!Object.hasOwn(values, key)) failures.push(`preset ${presetKey} is missing ${key}`);
    }
    for (const key of Object.keys(values)) {
      if (!orderedKeys.has(key)) warnings.push(`preset ${presetKey} contains non-ordered key ${key}`);
    }
  }

  const bryson = registry.observationalPriors?.bryson_eta_direct;
  for (const key of bryson?.replaced_factorized_terms || []) {
    if (!orderedKeys.has(key)) failures.push(`Bryson direct replacement references unknown parameter ${key}`);
  }

  if (!priorRows.length) failures.push('prior table has no rows');
  return { failures, warnings };
}

export async function runPriorAndDependencyAudit(outDir) {
  await ensureDir(outDir);
  const registryModule = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));
  const registry = registryModule.SCIENTIFIC_PARAMETER_REGISTRY;
  const priorRows = buildPriorRows(registry);
  const dependencyRows = buildDependencyRows(registry);
  const { failures, warnings } = validateRegistry(registry, priorRows);
  const summary = {
    status: failures.length ? 'FAIL' : 'PASS',
    generated_at: new Date().toISOString(),
    registry_version: registry.version,
    calculator_version: registry.calculatorVersion,
    parameter_count: priorRows.length,
    preset_count: Object.keys(registry.presets || {}).length,
    source_link_count: Object.keys(registry.sourceLinks || {}).length,
    failures,
    warnings
  };

  await writeJson(path.join(outDir, 'scientific-prior-table.json'), priorRows);
  await writeText(path.join(outDir, 'scientific-prior-table.md'), [
    '# Scientific Prior Table',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Parameter | Label | Central | Min | Max | Unit | Value type | Citation | Literature-backed |',
    '| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |',
    ...priorRows.map(row => `| ${md(row.key)} | ${md(row.label)} | ${md(row.central)} | ${md(row.min)} | ${md(row.max)} | ${md(row.unit)} | ${md(row.value_type)} | ${md(row.citation)} | ${yes(row.literature_backed)} |`)
  ].join('\n'));

  await writeText(path.join(outDir, 'scientific-prior-deep-table.md'), [
    '# Scientific Prior Deep Table',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Parameter | Directly measured | Inferred | Expert/internal prior | Distribution assumption | Transformation | Confidence label | Reason for bounds |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...priorRows.map(row => `| ${md(row.key)} | ${yes(row.is_value_directly_measured)} | ${yes(row.is_value_inferred)} | ${yes(row.is_value_expert_prior)} | ${md(row.distribution_assumption)} | ${md(row.transformation_used)} | ${md(row.confidence_level)} | ${md(row.reason_for_bounds)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'dependency-overlap-matrix.json'), dependencyRows);
  await writeText(path.join(outDir, 'dependency-overlap-matrix.md'), [
    '# Dependency / Overlap Matrix',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Parameter | Deterministic product | Preset values | Monte Carlo sampling | Bryson direct replacement | Export state | UI source registry |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...dependencyRows.map(row => `| ${md(row.key)} | ${md(row.deterministic_product)} | ${md(row.preset_values)} | ${md(row.monte_carlo_sampling)} | ${md(row.occurrence_overlay_replaced_by_bryson_direct)} | ${md(row.export_state)} | ${md(row.ui_source_registry)} |`)
  ].join('\n'));

  await writeText(path.join(outDir, 'dependency-independence-matrix.md'), [
    '# Dependency / Independence Matrix',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Parameter | Independence assumption | Likely overlap group | Bryson direct replacement |',
    '| --- | --- | --- | --- |',
    ...dependencyRows.map(row => `| ${md(row.key)} | ${md(row.independence_assumption)} | ${md(row.likely_overlap_group)} | ${md(row.occurrence_overlay_replaced_by_bryson_direct)} |`)
  ].join('\n'));

  await writeJson(path.join(outDir, 'prior-dependency-summary.json'), summary);
  await writeText(path.join(outDir, 'prior-dependency-report.md'), [
    '# Scientific Prior And Dependency Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    `Parameters: ${summary.parameter_count}`,
    `Presets: ${summary.preset_count}`,
    `Source links: ${summary.source_link_count}`,
    `Failures: ${summary.failures.length}`,
    `Warnings: ${summary.warnings.length}`,
    '',
    summary.failures.length ? `Failure details: ${summary.failures.join('; ')}` : 'Failure details: none',
    summary.warnings.length ? `Warning details: ${summary.warnings.join('; ')}` : 'Warning details: none'
  ].join('\n'));

  process.stdout.write(`PRIOR_DEPENDENCY ${summary.status}: parameters=${summary.parameter_count}, presets=${summary.preset_count}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `prior-dependency-${Date.now()}`);
  const summary = await runPriorAndDependencyAudit(outDir);
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
