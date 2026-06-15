# Are We Alone in the Universe v2.15 - Source/Prior Update, Median-Anchored Sampling, and UI Cleanup

Tag: `v2.15`

Release date: 2026-06-13

Comparison base: `v2.14`.

## Summary

Version 2.15 is a targeted public-review update after v2.14. It updates four mechanism-supported scientific filters, fixes median drift in bounded Monte Carlo sampling, makes Sobol sensitivity ranking align with the intended Kepler/Gaia scale uncertainty, updates public/export metadata to v2.15, and cleans up several visible UI issues found during review.

The core multiplicative candidate-filtering structure remains unchanged. The changed numerical priors are limited to the lunar/equivalent stabilizer, axial-tilt, and surface-water filters. The CHNOPS filter keeps the same central value and range, but now uses sources that match the intended filter level more directly.

## Changes Since v2.14

### Scientific Source And Prior Updates

Updated active source cards, registry entries, visible source links, uncertainty notes, and preset values for the four reviewed mechanism-supported filters:

| Filter | v2.14 value/range | v2.15 value/range | v2.15 active sources | Change type |
| --- | --- | --- | --- | --- |
| `f_lunar_stability` | `0.50 [0.20, 0.80]` | `0.70 [0.40, 0.90]` | Lissauer et al. 2012; Laskar et al. 1993 | source and value update |
| `f_tilt` | `0.50 [0.30, 0.65]` | `0.60 [0.40, 0.85]` | Lissauer et al. 2012; Linsenmeier et al. 2015 | source and value update |
| `f_H2O` | `0.10 [0.05, 0.30]` | `0.30 [0.10, 0.80]` | Tian & Ida 2015; Mulders et al. 2015 | source and value update |
| `f_CHNOPS` | `0.10 [0.05, 0.50]` | `0.10 [0.05, 0.50]` | Krijt et al. 2022; Hinkel et al. 2020 | source-only update |

Rationale:

- `f_lunar_stability`: Lissauer, Barnes & Chambers 2012 is now the primary source because it directly addresses obliquity variations for a moonless Earth and weakens the strict large-Moon requirement. Laskar et al. 1993 remains as the contrast case for lunar stabilization.
- `f_tilt`: Lissauer et al. 2012 and Linsenmeier et al. 2015 better support a less restrictive axial-tilt prior than the older Williams & Pollard framing alone.
- `f_H2O`: Tian & Ida 2015 and Mulders et al. 2015 are closer to the intended water-content/water-delivery fraction than a generic volatile-delivery mechanism source.
- `f_CHNOPS`: Krijt et al. 2022 and Hinkel et al. 2020 better match chemical habitability, CHNOPS supply/retention, and phosphorus limitation. The value is unchanged because the literature still does not provide a measured universal CHNOPS accessibility fraction.

These sources still support model priors rather than measured universal occurrence rates. The `interpretive_midpoint` / mechanism-supported treatment therefore remains intentional.

### Preset And Deterministic Output Updates

Updated the named scenario values for the changed filters:

- Pessimist / Rare Earth Stress Test:
  - `f_lunar_stability`: `0.20 -> 0.40`
  - `f_tilt`: `0.30 -> 0.40`
  - `f_H2O`: `0.05 -> 0.10`
- Consensus / Lineweaver:
  - `f_lunar_stability`: `0.50 -> 0.70`
  - `f_tilt`: `0.50 -> 0.60`
  - `f_H2O`: `0.10 -> 0.30`
- Kepler/Gaia / Bryson:
  - `f_lunar_stability`: `0.50 -> 0.70`
  - `f_tilt`: `0.50 -> 0.60`
  - `f_H2O`: `0.15 -> 0.30`
- High-End / Literature Bounds:
  - `f_lunar_stability`: `0.80 -> 0.90`
  - `f_tilt`: `0.65 -> 0.85`
  - `f_H2O`: `0.30 -> 0.80`

Updated deterministic scenario outputs:

| Scenario | v2.14 deterministic output | v2.15 deterministic output |
| --- | ---: | ---: |
| Pessimist | `0.00000127575` | `0.000006804` |
| Consensus | `2,733.75` | `13,778.1` |
| Kepler/Gaia | `10,524.9375` | `35,363.79` |
| High-End | `7,669,034.1` | `30,086,210.7` |

### Monte Carlo And Numerical Fixes

- Fixed bounded log-normal and logit-normal sampling so the sampled q50 remains anchored at the configured central value after truncation.
- Added a transformed-space center solver for asymmetric bounded distributions.
- Documented why ordinary untruncated log/logit-normal median anchoring is insufficient when rejection/truncation cuts off more probability mass on one side.
- Added regression checks for asymmetric probability bounds and asymmetric `N_GHZ` global-envelope bounds.
- Updated Monte Carlo documentation to state that adaptive log-normal and logit-normal sampling is median-anchored after truncation.

This specifically fixes cases such as `customInput` and `globalEnvelope` where asymmetric min/max bounds near a registry edge could previously move the Monte Carlo median away from the user's central value.

### Sobol Sensitivity Fix

- Changed the Sobol uncertainty setup for clean named presets: `Stars in GHZ` now uses a broad local band, while `Planets per star` uses a narrow local band.
- Added seeded Sobol defaults:
  - `SOBOL_BASE_SAMPLE_COUNT = 1000`
  - `SOBOL_DEFAULT_SEED = 20260613`
- Made `computeSobolIndices` accept an injected RNG.
- Added regression coverage confirming that in the clean Kepler/Gaia Sobol analysis, `Stars in GHZ` ranks above `Planets per star`.

This fixes the review finding where the default Sobol chart implied that `Planets per star` was the largest driver even though the intended dominant scale uncertainty is `Stars in GHZ`.

### UI, Assets, And Visible Text

- Updated visible calculator cards for the changed scientific sources and values.
- Updated the advanced volatile split source row to use Tian & Ida 2015, Mulders et al. 2015, and Raymond et al. 2004.
- Added a logo fallback in `index.html`: local `assets/images/site-logo.webp` is tried first, then a verified static fallback URL is used if the local asset fails.
- Changed the two visible `Sub-Poisson regime` messages from red text to normal dim explanatory text.
- Restored missing dash separators in `HISTORY_DB` signal-context text where 49 visible historical entries had three-space artifacts.
- Corrected two visible historical-context possessives: `Roman Republic's expansion` and `history's earliest empires`.
- Updated version labels, cache-buster strings, footer text, README badge, 404 page metadata, citation metadata, and Zenodo metadata to v2.15.
- Corrected public author metadata to use `Roman Jerše`.
- Improved paper-table contrast for newly inserted v2.15 values so the new blue text remains readable on white table backgrounds.

### Export And Metadata

- Updated JSON export version metadata to `2.15`.
- Updated LaTeX/BibTeX export metadata strings to v2.15.
- Updated `package.json` to `2.15.0`.
- Updated `CITATION.cff`, `.zenodo.json`, `README.md`, `404.html`, and `CODE_AUDIT_MATRIX.md` for the v2.15 public-review build.
- Added `docs/V2_15_SOURCE_UPDATE.md` with the source/value replacement rationale.

### Tests And Regression Coverage

Updated tests to match v2.15 behavior and protect the new fixes:

- `tools/test-numerics.mjs`: updated deterministic scenario anchors.
- `tools/test-pessimist-mc.mjs`: updated preset anchors and added clean Kepler Sobol ranking coverage.
- `tools/test-montecarlo.mjs`: added median-anchoring checks for asymmetric bounded distributions and updated the pessimist regression guard.
- `tools/test-calibration-markers.mjs`: updated expected default values for lunar stabilizer, tilt, and water.
- `tools/test-bio-geophysical-sources.mjs`: updated expected visible sources and registry source checks.
- `tools/test-absolute-deep-audit.mjs`: updated expected JSON export version.
- `tools/test-strings.mjs`: includes this v2.15 release notes file in the text-regression scan.
- `tools/test-strings.mjs`: adds regression checks for `HISTORY_DB` dash separators and the corrected historical possessives.

## Suggested GitHub Release Text

```text
Version 2.15 updates the calculator's source basis and priors for lunar/equivalent obliquity stabilization, axial tilt, and surface-water availability, while replacing the CHNOPS source basis without changing its numerical value. It also fixes median drift in bounded Monte Carlo sampling, aligns clean Kepler/Gaia Sobol sensitivity so Stars in GHZ is the dominant scale uncertainty, updates export and publication metadata to v2.15, and cleans up visible UI issues found during review.

The core multiplicative candidate-filtering structure remains unchanged. The changed numerical priors are limited to f_lunar_stability, f_tilt, and f_H2O; f_CHNOPS is a source-only update.
```

## Suggested Zenodo Additional Description

```text
Version 2.15 is a targeted source/prior and numerical-consistency update for the Are We Alone in the Universe? Earth-like Planet Calculator. It updates the scientific source basis for water availability, CHNOPS availability, axial-tilt suitability, and lunar or equivalent obliquity stabilization; updates the corresponding model priors for water, tilt, and lunar/equivalent stabilization; fixes bounded Monte Carlo sampling so medians remain anchored after truncation; and adds seeded Sobol sensitivity regression coverage for the Kepler/Gaia scenario.

The software remains an exploratory modelling tool. Its outputs are conditional scenario estimates derived from explicit assumptions, not observational measurements or claims about confirmed inhabited worlds or technologically detectable activity.
```

## Verification

Verification completed for v2.15:

- `npm.cmd run test:all` - passed.
- `npm.cmd run test:strings` - passed after the release-note and metadata updates.

The latest checked v2.15 Kepler/Gaia deterministic output is `35,363.79`.
