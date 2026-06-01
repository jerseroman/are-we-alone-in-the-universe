# Are We Alone in the Universe v2.13 - Public Review Build

Tag: `v2.13-public-review`

Release date: 2026-05-23

## Summary

Version 2.13 is a transparency and scientific-calibration release. It keeps the calculator as a static browser application, but improves how presets, sources, calibration status, Monte Carlo uncertainty, and nearest-distance estimates are documented and presented.

The core multiplicative Earth-like planet formula remains unchanged. Selected preset values and the default distance-reference model were recalibrated or reframed where the previous wording overstated the literature basis.

## Monte Carlo Semantic Coherence Patch

Patch date: 2026-05-27

### Fixed

- Named presets now use `presetLocal` Monte Carlo uncertainty by default.
- Added explicit Monte Carlo basis modes: `presetLocal`, `customInput`, and `globalEnvelope`.
- `presetLocal` sampling is centered on each selected preset's central values.
- Pessimist / Rare Earth no longer samples broad global bounds while labelled as local preset uncertainty.
- High-End / Optimist Monte Carlo q50 no longer collapses far below the deterministic scenario point.
- Monte Carlo q50/median and arithmetic mean are now separated across UI, exports, history, and share output.
- JSON export now labels `mc_mean` as the true arithmetic mean of the sampled values.
- Export, history, and share output include explicit basis fields: `mcMode`, `mcMedianQ50`, `mcArithmeticMean`, `mcQ025`, `mcQ975`, and `uncertaintyBasisLabel`.
- Global exploratory sampling is now explicitly labelled as non-local uncertainty.
- Added semantic regression tests for preset-local MC coherence, Pessimist drift, High-End collapse, global-envelope labelling, export basis fields, stale invalidation, and radial distance monotonicity.

### Clarified

- Scenario-local Monte Carlo intervals are model uncertainty bands around selected scenario assumptions.
- They are not observational confidence intervals, Bayesian posterior intervals, or direct empirical planet-count estimates.
- `globalEnvelope` is an expert/diagnostic mode, not the default uncertainty basis for named presets.
- `customInput` uses visible user-edited values and their visible uncertainty ranges.

## User-Facing Changes

- Version metadata now consistently identifies this release as `v2.13`.
- Added top navigation buttons for `GitHub` and an `Ask Perplexity` external-review prompt.
- Default scenario on page load is now `Kepler/Gaia - Bryson`.
- Default observational prior is now `Updated Kepler/Gaia`.
- Removed obsolete JWST occurrence-rate wording and stale `jwst` preset references.
- Replaced ambiguous star calibration markers with compact calibration badges.
- Added a four-level calibration taxonomy:
  - `LC` = direct literature/reference value.
  - `LI` = literature-informed numerical prior.
  - `MS` = mechanism-supported model prior.
  - `MP` = speculative/user model prior.
- Added calibration badges to the main parameter cards and Additional Scientific Modules.
- Added accessible badge tooltips that work on hover and keyboard focus.
- Fixed calibration badge alignment and compact sizing.
- Removed passive `role="button"` usage from tooltip badges.
- Added or corrected clickable source links in Additional Scientific Modules.
- Added green `LC` badges for solar/reference defaults where appropriate.

## Scientific Calibration Changes

- Re-baselined `N_GHZ` as a literature-informed GHZ star-count prior rather than a direct Lineweaver star count.
- `N_GHZ` preset values now use:
  - Pessimist / Rare Earth Stress Test: `5e9`.
  - Consensus / Lineweaver: `1e10`.
  - Kepler/Gaia / Bryson: `1e10`.
  - High-End / Literature Bounds: `4e10`.
- Documented that these `N_GHZ` values are not directly quoted by Lineweaver et al. 2004.
- Updated deterministic expected outputs accordingly:
  - Pessimist: `0.0000012757500000000002`.
  - Consensus: `2733.75`.
  - Kepler/Gaia: `10524.937500000002`.
  - High-End: `7669034.099999999`.
- Kept `f_complex_life` and `f_x` clearly outside literature-calibrated claims.
- Clarified that the Kepler/Gaia split of rocky and habitable-zone occurrence factors is a model approximation, not a direct single-paper probability.
- Updated `f_orbit` visible source context with Bryson et al. 2021 and Kopparapu et al. 2013.
- Corrected or removed known wrong/broken citation metadata, including Henry 2006 and Driscoll & Bercovici 2014.
- Added source/text guardrails so future changes do not reintroduce obsolete JWST occurrence-rate wording or broken DOI references.

## Monte Carlo Improvements

- Renamed the old confidence-interval label to `95% sampled model interval`.
- Added explicit wording that the interval is not an observational confidence interval and not a Bayesian posterior.
- Added uncertainty profiles:
  - Conservative/narrow.
  - Balanced/default.
  - Broad exploratory.
  - Stress-test extremes.
- Changed default Monte Carlo correlation mode to `Independent factors`.
- Kept the heuristic correlation scaffold as an optional exploratory mode.
- Preserved seeded Monte Carlo support for deterministic audit/test runs.
- Expanded Monte Carlo tests to verify seed reproducibility, default independent correlation, valid outputs, and radial distance interval ordering.

## Nearest-Distance Model Improvements

- Added a new default `Radial density model` for nearest-neighbour distance.
- The radial model uses an inhomogeneous Poisson approximation over an exponential-disk GHZ profile.
- The model computes nearest distance from the void-probability relation:
  - `P(D > r) = exp(-Lambda(r))`.
  - `E[D] = integral exp(-Lambda(r)) dr`.
- Retained older uniform `2D disk`, `3D disk`, and `3D spherical` models as comparison geometries.
- Clarified that distance results are geometric model expectations, not catalogue predictions.
- External galaxies remain treated as Earth-reference distance gates rather than internal GHZ nearest-neighbour estimates.
- Added `docs/DISTANCE_MODEL_METHOD.md` documenting the radial and uniform Poisson models.

## Validation, Storage, And Export

- Added visible validation warning paths for sanitized/clamped inputs.
- Kept safe clamping behavior for invalid values.
- Added localStorage `simHistory` schema versioning:
  - Current schema: `{ "schemaVersion": 1, "items": [] }`.
  - Legacy raw arrays migrate safely.
  - Corrupted localStorage is ignored without crashing page load.
- Updated JSON/LaTeX/BibTeX export metadata to version `2.13`.
- Replaced ambiguous export heading `Literature range` with `Range / uncertainty interval`.
- Ensured share/export wording avoids obsolete source labels and overclaim language.

## Release Robustness And Publication Cleanup

- Added a `modifiedPresetLocal` Monte Carlo basis for edited named presets: edited fields are sampled from their visible bounds while unchanged preset fields keep scenario-local preset uncertainty. A single preset edit no longer falls back to full `customInput` sampling that widened unrelated fields. Restoring all edited fields to their defaults returns the scenario to a clean preset and `presetLocal`.
- Added invalid-bound gating: when a parameter sampled from its visible bounds has an inconsistent interval (minimum greater than maximum, or a central value outside its min/max range), Monte Carlo is blocked with a clear validation warning rather than silently expanding the interval. Blocked states are never exported as current Monte Carlo q50/mean/interval values.
- Added an explicit Monte Carlo lifecycle state: `not-run`, `current`, and `stale`.
- Prevented JSON, LaTeX, share, and history outputs from presenting missing or invalidated Monte Carlo values as current numerical results.
- Fixed LaTeX export so deterministic-only and stale Monte Carlo states are shown as `not-run` or `stale`, not as zero-valued sampled results.
- Added raw Monte Carlo history fields for current runs: `mcMedianQ50Raw`, `mcArithmeticMeanRaw`, `mcQ025Raw`, and `mcQ975Raw`.
- Updated history entries to preserve the active distance model, active distance basis, distance count basis, displayed distance value, and displayed distance label at the time of calculation.
- Fixed preset-equivalent visible-state restoration: when a user edits a preset-owned value or bound and restores it exactly to the preset default, the scenario state returns to a clean preset state.
- Fixed Monte Carlo basis restoration so restored preset-equivalent states resolve back to `presetLocal` rather than silently falling into `customInput`.
- Separated scientific scenario invalidation from display and distance invalidation. Distance-model and display controls no longer mark the scientific preset as modified.
- Added regression tests for central-value, min-bound, max-bound, min+max, distance-toggle, and cross-preset roundtrips across all named presets.
- Added export/share/history consistency tests for deterministic-only, current Monte Carlo, stale Monte Carlo, and restored preset-equivalent states.
- Replaced unqualified model-output wording such as "Earth-like planets" with safer phrases such as "modelled Earth-like candidates", "modelled candidate count", or "scenario-dependent candidate count".
- Added string-regression checks to prevent public text from implying confirmed, detected, counted, or empirically measured Earth-like planets.
- Added Zenodo publication metadata and a Zenodo publication checklist.

## Post-audit Transparency Improvements

- Additional UI transparency was added for conceptually overlapping filters, Fermi-tension heuristic buckets, and maintenance risks around duplicated citation metadata. These changes do not alter formulas or numerical defaults.
- Added cross-module stacking warnings in the Configuration alerts panel when atmospheric, water-retention, radiation, or shielding modules are combined with restrictive base factors.
- Added overlap-context notes to the Atmospheric Retention, Space Weather, GRB/SN Radiation Survival, Binary Star Filter, Surface Water, and Magnetic Field cards clarifying that the multiplication is a modelling choice rather than independent probabilities.
- Added a clarification line beneath the Fermi-paradox tension category text noting that the tension labels are heuristic UI buckets, not literature-defined thresholds.
- Replaced the Universe Scale galaxy-count extrapolation with an observable-universe star-count extrapolation using a documented `10^22`-`10^24` stellar-count range.
- Added Universe Scale source links for ESA, NASA, Driver / IAU 2003, van Dokkum & Conroy 2010, and Conselice et al. 2016.
- Clarified that the observable-universe extrapolation is not a direct census and does not model galaxy type, cosmic epoch, metallicity evolution, or low-mass-star uncertainty.
- Added a maintenance comment above the static BibTeX list in `src/share.js` flagging the duplication with `src/scientific-parameters.js` `SOURCE_LINKS`.
- Extracted named constants `GHZ_INNER_FRAC = 0.26` and `GHZ_OUTER_FRAC = 0.85` for the default GHZ annulus; numeric behaviour is unchanged.
- Added a `<noscript>` fallback notice clarifying that the calculator requires JavaScript for preset loading, Monte Carlo, exports, and interpretation outputs.

## Documentation Added Or Updated

- Added `src/scientific-parameters.js` as a scientific parameter/source registry.
- Added `docs/MONTE_CARLO_METHOD.md`.
- Added `docs/PARAMETER_REGISTRY.md`.
- Added `docs/DISTANCE_MODEL_METHOD.md`.
- Added `docs/AUDIT_RECALIBRATION_JUSTIFICATION.md`.
- Added browser/a11y verification checklist documentation.
- Added dependency-integrity follow-up documentation.
- Updated `README.md`, `CHANGELOG.md`, `CITATION.cff`, and release notes.
- Consolidated the complete v2.13 version-change map in `CHANGELOG.md` and these release notes.

## Test And Verification Infrastructure

- Added minimal `package.json` test scripts.
- Added deterministic numerical regression tests.
- Added preset invariant tests.
- Added banned-string and source-text regression tests.
- Added seeded Monte Carlo tests.
- Added calibration badge/source-link tests.
- Added biological/geophysical source framing tests.
- Expanded the static verifier for:
  - required files;
  - duplicate IDs;
  - safe external links;
  - SRI/crossorigin on external scripts;
  - dead placeholder links.

## Verification Status

The latest verification run passed:

- `npm run test:all`
- `node tools/verify-static-site.mjs`
- syntax checks for core JavaScript files
- `git diff --check` with only an existing LF/CRLF warning for `tools/verify-static-site.mjs`

## Known Limitations

- Browser/a11y verification still requires manual rendered checks or Playwright installation.
- Some citation metadata still has `needsCitationPrecision` where exact table/page precision is not yet available.
- Google Fonts/Wix asset vendoring/integrity remains documented as an open dependency-integrity item where applicable.
- The model remains exploratory. It does not prove extraterrestrial life, does not estimate confirmed civilizations, and does not provide an empirical census of life.
