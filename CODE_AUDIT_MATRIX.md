# Calculator Code Audit Matrix

This document contains the list of calculator code tests, calculator audit profiles, oracle tests, browser tests, and stress test cases that have been performed for version 2.13.

Several lengthy audits of the calculator code were conducted on our systems for a total period of 20 hours, including two 10-hour time-boxed audit runs in addition to smoke, static analysis, browser, oracle, and specific regression audits.

Scope boundary: this audit of the code refers specifically to the calculator code implementation and its results. It does not constitute certification.

Transparency in workflow: this audit matrix was prepared based on the logs of our local calculator audits, along with Node.js and Python oracle scripts and Codex 5.5 Extra High assistance.

Evidence summary: the latest completed 10-hour calculator audit passed 131/131 profile executions, with 74,828,664 randomized core calculator cases, 1,626 Python oracle checks, and 9,718 browser/UI/export samples. No mismatches were reported in that completed 10-hour functional audit. Remaining open items are mutation-test strength, coverage collection tooling, and one later deep state-transition/history assertion listed below.

## Status Legend

| Status | Meaning |
| --- | --- |
| PASS | Current calculator-code check passed in the latest relevant run. |
| FIXED | An earlier error was observed and the current relevant run no longer reports it. |
| PARTIAL | A previous run stopped before completing all intended checks. |
| SKIPPED | The check did not run because a required tool or condition was missing. |
| FAIL | The latest local run of this check reported a failing assertion or runtime error. |
| OPEN | The item remains an improvement target. |

## Current Calculator-Code Audit Summary

| Item | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Latest full 10h calculator timeboxed run | PASS | No current timeboxed failures | 131/131 profile executions passed. |
| Core randomized calculator cases | PASS | No current core failures | 74,828,664 randomized core cases completed with 0 failures. |
| Python oracle sampled checks | PASS | No current oracle mismatches in latest full run | 1,626 sampled checks completed with 0 mismatches and 0 Python errors. |
| Browser/UI/export samples | PASS | No current browser sample findings in latest full run | 9,718 browser/UI/export samples completed. |
| Overall full audit report status | OPEN | Yes, overall report remained YELLOW | Functional calculator checks passed; YELLOW remained because mutation testing and coverage tooling were not fully satisfied. |
| Mutation testing | OPEN | Yes, survived mutants were reported | Needs stronger tests to kill remaining survived mutants. |
| Coverage tooling | SKIPPED | Yes, coverage tool missing | Needs `c8` or `nyc` to collect coverage. |
| Later deep state-transition/history check | FAIL | Yes, latest `npm run test:deep` failed in history distance-basis storage | Open item; see section B.2. |

## A. Calculator Source Files Under Code Audit

| Code area | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| `src/calculator-core.js` core formulas | PASS | No current syntax/runtime audit error | Covered by deterministic, Monte Carlo, oracle, distance, universe-scale, SETI, mutation, and stress profiles. |
| `src/scientific-parameters.js` preset/parameter registry | PASS | No current registry mismatch | Covered by preset, calibration, source-link, and traceability checks. |
| `src/app.js` UI state and history wiring | PASS | Earlier storage/runtime risk was identified separately | Current guarded storage handling and state-transition tests pass. |
| `src/share.js` export and share code | PASS | No current export parity failure | Covered by JSON, LaTeX/Markdown, share/export, and stale Monte Carlo export checks. |
| `src/charts.js` chart code | PASS | Static scan flags `innerHTML` review only | No current runtime failure; manual escaping review remains recommended. |
| `src/accessibility.js` accessibility helpers | PASS | No current accessibility audit failure | Covered by syntax and calibration/accessibility checks. |
| `index.html` calculator integration | PASS | Earlier metadata/source-link concerns were handled separately | Static structure, link, source, wording, and UI checks pass in current audit context. |

## B. Local Calculator Test Commands

| Command or script | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| `npm run verify` | PASS | No current error | Static site verification passes. |
| `npm run check:syntax` | PASS | No current error | JavaScript/MJS syntax check passes. |
| `npm run test:numerics` | PASS | No current error | Deterministic numerical regression checks pass. |
| `npm run test:strings` | PASS | No current error | Wording regression checks pass. |
| `npm run test:presets` | PASS | No current error | Preset invariants and history storage checks pass. |
| `npm run test:montecarlo` | PASS | No current error | Monte Carlo regression checks pass. |
| `npm run test:pessimist-mc` | PASS | No current error | Pessimist/Rare Earth Monte Carlo checks pass. |
| `npm run test:scenario-coherence` | PASS | No current error | Scenario coherence checks pass. |
| `npm run test:universe-scale` | PASS | No current error | Universe-scale coherence checks pass. |
| `npm run test:state-transition` | PASS | No current error | Core state-transition checks pass. |
| `npm run test:state-transition:core` | PASS | No current error | Same core state-transition path used by `npm run test:state-transition`. |
| `npm run test:state-transition:deep` | FAIL | Yes, latest local run failed at history active distance model/basis storage | Open issue: history entry was not available for the distance-basis assertion after many preceding PASS checks. |
| `npm run test:preset-state-reset` | PASS | No current error | Preset reset isolation checks pass. |
| `npm run test:calibration` | PASS | No current error | Calibration/accessibility/source checks pass. |
| `npm run test:source-links` | PASS | No current error | Visible source-link checks pass. |
| `npm run test:biogeo-sources` | PASS | No current error | Bio/geophysical source checks pass. |
| `npm run test:absolute` | PASS | No current error | Absolute deep audit passed 22 sections, 1,515 assertions, and 0 failures. |
| `npm run test:deep` | FAIL | Yes, same latest failure as `test:state-transition:deep` | Alias for the deep state-transition path; not currently included in `test:all`. |
| `npm run test:all` | PASS | No current error | Combined CI-style calculator suite passes; it does not include `test:absolute` or `test:deep`. |

## B.1 Absolute Deep Audit Sections

| Section | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Bootstrap | PASS | No current error | 14 assertions passed. |
| Static Integrity | PASS | No current error | 151 assertions passed. |
| Browser Bootstrap and Runtime Smoke Test | PASS | No current error | 20 assertions passed. |
| Deterministic Model | PASS | No current error | 17 assertions passed. |
| Preset Roundtrip | PASS | No current error | 400 assertions passed. |
| Preset Switching | PASS | No current error | 240 assertions passed. |
| MC Basis | PASS | No current error | 11 assertions passed. |
| MC Reproducibility | PASS | No current error | 132 assertions passed. |
| Bounds Validation | PASS | No current error | 75 assertions passed. |
| MC-only Controls | PASS | No current error | 25 assertions passed. |
| Bayesian Toggle | PASS | No current error | 11 assertions passed. |
| Galaxy Presets | PASS | No current error | 39 assertions passed. |
| Advanced Modules | PASS | No current error | 40 assertions passed. |
| Distance Models | PASS | No current error | 9 assertions passed. |
| Universe Scaling | PASS | No current error | 13 assertions passed. |
| Export Share History | PASS | No current error | 24 assertions passed. |
| Charts State Invalidation | PASS | No current error | 6 assertions passed. |
| Source Docs Wording | PASS | No current error | 69 assertions passed. |
| Registry Consistency | PASS | No current error | 176 assertions passed. |
| Cache Invalidation | PASS | No current error | 24 assertions passed. |
| Performance | PASS | No current error | 3 assertions passed. |
| Existing Test Orchestration | PASS | No current error | 16 assertions passed. |
| Absolute audit total | PASS | No current error | 1,515 assertions passed with 0 failures. |

## B.2 Deep State-Transition Test Areas

| Area | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Core state-transition smoke path | PASS | No current error | Galaxy preset metadata, sampling uncertainty, Bayesian reconciliation, MC bounds basis, and explicit preset/custom modes passed. |
| Modified Pessimist / Rare Earth N_GHZ tracking | PASS | No current error | Modified preset-local labels, warnings, Monte Carlo summary, and universe-scale basis passed for central/min/max edits. |
| Modified Pessimist / Rare Earth complex-life tracking | PASS | No current error | Modified preset-local labels, warnings, Monte Carlo summary, and universe-scale basis passed for central/min/max edits. |
| N_GHZ scale regression after edit | PASS | No current error | Modified preset-local uncertainty and universe-scale labels passed. |
| Chart invalidation after input changes | PASS | No current error | Histogram and KDE stale-state checks passed. |
| Visible restore checks across presets | PASS | No current error | Pessimist, consensus, optimist, and Kepler visible restore paths returned MC, distance, and Fermi panels to baseline. |
| Distance model off/on scenario state | PASS | No current error | Distance model toggles did not mark the scientific scenario modified. |
| LaTeX deterministic/current/stale MC export states | PASS | No current error | Deterministic-only, current MC, and stale MC export checks passed. |
| History active distance model and MC q50 basis | FAIL | Yes, latest `test:deep` reported no stored history entry for this assertion | Open issue to inspect in `saveHistoryEntry()` / distance history flow. |
| JSON export agreement with history distance basis | FAIL | Yes, follow-up assertion hit undefined history data | Open issue depends on the missing history entry above. |

## C. Deterministic Calculator Mathematics

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Deterministic multiplicative product formula | PASS | No current mismatch | Golden scenario outputs match expected values. |
| Scenario ordering | PASS | No current mismatch | Pessimist < consensus < Kepler/Gaia < optimist. |
| Pessimist deterministic output | PASS | No current mismatch | Expected value is preserved. |
| Consensus deterministic output | PASS | No current mismatch | Expected value is preserved. |
| Kepler/Gaia deterministic output | PASS | No current mismatch | Expected value is preserved. |
| Optimist deterministic output | PASS | No current mismatch | Expected value is preserved. |
| Zero-factor collapse | PASS | No current mismatch | Required zero factors collapse result as expected. |
| Optional-factor neutral behaviour | PASS | No current mismatch | Disabled optional factors remain neutral where intended. |
| Optional-factor enabled behaviour | PASS | No current mismatch | Enabled optional factors affect result as intended. |
| All-factors-one upper-bound sanity | PASS | No current mismatch | Finite and bounded result path preserved. |
| Non-negative result invariant | PASS | No current mismatch | Invalid negative inputs normalize or warn without negative final result. |
| Finite result invariant | PASS | No current mismatch | NaN/Infinity states are guarded in tested paths. |
| Clamp behaviour | PASS | No current runtime failure | Clamp-max mutation survived, so stronger tests remain an improvement target. |
| Exact golden examples | PASS | No current mismatch | Golden outputs are checked by deterministic and absolute tests. |

## D. Input Validation And Bounds

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Empty input normalization | PASS | No current error | Empty values normalize with visible validation state. |
| String input normalization | PASS | No current error | String values normalize with visible validation state. |
| Huge input normalization | PASS | No current error | Huge values normalize with visible validation state. |
| Negative input handling | PASS | No current error | Negative values normalize or warn without invalid final state. |
| Probability below 0 | PASS | No current error | Invalid probability bounds produce visible warning state. |
| Probability above 1 | PASS | No current error | Invalid probability bounds produce visible warning state. |
| Advanced input below 0 | PASS | No current error | Advanced input validation state appears. |
| Advanced input above 1 | PASS | No current error | Advanced input validation state appears. |
| Min greater than max | PASS | No current error | Monte Carlo is blocked with warning rather than silently accepting invalid bounds. |
| Central value outside min/max | PASS | No current error | Monte Carlo is blocked with warning. |

## E. Presets And Calculator State

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Startup default preset | PASS | No current error | Default is Kepler/Gaia. |
| Kepler/Gaia preset load | PASS | No current error | `loadPreset("kepler")` selects expected scenario. |
| Pessimist/Rare Earth preset | PASS | No current error | Rare Earth values stay isolated from other presets. |
| Consensus preset | PASS | No current error | Consensus values and labels remain coherent. |
| Optimist preset | PASS | No current error | Optimist values and labels remain coherent. |
| Preset key registry match | PASS | No current error | Runtime and UI preset keys match. |
| Obsolete preset absence | PASS | No current error | Obsolete keys are not present. |
| Preset visible min/max reset | PASS | Earlier stale-bound risk was tested | Current preset switching resets visible bounds. |
| Modified preset detection | PASS | No current error | Manual edit creates modified scenario state. |
| Modified preset restoration | PASS | No current error | Restoring defaults returns to clean preset mode. |
| Bayesian pre/post toggle reconciliation | PASS | No current error | Toggle returns to clean matching preset when expected. |
| Advanced module state reset | PASS | No current error | Preset changes reset dirty advanced module state. |
| Volatile/water split reset | PASS | No current error | Preset changes reset dirty split state. |
| History storage migration | PASS | Earlier storage/runtime risk was fixed | Legacy and corrupted `simHistory` payloads normalize safely. |

## F. Monte Carlo And Model-Internal Uncertainty

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Seeded reproducibility | PASS | No current error | Same seed reproduces output exactly. |
| Different seed variation | PASS | No current error | Different seed changes sample sequence. |
| Unseeded valid summary | PASS | No current error | Unseeded mode returns valid summary. |
| Adaptive log/logit-normal mode | PASS | No current error | Valid preset-local outputs. |
| Bounded normal mode | PASS | No current error | Valid interval outputs. |
| Uniform mode | PASS | No current error | Valid interval outputs. |
| Latin-hypercube reproducibility | PASS | No current error | Same seed reproduces LHS output. |
| q2.5 <= q50 <= q97.5 | PASS | No current error | Interval ordering profile passes. |
| q50 not swapped with mean | PASS | Mutation killed relevant swap | q50/mean distinction is tested and preserved. |
| q025/q975 not swapped | PASS | Mutation killed relevant swap | Quantile order protected. |
| Mean/median distinction | PASS | No current error | UI/export/history distinguish q50 and arithmetic mean. |
| Min=max deterministic collapse | PASS | No current error | Degenerate interval collapses as expected. |
| Scenario-local preset mode | PASS | No current error | Named presets use scenario-local uncertainty. |
| Modified-preset local mode | PASS | No current error | Edited fields use visible bounds, unchanged fields keep scenario-local bounds. |
| Global-envelope mode label | PASS | No current error | Label remains explicitly exploratory/non-local. |
| Custom-input invalid bounds | PASS | No current error | Invalid custom bounds block Monte Carlo. |
| Stale Monte Carlo invalidation | PASS | Mutation survived a related stale-state variant | Current state-transition tests pass; stronger mutation coverage remains open. |
| No empirical confidence-interval overclaim | PASS | Earlier wording issues were fixed | Public wording frames intervals as model-internal. |

## G. Additional Scientific Modules

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Supported module matrix | PASS | No current error | Matrix profile passes. |
| Strict oracle-supported modules | PASS | No current mismatch | Python oracle checks sampled module behaviour. |
| Module enabled/disabled states | PASS | No current error | Runtime state combinations pass randomized profiles. |
| Product behaviour | PASS | No current mismatch | Product modules match expected multiplication behaviour. |
| Replacement behaviour | PASS | No current mismatch | Replacement modules match expected behaviour. |
| Module overlap warning | PASS | No current browser finding | Warning profile passes in latest full run. |
| H2O disabled neutral behaviour | PASS | No current error | Disabled H2O remains multiplicative neutral where expected. |
| Module source/provenance coverage | PASS | No current failure | Source/provenance profile passes. |

## H. Distance, Universe Scaling, And SETI/Fermi Code

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| kpc/light-year conversion sanity | PASS | No current error | Distance/unit checks pass. |
| 2D distance model finite output | PASS | No current error | 2D model returns finite values across grid. |
| 3D disk distance model finite output | PASS | No current error | 3D model returns finite values across grid. |
| Radial-density nearest-neighbour output | PASS | No current error | Finite and ordered sampled interval. |
| Distance monotonicity by count | PASS | No current error | Counts from 1 through 1e10 remain monotonic. |
| GHZ annulus/radial boundary sanity | PASS | Earlier hard-cutoff issue was fixed separately | Current softened transition is documented and tested. |
| Observable-universe per-star scaling | PASS | No current error | Scaling remains stable when only `N_GHZ` changes. |
| Universe-scale lower-bound jump guard | PASS | No current error | No order-of-magnitude jump from one extra zero in `N_GHZ`. |
| SETI/Fermi lambda | PASS | No current error | Lambda formula sanity passes. |
| SETI/Fermi `P>=1` | PASS | No current error | Probability remains in [0, 1]. |
| SETI sparse display | PASS | No current browser finding | Sparse-regime browser profile passes. |
| Mean/median waiting time | PASS | No current error | Waiting-time sanity checks pass. |

## I. Export, Share, And History Code

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| JSON export parity | FIXED | Yes, older deep 10h run had browser failures | Latest full 10h run reports JSON export parity PASS. |
| LaTeX export parity | PASS | No current error | Latest full run reports PASS. |
| Markdown/export text parity | PASS | No current error | Export content remains consistent. |
| Deterministic-only export state | PASS | No current error | Missing Monte Carlo is not exported as current sampled result. |
| Stale Monte Carlo export state | PASS | No current error | Stale state is exported as stale/not-current. |
| Current Monte Carlo export state | PASS | No current error | Current sampled values export correctly. |
| Share text scenario labels | PASS | No current error | Scenario state and labels included. |
| History schema migration | PASS | Earlier localStorage risk fixed | Legacy arrays and corrupted payloads normalize safely. |
| Bad storage read handling | PASS | Earlier runtime risk fixed | Storage access failures are ignored safely. |

## J. UI And Browser Calculator Code

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Browser DOM profile | PASS | Earlier standalone browser check was skipped before Playwright install | Latest full browser DOM profile passes. |
| Mobile vs desktop parity | FIXED | Yes, older deep 10h run had one failure | Latest full run reports PASS. |
| Sparse SETI UI display | PASS | No current error | Latest browser profile passes. |
| Module-overlap warning UI | PASS | No current error | Latest browser profile passes. |
| Browser performance/memory | PASS | No current error | Latest profile passes. |
| Calibration badge accessibility | PASS | No current error | Accessibility/calibration checks pass. |
| Visible source-link UI | PASS | No current error | Source-link UI checks pass. |
| Bio/geophysical source UI | PASS | No current error | Bio/geophysical source checks pass. |

## K. Static Code And Wording Guards

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Forbidden wording scan | FIXED | Yes, first full smoke audit reported wording failure | Later static wording check and latest full run pass. |
| False-confidence wording scan | FIXED | Yes, wording issues were previously reported | Current wording scan passes with only review-level findings. |
| Source/provenance scan | PASS | No current failure | Expected source/provenance markers are present. |
| Security/static scan | FIXED | Yes, first full smoke audit reported security/static failure | Later security check and latest full run pass. |
| Formula-trap scan | PASS | No current failure | Formula visibility and interval/unit terms present. |
| Golden-output static regression | PASS | No current failure | Known outputs remain guarded. |
| Non-HTTPS link review | OPEN | Review-level findings exist | Not a current runtime failure; should be cleaned where practical. |
| `innerHTML` manual review | OPEN | Review-level findings exist | Not a current runtime failure; manual escaping review remains recommended. |

## L. Independent Python Oracle

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Deterministic product oracle | PASS | A partial run once reported oracle mismatches | Latest full run reports 0 mismatches. |
| Optional-factor collapse oracle | PASS | No current mismatch | Latest full run reports 0 mismatches. |
| Additional module oracle | PASS | No current mismatch | Latest full run reports 0 mismatches. |
| Distance helper formulas | PASS | No current mismatch | Included in oracle sanity checks. |
| Universe scaling helper formulas | PASS | No current mismatch | Included in oracle sanity checks. |
| SETI/Fermi helper formulas | PASS | No current mismatch | Included in oracle sanity checks. |
| Python oracle errors | PASS | No current error | Latest full run reports 0 Python errors. |

## M. Timeboxed Stress Profiles

| Profile | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| `01-realistic-core-fuzz` | PASS | No current error | Latest full 10h run passed. |
| `02-supported-modules-matrix` | PASS | No current error | Latest full 10h run passed. |
| `03-preset-mc-transition` | PASS | No current error | Latest full 10h run passed. |
| `04-seti-fermi-extremes` | PASS | No current error | Latest full 10h run passed. |
| `05-boundary-corrupted` | PASS | No current error | Latest full 10h run passed. |
| `06-strict-oracle-no-modules` | PASS | No current error | Latest full 10h run passed. |
| `07-mc-reproducibility` | PASS | No current error | Latest full 10h run passed. |
| `08-interval-ordering` | PASS | No current error | Latest full 10h run passed. |
| `09-preset-reset-stale` | PASS | No current error | Latest full 10h run passed. |
| `10-distance-model-nearest-candidate` | PASS | No current error | Latest full 10h run passed. |
| `11-universe-scale` | PASS | No current error | Latest full 10h run passed. |
| `12-json-export-parity` | FIXED | Yes, older deep 10h run had failures | Latest full 10h run passed. |
| `13-latex-markdown-export-parity` | PASS | No current error | Latest full 10h run passed. |
| `14-ui-browser-dom` | PASS | Standalone early browser run was skipped before Playwright install | Latest full 10h run passed. |
| `15-mobile-vs-desktop` | FIXED | Yes, older deep 10h run had a failure | Latest full 10h run passed. |
| `16-seti-sparse-display` | PASS | No current error | Latest full 10h run passed. |
| `17-module-overlap-warning` | PASS | No current error | Latest full 10h run passed. |
| `18-performance-memory` | PASS | No current error | Latest full 10h run passed. |
| `10b-full-preset-snapshot-diff` | PASS | No current error | Latest full 10h run passed. |
| `19-forbidden-wording` | FIXED | Yes, first full smoke audit failed wording/static profile | Latest full 10h run passed. |
| `20-source-provenance` | PASS | No current error | Latest full 10h run passed. |
| `21-security-static-scan` | FIXED | Yes, first full smoke audit failed security/static profile | Latest full 10h run passed. |
| `22-mutation-style-formula-trap` | PASS | No current error | Latest full 10h run passed. |
| `23-regression-golden-outputs` | PASS | No current error | Latest full 10h run passed. |

## N. Mutation, Coverage, And Performance

| Check | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Multiplication-to-division mutant | OPEN | Mutant survived | Needs a stronger assertion. |
| Plus-to-minus mutant | OPEN | Mutant survived | Needs a stronger assertion. |
| Probability inversion mutant | OPEN | Mutant survived | Needs a stronger assertion. |
| q50/mean swap mutant | PASS | Mutant killed | Protected by current tests. |
| q025/q975 swap mutant | PASS | Mutant killed | Protected by current tests. |
| Stale-state disable mutant | OPEN | Mutant survived | Needs a stronger state-transition/export assertion. |
| Clamp max removal mutant | OPEN | Mutant survived | Needs a stronger clamp-boundary assertion. |
| Coverage collection | SKIPPED | Coverage tool missing | Install/wire `c8` or `nyc`. |
| Performance profile | PASS | No current error | 5,000 cases completed; performance report generated. |

## O. Previous Model-Validation Audit Findings

These entries come from the earlier calculator-focused `MODEL_VALIDATION_AUDIT.md` run on 2026-06-06. The old root file was replaced by this matrix, but its code-level findings are retained here.

| Finding | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| AUD-HIGH-001 sparse probability display | FIXED | Yes, tiny nonzero sparse probabilities could look like `0.0%` | `fmtExistencePct(pAtLeastOne)` is used for sparse distance/Fermi text and share text. |
| AUD-HIGH-002 external-galaxy SETI console branch | FIXED | Yes, console trace could diverge from runtime external-galaxy range-gate logic | Console SETI trace mirrors `computeDetectionFilter()` for external range-gate cases. |
| AUD-HIGH-003 JSON detection basis export | FIXED | Yes, JSON detection fields could miss the currently displayed Fermi/detection basis | JSON export includes current detection basis fields, detection count, and Fermi mode. |
| AUD-MED-004 2D SETI density wording | FIXED | Yes, area-based SETI density wording could sound like a 3D sphere | UI wording now uses observer-centred detection area/search geometry. |
| AUD-MED-005 duplicate legacy Fermi supplement | FIXED | Yes, legacy duplicate Fermi rendering created repeated/ambiguous context | SETI information is rendered in the SETI signal context and diagnostics path. |
| AUD-MED-006 detection verdict wording | FIXED | Yes, wording risked over-reading model output as observational existence | Detection verdicts refer to active detectable transmitters under assumptions. |
| AUD-MED-007 Fermi/historical JSON context | FIXED | Yes, JSON export lacked full Fermi tension and historical context metadata | JSON includes `results.fermi_context` with basis and omission metadata when needed. |
| AUD-LOW-008 LaTeX export scope note | FIXED | Yes, LaTeX export did not explicitly state compact table scope | LaTeX export documents compact scope and points full SETI/Fermi/historical context to JSON. |

## O.1 Previous Model-Validation Acceptance Tests

| Acceptance test | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Probability factor clamp with `10`, `-1`, `NaN`, and empty inputs | PASS | Earlier invalid-input risk was tested | Deterministic output remains finite and warnings are visible. |
| Disabled optional filters: H2O, CHNOPS, complex life, and `f_x` | PASS | No current mismatch | Disabled optional factors are effective factor `1` in deterministic and MC paths. |
| `customInput` invalid min/max and central-outside-range handling | PASS | Earlier silent-bound risk was tested | Invalid custom bounds block MC and show warnings; clean preset-local sampling is not blocked by unrelated visible bounds. |
| MC current/stale/not-run state | PASS | Earlier stale-export risk was tested | Editing a scientific input after current MC marks MC stale and JSON numeric MC fields become null. |
| Quantile ordering | PASS | No current mismatch | `q025 <= q50 <= q975` for MC runs. |
| Deterministic equals MC when all min/max equal central | PASS | No current mismatch | Degenerate sampling collapses all samples to deterministic output. |
| Sparse Pessimist distance/Fermi display | FIXED | Yes, sparse output could falsely look like `0.0%` | Sparse display uses nonzero odds/percentage form from `fmtExistencePct`. |
| Sparse share text | FIXED | Yes, share summary could inherit false-looking `0.0%` wording | Pessimist sparse share text no longer reports false-looking zero probability. |
| SETI `lambda_det = 0` | PASS | No current mismatch | `N_det = 0`, `P>=1 = 0`, wait time unavailable, and no finite transmitter distance scale. |
| SETI `lambda_det ~= 1` | PASS | No current mismatch | Displayed `P>=1` is approximately `63.2%`. |
| Small SETI lambda | PASS | No current mismatch | For `lambda_det << 1`, displayed `P>=1` is approximately lambda and does not round nonzero values to zero. |
| SETI wait times | PASS | No current mismatch | If `N_det > 0`, `mean_wait = L / N_det`, `median_wait = ln(2) * mean_wait`, and mean exceeds median. |
| Detectable-transmitter distance beyond horizon | PASS | No current mismatch | UI says fewer than one expected on average and does not call the scale reachable. |
| External galaxy console, M31 with `L = 30000` | FIXED | Yes, external-galaxy console/runtime branch mismatch was found | Console and UI show range gate `0` and `N_det = 0`. |
| External galaxy console, M31 with `L > 2537000` | FIXED | Yes, external-galaxy console/runtime branch mismatch was found | Console and UI show range gate `1` and the same `N_det`. |
| JSON detection basis for deterministic vs MC Fermi mode | FIXED | Yes, JSON basis export could diverge from displayed Fermi mode | Deterministic Fermi mode exports deterministic basis; MC Fermi mode exports MC q50 basis. |
| JSON export labels | PASS | No current mismatch | Deterministic, MC median, MC arithmetic mean, q025/q975, active distance model, detection basis, and Fermi/historical context labels match UI labels. |
| LaTeX export labels and stale/not-run MC rows | PASS | No current mismatch | Deterministic and MC rows match UI labels; stale/not-run MC rows use nonnumeric placeholders. |
| Share text overclaim scan | PASS | Earlier wording risk was tested | Share text avoids "nearest planet" for modelled distance scale and avoids proof/confirmed-civilisation/direct-existence wording. |
| Historical lookback context | PASS | Earlier historical-anchor mapping risk was tested | 11.77-year, 26-year, 3000 BCE, zero-year, and older-anchor checks pass. |
| SETI label scan | FIXED | Yes, legacy detectability-section label remained before cleanup | Target wording is "SETI signal context". |
| Geometry wording scan | FIXED | Yes, area-based SETI formula could be described as a sphere | Area-based SETI density wording avoids sphere terminology. |
| Generated HTML synchronization | PASS | No stale inline logic found | `index.html` references modular JS/CSS source files and does not contain copied inline stale calculator logic. |

## P. Previous Calculator-Code Audit Executions Reviewed

| Execution | Status | Error observed | Fixed/current state |
| --- | --- | --- | --- |
| Short deep-random smoke run | PASS | No error in that run | Static and core fuzz profiles passed. |
| Standalone browser DOM check | SKIPPED | Playwright was missing | Later browser profiles ran after browser tooling was available. |
| First 10h setup attempt | PARTIAL | `spawnSync npm.cmd EINVAL` and setup failures | Later launch scripts and full runs succeeded. |
| Older deep 10h audit | PARTIAL | Browser profile failures in JSON export parity and mobile/desktop parity | Latest full 10h run passed those profiles. |
| First full smoke audit | PARTIAL | Wording/security static failures | Later static checks and latest full run passed. |
| Standalone security static check | PASS | No error after fixes | Security/static profile passed. |
| Standalone wording static check | PASS | No error after fixes | Wording profile passed. |
| Second full smoke audit | OPEN | No functional failure; mutation/coverage remained open | Current matrix records mutation/coverage as open items. |
| Partial 10h model-audit attempt on 2026-06-10 | PARTIAL | Oracle mismatches before final report | Latest full 10h run reported 0 oracle mismatches. |
| Latest full 10h model-audit run on 2026-06-10 | OPEN | No timeboxed failures; mutation/coverage remained open | Calculator timeboxed profiles passed; mutation/coverage remain improvement targets. |
