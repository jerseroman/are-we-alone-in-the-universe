# V&V/UQ Code Audit

> **Status: local audit completed.**

This document records the local V&V/UQ-oriented code checks performed on the
current repository state. It follows the matrix style of the earlier calculator
code audit, but it records only checks that were actually executed in this local
session.

Scope boundary: this audit verifies implementation robustness, internal
consistency, wording discipline, source traceability markers, export/test
surfaces, and local regression behavior for modelled Earth-like candidates. It
does not constitute empirical astronomical validation, peer review, proof of
life, confirmed Earth-like planets, or SETI detection evidence.

## Local Repository State

| Item | Value |
| --- | --- |
| Audit date/time | 2026-06-28T06:55:35.7915051+02:00 |
| Git branch | `main` |
| Git commit | `4baef054c4bfa05b23b6fb7e24ba691b2773a6da` |
| Working tree | Clean at audit start |
| Node.js | `v24.14.1` |
| npm | `11.11.0` |
| OS | Microsoft Windows NT 10.0.26200.0 |
| Package version | `2.18.0` |

## Status Legend

| Status | Meaning |
| --- | --- |
| PASS | The local check completed successfully or found no blocking issue in this audit scope. |
| PARTIAL | The local check completed with a documented limitation or non-blocking skip. |
| FAIL | The local check reported a failing assertion, command failure, or blocking finding. |
| INFO | The item is recorded as audit context, not as a pass/fail assertion. |

## Current Local Audit Summary

| Item | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| Existing local regression suite | PASS | `npm run test:all` exited 0 in about 90 seconds. | All configured scripts in `test:all` completed without command failure. |
| Absolute deep local audit | PASS | `npm run test:absolute` exited 0. | 1,486 assertions passed with 0 failures. |
| Deep state-transition regression | PASS | `npm run test:deep` exited 0. | Deep state, history, export, preset, MC, clamp, and distance transition checks completed. |
| Static primary-file scan | PASS | 24 primary source, documentation, metadata, and paper files were scanned. | No blocking static finding was observed in this local scope. |
| Forbidden wording scan | PASS | 2 exact phrase matches were found, both in explicit negating context. | Public wording states what the calculator does not claim. |
| High-signal secret scan | PASS | 0 high-signal key/token/private-key patterns found. | No obvious committed secret pattern found by this scan. |
| External script SRI scan | PASS | 2 external script tags found, 0 missing SRI. | External scripts in `index.html` include integrity metadata. |
| HTTP link scan | PASS | 7 `http://` matches found. | Matches were AGPL license URLs or SVG namespace strings, not live insecure content links. |
| Source/provenance term scan | PASS | 368 source/provenance/citation/calibration term matches. | Traceability terminology is present across code/docs. |
| Placeholder marker scan | PARTIAL | 14 placeholder-marker matches found. | Matches are current audit placeholder references, exported MC placeholder strings, and function naming; no source-citation placeholder was identified in this scan. |
| HTML sink inventory | INFO | 77 `innerHTML`/HTML sink matches found in `src` JavaScript. | Existing automated tests passed; this row records sink inventory only. |
| Version metadata scan | PASS | `2.18` / `2.18.0` observed in package, citation, Zenodo, app shell, README, 404, and release notes. | Active version metadata is consistent for this release family. |

## A. Local Test Commands Executed

| Command | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| `npm run test:all` | PASS | Exit code 0; about 90 seconds. | Combined local suite completed. |
| `npm run test:absolute` | PASS | Exit code 0; 1,486 assertions; 0 failures. | Absolute local audit completed. |
| `npm run test:deep` | PASS | Exit code 0. | Deep state-transition suite completed. |

## B. Existing Suite Areas From `npm run test:all`

| Script or area | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| Static site verification | PASS | Required files, CSS/JS references, basic HTML, duplicate IDs, target blank rel, SRI, crossorigin, and href placeholders checked. | Static site verification completed. |
| Canonical standalone sync | PARTIAL | Source inline blocks matched; canonical standalone path was not provided. | No source/export sync failure; byte-level canonical path enforcement was skipped by configuration. |
| JavaScript/MJS syntax | PASS | 24 JS/MJS files checked. | Syntax check passed. |
| Deterministic numerics | PASS | Scenario outputs, input normalization, probability bounds, advanced inputs, H2O neutral path, and sparse probability display checked. | Numerical regression test completed. |
| Scientific wording strings | PASS | 20 files scanned by repository test. | Banned scientific-regression phrases were not found outside explicit disclaimers. |
| Standalone export consistency | PASS | Fresh standalone export content and extracted JS syntax checked. | Standalone export consistency test completed. |
| Preset invariants | PASS | Startup default, preset keys, eta-Earth overlays, source metadata, and history storage paths checked. | Preset invariant test completed. |
| Monte Carlo regression | PASS | Seed reproducibility, MC modes, q2.5/q50/q97.5, distance models, and preset-local summaries checked. | Monte Carlo regression test completed. |
| Pessimist/Rare Earth MC regression | PASS | Four preset deterministic chains and preset-local MC behavior checked. | Pessimist MC regression completed. |
| Scenario coherence | PASS | Preset-local intervals across adaptive, bounded normal, and uniform sampling checked. | Scenario coherence test completed. |
| Universe-scale coherence | PASS | Per-star scaling, MC per-sample yield data, and UI labels checked. | Universe-scale coherence test completed. |
| Core state transition | PASS | Galaxy selection, sampling uncertainty, occurrence overlays, presetLocal paths, and invalid bounds checked. | Core state-transition test completed. |
| Preset state reset | PASS | Cross-preset central values, visible bounds, advanced modules, volatile/water split, and modified preset isolation checked. | Preset reset regression completed. |
| Calibration/source markers | PASS | 61 badges, 17 controls, 33 module values, 18 inputs, and 62 source links checked. | Calibration marker test completed. |
| Visible source links | PASS | 15 literature-backed cards and required source mappings checked. | Visible source-link test completed. |
| Bio/geophysical sources | PASS | 7 cards and registry DOI/URL entries checked. | Bio/geophysical source test completed. |

## C. Absolute Deep Audit Sections

| Section | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| Bootstrap | PASS | 14 assertions; 0 failures. | Passed. |
| Static Integrity | PASS | 150 assertions; 0 failures. | Passed. |
| Browser Bootstrap and Runtime Smoke Test | PASS | 20 assertions; 0 failures. | Passed. |
| Deterministic Model | PASS | 17 assertions; 0 failures. | Passed. |
| Preset Roundtrip | PASS | 400 assertions; 0 failures. | Passed. |
| Preset Switching | PASS | 240 assertions; 0 failures. | Passed. |
| MC Basis | PASS | 11 assertions; 0 failures. | Passed. |
| MC Reproducibility | PASS | 132 assertions; 0 failures. | Passed. |
| Bounds Validation | PASS | 75 assertions; 0 failures. | Passed. |
| MC-only Controls | PASS | 25 assertions; 0 failures. | Passed. |
| Occurrence Overlay Controls | PASS | 15 assertions; 0 failures. | Passed. |
| Galaxy Presets | PASS | 7 assertions; 0 failures. | Passed. |
| Advanced Modules | PASS | 40 assertions; 0 failures. | Passed. |
| Distance Models | PASS | 9 assertions; 0 failures. | Passed. |
| Universe Scaling | PASS | 13 assertions; 0 failures. | Passed. |
| Export Share History | PASS | 24 assertions; 0 failures. | Passed. |
| Charts State Invalidation | PASS | 6 assertions; 0 failures. | Passed. |
| Source Docs Wording | PASS | 69 assertions; 0 failures. | Passed. |
| Registry Consistency | PASS | 176 assertions; 0 failures. | Passed. |
| Cache Invalidation | PASS | 24 assertions; 0 failures. | Passed. |
| Performance | PASS | 3 assertions; 0 failures. | Passed. |
| Existing Test Orchestration | PASS | 16 assertions; 0 failures. | Passed. |
| Absolute audit total | PASS | 1,486 assertions; 0 failures. | Passed. |

## D. Deep State-Transition Areas

| Area | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| Core transition smoke path | PASS | Galaxy selection, sampling uncertainty, occurrence overlays, presetLocal paths, and invalid visible bounds passed. | Passed. |
| Modified Pessimist N_GHZ tracking | PASS | Central/min/max edits preserved modified preset-local labels, warnings, MC summary, and universe-scale basis. | Passed. |
| Modified Pessimist complex-life tracking | PASS | Central/min/max edits preserved modified preset-local labels, warnings, MC summary, and universe-scale basis. | Passed. |
| N_GHZ scale regression | PASS | Modified preset-local uncertainty and universe-scale labels passed after edit. | Passed. |
| Chart invalidation | PASS | Histogram and exceedance charts were marked stale after input changes. | Passed. |
| Visible restore checks | PASS | Pessimist, consensus, optimist, and Kepler restore paths returned MC, distance, and Fermi panels to baseline. | Passed. |
| Distance model toggle behavior | PASS | Distance model toggle preserved scientific preset state. | Passed. |
| Export/history MC state | PASS | Deterministic-only, current MC, and stale MC states were consistent across getter, JSON, history, and LaTeX. | Passed. |
| Custom input path | PASS | Explicit customInput selection used visible-bound sampling and custom input label. | Passed. |
| Clamp behavior | PASS | Probability-like factors above 1 were clamped with inline warnings; count-like fields were not clamped. | Passed. |

## E. Static Wording, Metadata, And Security Checks

| Check | Status | Evidence observed | Current state |
| --- | --- | --- | --- |
| Exact forbidden phrase scan | PASS | `confirmed Earth-like planets` appears only in a sentence saying the calculator does not count them; `empirical confidence interval` appears only in "not an empirical confidence interval." | No unnegated exact forbidden phrase finding in this local scan. |
| High-signal secret pattern scan | PASS | 0 matches for common API-key, token, and private-key signatures. | No obvious committed secret signature found. |
| External script SRI | PASS | MathJax and ApexCharts external scripts include `integrity` and `crossorigin`. | External script integrity metadata present. |
| HTTP literal scan | PASS | 7 matches: AGPL license URLs and SVG namespace declarations. | No insecure live application content link was identified by this scan. |
| Version metadata scan | PASS | `2.18.0` in `package.json`; `2.18` or `v2.18` in citation, Zenodo, app shell, README, 404, and release notes. | Release metadata is coherent for the v2.18 family. |
| Source/provenance/citation term scan | PASS | 368 term matches across source, docs, README, paper, citation, and Zenodo metadata. | Source/provenance terminology is present. |
| Source placeholder scan | PASS | No source-citation placeholder such as `citation needed`, `source needed`, `source TBD`, or `doi TBD` was found. | No source placeholder finding in this local scan. |
| Generic placeholder marker scan | INFO | Matches included the current `CODE_AUDIT_MATRIX.md` placeholder references and intentional MC placeholder strings. | Recorded as context; no blocking local finding. |
| HTML sink inventory | INFO | 77 HTML sink references were found in `src` JavaScript. | Existing tests passed; this inventory is not a full manual escaping proof. |

## F. Findings

| ID | Severity | Status | Finding | Evidence |
| --- | --- | --- | --- | --- |
| VVUQ-INFO-001 | INFO | OPEN | The existing `CODE_AUDIT_MATRIX.md` remains a placeholder while this new audit file records the current local V&V/UQ check. | README references the placeholder audit matrix; no README change was requested or made. |
| VVUQ-INFO-002 | INFO | OPEN | HTML-generating code paths are present and should continue to be covered by regression and escaping-focused review when changed. | Static inventory found 77 `innerHTML`/HTML sink references in `src` JavaScript; local regression tests passed. |

## Final Local Status

| Status | Basis |
| --- | --- |
| PASS for this local audit scope | `npm run test:all`, `npm run test:absolute`, `npm run test:deep`, and the local static scans above completed without critical or high findings. |

This final status applies only to the checks recorded in this file. It verifies
implementation robustness and internal consistency for the executed local audit
scope. It does not constitute empirical astronomical validation, peer review,
proof of life, confirmed Earth-like planets, or SETI detection evidence.
