export const ROTATING_PROFILES = [
  {
    id: '01-realistic-core-fuzz',
    title: 'Realistic core parameter fuzz',
    steps: [{ command: 'npm', args: ['run', 'test:numerics'] }]
  },
  {
    id: '02-additional-modules-matrix',
    title: 'Additional Scientific Modules matrix',
    steps: [{ command: 'npm', args: ['run', 'test:absolute'] }]
  },
  {
    id: '03-preset-mc-transition',
    title: 'Preset and MC-mode transition fuzz',
    steps: [{ command: 'npm', args: ['run', 'test:state-transition:core'] }]
  },
  {
    id: '04-seti-fermi-extremes',
    title: 'SETI/Fermi extreme assumptions',
    steps: [
      { command: 'npm', args: ['run', 'test:numerics'] },
      { command: 'npm', args: ['run', 'test:strings'] }
    ]
  },
  {
    id: '05-boundary-corrupted',
    title: 'Boundary and corrupted input fuzz',
    steps: [{ command: 'npm', args: ['run', 'test:numerics'] }]
  },
  {
    id: '06-strict-oracle-no-modules',
    title: 'Strict no-module independent oracle comparison',
    steps: [{ command: 'node', args: ['tools/vvuq-audit/run-oracle.mjs', '--out', '{profileOut}'] }]
  },
  {
    id: '07-mc-reproducibility',
    title: 'Monte Carlo reproducibility',
    steps: [{ command: 'npm', args: ['run', 'test:montecarlo'] }]
  },
  {
    id: '08-interval-ordering',
    title: 'Interval ordering',
    steps: [{ command: 'npm', args: ['run', 'test:scenario-coherence'] }]
  },
  {
    id: '09-preset-reset-stale',
    title: 'Preset reset / stale-state',
    steps: [{ command: 'npm', args: ['run', 'test:preset-state-reset'] }]
  },
  {
    id: '10-full-preset-snapshot-diff',
    title: 'Full preset snapshot diff',
    steps: [{ command: 'npm', args: ['run', 'test:presets'] }]
  },
  {
    id: '11-json-export-parity',
    title: 'JSON export parity',
    steps: [{ command: 'npm', args: ['run', 'test:standalone-export'] }]
  },
  {
    id: '12-latex-markdown-export-parity',
    title: 'LaTeX / Markdown export parity',
    steps: [{ command: 'npm', args: ['run', 'test:deep'] }]
  },
  {
    id: '13-ui-browser-dom',
    title: 'UI/browser DOM',
    steps: [{ command: 'npm', args: ['run', 'test:absolute'] }]
  },
  {
    id: '14-mobile-vs-desktop',
    title: 'Mobile vs desktop parity proxy',
    steps: [{ command: 'npm', args: ['run', 'test:absolute'] }]
  },
  {
    id: '15-forbidden-wording',
    title: 'Forbidden wording',
    steps: [{ command: 'node', args: ['tools/vvuq-audit/static-scan.mjs', '--out', '{profileOut}'] }]
  },
  {
    id: '16-source-provenance',
    title: 'Source/provenance',
    steps: [
      { command: 'npm', args: ['run', 'test:source-links'] },
      { command: 'npm', args: ['run', 'test:biogeo-sources'] },
      { command: 'node', args: ['tools/vvuq-audit/traceability.mjs', '--out', '{profileOut}'] }
    ]
  },
  {
    id: '17-distance-model-nearest-candidate',
    title: 'Distance model / nearest candidate',
    steps: [{ command: 'npm', args: ['run', 'test:montecarlo'] }]
  },
  {
    id: '18-universe-scale',
    title: 'Universe scale',
    steps: [{ command: 'npm', args: ['run', 'test:universe-scale'] }]
  },
  {
    id: '19-seti-sparse-display',
    title: 'SETI sparse display',
    steps: [{ command: 'npm', args: ['run', 'test:numerics'] }]
  },
  {
    id: '20-module-overlap-warning',
    title: 'Module overlap warning',
    steps: [{ command: 'npm', args: ['run', 'test:absolute'] }]
  },
  {
    id: '21-performance-memory',
    title: 'Performance / memory',
    steps: [{ command: 'node', args: ['tools/vvuq-audit/performance-runner.mjs', '--out', '{profileOut}', '--seconds', '15'] }]
  },
  {
    id: '22-security-static-scan',
    title: 'Security/static scan',
    steps: [{ command: 'node', args: ['tools/vvuq-audit/static-scan.mjs', '--out', '{profileOut}'] }]
  },
  {
    id: '23-mutation-style-formula-trap',
    title: 'Mutation-style formula trap',
    steps: [{ command: 'node', args: ['tools/vvuq-audit/mutation-runner.mjs', '--quick', '--out', '{profileOut}'] }]
  },
  {
    id: '24-regression-golden-outputs',
    title: 'Regression against golden outputs',
    steps: [
      { command: 'npm', args: ['run', 'test:numerics'] },
      { command: 'npm', args: ['run', 'test:pessimist-mc'] }
    ]
  }
];

