# Changelog

## v2.15 - 2026-06-13

### Source And Prior Update

- Updated `f_lunar_stability` to `0.70 [0.40, 0.90]` using Lissauer et al. 2012 as the primary source and Laskar et al. 1993 as the contrast source.
- Updated `f_tilt` to `0.60 [0.40, 0.85]` using Lissauer et al. 2012 and Linsenmeier et al. 2015.
- Updated `f_H2O` to `0.30 [0.10, 0.80]` using Tian & Ida 2015 and Mulders et al. 2015.
- Replaced the CHNOPS source basis with Krijt et al. 2022 and Hinkel et al. 2020 while keeping `f_CHNOPS = 0.10 [0.05, 0.50]`.
- Added `docs/V2_15_SOURCE_UPDATE.md` and `RELEASE_NOTES_v2.15.md`.

### Numerical And Sensitivity Fixes

- Fixed bounded log-normal and logit-normal sampling so q50 remains anchored at the configured central value after asymmetric truncation.
- Updated deterministic scenario anchors: Pessimist `0.000006804`, Consensus `13,778.1`, Kepler/Gaia `35,363.79`, and High-End `30,086,210.7`.
- Adjusted clean named-preset Sobol uncertainty widths so `N_GHZ` is broader than `N_p_star`.
- Added seeded Sobol regression coverage confirming that `Stars in GHZ` is the top Kepler/Gaia sensitivity driver.

### UI, Metadata, And Tests

- Updated public version metadata, exports, README, 404, citation metadata, Zenodo metadata, and cache-buster strings to v2.15.
- Added a site-logo fallback in `index.html`.
- Changed the visible Sub-Poisson explanatory text from red to normal dim text.
- Restored missing dash separators in visible `HISTORY_DB` signal-context text and corrected two historical possessives.
- Updated source, calibration, Monte Carlo, numeric, and export tests for the v2.15 behavior.

## v2.14 - 2026-06-12

### Release And License

- Updated the public review build from `v2.13` to `v2.14`.
- Replaced the previous custom source-available non-commercial license with GNU AGPLv3 only (`AGPL-3.0-only`).
- Updated active application, package, citation, Zenodo, export, test, README, cache-buster, and footer version metadata to `2.14`.
- Added `RELEASE_NOTES_v2.14.md` for GitHub Release and Zenodo publication notes.

### Audit-Driven Fixes

- Added `CODE_AUDIT_MATRIX.md` with calculator audit coverage, fixed findings, and remaining open audit limitations.
- Fixed deep state-transition test storage by sharing the same mock between global `localStorage` and `window.localStorage`.
- Added JSON export checks for deterministic vs Monte Carlo Fermi/detection basis consistency.
- Added historical signal-context regression checks for near-present, around-2000, and BCE/CE boundary cases.
- Clarified sparse Poisson probability wording so expected counts below one are not described as impossible outcomes.
- Replaced legacy SETI/civilisation-existence wording with active-detectable-transmitter wording where the SETI filter is being described.
- Removed misleading "detection sphere" wording from area-based SETI density displays.

### Calculator And Export Fixes

- Fixed Sobol sensitivity filtering so it uses the same active sampled-parameter set as Monte Carlo.
- Removed a duplicated Calculate button block.
- Fixed the static Kepler/Gaia preset label.
- Added an external-galaxy SETI range-gate branch.
- Added count-basis disclosure to detection displays and JSON exports.
- Expanded JSON Fermi, detection, horizon, and historical-context metadata.
- Clarified LaTeX export scope and renamed export filenames from `habitability-*` to `earth-like-candidate-*`.

### Assets And Repository Hygiene

- Added local UI imagery under `assets/images/` and updated UI image references to local assets.
- Added social metadata, canonical URL, favicon, and README banner/badges.
- Added `CONTRIBUTING.md`.
- Removed obsolete embed build script.

## v2.13 - 2026-05-23; semantic-coherence patch 2026-05-27

### Monte Carlo Semantic Coherence — Fixed

- Named presets now use `presetLocal` Monte Carlo uncertainty by default.
- Added explicit Monte Carlo basis modes: `presetLocal`, `customInput`, and `globalEnvelope`.
- `presetLocal` sampling is centered on each selected preset's central values.
- Pessimist / Rare Earth no longer samples broad global bounds while labelled as local preset uncertainty.
- High-End / Optimist Monte Carlo q50 no longer collapses far below the deterministic scenario point.
- Monte Carlo q50/median and arithmetic mean are now separated across UI, exports, history, and share output.
- JSON export now labels `mc_mean` as the true arithmetic mean of the sampled values.
- Global exploratory sampling is now explicitly labelled as non-local uncertainty.
- Added semantic regression tests for preset-local MC coherence, Pessimist drift, High-End collapse, global-envelope labelling, export basis fields, stale invalidation, and radial distance monotonicity.

### Monte Carlo Semantic Coherence — Clarified

- Scenario-local Monte Carlo intervals are model uncertainty bands around selected scenario assumptions.
- They are not observational confidence intervals, Bayesian posterior intervals, or direct empirical planet-count estimates.
- `globalEnvelope` is an expert/diagnostic mode, not the default uncertainty basis for named presets.
- `customInput` uses visible user-edited values and their visible uncertainty ranges.

### Release Structure

- Updated the public review build from `v2.12` to `v2.13`.
- Renamed release notes to `RELEASE_NOTES_v2.13.md`.
- Updated citation metadata and export metadata to version `2.13`.
- Consolidated v2.13 version-change notes in `CHANGELOG.md` and `RELEASE_NOTES_v2.13.md`.

### UI And Source Transparency

- Added top buttons for GitHub and an Ask Perplexity external-review prompt.
- Added clickable source links in Additional Scientific Modules.
- Added accessible calibration badges and tooltips across main calculator cards and advanced modules.
- Replaced the previous three-level badge system with `LC` / `LI` / `MS` / `MP`.
- Fixed badge sizing, alignment, tooltip clipping, and passive button-role accessibility.

### Scientific Calibration

- Changed the default scenario to `Kepler/Gaia - Bryson`.
- Changed the default observational prior to `Updated Kepler/Gaia`.
- Re-baselined `N_GHZ`:
  - Pessimist: `5e9`.
  - Consensus: `1e10`.
  - Kepler/Gaia: `1e10`.
  - High-End: `4e10`.
- Documented that `N_GHZ` is a literature-informed GHZ star-count prior, not a direct Lineweaver et al. 2004 star-count.
- Corrected or removed obsolete JWST occurrence-rate wording.
- Corrected source framing for Bryson/Gaia, Henry 2006, Driscoll & Bercovici 2014, and other audited references.

### Monte Carlo

- Reframed Monte Carlo output as a `95% sampled model interval` rather than a statistical confidence interval from observations.
- Added uncertainty profiles for conservative, balanced, broad, and stress-test sampling.
- Changed default correlation mode to independent factors.
- Kept the heuristic correlation scaffold as an optional exploratory mode.
- Preserved seeded Monte Carlo reproducibility for tests and audit runs.

### Distance Model

- Added a radial-density nearest-neighbour distance model using an inhomogeneous Poisson approximation over a GHZ exponential-disk profile.
- Retained the older uniform 2D annulus, 3D disk, and 3D shell models as comparison geometries.
- Clarified that nearest-distance outputs are geometric model expectations, not catalogue predictions.
- Replaced the Universe Scale galaxy-count extrapolation with an observable-universe star-count extrapolation using `10^22`-`10^24` stars and visible ESA/NASA/Driver/van Dokkum/Conselice source links.

### Reliability And Tests

- Added minimal npm-based verification scripts.
- Added numerical, preset, string, Monte Carlo, calibration badge, and bio/geophysical source tests.
- Added localStorage `simHistory` schema migration.
- Added visible validation warnings for sanitized/clamped inputs.
- Expanded static-site verification for safe links, SRI/crossorigin, duplicate IDs, required files, and dead placeholder links.

### Post-audit Transparency

- Added cross-module stacking warnings for overlapping advanced modules (atmospheric retention, space weather, radiation survival, volatile delivery / water retention, binary filter).
- Added overlap-context notes on the Atmospheric Retention, Space Weather, GRB/SN Radiation Survival, Binary Star Filter, Surface Water, and Magnetic Field cards.
- Added a heuristic-UI-bucket clarification under the Fermi-paradox tension category text.
- Added a maintenance comment over the static BibTeX list to reduce drift risk with the scientific-parameter registry.
- Extracted `GHZ_INNER_FRAC = 0.26` and `GHZ_OUTER_FRAC = 0.85` as named constants used by the default GHZ annulus.
- Added a `<noscript>` notice for no-JavaScript fallback.
- No formulas, preset numerical values, or source URLs changed.

### Release Robustness

- Edited named presets now use `modifiedPresetLocal` Monte Carlo basis: edited fields use their visible bounds while unchanged preset fields keep scenario-local preset uncertainty, so a single edit can no longer widen unrelated fields into full `customInput` sampling.
- Blocked Monte Carlo for inconsistent visible bounds (minimum greater than maximum, or central value outside its min/max range) on parameters sampled from visible bounds, with a clear validation warning; such states are never exported as current Monte Carlo results.
- Added explicit Monte Carlo lifecycle state: `not-run`, `current`, and `stale`.
- Fixed stale/not-run Monte Carlo exports so missing values are never presented as zero-valued results.
- Added raw Monte Carlo fields to history entries for current runs.
- Preserved active distance model and distance basis in history entries.
- Fixed restored preset-equivalent visible states so they return to the clean preset state and `presetLocal` Monte Carlo basis.
- Separated scientific scenario invalidation from distance/display invalidation.
- Added roundtrip regression tests for central values, min/max bounds, distance toggles, and cross-preset switching.
- Strengthened public wording tests around modelled Earth-like candidates and anti-overclaim language.
- Added Zenodo publication checklist and historical-audit context notes.

### Documentation

- Added or updated Monte Carlo, parameter registry, distance model, recalibration justification, browser/a11y checklist, and dependency-integrity documentation.
- Updated README repository structure and release references.

### Notes

- The core multiplicative calculator formula remains unchanged.
- Selected preset values and the default distance-reference model were recalibrated or reframed for scientific transparency.
- This release does not claim empirical proof of extraterrestrial life.
- This release does not establish a scientific consensus about the number of Earth-like planets.
- Model outputs remain conditional on user-selected assumptions and parameter presets.
