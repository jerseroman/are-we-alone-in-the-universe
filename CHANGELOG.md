# Changelog

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
