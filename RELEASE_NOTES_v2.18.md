# Are We Alone in the Universe v2.18 - Monte Carlo Transparency, Exceedance Chart, And Sobol Clarification

Tag: `v2.18`

Release date: 2026-06-24

## GitHub Release Title

Are We Alone in the Universe v2.18 - Monte Carlo Transparency, Exceedance Chart, And Sobol Clarification

## Summary

Version 2.18 is a Monte Carlo transparency, sensitivity-analysis clarification, export-metadata, and regression-test release for the Are We Alone in the Universe? Earth-like Planet Calculator.

This update improves the transparency and reproducibility of Monte Carlo and sensitivity-analysis outputs without changing the scientific parameter registry or scenario preset values.

No scientific parameter registry or preset-value changes were made in this update.

## Highlights

- Replaced the previous KDE/Gaussian relative-density chart with an empirical exceedance-probability chart showing `P(N >= threshold)` across Monte Carlo candidate-count samples.
- Added a resolved MC CONFIG line and collapsible MC details panel reporting the active sampling engine, distribution, uncertainty basis, correlation model, seed mode, iteration count, and robust-envelope state.
- Introduced a resolved Monte Carlo display-configuration snapshot used consistently across results, charts, exports, history, console summaries, and shared text.
- Distinguished Standard Monte Carlo from Latin Hypercube Sampling in result labels and surfaced the effective uncertainty basis directly in result lines.
- Expanded JSON and Monte Carlo data exports with full `mc_config` and chart metadata for reproducibility and independent replotting.
- Clarified Sobol/Saltelli sensitivity-analysis display in Bryson eta-Earth direct mode.

## Implemented Changes

- Replaced the previous KDE/Gaussian relative-density chart with an empirical exceedance-probability chart showing P(N >= threshold) across Monte Carlo candidate-count samples.
- Added a resolved MC CONFIG line and collapsible MC details panel reporting the active sampling engine, distribution, uncertainty basis, correlation model, seed mode, iteration count, and robust-envelope state.
- Introduced a resolved Monte Carlo display-configuration snapshot used consistently by results, charts, exports, history, console summaries, and shared text.
- Updated Monte Carlo result labels to distinguish Standard Monte Carlo from Latin Hypercube Sampling and to show the effective uncertainty basis directly in result lines.
- Expanded JSON and Monte Carlo data exports with full mc_config metadata and chart metadata for reproducibility and independent replotting.
- Updated simulation history so stored runs preserve the resolved Monte Carlo engine and effective basis used at calculation time.
- Improved Sobol/Saltelli sensitivity-analysis display in Bryson eta-Earth direct mode: the panel now states that eta-Earth is fixed, N_p_star/f_rocky/f_HZ are bypassed, and the chart covers post-eta-Earth sampled factors only.
- Refined distance-basis labels so nearest-neighbour distance estimates report the actual MC engine and q50 count basis.
- Added regression checks for Monte Carlo display-configuration consistency and stale-label prevention.
- Cleaned several UI text separators for more robust rendering and export compatibility.

## Exports

- Extended JSON and Monte Carlo data exports with full `mc_config` metadata (sampling engine, distribution, uncertainty basis, correlation model, seed mode, iteration count, robust-envelope state) and chart metadata for independent replotting.
- Ensured exports, history, console summaries, and shared text all read from the same resolved Monte Carlo display-configuration snapshot.
- Updated active version metadata to `2.18`.

## Tests And Tooling

- Added regression checks for Monte Carlo display-configuration consistency and stale-label prevention.
- Updated `tools/test-strings.mjs` to scan `RELEASE_NOTES_v2.18.md`.
- Updated `tools/test-absolute-deep-audit.mjs` to assert the `2.18` JSON export version.

## Scope Statement

No scientific parameter registry or scenario preset values were changed in this update. The changes are limited to Monte Carlo and sensitivity-analysis presentation, resolved display configuration, export and history metadata, distance-basis labelling, and regression tests.

## Verification

Verification for v2.18. All three top-level test commands pass with 0 failures on the v2.18 working tree:

- `npm run test:all` — combined CI-style calculator suite: PASS (0 failures).
- `npm run test:absolute` — absolute deep audit, 22 sections: PASS (0 failures).
- `npm run test:deep` — deep state-transition regression: PASS (0 failures).

Individual checks included in `test:all` (also re-run for this release): `npm run verify`, `npm run check:syntax`, `npm run test:strings`, `npm run test:standalone-export`.

The stale-test references that previously failed under `test:absolute` and `test:deep` (the removed `gaussianChart`/KDE chart element and the old `MC q50 median` LaTeX label) were updated to the v2.18 chart model (`exceedanceChart` and engine-aware `Monte Carlo q50 median` labels). No scientific parameter, preset, prior, or formula values were changed.
