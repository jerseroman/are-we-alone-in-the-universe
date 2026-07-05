import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, timestampId, writeJson, writeText } from './lib/audit-utils.mjs';

const require = createRequire(import.meta.url);

const PARAMETER_EVIDENCE = Object.freeze({
  N_GHZ: {
    id: 'LIT-N-GHZ',
    sourceText: 'an annular region between 7 and 9 kiloparsecs',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze(['7', '9']),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'GHZ star-count preset values are derived from GHZ framing and Milky Way star-count assumptions, not quoted star counts.'
  },
  f_sun_type: {
    id: 'LIT-F-SUN-TYPE',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'Host-star fraction is an interpretive solar-type range, not a quoted census fraction.'
  },
  f_sun_age: {
    id: 'LIT-F-SUN-AGE',
    sourceText: '75% of the stars in the GHZ are older than the Sun',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze(['75%']),
    directPresetValues: Object.freeze([0.75]),
    calibrationClass: 'LI',
    directNumericQuote: true,
    valueClaim: 'The 0.75 central value is directly anchored to the quoted 75% GHZ-age statement; 0.60 and 0.80 remain interval choices.'
  },
  N_p_star: {
    id: 'LIT-N-P-STAR',
    sourceText: 'stars are orbited by planets as a rule, rather than the exception',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'Planet multiplicity values are selected inside broad occurrence-rate context, not directly quoted as 1.0/1.5/1.6/2.0.'
  },
  f_composition: {
    id: 'LIT-F-COMPOSITION',
    sourceText: 'the majority of 1.6 Earth-radius planets are too low density',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze(['1.6']),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'Rocky-fraction values are model splits inside a literature-informed radius/composition context.'
  },
  f_orbit: {
    id: 'LIT-F-ORBIT',
    sourceText: 'conservative HZ is between 0.37 and 0.60 planets per star',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze(['0.37', '0.60']),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'Bryson quotes eta-Earth as a combined occurrence rate; f_orbit preset values are factorized model proxies.'
  },
  f_stability: {
    id: 'LIT-F-STABILITY',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Orbital-stability values are mechanism-supported model priors.'
  },
  f_magnetosphere: {
    id: 'LIT-F-MAGNETOSPHERE',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Magnetic/atmospheric retention values are mechanism-supported model priors.'
  },
  f_lunar_stability: {
    id: 'LIT-F-LUNAR-STABILITY',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Moon/stabilizer values are mechanism-supported climate-stability priors.'
  },
  f_size: {
    id: 'LIT-F-SIZE',
    sourceText: 'the majority of 1.6 Earth-radius planets are too low density',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze(['1.6']),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'LI',
    directNumericQuote: false,
    valueClaim: 'Earth-size window values are literature-informed, not a quoted universal occurrence fraction.'
  },
  f_rotation: {
    id: 'LIT-F-ROTATION',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Rotation-suitability values are mechanism-supported climate priors.'
  },
  f_tilt: {
    id: 'LIT-F-TILT',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Axial-tilt values are mechanism-supported climate-stability priors.'
  },
  f_H2O: {
    id: 'LIT-F-H2O',
    sourceText: 'No direct preset-value quote recorded.',
    sourceTextType: 'audit finding',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'Surface-water values are mechanism-supported water-availability priors.'
  },
  f_CHNOPS: {
    id: 'LIT-F-CHNOPS',
    sourceText: 'CHNOPS are likely crucial to most habitable worlds',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MS',
    directNumericQuote: false,
    valueClaim: 'CHNOPS values are mechanism-supported chemical-habitability priors.'
  },
  f_complex_life: {
    id: 'LIT-F-COMPLEX-LIFE',
    sourceText: 'uncertainties that span multiple orders of magnitude',
    sourceTextType: 'abstract excerpt',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MP',
    directNumericQuote: false,
    valueClaim: 'Complex-life values are broad exploratory biological-filter priors.'
  },
  f_x: {
    id: 'LIT-F-X',
    sourceText: 'User-defined wildcard factor; no literature-backed numeric claim.',
    sourceTextType: 'local model-scope statement',
    quotedNumbers: Object.freeze([]),
    directPresetValues: Object.freeze([]),
    calibrationClass: 'MP',
    directNumericQuote: false,
    valueClaim: 'Wildcard values are intentionally user/model defined and outside literature-backed claims.'
  }
});

function md(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function badge(status) {
  if (status === 'PASS') return '![PASS](https://img.shields.io/badge/PASS-green)';
  if (status === 'PARTIAL') return '![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow)';
  if (status === 'WARN') return '![WARN](https://img.shields.io/badge/WARN-yellow)';
  return '![FAIL](https://img.shields.io/badge/FAIL-red)';
}

function near(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= scale * 1e-12;
}

function classifyPresetValue(value, param) {
  if (near(value, param.min)) return 'registry lower bound';
  if (near(value, param.central)) return 'registry central value';
  if (near(value, param.max)) return 'registry upper bound';
  if (value >= param.min && value <= param.max) return 'inside registry interval';
  return 'outside registry interval';
}

function sourceUrlForParameter(param, evidence) {
  if (param.doiOrUrl) return param.doiOrUrl;
  return evidence.calibrationClass === 'MP' ? 'not applicable' : '';
}

function validateSourceText(key, evidence, failures, warnings) {
  if (!evidence) {
    failures.push(`${key} has no literature evidence entry`);
    return;
  }
  if (!evidence.id) failures.push(`${key} evidence has no id`);
  if (!evidence.sourceText || !String(evidence.sourceText).trim()) {
    failures.push(`${key} evidence has no exact source text`);
  }
  const words = String(evidence.sourceText || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 25) {
    failures.push(`${key} evidence source text is too long for a compact audit excerpt`);
  }
  if (!evidence.valueClaim || !String(evidence.valueClaim).trim()) {
    failures.push(`${key} evidence has no value-claim explanation`);
  }
}

function hasDirectPresetValueQuote(value, evidence) {
  return (evidence?.directPresetValues || []).some(item => near(value, item));
}

function buildLiteratureAudit(registry) {
  const failures = [];
  const warnings = [];
  const parameterRows = [];
  const presetRows = [];
  const orderedKeys = registry.parameterOrder || [];

  for (const key of orderedKeys) {
    const param = registry.parameters?.[key];
    const evidence = PARAMETER_EVIDENCE[key];
    if (!param) {
      failures.push(`missing parameter registry entry for ${key}`);
      continue;
    }
    validateSourceText(key, evidence, failures, warnings);

    const sourceUrl = evidence ? sourceUrlForParameter(param, evidence) : '';
    if (param.isLiteratureBacked && !sourceUrl) {
      failures.push(`${key} is literature-backed but has no literature URL`);
    }

    parameterRows.push({
      parameter: key,
      evidence_id: evidence?.id ?? '',
      label: param.label,
      citation: param.citationShort,
      source_url: sourceUrl,
      quoted_evidence_text: evidence?.sourceText ?? '',
      quoted_numbers: (evidence?.quotedNumbers || []).join(', '),
      directly_quoted_preset_values: (evidence?.directPresetValues || []).join(', '),
      source_text_type: evidence?.sourceTextType ?? '',
      calibration_class: evidence?.calibrationClass ?? '',
      direct_numeric_quote: !!evidence?.directNumericQuote,
      value_claim: evidence?.valueClaim ?? '',
      registry_value_type: param.valueType,
      registry_interval: `[${param.min}, ${param.central}, ${param.max}]`,
      literature_backed: !!param.isLiteratureBacked
    });
  }

  for (const [presetKey, preset] of Object.entries(registry.presets || {})) {
    const values = preset.values || {};
    for (const key of orderedKeys) {
      const value = values[key];
      const param = registry.parameters?.[key];
      const evidence = PARAMETER_EVIDENCE[key];
      const directPresetValueQuote = hasDirectPresetValueQuote(value, evidence);
      if (typeof value !== 'number' || Number.isNaN(value)) {
        failures.push(`preset ${presetKey} has non-numeric value for ${key}`);
        continue;
      }
      if (!param) continue;
      const basis = classifyPresetValue(value, param);
      const rowStatus = basis === 'outside registry interval' ? 'FAIL' : 'PASS';
      if (rowStatus === 'FAIL') {
        failures.push(`preset ${presetKey} ${key}=${value} is outside [${param.min}, ${param.max}]`);
      }
      presetRows.push({
        preset: presetKey,
        preset_label: preset.label,
        parameter: key,
        value,
        registry_min: param.min,
        registry_central: param.central,
        registry_max: param.max,
        value_basis: basis,
        evidence_id: evidence?.id ?? '',
        calibration_class: evidence?.calibrationClass ?? '',
        direct_numeric_quote: !!evidence?.directNumericQuote,
        direct_preset_value_quote: directPresetValueQuote,
        quoted_numbers: (evidence?.quotedNumbers || []).join(', '),
        status: rowStatus
      });
    }
  }

  const directQuoteCount = parameterRows.filter(row => row.direct_numeric_quote).length;
  const directPresetValueQuoteCount = presetRows.filter(row => row.direct_preset_value_quote).length;
  const modelDerivedCount = parameterRows.length - directQuoteCount;
  const status = failures.length ? 'FAIL' : 'PASS';
  const directPresetQuoteStatus = failures.length
    ? 'FAIL'
    : directPresetValueQuoteCount === presetRows.length
      ? 'PASS'
      : 'PARTIAL';
  const summary = {
    status,
    direct_preset_quote_status: directPresetQuoteStatus,
    generated_at: new Date().toISOString(),
    registry_version: registry.version,
    calculator_version: registry.calculatorVersion,
    preset_count: Object.keys(registry.presets || {}).length,
    parameter_count: orderedKeys.length,
    preset_value_count: presetRows.length,
    evidence_entry_count: parameterRows.length,
    direct_numeric_quote_count: directQuoteCount,
    direct_preset_value_quote_count: directPresetValueQuoteCount,
    model_or_prior_count: modelDerivedCount,
    failures,
    warnings
  };

  return { summary, parameterRows, presetRows };
}

function renderReport(audit) {
  const { summary, parameterRows, presetRows } = audit;
  const schemaColor = summary.status === 'PASS' ? 'green' : 'red';
  const quoteColor = summary.direct_preset_quote_status === 'PASS' ? 'green' : 'yellow';
  const lines = [
    '# Literature Audit',
    '',
    `![provenance_schema](https://img.shields.io/badge/provenance_schema-${summary.status}-${schemaColor}) ![direct_preset_quotes](https://img.shields.io/badge/direct_preset_quotes-${summary.direct_preset_quote_status}-${quoteColor}) ![preset_values](https://img.shields.io/badge/preset_values-${summary.preset_value_count}-blue) ![evidence_entries](https://img.shields.io/badge/evidence_entries-${summary.evidence_entry_count}-blue)`,
    '',
    'This audit checks whether every named preset number in `SCIENTIFIC_PARAMETER_REGISTRY.presets` has an explicit provenance path. It records the source link, a compact quoted evidence text where available, quoted numbers, the calibration class, and whether the preset number itself is directly quoted by the literature or is an internal literature-informed/model prior.',
    '',
    'Important scope note: most preset numbers in this calculator are not claimed to be exact numbers copied from a paper. They are documented as registry lower bounds, central values, upper bounds, or internal scenario values inside literature-informed intervals. `provenance_schema=PASS` means the provenance classification is explicit and internally consistent. `direct_preset_quotes=PARTIAL` means only the listed preset values have a direct numeric quote; the remaining values are model-derived priors and must not be described as quoted literature numbers.',
    '',
    '## Summary',
    '',
    '| Item | Value |',
    '| --- | --- |',
    `| Provenance schema status | ${badge(summary.status)} |`,
    `| Direct preset-value quote status | ${badge(summary.direct_preset_quote_status)} |`,
    `| Generated at | \`${summary.generated_at}\` |`,
    `| Calculator version | \`${summary.calculator_version}\` |`,
    `| Registry version | \`${summary.registry_version}\` |`,
    `| Presets checked | \`${summary.preset_count}\` |`,
    `| Parameters checked | \`${summary.parameter_count}\` |`,
    `| Preset numeric values checked | \`${summary.preset_value_count}\` |`,
    `| Evidence entries | \`${summary.evidence_entry_count}\` |`,
    `| Parameters with direct numeric quote evidence | \`${summary.direct_numeric_quote_count}\` |`,
    `| Preset values with direct numeric quote coverage | \`${summary.direct_preset_value_quote_count}/${summary.preset_value_count}\` |`,
    `| Literature-informed/model-prior entries | \`${summary.model_or_prior_count}\` |`,
    `| Failures | \`${summary.failures.length}\` |`,
    `| Warnings | \`${summary.warnings.length}\` |`,
    '',
    '## Calibration Classes',
    '',
    '| Class | Meaning |',
    '| --- | --- |',
    '| LC | Direct literature/reference calibration. |',
    '| LI | Literature-informed numerical prior; source supports context, but the exact value is an internal prior. |',
    '| MS | Mechanism-supported model prior; source supports the mechanism, not an exact occurrence value. |',
    '| MP | Speculative/model/user prior; not a direct literature-backed numeric value. |',
    '',
    '## Parameter Evidence',
    '',
    '| Evidence ID | Parameter | Citation | Link | Quoted evidence text | Quoted numbers | Directly quoted preset values | Text type | Class | Value claim |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...parameterRows.map(row => `| ${md(row.evidence_id)} | ${md(row.parameter)} | ${md(row.citation)} | ${md(row.source_url)} | ${md(row.quoted_evidence_text)} | ${md(row.quoted_numbers || 'none')} | ${md(row.directly_quoted_preset_values || 'none')} | ${md(row.source_text_type)} | ${md(row.calibration_class)} | ${md(row.value_claim)} |`),
    '',
    '## Preset Number Trace Matrix',
    '',
    '| Preset | Parameter | Value | Registry interval | Basis | Evidence ID | Quoted numbers | Class | Direct preset-value quote? | Status |',
    '| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |',
    ...presetRows.map(row => `| ${md(row.preset)} | ${md(row.parameter)} | ${row.value} | [${row.registry_min}, ${row.registry_central}, ${row.registry_max}] | ${md(row.value_basis)} | ${md(row.evidence_id)} | ${md(row.quoted_numbers || 'none')} | ${md(row.calibration_class)} | ${row.direct_preset_value_quote ? 'yes' : 'no'} | ${badge(row.status)} |`),
    '',
    '## Findings',
    '',
    summary.failures.length
      ? summary.failures.map(item => `- FAIL: ${item}`).join('\n')
      : '- No missing evidence entries, missing source-text anchors, missing literature links for literature-backed entries, non-numeric preset values, or out-of-interval preset values were found.',
    '',
    summary.warnings.length
      ? summary.warnings.map(item => `- WARN: ${item}`).join('\n')
      : '- No warnings were recorded.',
    '',
    '## Interpretation Boundary',
    '',
    'This audit verifies provenance traceability for preset numbers. It does not independently validate the cited scientific papers, does not prove that the selected priors are empirically correct, and does not convert mechanism-supported or model-prior values into direct literature measurements.'
  ];
  return lines.join('\n');
}

export async function runLiteratureAudit(outDir, options = {}) {
  await ensureDir(outDir);
  const registryModule = require(path.join(repoRoot, 'src', 'scientific-parameters.js'));
  const registry = registryModule.SCIENTIFIC_PARAMETER_REGISTRY;
  const audit = buildLiteratureAudit(registry);
  const report = renderReport(audit);

  await writeJson(path.join(outDir, 'literature-audit-summary.json'), audit.summary);
  await writeJson(path.join(outDir, 'literature-parameter-evidence.json'), audit.parameterRows);
  await writeJson(path.join(outDir, 'literature-preset-trace-matrix.json'), audit.presetRows);
  await writeText(path.join(outDir, 'LITERATURE_AUDIT.md'), report);

  if (options.rootReport) {
    await writeText(path.resolve(repoRoot, options.rootReport), report);
  }

  process.stdout.write(`LITERATURE_AUDIT ${audit.summary.status}: direct_preset_quotes=${audit.summary.direct_preset_quote_status}, quoted_values=${audit.summary.direct_preset_value_quote_count}/${audit.summary.preset_value_count}, preset_values=${audit.summary.preset_value_count}, evidence_entries=${audit.summary.evidence_entry_count}, failures=${audit.summary.failures.length}\n`);
  return audit.summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out
    ? path.resolve(repoRoot, args.out)
    : path.join(repoRoot, 'audit-output', timestampId('literature-audit'));
  const summary = await runLiteratureAudit(outDir, { rootReport: args['root-report'] || args.rootReport || null });
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
