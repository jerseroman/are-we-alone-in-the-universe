import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

async function readText(file) {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function externalScriptFindings(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match => ({ tag: match[0], src: match[1] }))
    .filter(item => /^(https?:)?\/\//i.test(item.src));
  return scripts.map(({ tag, src }) => ({
    src,
    tag,
    has_sri: /\bintegrity=["']sha(256|384|512)-[^"']+["']/i.test(tag),
    has_crossorigin: /\bcrossorigin=["']anonymous["']/i.test(tag)
  }));
}

function workflowFindings(workflowText) {
  const uses = [...workflowText.matchAll(/\buses:\s*([^\s#]+)/g)].map(match => match[1]);
  return {
    explicit_permissions: /^\s*permissions:/m.test(workflowText),
    actions: uses.map(action => ({
      action,
      pinned_to_sha: /@[a-f0-9]{40}$/i.test(action),
      version_pinned: /@v?\d+(?:\.\d+)?(?:\.\d+)?$/i.test(action)
    }))
  };
}

export async function runSecuritySupplyChainAudit(outDir) {
  await ensureDir(outDir);
  const pkg = await readJson(path.join(repoRoot, 'package.json'));
  const lock = await readJson(path.join(repoRoot, 'package-lock.json'));
  const licenseText = await readText(path.join(repoRoot, 'LICENSE.md'));
  const noticeText = await readText(path.join(repoRoot, 'NOTICE.md'));
  const reuseText = await readText(path.join(repoRoot, 'docs', 'REUSE_AND_ATTRIBUTION.md'));
  const workflowText = await readText(path.join(repoRoot, '.github', 'workflows', 'ci.yml'));
  const html = await readText(path.join(repoRoot, 'index.html'));

  const audit = await runCommand('npm', ['audit', '--json'], { timeoutMs: 120000 });
  let auditJson = null;
  try {
    auditJson = JSON.parse(audit.stdout || '{}');
  } catch {
    auditJson = null;
  }

  const scripts = externalScriptFindings(html);
  const workflow = workflowFindings(workflowText);
  const vulnerabilities = auditJson?.metadata?.vulnerabilities || {};
  const totalVulnerabilities = Number(vulnerabilities.total || 0);
  const findings = [];
  const warnings = [];

  if (!pkg) findings.push('package.json is missing or invalid');
  if (!lock) findings.push('package-lock.json is missing or invalid');
  if (pkg?.license !== 'AGPL-3.0-only') findings.push(`package license is ${pkg?.license || 'missing'}, expected AGPL-3.0-only`);
  if (!/GNU AFFERO GENERAL PUBLIC LICENSE/i.test(licenseText)) findings.push('LICENSE.md does not appear to contain AGPL text');
  if (!/AGPL/i.test(reuseText)) warnings.push('docs/REUSE_AND_ATTRIBUTION.md does not mention AGPL');
  if (!noticeText.trim()) warnings.push('NOTICE.md is empty or missing');
  if (scripts.some(item => !item.has_sri)) findings.push('one or more external script tags are missing SRI');
  if (scripts.some(item => !item.has_crossorigin)) findings.push('one or more external script tags are missing crossorigin=anonymous');
  if (!workflow.explicit_permissions) warnings.push('GitHub Actions workflow does not declare explicit permissions');
  if (workflow.actions.some(item => !item.pinned_to_sha)) warnings.push('GitHub Actions are version-pinned but not SHA-pinned');
  if (audit.status !== 'PASS' || totalVulnerabilities > 0) findings.push(`npm audit reported ${totalVulnerabilities} vulnerabilities or non-zero exit`);
  if (!pkg?.scripts?.['build:standalone']) warnings.push('reproducible standalone build script missing');
  if (!pkg?.scripts?.['test:canonical-sync']) warnings.push('canonical sync test script missing');

  const summary = {
    status: findings.length ? 'FAIL' : warnings.length ? 'PARTIAL' : 'PASS',
    generated_at: new Date().toISOString(),
    npm_audit_exit_code: audit.exitCode,
    vulnerabilities,
    package_license: pkg?.license || null,
    package_lock_present: !!lock,
    external_script_count: scripts.length,
    external_scripts_missing_sri: scripts.filter(item => !item.has_sri).length,
    external_scripts_missing_crossorigin: scripts.filter(item => !item.has_crossorigin).length,
    github_actions_explicit_permissions: workflow.explicit_permissions,
    github_actions: workflow.actions,
    agpl_license_present: /GNU AFFERO GENERAL PUBLIC LICENSE/i.test(licenseText),
    reuse_attribution_present: /AGPL/i.test(reuseText),
    reproducible_build_script_present: !!pkg?.scripts?.['build:standalone'],
    canonical_sync_script_present: !!pkg?.scripts?.['test:canonical-sync'],
    findings,
    warnings
  };

  await writeJson(path.join(outDir, 'security-supply-chain-summary.json'), summary);
  await writeText(path.join(outDir, 'security-supply-chain-report.md'), [
    '# Security / Supply-Chain Audit',
    '',
    `Status: **${summary.status}**`,
    '',
    '| Check | Result |',
    '| --- | --- |',
    `| npm audit vulnerabilities | ${totalVulnerabilities} |`,
    `| package-lock present | ${summary.package_lock_present ? 'yes' : 'no'} |`,
    `| package license | ${summary.package_license || 'missing'} |`,
    `| AGPL license text present | ${summary.agpl_license_present ? 'yes' : 'no'} |`,
    `| external script tags | ${summary.external_script_count} |`,
    `| missing SRI | ${summary.external_scripts_missing_sri} |`,
    `| missing crossorigin | ${summary.external_scripts_missing_crossorigin} |`,
    `| GitHub Actions explicit permissions | ${summary.github_actions_explicit_permissions ? 'yes' : 'no'} |`,
    `| SHA-pinned GitHub Actions | ${summary.github_actions.every(item => item.pinned_to_sha) ? 'yes' : 'no'} |`,
    `| reproducible build script | ${summary.reproducible_build_script_present ? 'yes' : 'no'} |`,
    '',
    `Findings: ${summary.findings.length ? summary.findings.join('; ') : 'none'}`,
    `Warnings: ${summary.warnings.length ? summary.warnings.join('; ') : 'none'}`
  ].join('\n'));

  process.stdout.write(`SECURITY_SUPPLY_CHAIN ${summary.status}: vulnerabilities=${totalVulnerabilities}, findings=${summary.findings.length}, warnings=${summary.warnings.length}\n`);
  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `security-supply-chain-${Date.now()}`);
  const summary = await runSecuritySupplyChainAudit(outDir);
  process.exit(summary.status === 'FAIL' ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
