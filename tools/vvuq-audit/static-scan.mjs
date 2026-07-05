import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, writeJson, writeText } from './lib/audit-utils.mjs';

const DEFAULT_GLOBS = [
  'src',
  'docs',
  'paper',
  'README.md',
  'REPRODUCIBILITY.md',
  'CHANGELOG.md',
  'CITATION.cff',
  'package.json',
  '.zenodo.json',
  'index.html',
  '404.html',
  'RELEASE_NOTES_v2.18.md'
];

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.md', '.cff', '.json', '.css']);

const FORBIDDEN_PHRASES = [
  'confirmed Earth-like planets',
  'proof of life',
  'detected civilizations',
  'SETI prediction',
  'first contact prediction',
  'Fermi paradox solved',
  'empirical confidence interval',
  'observational evidence'
];

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /ghp_[0-9A-Za-z]{36,}/,
  /github_pat_[0-9A-Za-z_]{40,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/
];

function walk(item, out = []) {
  const full = path.resolve(repoRoot, item);
  if (!fs.existsSync(full)) return out;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(full)) {
      if (child === 'node_modules' || child === '.git' || child === 'audit-output') continue;
      walk(path.relative(repoRoot, path.join(full, child)), out);
    }
    return out;
  }
  if (TEXT_EXTENSIONS.has(path.extname(full)) || path.basename(full) === '.zenodo.json') out.push(full);
  return out;
}

function lineRecords(file, text, pattern, mapper) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
  const records = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (pattern.test(line)) records.push(mapper(line, idx + 1, rel));
  });
  return records;
}

function isExplicitlyNegated(line, phrase) {
  const lower = line.toLowerCase();
  const p = phrase.toLowerCase();
  const ix = lower.indexOf(p);
  if (ix === -1) return false;
  const before = lower.slice(Math.max(0, ix - 80), ix);
  return /\b(not|does not|do not|no|without|avoid|avoids|never|must not|doesn't|is not|are not)\b/.test(before);
}

export async function runStaticScan(options = {}) {
  const outDir = options.outDir || path.join(repoRoot, 'audit-output', 'static-scan');
  await ensureDir(outDir);
  const files = DEFAULT_GLOBS.flatMap(item => walk(item));
  const uniqueFiles = [...new Set(files)].sort();

  const findings = [];
  const counters = {
    files_scanned: uniqueFiles.length,
    forbidden_phrase_matches: 0,
    unnegated_forbidden_phrase_matches: 0,
    high_signal_secret_matches: 0,
    http_literal_matches: 0,
    live_http_link_findings: 0,
    external_script_tags: 0,
    external_script_tags_missing_sri: 0,
    html_sink_matches: 0,
    source_placeholder_matches: 0,
    version_mentions: 0,
    provenance_term_matches: 0
  };

  for (const file of uniqueFiles) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const text = await fsp.readFile(file, 'utf8');

    for (const phrase of FORBIDDEN_PHRASES) {
      const rx = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      let match;
      while ((match = rx.exec(text))) {
        const before = text.slice(0, match.index);
        const lineNo = before.split(/\r?\n/).length;
        const line = text.split(/\r?\n/)[lineNo - 1] || '';
        const negated = isExplicitlyNegated(line, phrase);
        counters.forbidden_phrase_matches += 1;
        if (!negated) counters.unnegated_forbidden_phrase_matches += 1;
        findings.push({
          severity: negated ? 'INFO' : 'HIGH',
          category: 'forbidden-wording',
          file: rel,
          line: lineNo,
          phrase,
          negated,
          message: negated ? 'Forbidden phrase appears in explicit negating context.' : 'Forbidden phrase appears without local negation.'
        });
      }
    }

    for (const pattern of SECRET_PATTERNS) {
      const matches = lineRecords(file, text, pattern, (line, lineNo, fileRel) => ({
        severity: 'HIGH',
        category: 'secret-pattern',
        file: fileRel,
        line: lineNo,
        message: 'High-signal secret/key pattern matched.'
      }));
      counters.high_signal_secret_matches += matches.length;
      findings.push(...matches);
    }

    const httpMatches = lineRecords(file, text, /http:\/\//i, (line, lineNo, fileRel) => {
      const isSvgNs = /xmlns=["']http:\/\/www\.w3\.org\/2000\/svg/.test(line);
      const isLicense = /gnu\.org\/licenses|fsf\.org/.test(line);
      if (!isSvgNs && !isLicense) counters.live_http_link_findings += 1;
      return {
        severity: isSvgNs || isLicense ? 'INFO' : 'MEDIUM',
        category: 'http-literal',
        file: fileRel,
        line: lineNo,
        message: isSvgNs || isLicense ? 'Allowed HTTP literal context.' : 'HTTP literal should be reviewed.'
      };
    });
    counters.http_literal_matches += httpMatches.length;
    findings.push(...httpMatches);

    const scriptTags = [...text.matchAll(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi)];
    counters.external_script_tags += scriptTags.length;
    for (const tag of scriptTags) {
      if (!/\bintegrity=["']sha(256|384|512)-[^"']+["']/i.test(tag[0])) {
        counters.external_script_tags_missing_sri += 1;
        findings.push({
          severity: 'MEDIUM',
          category: 'external-script-sri',
          file: rel,
          line: text.slice(0, tag.index).split(/\r?\n/).length,
          message: 'External script tag is missing SRI integrity metadata.'
        });
      }
    }

    const sinkMatches = lineRecords(file, text, /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/, (line, lineNo, fileRel) => ({
      severity: 'INFO',
      category: 'html-sink-inventory',
      file: fileRel,
      line: lineNo,
      message: 'HTML sink inventory item; review escaping when this path changes.'
    }));
    counters.html_sink_matches += sinkMatches.length;

    const placeholders = lineRecords(file, text, /citation needed|source needed|source TBD|doi TBD|example\.com/i, (line, lineNo, fileRel) => ({
      severity: 'MEDIUM',
      category: 'source-placeholder',
      file: fileRel,
      line: lineNo,
      message: 'Source/provenance placeholder text matched.'
    }));
    counters.source_placeholder_matches += placeholders.length;
    findings.push(...placeholders);

    counters.version_mentions += (text.match(/\b(?:v)?2\.18(?:\.0)?\b/g) || []).length;
    counters.provenance_term_matches += (text.match(/\b(source|provenance|doi|citation|calibration)\b/gi) || []).length;
  }

  const blocking = findings.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity) && f.category !== 'html-sink-inventory');
  const summary = {
    status: blocking.length === 0 ? 'PASS' : 'FAIL',
    generated_at: new Date().toISOString(),
    counters,
    findings_count: findings.length,
    blocking_findings_count: blocking.length,
    findings
  };

  const report = [
    '# Static Code And Documentation Scan',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    ...Object.entries(counters).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Findings',
    '',
    findings.length
      ? '| Severity | Category | Location | Message |\n| --- | --- | --- | --- |\n' + findings
        .filter(f => f.severity !== 'INFO' || ['forbidden-wording', 'http-literal', 'external-script-sri', 'source-placeholder'].includes(f.category))
        .slice(0, 200)
        .map(f => `| ${f.severity} | ${f.category} | ${f.file}:${f.line || ''} | ${f.message.replace(/\|/g, '/')} |`)
        .join('\n')
      : 'No findings recorded.',
    '',
    'Note: HTML sink matches are inventoried in the JSON summary and are not treated as failures by this scan.'
  ].join('\n');

  await writeJson(path.join(outDir, 'static-scan-summary.json'), summary);
  await writeText(path.join(outDir, 'static-scan-report.md'), report);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : process.cwd();
  const summary = await runStaticScan({ outDir });
  process.stdout.write(`STATIC_SCAN ${summary.status}: ${summary.counters.files_scanned} files scanned, ${summary.blocking_findings_count} blocking findings\n`);
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

