# Are We Alone in the Universe v2.16 - Reproducible Monte Carlo Exports And Release Consistency

Tag: `v2.16`
Date: 2026-06-14

## GitHub Release Title

Are We Alone in the Universe v2.16 - Reproducible Monte Carlo Exports And Release Consistency

## GitHub Release Summary

Version 2.16 is a reproducibility, export-consistency, and UI cleanup release for the Are We Alone in the Universe? Earth-like Planet Calculator.

The current public framing is:

> Literature-informed exploratory model with mathematically valid Poisson distance estimates and simplified GHZ comparison geometries.

This release does not change scientific parameters, presets, Monte Carlo distributions, numerical constants, or the deterministic calculation chain.

## Main Changes

### Monte Carlo Reproducibility

- Added random and fixed Monte Carlo seed modes.
- Added numeric seed validation and a new-seed control.
- Uses `globalThis.crypto` for secure unseeded seed generation when available.
- Keeps deterministic seeded Monte Carlo replay unchanged.
- Adds PRNG and seed metadata to Monte Carlo exports.

### Monte Carlo Export Package

- Added raw Monte Carlo sample export as JSON.
- Added Monte Carlo chart export in PNG, SVG, and PDF formats.
- Added a ZIP package containing chart files, raw sample JSON, and a reproducibility README.
- Added stale/not-run export warnings so old or missing Monte Carlo samples are not exported as current results.
- Added `Source: arewealoneintheuniverse.com` to chart exports and package metadata.

### Formula And Export Consistency

- Fixed the displayed SETI/detectable-transmitters formula so `rho_det * pi` is shown as multiplication rather than division.
- Added regression coverage that fails if the corrupted `rho_det / pi` display form returns.
- Added checks that middle-dot operators stay preserved in formula and compact UI contexts.
- Added a self-contained HTML export generator from the modular source.
- Added a self-contained export consistency test that verifies key source/export strings and extracted JavaScript syntax.

### Fermi Panel Cleanup

- Removed the therefore symbol from the Interpretation & Fermi Context heading.
- Moved the MC/DT controls next to the Interpretation & Fermi Context title.
- Changed the default Fermi view to MC when current Monte Carlo data exists.
- Keeps deterministic fallback when no current Monte Carlo result exists.

### PDF Chart Cleanup

- Fixed the Monte Carlo PDF chart label placement so the sample-frequency label no longer collides with the chart edge.
- Added a source footer to the chart export.

### Documentation And Metadata

- Updated active version metadata to `2.16`.
- Updated package, citation, Zenodo, README, footer, cache-buster, export, and audit metadata.
- Added this v2.16 release notes file.
- Updated the changelog with the v2.16 changes.

## Scientific Scope

The calculator remains a scenario-based modelling tool. Its results are conditional model outputs, not an observational census, not a confirmed planet catalogue, and not evidence for extraterrestrial life or technological activity.

The nearest-distance outputs remain Poisson nearest-neighbour distance scales derived from modelled candidate counts and simplified geometry assumptions. They are not detected planet distances.

## Verification

Verification completed for v2.16:

- `npm run verify`
- `npm run check:syntax`
- `npm run test:numerics`
- `npm run test:strings`
- `npm run test:standalone-export`
- `npm run test:presets`
- `npm run test:montecarlo`
- `npm run test:pessimist-mc`
- `npm run test:scenario-coherence`
- `npm run test:universe-scale`
- `npm run test:state-transition:core`
- `npm run test:preset-state-reset`
- `npm run test:calibration`
- `npm run test:source-links`
- `npm run test:biogeo-sources`

The combined command is:

```bash
npm run test:all
```

