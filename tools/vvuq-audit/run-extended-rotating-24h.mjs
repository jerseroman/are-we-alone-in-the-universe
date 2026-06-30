import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { runOracle } from './run-oracle.mjs';
import { runStaticScan } from './static-scan.mjs';
import { writeTraceability } from './traceability.mjs';
import {
  appendJsonl,
  collectEnvironment,
  ensureDir,
  parseArgs,
  recordCommandResult,
  repoRoot,
  runCommand,
  sanitizeFilePart,
  summarizeOutput,
  timestampId,
  writeJson,
  writeText
} from './lib/audit-utils.mjs';

const EXTENDED_PROFILES = [
  {
    id: '00-high-throughput-random-core-fuzz',
    title: 'High-throughput raw random core formula fuzz with Python oracle sampling',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/high-throughput-random-core-fuzz.mjs',
          '--seconds', '{sliceSeconds}',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}',
          '--progress-every', '1000000',
          '--oracle-every', '10000',
          '--oracle-sample-limit', '5000'
        ]
      }
    ]
  },
  {
    id: '01-random-ui-python-oracle',
    title: 'Random UI state fuzz with Python oracle and GUI verification',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/random-ui-oracle-fuzz.mjs',
          '--seconds', '{sliceSeconds}',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}',
          '--oracle-every', '25',
          '--oracle-batch-size', '8',
          '--progress-every', '100',
          '--pace-ms', '20'
        ]
      }
    ]
  },
  {
    id: '02-deterministic-replay',
    title: 'Deterministic replay of seeded random UI traces',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/deterministic-replay-audit.mjs',
          '--seconds', '{sliceSeconds}',
          '--steps', '180',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}'
        ]
      }
    ]
  },
  {
    id: '03-boundary-extreme-fuzz',
    title: 'Boundary and extreme value fuzz',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/boundary-extreme-audit.mjs',
          '--seconds', '{sliceSeconds}',
          '--steps', '220',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}'
        ]
      }
    ]
  },
  {
    id: '04-state-transition-soak',
    title: 'State transition soak with reset, export, and edge sweeps',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/state-transition-soak.mjs',
          '--seconds', '{sliceSeconds}',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}'
        ]
      }
    ]
  },
  {
    id: '05-export-consistency',
    title: 'HTML/DOM, JSON, LaTeX, BibTeX, package readme, MC state, and basis export consistency',
    strategy: 'repeat-until-slice-end',
    minStartMs: 150000,
    steps: [{ command: 'node', args: ['tools/vvuq-audit/export-consistency-audit.mjs', '--out', '{profileOut}'] }]
  },
  {
    id: '06-cross-implementation-formula',
    title: 'Cross-implementation Node/Python formula oracle',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/cross-implementation-formula-audit.mjs',
          '--seconds', '{sliceSeconds}',
          '--cases', '600',
          '--oracle-batch-size', '40',
          '--out', '{profileOut}',
          '--seed', '{derivedSeed}'
        ]
      }
    ]
  },
  {
    id: '07-full-local-regression',
    title: 'Full local regression suite',
    strategy: 'repeat-until-slice-end',
    minStartMs: 45000,
    steps: [{ command: 'npm', args: ['run', 'test:all'] }]
  },
  {
    id: '08-absolute-deep-audit',
    title: 'Absolute deep audit DOM and text matrix',
    strategy: 'repeat-until-slice-end',
    minStartMs: 35000,
    steps: [{ command: 'npm', args: ['run', 'test:absolute'] }]
  },
  {
    id: '09-monte-carlo-reproducibility',
    title: 'Monte Carlo reproducibility and pessimist distribution',
    strategy: 'repeat-until-slice-end',
    minStartMs: 25000,
    steps: [
      { command: 'npm', args: ['run', 'test:montecarlo'] },
      { command: 'npm', args: ['run', 'test:pessimist-mc'] }
    ]
  },
  {
    id: '10-distance-and-universe-scale',
    title: 'Distance, interval, and universe-scale coherence',
    strategy: 'repeat-until-slice-end',
    minStartMs: 25000,
    steps: [
      { command: 'npm', args: ['run', 'test:scenario-coherence'] },
      { command: 'npm', args: ['run', 'test:universe-scale'] }
    ]
  },
  {
    id: '11-independent-python-oracle',
    title: 'Fixed snapshot independent Python oracle',
    strategy: 'repeat-until-slice-end',
    minStartMs: 15000,
    steps: [{ command: 'node', args: ['tools/vvuq-audit/run-oracle.mjs', '--out', '{profileOut}'] }]
  },
  {
    id: '12-source-provenance-static',
    title: 'Source provenance and static scans',
    strategy: 'repeat-until-slice-end',
    minStartMs: 25000,
    steps: [
      { command: 'npm', args: ['run', 'test:source-links'] },
      { command: 'npm', args: ['run', 'test:biogeo-sources'] },
      { command: 'node', args: ['tools/vvuq-audit/static-scan.mjs', '--out', '{profileOut}'] },
      { command: 'node', args: ['tools/vvuq-audit/traceability.mjs', '--out', '{profileOut}'] }
    ]
  },
  {
    id: '13-boundary-numerics-and-strings',
    title: 'Boundary numerics, strings, and preset snapshots',
    strategy: 'repeat-until-slice-end',
    minStartMs: 25000,
    steps: [
      { command: 'npm', args: ['run', 'test:numerics'] },
      { command: 'npm', args: ['run', 'test:strings'] },
      { command: 'npm', args: ['run', 'test:presets'] }
    ]
  },
  {
    id: '14-mutation-rotation',
    title: 'Rotating mutation audit across the full mutant catalog',
    strategy: 'repeat-until-slice-end',
    minStartMs: 35000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/mutation-runner.mjs',
          '--start-index', '{executionIndex}',
          '--limit', '1',
          '--timeout-ms', '240000',
          '--out', '{profileOut}'
        ]
      }
    ]
  },
  {
    id: '15-performance-memory-trend',
    title: 'Performance and memory command rotor',
    strategy: 'single-timeboxed',
    minStartMs: 5000,
    steps: [{ command: 'node', args: ['tools/vvuq-audit/performance-runner.mjs', '--out', '{profileOut}', '--seconds', '{sliceSeconds}'] }]
  },
  {
    id: '16-report-integrity',
    title: 'Audit report, checkpoint, summary, and badge integrity',
    strategy: 'repeat-until-slice-end',
    minStartMs: 15000,
    steps: [
      {
        command: 'node',
        args: [
          'tools/vvuq-audit/report-integrity-audit.mjs',
          '--run-dir', '{runDir}',
          '--out', '{profileOut}'
        ]
      }
    ]
  },
  {
    id: '17-export-and-calibration',
    title: 'Standalone export, calibration, and preset reset',
    strategy: 'repeat-until-slice-end',
    minStartMs: 25000,
    steps: [
      { command: 'npm', args: ['run', 'test:standalone-export'] },
      { command: 'npm', args: ['run', 'test:calibration'] },
      { command: 'npm', args: ['run', 'test:preset-state-reset'] }
    ]
  }
];

function statusBadge(status) {
  const label = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'YELLOW';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  return `![${label}](https://img.shields.io/badge/${label}-${color})`;
}

function replacePlaceholders(args, context) {
  return (args || []).map(arg => String(arg)
    .replaceAll('{runDir}', context.runDir)
    .replaceAll('{profileOut}', context.profileOut)
    .replaceAll('{sliceSeconds}', String(context.sliceSeconds))
    .replaceAll('{remainingSeconds}', String(context.remainingSeconds))
    .replaceAll('{seed}', String(context.seed))
    .replaceAll('{derivedSeed}', String(context.derivedSeed))
    .replaceAll('{executionIndex}', String(context.executionIndex)));
}

async function emitEvent(runDir, event, live = false) {
  const enriched = { at: new Date().toISOString(), ...event };
  await appendJsonl(path.join(runDir, 'events.jsonl'), enriched);
  if (live) {
    const details = [
      enriched.type,
      enriched.profile_id ? `profile=${enriched.profile_id}` : null,
      enriched.execution_index ? `#${enriched.execution_index}` : null,
      enriched.iteration ? `iter=${enriched.iteration}` : null,
      enriched.status ? `status=${enriched.status}` : null,
      enriched.command ? `cmd=${enriched.command}` : null
    ].filter(Boolean).join(' ');
    process.stdout.write(`[EXT-VVUQ] ${enriched.at} ${details}\n`);
  }
}

async function runProfileStep(runDir, profile, step, context, stepIndex, iteration, timeoutMs) {
  const args = replacePlaceholders(step.args, context);
  const name = [
    String(context.executionIndex).padStart(5, '0'),
    sanitizeFilePart(profile.id),
    `iter-${String(iteration).padStart(4, '0')}`,
    `step-${stepIndex + 1}`
  ].join('-');
  await emitEvent(runDir, {
    type: 'command_start',
    profile_id: profile.id,
    execution_index: context.executionIndex,
    iteration,
    name,
    command: [step.command, ...args].join(' ')
  }, context.live);
  const result = await runCommand(step.command, args, {
    timeoutMs,
    live: context.live,
    livePrefix: `${profile.id}:${iteration}.${stepIndex + 1}`,
    liveLogFile: context.liveLogFile
  });
  await recordCommandResult(runDir, name, result);
  await emitEvent(runDir, {
    type: 'command_end',
    profile_id: profile.id,
    execution_index: context.executionIndex,
    iteration,
    name,
    command: result.commandLine,
    status: result.status,
    duration_ms: result.durationMs,
    exit_code: result.exitCode,
    timed_out: result.timedOut
  }, context.live);
  return {
    name,
    command: result.commandLine,
    summary: summarizeOutput(result)
  };
}

async function runSingleTimeboxedProfile(runDir, profile, context, sliceDeadline) {
  const remainingMs = Math.max(1000, sliceDeadline - Date.now());
  const sliceSeconds = Math.max(1, Math.floor(remainingMs / 1000));
  const localContext = { ...context, sliceSeconds, remainingSeconds: sliceSeconds };
  const stepResults = [];
  for (let stepIndex = 0; stepIndex < profile.steps.length; stepIndex += 1) {
    const step = profile.steps[stepIndex];
    const result = await runProfileStep(runDir, profile, step, localContext, stepIndex, 1, remainingMs + 30000);
    stepResults.push(result);
    if (result.summary.status !== 'PASS') break;
  }
  return { iterations: 1, stepResults };
}

async function runRepeatingProfile(runDir, profile, context, sliceDeadline) {
  const stepResults = [];
  let iteration = 0;
  let shouldStop = false;
  while (!shouldStop && Date.now() < sliceDeadline) {
    const remainingMs = sliceDeadline - Date.now();
    if (remainingMs < (profile.minStartMs || 15000)) break;
    iteration += 1;
    for (let stepIndex = 0; stepIndex < profile.steps.length; stepIndex += 1) {
      const innerRemainingMs = sliceDeadline - Date.now();
      if (innerRemainingMs < (profile.minStartMs || 15000)) {
        shouldStop = true;
        break;
      }
      const step = profile.steps[stepIndex];
      const result = await runProfileStep(
        runDir,
        profile,
        step,
        {
          ...context,
          remainingSeconds: Math.max(1, Math.floor(innerRemainingMs / 1000))
        },
        stepIndex,
        iteration,
        Math.max(15000, innerRemainingMs + 30000)
      );
      stepResults.push(result);
      if (result.summary.status !== 'PASS') {
        shouldStop = true;
        break;
      }
    }
  }
  return { iterations: iteration, stepResults };
}

async function runProfile(runDir, profile, options) {
  const startedAt = new Date();
  const sliceMs = Math.max(1000, Number(options.sliceMinutes) * 60 * 1000);
  const sliceDeadline = Math.min(options.auditDeadline, Date.now() + sliceMs);
  const profileOut = path.join(runDir, 'profiles', `${String(options.executionIndex).padStart(5, '0')}-${profile.id}`);
  await ensureDir(profileOut);
  await emitEvent(runDir, {
    type: 'profile_start',
    profile_id: profile.id,
    title: profile.title,
    execution_index: options.executionIndex,
    strategy: profile.strategy,
    target_seconds: Math.max(1, Math.floor((sliceDeadline - Date.now()) / 1000))
  }, options.live);

  const context = {
    runDir,
    profileOut,
    executionIndex: options.executionIndex,
    seed: options.seed,
    derivedSeed: (Number(options.seed) + options.executionIndex * 1009) >>> 0,
    sliceSeconds: Math.max(1, Math.floor((sliceDeadline - Date.now()) / 1000)),
    remainingSeconds: Math.max(1, Math.floor((sliceDeadline - Date.now()) / 1000)),
    live: options.live,
    liveLogFile: options.liveLogFile
  };
  const { iterations, stepResults } = profile.strategy === 'single-timeboxed'
    ? await runSingleTimeboxedProfile(runDir, profile, context, sliceDeadline)
    : await runRepeatingProfile(runDir, profile, context, sliceDeadline);

  const failed = stepResults.filter(item => item.summary.status !== 'PASS');
  const status = failed.length ? 'FAIL' : 'PASS';
  const summary = {
    id: profile.id,
    title: profile.title,
    strategy: profile.strategy,
    execution_index: options.executionIndex,
    status,
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    target_slice_minutes: options.sliceMinutes,
    command_iterations: iterations,
    commands_started: stepResults.length,
    commands_passed: stepResults.filter(item => item.summary.status === 'PASS').length,
    commands_failed: failed.length,
    steps: stepResults
  };
  await writeJson(path.join(profileOut, 'profile-summary.json'), summary);
  await emitEvent(runDir, {
    type: 'profile_end',
    profile_id: profile.id,
    title: profile.title,
    execution_index: options.executionIndex,
    status,
    command_iterations: iterations,
    commands_started: stepResults.length,
    commands_failed: failed.length
  }, options.live);
  return summary;
}

function summarizeExecutions(executions) {
  const profileStats = new Map();
  for (const item of executions) {
    const current = profileStats.get(item.id) || {
      id: item.id,
      title: item.title,
      executions: 0,
      failures: 0,
      command_iterations: 0,
      commands_started: 0
    };
    current.executions += 1;
    current.failures += item.status === 'PASS' ? 0 : 1;
    current.command_iterations += item.command_iterations || 0;
    current.commands_started += item.commands_started || 0;
    profileStats.set(item.id, current);
  }
  return [...profileStats.values()];
}

async function writeCheckpoint(runDir, executionIndex, profile, result, deadline, executions) {
  const latest = {
    generated_at: new Date().toISOString(),
    execution_index: executionIndex,
    profile_id: profile.id,
    status: result.status,
    remaining_ms: Math.max(0, deadline - Date.now()),
    profile_executions: executions.length,
    failed_profile_executions: executions.filter(item => item.status !== 'PASS').length,
    command_iterations: executions.reduce((sum, item) => sum + (item.command_iterations || 0), 0),
    commands_started: executions.reduce((sum, item) => sum + (item.commands_started || 0), 0)
  };
  await writeJson(path.join(runDir, 'checkpoints', `checkpoint-${String(executionIndex).padStart(5, '0')}.json`), latest);
  await writeJson(path.join(runDir, 'latest-status.json'), latest);
}

async function writeFinalReport(runDir, summary) {
  const profileStats = summarizeExecutions(summary.executions);
  await writeText(path.join(runDir, 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md'), [
    '# Extended Rotating V&V/UQ Code Audit',
    '',
    statusBadge(summary.status),
    '',
    `Status: **${summary.status}**`,
    `Mode: ${summary.mode}`,
    `Started: ${summary.started_at}`,
    `Ended: ${summary.ended_at}`,
    `Hours requested: ${summary.hours_requested}`,
    `Slice minutes: ${summary.slice_minutes}`,
    `Profile catalogue size: ${summary.profile_count}`,
    `Profile executions: ${summary.profile_executions}`,
    `Failed profile executions: ${summary.failed_profile_executions}`,
    `Command iterations: ${summary.command_iterations}`,
    `Commands started: ${summary.commands_started}`,
    '',
    '## Profiles',
    '',
    '| Profile | Executions | Failures | Command iterations | Commands started |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...profileStats.map(item => `| ${item.id} | ${item.executions} | ${item.failures} | ${item.command_iterations} | ${item.commands_started} |`),
    '',
    '## Execution Log',
    '',
    '| # | Profile | Status | Command iterations | Commands started | Started | Ended |',
    '| ---: | --- | --- | ---: | ---: | --- | --- |',
    ...summary.executions.map(item => (
      `| ${item.execution_index} | ${item.id} | ${statusBadge(item.status)} | ` +
      `${item.command_iterations || 0} | ${item.commands_started || 0} | ${item.started_at} | ${item.ended_at} |`
    ))
  ].join('\n'));
}

export async function runExtendedRotatingAudit(args = parseArgs()) {
  const hours = Math.max(0.001, Number(args.hours || 24));
  const sliceMinutes = Math.max(0.01, Number(args['slice-minutes'] || args.sliceMinutes || 5));
  const maxSlices = args['max-slices'] ? Math.max(1, Number(args['max-slices'])) : null;
  const seed = Number(args.seed || Date.now()) >>> 0;
  const live = !!args.live;
  const runId = args.runId || timestampId('extended-24h-rotating');
  const runDir = args.out
    ? path.resolve(repoRoot, args.out)
    : path.join(repoRoot, 'audit-output', sanitizeFilePart(runId));
  const liveLogFile = path.join(runDir, 'live-output.log');
  const auditStartedAt = new Date();
  const auditDeadline = Date.now() + hours * 60 * 60 * 1000;
  const failuresFile = path.join(runDir, 'failures', 'profile-failures.jsonl');

  await ensureDir(runDir);
  await ensureDir(path.join(runDir, 'checkpoints'));
  await ensureDir(path.join(runDir, 'failures'));
  await emitEvent(runDir, {
    type: 'extended_audit_start',
    mode: 'extended-rotating',
    hours,
    slice_minutes: sliceMinutes,
    max_slices: maxSlices,
    seed
  }, live);
  await collectEnvironment(runDir);

  if (!args['skip-preflight']) {
    await emitEvent(runDir, { type: 'preflight_start', name: 'static-scan' }, live);
    const staticSummary = await runStaticScan({ outDir: runDir });
    await emitEvent(runDir, { type: 'preflight_end', name: 'static-scan', status: staticSummary.status }, live);
    await emitEvent(runDir, { type: 'preflight_start', name: 'traceability' }, live);
    const traceability = await writeTraceability(runDir);
    await emitEvent(runDir, { type: 'preflight_end', name: 'traceability', status: traceability.status }, live);
    await emitEvent(runDir, { type: 'preflight_start', name: 'oracle' }, live);
    const oracleSummary = await runOracle(runDir);
    await emitEvent(runDir, { type: 'preflight_end', name: 'oracle', status: oracleSummary.status }, live);
  }

  const executions = [];
  let executionIndex = 0;
  while (Date.now() < auditDeadline && (!maxSlices || executions.length < maxSlices)) {
    const profile = EXTENDED_PROFILES[executionIndex % EXTENDED_PROFILES.length];
    executionIndex += 1;
    const result = await runProfile(runDir, profile, {
      executionIndex,
      sliceMinutes,
      auditDeadline,
      seed,
      live,
      liveLogFile
    });
    const execution = {
      id: result.id,
      title: result.title,
      execution_index: result.execution_index,
      status: result.status,
      started_at: result.started_at,
      ended_at: result.ended_at,
      command_iterations: result.command_iterations,
      commands_started: result.commands_started,
      commands_failed: result.commands_failed
    };
    executions.push(execution);
    if (result.status !== 'PASS') await appendJsonl(failuresFile, result);
    await writeCheckpoint(runDir, executionIndex, profile, result, auditDeadline, executions);
  }

  const failed = executions.filter(item => item.status !== 'PASS');
  const summary = {
    status: failed.length ? 'FAIL' : 'PASS',
    mode: 'extended-rotating',
    hours_requested: hours,
    slice_minutes: sliceMinutes,
    seed,
    max_slices: maxSlices,
    started_at: auditStartedAt.toISOString(),
    ended_at: new Date().toISOString(),
    profile_count: EXTENDED_PROFILES.length,
    profile_executions: executions.length,
    failed_profile_executions: failed.length,
    command_iterations: executions.reduce((sum, item) => sum + (item.command_iterations || 0), 0),
    commands_started: executions.reduce((sum, item) => sum + (item.commands_started || 0), 0),
    profiles: EXTENDED_PROFILES.map(item => ({ id: item.id, title: item.title, strategy: item.strategy })),
    executions
  };
  await writeJson(path.join(runDir, 'extended-rotating-summary.json'), summary);
  await writeJson(path.join(runDir, 'run-summary.json'), {
    ...summary,
    final_report: path.join(runDir, 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md')
  });
  await writeFinalReport(runDir, summary);
  await emitEvent(runDir, {
    type: 'extended_audit_end',
    mode: summary.mode,
    status: summary.status,
    profile_executions: summary.profile_executions,
    failed_profile_executions: summary.failed_profile_executions,
    command_iterations: summary.command_iterations,
    commands_started: summary.commands_started
  }, live);
  process.stdout.write(`EXTENDED_VVUQ_AUDIT ${summary.status}: ${path.join(runDir, 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md')}\n`);
  return { runDir, summary };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runExtendedRotatingAudit().then(({ summary }) => {
    process.exit(summary.status === 'PASS' ? 0 : 1);
  }).catch(err => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}
