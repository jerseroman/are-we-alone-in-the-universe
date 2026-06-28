import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDir, parseArgs, repoRoot, runCommand, writeJson, writeText } from './lib/audit-utils.mjs';

const MUTATIONS = [
  {
    id: 'mul-to-div-core-product',
    file: 'src/calculator-core.js',
    find: 'inp.N_GHZ *\n    inp.f_sun_type *',
    replace: 'inp.N_GHZ /\n    inp.f_sun_type *',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'probability-inversion',
    file: 'src/calculator-core.js',
    find: '1 - Math.exp(-Math.max(0, count))',
    replace: 'Math.exp(-Math.max(0, count))',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'alter-kpc-to-ly',
    file: 'src/calculator-core.js',
    find: 'const KPC_TO_LY = 3261.56;',
    replace: 'const KPC_TO_LY = 3000;',
    tests: [['npm', ['run', 'test:montecarlo']]]
  },
  {
    id: 'disable-stale-state-label',
    file: 'src/calculator-core.js',
    find: "return monteCarloState === 'stale' ? 'stale' : 'not-run';",
    replace: "return monteCarloState === 'stale' ? 'not-run' : 'not-run';",
    tests: [['npm', ['run', 'test:deep']]]
  },
  {
    id: 'universe-scale-min-star-range',
    file: 'src/calculator-core.js',
    find: 'min: 1e22,',
    replace: 'min: 1e20,',
    tests: [['npm', ['run', 'test:universe-scale']]]
  },
  {
    id: 'temporal-overlap-floor',
    file: 'src/calculator-core.js',
    find: 'const temporalTerm = Math.max(1e-30, detection.p_temporal_pct / 100);',
    replace: 'const temporalTerm = Math.max(1, detection.p_temporal_pct / 100);',
    tests: [['npm', ['run', 'test:absolute']]]
  }
];

function shouldCopy(rel) {
  const normalized = rel.replace(/\\/g, '/');
  if (normalized === '.git' || normalized.startsWith('.git/')) return false;
  if (normalized === 'node_modules' || normalized.startsWith('node_modules/')) return false;
  if (normalized === 'audit-output' || normalized.startsWith('audit-output/')) return false;
  return true;
}

async function copyRepo(tempRoot) {
  await ensureDir(tempRoot);
  fs.cpSync(repoRoot, tempRoot, {
    recursive: true,
    filter: src => shouldCopy(path.relative(repoRoot, src))
  });
}

async function applyMutation(tempRoot, mutation) {
  const file = path.join(tempRoot, mutation.file);
  const text = await fsp.readFile(file, 'utf8');
  if (!text.includes(mutation.find)) return false;
  await fsp.writeFile(file, text.replace(mutation.find, mutation.replace), 'utf8');
  return true;
}

export async function runMutations(outDir, options = {}) {
  await ensureDir(outDir);
  const tempBase = path.resolve(outDir, 'temp-mutants');
  const resolvedOut = path.resolve(outDir);
  if (!tempBase.startsWith(resolvedOut)) {
    throw new Error(`Refusing unsafe temp path: ${tempBase}`);
  }
  await fsp.rm(tempBase, { recursive: true, force: true });
  await ensureDir(tempBase);

  const selected = options.quick ? MUTATIONS.slice(0, 3) : MUTATIONS;
  const results = [];

  for (const mutation of selected) {
    const mutantRoot = path.join(tempBase, mutation.id);
    await copyRepo(mutantRoot);
    const applied = await applyMutation(mutantRoot, mutation);
    if (!applied) {
      results.push({ id: mutation.id, status: 'INVALID', reason: 'mutation target pattern not found' });
      continue;
    }

    const testResults = [];
    for (const [command, args] of mutation.tests) {
      const result = await runCommand(command, args, { cwd: mutantRoot, timeoutMs: options.quick ? 120000 : 300000 });
      testResults.push({
        command: result.commandLine,
        status: result.status,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        durationMs: result.durationMs
      });
      if (result.status !== 'PASS') break;
    }

    const killed = testResults.some(r => r.status !== 'PASS');
    results.push({
      id: mutation.id,
      status: killed ? 'KILLED' : 'SURVIVED',
      tests: testResults
    });
  }

  const valid = results.filter(r => r.status !== 'INVALID');
  const killed = results.filter(r => r.status === 'KILLED');
  const survived = results.filter(r => r.status === 'SURVIVED');
  const summary = {
    status: survived.length === 0 ? 'PASS' : 'FAIL',
    mode: options.quick ? 'quick' : 'full',
    total_mutants: results.length,
    valid_mutants: valid.length,
    killed_mutants: killed.length,
    survived_mutants: survived.length,
    invalid_mutants: results.filter(r => r.status === 'INVALID').length,
    mutation_score: valid.length ? killed.length / valid.length : null,
    results
  };

  await writeJson(path.join(outDir, 'mutation-summary.json'), summary);
  await writeText(path.join(outDir, 'mutation-report.md'), [
    '# Mutation Testing',
    '',
    `Status: **${summary.status}**`,
    '',
    `Mode: ${summary.mode}`,
    `Mutation score: ${summary.mutation_score === null ? 'n/a' : summary.mutation_score.toFixed(3)}`,
    '',
    '| Mutant | Status |',
    '| --- | --- |',
    ...results.map(r => `| ${r.id} | ${r.status} |`)
  ].join('\n'));

  return summary;
}

async function main() {
  const args = parseArgs();
  const outDir = args.out ? path.resolve(repoRoot, args.out) : path.join(repoRoot, 'audit-output', `mutation-${Date.now()}`);
  const summary = await runMutations(outDir, { quick: !!args.quick });
  process.stdout.write(`MUTATION ${summary.status}: killed ${summary.killed_mutants}/${summary.valid_mutants} valid mutants\n`);
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

