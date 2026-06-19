# Are We Alone in the Universe v2.17 - Light Theme, Custom Galaxy X, And Context Wording

Tag: `v2.17`

Release date: 2026-06-18

## GitHub Release Title

Are We Alone in the Universe v2.17 - Light Theme, Custom Galaxy X, And Context Wording

## Summary

Version 2.17 is a user-interface, galaxy-scaling, SETI/Fermi wording, export-metadata, and regression-test release for the Are We Alone in the Universe? Earth-like Planet Calculator.

The release keeps the core multiplicative modelling intent intact while making the public interface default to a paper-white light theme, replacing named external-galaxy presets with one user-defined Custom Galaxy X scenario, resolving `N_GHZ` through a single source of truth, and cleaning up historical-context and SETI signal-travel-time wording.

## Highlights

- Default White/Black theme switch with `html.light` as the startup theme.
- Paper-white grayscale light theme variables and overrides for cards, tooltips, badges, icons, sliders, sensitivity bars, validation warnings, and the logo.
- Single Custom Galaxy X scenario replacing the previous named galaxy presets.
- Unified `N_GHZ` resolution through `getNGHZSource()` and `getEffectiveNGHZ()`.
- Deterministic calculations, Monte Carlo deterministic-at-run values, and current deterministic snapshots now use the same effective `N_GHZ` value as sampling.
- New galaxy scaling mode selector with Manual, Simple, and Radial modes, plus total-stars and GHZ-fraction controls.
- JSON and Monte Carlo exports now expose the resolved galaxy model and `N_GHZ` provenance.
- Historical-context wording now uses a single clean "In historical terms, this corresponds to ..." sentence.
- SETI signal timing now uses light-travel wording: the signal would have had to leave its source about the displayed number of years ago.
- Static-site verification and regression tests were updated for the Custom Galaxy X and historical-context changes.

## User Interface

- Added a sliding White/Black theme switch in the project link row.
- Made the white theme the default with `<html class="light">` and `window load -> setTheme('light')`.
- Added light-theme CSS variables and targeted `html.light` overrides for high-contrast grayscale rendering.
- Softened light-theme borders and gave input and advanced-module cards a warm paper tone while keeping other panels visually separate.
- Adjusted light-theme accent stripes, Fermi arrow contrast, tooltip presentation, calibration badges, icon filters, sliders, validation warnings, and sensitivity-legend swatches.
- Replaced several long-dash visible labels and comments with slash-separated wording while preserving functional regex support for dash variants.

## Galaxy Settings

- Removed named galaxy presets; the galaxy settings panel now represents one user-defined Custom Galaxy X scenario.
- Kept Milky Way totals only as internal reference constants: `MW_TOTAL_STARS`, `MW_DEFAULT_N_GHZ`, and `MW_DEFAULT_GHZ_FRACTION`.
- Added `manual_raw_N_GHZ`, `simple_galaxy_scaling`, and `radial_ghz_integrator` source labels.
- Added `getEffectiveNGHZ()` returning `{ value, source, metadata }` as the single source of truth.
- Updated `getInputs()` and `resolveInputsForCalculation()` to use the resolved effective value.
- Updated `sampleBaseInputs()` so sampling respects the selected scaling mode.
- Added total-stars and GHZ-fraction controls and simplified the galaxy-setting UI update flow.
- Preserved manually edited GHZ fractions across scaling-mode changes through `maybeInitGhzFraction()` and `galaxyGhzFractionTouched`.
- Kept diameter, thickness, and distance as geometry or distance settings that do not change the candidate-count result.

## Exports

- Extended JSON exports with `galaxy_model_type`, `galaxy_preset_evidence_level`, `N_GHZ_source`, `raw_N_GHZ`, `effective_N_GHZ`, `galaxy_total_stars`, `galaxy_GHZ_fraction`, and `galaxy_scaling_mode`.
- Added an `N_GHZ_resolved` block to the Monte Carlo data export.
- Updated the calculation console to show the active `N_GHZ` source.
- Updated active version metadata to `2.17`.

## SETI / Fermi Context

- Added `buildHistoricalContextText()` and routed `getHistoricalContextForLookback()` through it, including JSON export context.
- Removed duplicated historical phrasing that could repeat the same lookback anchor.
- Reworded SETI signal timing away from continuous-transmission wording and toward light-travel-time framing.
- Closed the star-reference parenthesis in all distance-context branches.
- Added `ensureSentenceEnd()` handling before "This is ..." interpretation text.

## Tests And Tooling

- Added `runGalaxySettingsTests()` covering simple scaling, proportionality, distance/diameter/thickness non-effects, radial override behavior, sampling/effective agreement, Monte Carlo deterministic agreement, and preset-local effective-value regression.
- Added `runHistoricalContextTests()` covering duplicate historical wording, closed parenthesis output, and the new SETI timing sentence.
- Updated `tools/test-strings.mjs` expected text to the new historical-context wording.
- Updated `tools/test-state-transition-coherence.mjs` to use the Custom Galaxy X model.
- Added standalone-export harness shims for the new resolver dependencies and Milky Way reference constants.
- Updated `tools/verify-static-site.mjs` so console logging is permitted only inside the two development helper test functions.

## Occurrence Controls And Bryson Direct Mode

Refactor rocky/HZ occurrence controls into explicit occurrence overlays and add Bryson η⊕ direct mode.

- Replaced ambiguous bayesianMode logic with astronomyOverrideMode / occurrence overlay state.
- Reworked Conservative Kepler-era and Updated Kepler/Gaia as overlays that only modify f_composition and f_orbit.
- Added Bryson η⊕ direct occurrence mode using eta_earth_bryson = 0.60.
- Added resolveOccurrenceTerm() so the model can switch between factorized occurrence and direct η⊕.
- Added scenarioFactorizedBaseline capture/restore to prevent Bryson direct stale values from leaking into pre/post overlays.
- Expanded export and Monte Carlo metadata with occurrence model details.
- Added astronomy-source/occurrence regression tests for High-End, pre/post overlays, Bryson direct, export consistency, and stale-state transitions.

## Occurrence UI Consistency Update

No scientific constants, deterministic calculation, Monte Carlo engine, robust-envelope calculation, or export formulas changed. This update is limited to GUI presentation, state labelling, export metadata, and regression tests.

- Split the former single "Rocky/HZ Occurrence Overlay" area into two explicit UI sections:
  - "Rocky/HZ Factorized Occurrence Overlays" for Conservative Kepler-era and Updated Kepler/Gaia posterior proxy, using the factorized `N_p_star * f_rocky * f_HZ` term.
  - "Direct η⊕ Occurrence Replacement" for the Bryson η⊕ direct proxy, replacing the whole factorized occurrence product with `η⊕ = 0.60`.
- Added the `.occurrence-section-desc` CSS helper for explanatory text under each occurrence section.
- In Bryson direct mode, `N_p_star`, `f_composition`, and `f_orbit` cards now use the `bypassed-by-eta` visual state: grey styling, dashed border, reduced opacity, disabled/readonly mean and min/max fields, disabled interval button, `aria-disabled`, explanatory `title`, hidden calibration/info/source decorations, and a short `BYPASSED BY η⊕ NOT USED` label. Values are not overwritten; they remain diagnostic only.
- Added `renderOccurrenceModeBanner()` for the `#occurrence-mode-banner` element. It removes stale banners before rendering, shows no banner for clean/factorized modes, and shows only the grey Bryson direct banner: `Direct η⊕ occurrence replacement active / η⊕ = 0.60 replaces N_p_star × f_rocky × f_HZ.`
- Removed the old sticky/static occurrence notice and the lower "ACTIVE OCCURRENCE TERM" panel in favour of the banner plus the upper Active calculation state box.
- Extended the Active calculation state box so it explicitly shows `η⊕ direct = 0.60` or `N_p_star × f_rocky × f_HZ = ...`, and in Bryson direct mode also shows the bypassed diagnostic factorized product.
- Added readable display helpers for UI state:
  - `formatMonteCarloBasisDisplay()` and `monteCarloBasisPlainLabel()`
  - `formatNGHZSourceLabel()`
  - Configuration warnings now use readable labels instead of raw internal enum names.
- Extended occurrence export metadata:
  - Factorized mode exports `occurrence_mode: "factorized"` and `active_occurrence_term: "N_p_star * f_rocky * f_HZ"`.
  - Bryson direct exports `occurrence_mode: "eta_earth_direct"`, `active_occurrence_term: "eta_earth_bryson"`, `eta_earth_bryson: 0.60`, `replaced_terms: ["N_p_star","f_composition","f_orbit"]`, and `visible_terms_status: "diagnostic_only"`.
- Added occurrence-specific browser-console regression helpers:
  - `runOccurrenceModeRegressionTests()`
  - `runOccurrenceNoticeUiTests()`
  - `runAllOccurrenceTests()`
- Updated T13 to assert the `bypassed-by-eta` class and the exact bypass label.
- Confirmed the occurrence calculation source of truth remains `resolveOccurrenceTerm()` -> `computePlanetsBase()`, with GUI state reading through `buildResolvedModelState()`.

## Final Consistency Cleanup

- Fixed `N_p_star` preset contamination: `loadPreset()` now resets Galaxy Settings, returns the Monte Carlo basis to `auto`, applies the preset, and clears any occurrence overlay.
- Fixed overlay/Bryson reset on preset load through `clearAstronomyOverride({ fromPresetLoad: true })`.
- Fixed Galaxy Settings reset by calling `resetGalaxySettingsForPresetSwitch()` on every preset switch.
- Improved Monte Carlo `presetLocal` semantics: preset-local sampling is allowed only for a clean named preset; modified DOM state, overlays, or Galaxy overrides resolve to `modifiedPresetLocal` or current-input sampling.
- Improved Bryson η⊕ direct mode: `N_p_star`, `f_composition`, and `f_orbit` are removed from active sampled parameter IDs in direct mode, and `eta_earth_bryson` is exposed as the direct occurrence term.
- Fixed empty Monte Carlo samples: runs with no valid finite samples now return `NO_VALID_MONTE_CARLO_SAMPLES` instead of a fake zero result.
- Improved exports with `resolved_model_state`, occurrence mode, `eta_earth_used`, and `replaced_terms`.
- Improved UI semantics with an “Active calculation state” box showing base scenario, occurrence mode, `N_GHZ` source, active occurrence term, and resolved Monte Carlo basis.
- Fixed fragile `1e-12` equality checks by adding `nearlyEqual()`.
- Tightened `nearlyEqual()` for tiny probability bounds so edits such as `1e-9` -> `2e-9` are no longer treated as unchanged preset state.
- Improved Monte Carlo min/max handling: sampling swaps inverted bounds locally and regression tests verify that the DOM min/max fields are not mutated during sampling.
- Fixed probability-boundary sampling consistency: exact `0/0/0` and `1/1/1` probability factors stay exact in deterministic and Monte Carlo paths, while boundary values with interval width emit `PROBABILITY_BOUNDARY_WITH_WIDTH`.
- Removed remaining calculation-time DOM mutation from number sanitization; read paths now normalize values locally and record warnings without rewriting input fields.

## Verification

Verification completed for v2.17:

- `npm run verify`
- `npm run check:syntax`
- `npm run test:strings`
- `npm run test:standalone-export`
- `npm run test:state-transition:core`
- `npm.cmd run test:all`
- `npm.cmd run test:deep`
- `node tools/test-standalone-export-consistency.mjs --standalone "<desktop-layout standalone v2.17 HTML>"`
- `node tools/test-standalone-export-consistency.mjs --standalone "<small-screen-layout standalone v2.17 HTML>"`
- Browser `runV217StateConsistencyTests()` audit: desktop layout 24/24, small-screen layout 24/24.

The full repository test suite was run before publication.
