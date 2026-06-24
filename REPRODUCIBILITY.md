# Reproducibility

This repository is a static, client-side calculator. There is no build step required to use the public page; `index.html` can be served directly by GitHub Pages or opened in a modern browser.

## Runtime

Use Node.js LTS for repository verification. The CI workflow uses `actions/setup-node` with `node-version: lts/*`.

## Install

Install verification dependencies with npm:

```bash
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
```

The current repository does not require a build process.

## Verify

Run:

```bash
npm run test:all
node tools/verify-static-site.mjs
node tools/check-syntax.mjs
```

Expected result: all checks PASS with zero FAIL results.

`npm run test:all` uses the bounded core state-transition regression suite intended for CI and release checks. The slower exhaustive state-transition roundtrip audit and the absolute deep audit remain available with:

```bash
npm run test:deep
npm run test:absolute
```

Monte Carlo outputs can depend on seed and configuration. Use deterministic seed mode when exact Monte Carlo reproducibility is required.
