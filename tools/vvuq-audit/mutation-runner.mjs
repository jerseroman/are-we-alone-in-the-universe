import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
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
    id: 'occurrence-product-to-sum',
    file: 'src/calculator-core.js',
    find: 'return (Number(inp.N_p_star) || 0) * (Number(inp.f_composition) || 0) * (Number(inp.f_orbit) || 0);',
    replace: 'return (Number(inp.N_p_star) || 0) + (Number(inp.f_composition) || 0) + (Number(inp.f_orbit) || 0);',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'remove-stability-factor',
    file: 'src/calculator-core.js',
    find: 'inp.f_stability *\n    inp.f_magnetosphere *',
    replace: '1 *\n    inp.f_magnetosphere *',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'remove-chnops-factor',
    file: 'src/calculator-core.js',
    find: 'inp.f_CHNOPS *\n    inp.f_complex_life *',
    replace: '1 *\n    inp.f_complex_life *',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'clamp-inverted',
    file: 'src/calculator-core.js',
    find: 'return Math.min(hi, Math.max(lo, v));',
    replace: 'return Math.max(hi, Math.min(lo, v));',
    tests: [['npm', ['run', 'test:numerics']]]
  },
  {
    id: 'percentile-index-off-by-one',
    file: 'src/calculator-core.js',
    find: 'const idx = (sorted.length - 1) * p;',
    replace: 'const idx = sorted.length * p;',
    tests: [['npm', ['run', 'test:montecarlo']]]
  },
  {
    id: 'monte-carlo-sort-descending',
    file: 'src/calculator-core.js',
    find: 'results.sort((a, b) => a - b);',
    replace: 'results.sort((a, b) => b - a);',
    tests: [['npm', ['run', 'test:montecarlo']]]
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
    id: 'universe-scale-max-star-range',
    file: 'src/calculator-core.js',
    find: 'max: 1e24',
    replace: 'max: 1e22',
    tests: [['npm', ['run', 'test:universe-scale']]]
  },
  {
    id: 'temporal-overlap-floor',
    file: 'src/calculator-core.js',
    find: 'const temporalTerm = Math.max(1e-30, detection.p_temporal_pct / 100);',
    replace: 'const temporalTerm = Math.max(1, detection.p_temporal_pct / 100);',
    tests: [['npm', ['run', 'test:absolute']]]
  },
  {
    id: 'seed-prng-step-collapse',
    file: 'src/calculator-core.js',
    find: 'state = (state + 0x6D2B79F5) >>> 0;',
    replace: 'state = (state + 1) >>> 0;',
    tests: [['npm', ['run', 'test:montecarlo']]]
  },
  {
    id: 'mc-bounds-mode-label-stale',
    file: 'src/calculator-core.js',
    find: "modifiedPresetLocal: 'Modified preset-local uncertainty / Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields',",
    replace: "modifiedPresetLocal: 'Global exploratory envelope / Not local preset uncertainty',",
    tests: [['npm', ['run', 'test:standalone-export']]]
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

function selectMutations(options = {}) {
  const pool = options.quick ? MUTATIONS.slice(0, 3) : MUTATIONS;
  const hasWindow = options.startIndex !== undefined || options.limit !== undefined;
  if (!hasWindow) return pool;
  const start = Number.isFinite(Number(options.startIndex)) ? Math.max(0, Number(options.startIndex)) : 0;
  const limit = Number.isFinite(Number(options.limit)) ? Math.max(1, Number(options.limit)) : pool.length;
  const selected = [];
  for (let i = 0; i < Math.min(limit, pool.length); i += 1) {
    selected.push(pool[(start + i) % pool.length]);
  }
  return selected;
}

export async function runMutations(outDir, options = {}) {
  await ensureDir(outDir);
  const tempBase = await fsp.mkdtemp(path.join(os.tmpdir(), 'vvuq-mutants-'));

  const selected = selectMutations(options);
  const results = [];
  const timeoutMs = Number(options.timeoutMs || (options.quick ? 120000 : 300000));

  try {
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
        const result = await runCommand(command, args, { cwd: mutantRoot, timeoutMs });
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
  } finally {
    await fsp.rm(tempBase, { recursive: true, force: true });
  }

  const valid = results.filter(r => r.status !== 'INVALID');
  const killed = results.filter(r => r.status === 'KILLED');
  const survived = results.filter(r => r.status === 'SURVIVED');
  const summary = {
    status: survived.length === 0 ? 'PASS' : 'FAIL',
    mode: options.quick ? 'quick' : (options.limit || options.startIndex !== undefined ? 'rotating-window' : 'full'),
    catalog_mutants: MUTATIONS.length,
    selected_mutants: selected.map(item => item.id),
    start_index: options.startIndex === undefined ? null : Number(options.startIndex),
    limit: options.limit === undefined ? null : Number(options.limit),
    timeout_ms: timeoutMs,
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
    `Catalog mutants: ${summary.catalog_mutants}`,
    `Selected mutants: ${summary.selected_mutants.join(', ')}`,
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
  const summary = await runMutations(outDir, {
    quick: !!args.quick,
    startIndex: args['start-index'] || args.startIndex,
    limit: args.limit,
    timeoutMs: args['timeout-ms'] || args.timeoutMs
  });
  process.stdout.write(`MUTATION ${summary.status}: killed ${summary.killed_mutants}/${summary.valid_mutants} valid mutants\n`);
  process.exit(summary.status === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
