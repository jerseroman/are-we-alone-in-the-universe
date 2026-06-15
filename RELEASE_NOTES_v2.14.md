# Are We Alone in the Universe v2.14 - Audit, SETI Context, and AGPLv3 Release

Tag: `v2.14`

Release date: 2026-06-12

Comparison base: Zenodo/GitHub source archive `are-we-alone-in-the-universe-v2.13.zip`, root folder `jerseroman-are-we-alone-in-the-universe-3cd4631`, corresponding to commit `3cd4631`.

## Summary

Version 2.14 is the release that should be used for the next GitHub Release and Zenodo archive after v2.13. It includes the AGPLv3 license transition, post-release audit fixes, SETI/Fermi detectability wording corrections, export metadata improvements, local UI asset vendoring, and new calculator audit documentation.

The core multiplicative candidate-filtering formula remains unchanged.

## Changes Since The Zenodo v2.13 Archive

### License And Publication Metadata

- Replaced the previous custom source-available non-commercial license with the GNU Affero General Public License v3.0 only.
- Set SPDX license metadata to `AGPL-3.0-only` in `package.json`, `CITATION.cff`, `.zenodo.json`, README, NOTICE, reuse notes, and 404 metadata.
- Updated Zenodo-ready metadata to version `2.14` and publication date `2026-06-12`.
- Updated the public application, export metadata, test assertions, README badge, cache-buster strings, and footer/version labels from `2.13` to `2.14`.

### Audit-Driven Fixes And Clarifications

These changes were introduced as a consequence of calculator audit findings or audit follow-up checks:

- Added `CODE_AUDIT_MATRIX.md` documenting calculator audit coverage, current pass status, fixed findings, and remaining open audit limitations.
- Fixed the deep state-transition test harness so `window.localStorage` and global `localStorage` share the same mock storage object.
- Added audit coverage for JSON export detection-basis consistency between deterministic and Monte Carlo Fermi modes.
- Added historical signal-context regression checks for near-present lookbacks, around-2000 lookbacks, and BCE/CE boundary formatting.
- Replaced old sparse-regime wording that could imply "no such planet at all" with probability-aware wording: expected count below one does not mean probability is zero unless the expected count is zero.
- Replaced rounded sparse Poisson existence display with `fmtExistencePct(pAtLeastOne)` so small nonzero probabilities are not falsely displayed as `0.0%`.
- Removed legacy public SETI labels such as "Detectability now" and "Contact threshold" after their content was consolidated into the SETI signal context diagnostics.
- Changed public SETI wording from civilisation-existence language to active-detectable-transmitter language where the calculation is specifically about detectable transmitters.
- Removed misleading "detection sphere" wording from the 2D SETI density path and replaced it with area/density terminology.
- Added explicit sub-Poisson warnings where fewer than one active detectable transmitter is expected inside the current detection horizon.
- Added documentation of the radial-GHZ metallicity proxy, sigmoid metallicity transition, supernova-survival proxy, and Genovali et al. 2014 comparison scale.
- Added Monte Carlo documentation explaining the adaptive log-normal 10% spread floor for narrow positive count-like intervals.

### Calculator And UI Fixes

- Fixed Sobol/Saltelli sensitivity parameter filtering so sensitivity analysis uses the same active sampled-parameter set as Monte Carlo.
- Fixed the duplicate Calculate button rendering bug by removing the duplicated button block.
- Fixed the static Kepler/Gaia preset label in the no-JavaScript fallback and preset description.
- Added HD 73526 to the reference star catalogue used by distance context.
- Reworked historical signal-time context with a richer anchor table and helper functions, so short lookbacks no longer fall through to inappropriate older anchors.
- Refined Fermi/SETI context with temporal Poisson waiting-time panels, spatial Poisson distance-scale panels, model bottleneck interpretation, and technical SETI diagnostics.
- Added an external-galaxy range-gate branch for SETI detection traces, so external targets use Earth-reference light-travel reach rather than internal Milky Way GHZ area density.
- Added count-basis disclosure to the detection panel, matching the active deterministic or Monte Carlo Fermi view.
- Kept detection-panel calculations aligned with the currently displayed Fermi mode when exporting JSON.

### Export And Share Improvements

- JSON exports now include detection count basis, detection count, active Fermi mode, nested detection-basis fields, detection horizon, nearest-detectable distance scale, beyond-horizon flag, and Fermi/historical context snapshots.
- LaTeX export now states that it is a compact parameter/result table and that full SETI/Fermi/historical context is available in JSON export.
- Export filenames were renamed from generic `habitability-*` names to `earth-like-candidate-*` names.
- LaTeX table label was renamed from `tab:habitability-params` to `tab:earth-like-candidate-params`.

### Assets, Metadata, And Repository Hygiene

- Added local project imagery and UI assets under `assets/images/`.
- Updated UI icon/logo references in `index.html` to local assets.
- Added Open Graph, Twitter card, canonical URL, meta description, and favicon metadata.
- Removed an obsolete embed build script.
- Added `CONTRIBUTING.md`.
- Updated README badges, banner, repository structure, wording, license section, and verification references.
- Updated `.gitattributes` and `.gitignore` repository metadata.

## Audit Result Notes

The audit matrix records the latest completed calculator-code audit as passing 131/131 profile executions, with 74,828,664 randomized core calculator cases, 1,626 Python oracle checks, and 9,718 browser/UI/export samples in the completed 10-hour functional audit.

Remaining audit limitations are still documented as open, not hidden:

- mutation-test strength should be improved;
- coverage tooling such as `c8` or `nyc` is not yet wired into the repository;
- restrictive-browser history UX should be manually checked, especially in embedded contexts;
- model-factor correlation documentation can be strengthened;
- Monte Carlo sampler distribution-shape tests remain future work.

## Suggested GitHub Release Text

Use this concise text for the GitHub Release description:

```text
Version 2.14 updates the project license to GNU AGPLv3, adds the calculator code audit matrix, fixes Sobol sensitivity filtering, removes a duplicate Calculate button block, improves SETI/Fermi detectability wording and diagnostics, adds external-galaxy SETI range-gate handling, expands JSON export metadata, clarifies sparse Poisson probabilities, vendors local UI assets, and updates all active public/version metadata from 2.13 to 2.14.

This release includes audit-driven wording and consistency fixes. The core multiplicative candidate-filtering formula remains unchanged.
```

## Suggested Zenodo Additional Description

```text
Version 2.14 updates the project license to the GNU Affero General Public License v3.0 only (AGPL-3.0-only), adds a calculator code audit matrix, fixes Sobol sensitivity filtering and duplicate Calculate button rendering, improves SETI/Fermi detectability wording and diagnostics, clarifies sparse Poisson probability displays, expands JSON export metadata, vendors local UI assets, and updates public/version metadata for the new release.

Several changes are audit-driven: JSON detection-basis consistency, historical signal-context regression checks, sub-Poisson SETI wording, external-galaxy range-gate handling, and clearer distinction between modelled candidate existence and active detectable transmitter assumptions.
```

## Verification

Verification completed for v2.14:

- `npm.cmd run verify` - passed.
- `npm.cmd run check:syntax` - passed.
- `npm.cmd run test:strings` - passed.
- `npm.cmd run test:all` - passed.
- `npm.cmd run test:absolute` - passed, 22 sections, 1,510 assertions, 0 failures.
- `npm.cmd run test:deep` - passed.
- `git diff --check` - passed with Git line-ending warnings only for test files.
