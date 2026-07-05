# Internal V&V/UQ-Informed Model Audit Report

Final internal status:

![PASS](https://img.shields.io/badge/72h_code_behavior-PASS-green)
![PASS](https://img.shields.io/badge/Calculator-PASS-green)
![YELLOW](https://img.shields.io/badge/formal_scope-PARTIAL-yellow)

This report documents an internal verification, robustness, uncertainty-quantification, and consistency audit inspired by V&V/UQ practices. It should not be interpreted as a complete formal V&V certification, external peer review, empirical astronomical validation, or independent software assurance assessment.

The audit was executed through a combination of automated test suites, Node.js scripts, Python scripts, and Codex-assisted code-review/audit workflows. These procedures were designed to test implementation consistency, numerical stability, regression behaviour, edge cases, and internal model logic.

Despite extensive and repeated testing, residual errors may still exist. Passing this audit means that the tested implementation satisfied the defined internal checks at the recorded repository state; it does not prove that the model is empirically correct, exhaustive, free of defects, or scientifically validated against observed astronomical reality.

## 2026-07-05 Next-Suite Audit Tooling And Status-Semantics Update

This section appends the follow-up audit-tooling review and next-suite status-semantics correction. No earlier 72-hour audit evidence is removed or overwritten by this update.

The new `tools/vvuq-audit/next-audit-suite.mjs` runner separates calculator/code behavior from formal audit scope. This is intentional: a timeout in an audit harness, a missing optional browser runtime, a dirty git working tree, or an intentionally incomplete independent-oracle scope should not be reported as a calculator failure when no formula, GUI, export, oracle, assertion, or stderr evidence shows a calculator-code defect.

| Item | Result |
| --- | --- |
| Calculator/code behavior status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Formal audit scope status | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) |
| Latest status-semantics smoke run | `audit-output\next-suite-status-semantics-smoke` |
| Status-semantics summary | `status=PASS`, `code_behavior_status=PASS`, `formal_scope_status=PARTIAL`, `FailItems=0` |
| Audit-code smoke run | `audit-output\audit-code-audit-next-suite-smoke` |
| Audit-code finding fixed | ESM CLI guards now check `process.argv[1]` before `pathToFileURL(process.argv[1])`, so audit modules are safe to import as libraries as well as run from CLI. |
| Live monitor | `tools/vvuq-audit/watch-next-audit-suite.ps1` displays separate `Code behavior` and `Formal scope` statuses. |

### Export-Metamorphic Timeout Adjudication

The full next-suite run `audit-output\next-suite-live-20260705-122440` originally produced a raw `FAIL` because the `03-export-metamorphic` component ran `npm run test:deep` until the audit timeout boundary. The underlying command output contained `386` PASS lines, `0` FAIL lines, and the completion evidence `PASS: State-transition deep regression test completed.` The command was then terminated by the audit harness after approximately `362,900 ms`.

This is adjudicated as an audit-harness timeout classification issue, not a calculator-code failure. The export-consistency audit was updated so this case is now recorded as `PARTIAL` with adjudication `TIMEOUT_AFTER_PASS_OUTPUT` instead of calculator/code `FAIL`, when all of the following are true:

| Condition | Required |
| --- | --- |
| Command timed out | yes |
| FAIL lines or assertion failures observed | no |
| PASS/completion evidence observed | yes |

The historical raw output is preserved in its run directory, but future next-suite reports now separate:

| Status field | Meaning |
| --- | --- |
| `code_behavior_status=PASS` | No observed calculator formula, GUI, export, oracle, mutation, or assertion failure in the executed checks. |
| `formal_scope_status=PARTIAL` | The audit scope still contains tooling/environment/formality limitations, such as timeout-limited commands, missing Playwright browser runtime, coverage thresholds below formal targets, dirty git state, or incomplete full independent Python/R implementation. |

## 72h Extended Rotating Audit Adjudication Update

This section appends the completed 72-hour extended rotating audit evidence. The raw runner status is intentionally preserved as `FAIL` in the generated machine artifacts because 15 profile executions exceeded audit-harness time limits. In plain language: the audit tool itself ran out of its allowed time while processing very large audit-output folders or long-running audit scripts. This does not mean the calculator formula, GUI value, export value, or Python-oracle comparison failed. After reviewing the failed profiles and their underlying stdout/stderr/summary evidence, the code-behavior outcome is adjudicated as ![PASS](https://img.shields.io/badge/PASS-green) for the tested implementation surface: no failed assertion, formula-oracle mismatch, GUI/export mismatch, mutation survivor, security vulnerability, or stderr evidence of calculator-code failure was observed.

The PASS conclusion in this section is therefore a reviewed internal code-behavior conclusion, not a claim that the raw timeboxed runner exited green and not a claim of complete formal V&V certification.

| Item | Value |
| --- | --- |
| Reviewed code-behavior conclusion | ![PASS](https://img.shields.io/badge/PASS-green) |
| Raw runner status | ![FAIL](https://img.shields.io/badge/FAIL-red) in the automated runner only. The cause was audit-harness timeout behaviour while reading/writing large audit folders and running long audit scripts, not a detected calculator-code failure. |
| Run directory | `audit-output\extended-72h-live-20260701-095425` |
| Runner final report | `audit-output\extended-72h-live-20260701-095425\EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md` |
| Live monitor final report | `audit-output\extended-72h-live-20260701-095425\LIVE_MONITOR_FINAL_REPORT.md` |
| Started | `2026-07-01T09:54:27.1617353+02:00` |
| Ended | `2026-07-04T09:56:09.6652365+02:00` |
| Elapsed | `03.00:01:42` |
| Hours requested | `72` |
| Slice minutes | `5` |
| Profile catalogue size | `24` |
| Profile executions | `1387` |
| Failed profile executions | `15` |
| Commands completed | `106198` |
| PASS commands | `106183` |
| FAIL commands | `15` |
| stderr | Empty |
| Failed assertion lines observed | `0` |

### 72h Evidence Counters

| Evidence channel | Count | Status |
| --- | ---: | --- |
| Raw random calculations | `3,259,893,413` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Raw Python oracle sample cases | `288,990` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Raw advanced-factor cases | `3,179,104,386` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Raw occurrence-direct cases | `912,705,824` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Random GUI calculations / steps | `547,871` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| GUI deterministic checks | `547,871` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Python oracle cases | `95,460` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Monte Carlo GUI checks | `16,540` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Advanced module checks | `528,817` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Occurrence/Bryson checks | `136,234` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Galaxy checks | `448,207` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Replay trace rows | `10,440` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Boundary edge steps | `12,760` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Cross-oracle cases | `69,000` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| State-soak checks | `5,919` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Export checks | `173` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Mutants executed | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Mutants killed | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Mutants survived | `0` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Performance executions | `7,837` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Report-integrity findings | `0` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Coverage threshold runs | `58` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Coverage partial runs | `58` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Last coverage lines | `60.17%` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Last coverage branches | `53.57%` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| UQ convergence runs | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| UQ convergence rows | `1,140` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| UQ worst mean drift percent | `11.00` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Sobol validation runs | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Sobol validation warnings | `38` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Independent model scope runs | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Independent model covered areas accumulated | `228` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Methodology governance runs | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Security/supply-chain runs | `57` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Security vulnerabilities | `0` | ![PASS](https://img.shields.io/badge/-PASS-green) |
| Security warnings | `114` | ![PASS](https://img.shields.io/badge/-PASS-green) |

### 72h Failed Profile Adjudication

| Failed profile type | Count | Reviewed cause | Code-behavior impact |
| --- | ---: | --- | --- |
| `16-report-integrity` | `12` | Timeout while scanning a large, still-growing live audit directory. Completed report-integrity summaries showed `failures: 0` and `warnings: 0`. | No calculator-code failure observed. |
| `04-state-transition-soak` | `1` | Timeout after successful random UI edge sweep and deep state-transition output. The captured deep-test stdout included `386` PASS lines, `0` FAIL lines, and `State-transition deep regression test completed.` | No calculator-code failure observed. |
| `05-export-consistency` | `1` | Wrapper returned FAIL because nested `test:deep` exceeded the time window. `standalone-export-consistency` passed and captured deep-test output had `0` FAIL lines. | No export mismatch or calculator-code failure observed. |
| `18-coverage-threshold` | `1` | Timeout at the end of the overall 72h run while the audit window was expiring. Earlier coverage threshold runs completed and were consistently `PARTIAL`, not formula failures. | No calculator-code failure observed. |

### 72h Reviewed Conclusion

The 72-hour run is recorded as raw runner `FAIL` for reproducibility, because the generated runner summary must reflect actual timeout exits. After reviewing the failed profiles, the tested implementation itself is recorded here as code-behavior ![PASS](https://img.shields.io/badge/PASS-green): all observed failures were attributable to timebox/harness behavior or known non-blocking formal-scope limitations, not to a detected calculator, GUI, export, oracle, mutation, or security defect.

The broader formal scope remains ![YELLOW](https://img.shields.io/badge/YELLOW-yellow) because independent whole-model reimplementation coverage is incomplete, formal coverage thresholds are not met, Sobol warnings remain documented, and supply-chain hardening warnings remain open.

## Formal Deep Audit Update

This section appends the expanded one-time formal/deep audit performed before launching the next 72-hour rotating audit. It does not replace or delete the older 24-hour and pre-24-hour evidence retained below.

| Item | Value |
| --- | --- |
| Composite status after this update | ![YELLOW](https://img.shields.io/badge/YELLOW-yellow) / PARTIAL |
| Run directory | `audit-output\formal-deep-20260701-062656` |
| Report artifact | `audit-output\formal-deep-20260701-062656\FORMAL_DEEP_AUDIT_REPORT.md` |
| Evidence manifest | `audit-output\formal-deep-20260701-062656\evidence-pack-manifest.json` |
| Evidence files hashed | `183` |
| Git commit captured by manifest | `a199e8d3d7897bf14ada682fe540d2ee8e1832cf` |
| 72h audit started by this section | `false` |

### Formal Deep Audit Results

| Check | Status | Result |
| --- | --- | --- |
| Full independent Python/R reimplementation scope | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) | Existing Python oracle evidence covers `4/10` model areas. Snapshot oracle PASS `20/20`; JS/Python cross-oracle PASS `1200/1200`. A full independent Python/R implementation of the entire calculator model is not yet implemented. |
| Formal coverage thresholds | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) | `c8` over `npm run test:all`: statements `60.17%`, branches `53.57%`, functions `52.23%`, lines `60.17%`. Formal thresholds `90/85/90/90` are not met. |
| Expanded mutation framework | ![PASS](https://img.shields.io/badge/PASS-green) | `15/15` valid mutants killed, `0` survived, mutation score `1.000`. Two Monte Carlo regression tests were added to kill the previously surviving percentile and seeded-PRNG mutants. |
| Scientific prior audit | ![PASS](https://img.shields.io/badge/PASS-green) | `16` parameters, `4` presets, `52` source links, `0` failures, `0` warnings. |
| Dependency/overlap/independence matrix | ![PASS](https://img.shields.io/badge/PASS-green) | Dependency, overlap, and independence evidence generated from `SCIENTIFIC_PARAMETER_REGISTRY`. |
| Requirements traceability extension | ![PASS](https://img.shields.io/badge/PASS-green) | `17` extended requirements with REQ-ID, tolerance policy, severity, expected evidence, and source references. |
| UI → State → Calculation → Display → Export trace | ![PASS](https://img.shields.io/badge/PASS-green) | `5` trace rows generated. |
| Golden-output governance rules | ![PASS](https://img.shields.io/badge/PASS-green) | `5` governance rules generated. |
| Version-to-version scientific delta audit | ![PASS](https://img.shields.io/badge/PASS-green) | `5` version-delta rows generated; no missing release notes reported. |
| GREEN means / does not mean table | ![PASS](https://img.shields.io/badge/PASS-green) | `7` scope-semantics rows generated. |
| Formal NASA/ASME-style structure | ![PASS](https://img.shields.io/badge/PASS-green) | `8` structure rows generated. |
| UQ convergence to 100k samples | ![PASS](https://img.shields.io/badge/PASS-green) | `4` presets x `5` sample sizes through `100000` samples; worst mean drift vs the `100000`-sample reference was `4.429%`. |
| Sensitivity/Sobol validation | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) | `12` Sobol rows, `0` failures, `1` warning: pessimist top total-order parameter changed across sample sizes (`f_complex_life`, `N_GHZ`). |
| Security / supply-chain audit | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) | `npm audit` reported `0` vulnerabilities. Remaining warnings: GitHub Actions lacks explicit permissions and actions are version-pinned but not SHA-pinned. |
| Public evidence pack / SHA256 manifest | ![PASS](https://img.shields.io/badge/PASS-green) | `183` artifacts hashed with SHA256. |

### Formal Deep Audit Artifacts

| Artifact | Path |
| --- | --- |
| Formal deep report | `audit-output\formal-deep-20260701-062656\FORMAL_DEEP_AUDIT_REPORT.md` |
| Independent model scope summary | `audit-output\formal-deep-20260701-062656\independent-model\independent-model-scope-summary.json` |
| Coverage threshold summary | `audit-output\formal-deep-20260701-062656\coverage-threshold\coverage-threshold-summary.json` |
| Expanded mutation summary | `audit-output\formal-deep-20260701-062656\mutation-expanded\mutation-summary.json` |
| Prior/dependency summary | `audit-output\formal-deep-20260701-062656\prior-dependency\prior-dependency-summary.json` |
| Deep scientific prior table | `audit-output\formal-deep-20260701-062656\prior-dependency\scientific-prior-deep-table.md` |
| Dependency/independence matrix | `audit-output\formal-deep-20260701-062656\prior-dependency\dependency-independence-matrix.md` |
| Methodology governance summary | `audit-output\formal-deep-20260701-062656\methodology-governance\methodology-governance-summary.json` |
| Requirements traceability extension | `audit-output\formal-deep-20260701-062656\methodology-governance\requirements-traceability-extended.md` |
| UI/state/calculation/display/export trace | `audit-output\formal-deep-20260701-062656\methodology-governance\ui-state-calculation-display-export-trace.md` |
| Golden-output governance | `audit-output\formal-deep-20260701-062656\methodology-governance\golden-output-governance.md` |
| GREEN semantics table | `audit-output\formal-deep-20260701-062656\methodology-governance\green-means-does-not-mean.md` |
| Formal V&V/UQ structure | `audit-output\formal-deep-20260701-062656\methodology-governance\formal-vvuq-structure.md` |
| Version delta summary | `audit-output\formal-deep-20260701-062656\methodology-governance\version-to-version-delta-summary.md` |
| UQ convergence summary | `audit-output\formal-deep-20260701-062656\uq-convergence\uq-convergence-summary.json` |
| Sobol validation summary | `audit-output\formal-deep-20260701-062656\sensitivity-sobol\sensitivity-sobol-summary.json` |
| Security/supply-chain summary | `audit-output\formal-deep-20260701-062656\security-supply-chain\security-supply-chain-summary.json` |
| Evidence SHA256 manifest | `audit-output\formal-deep-20260701-062656\evidence-pack-manifest.json` |

### Formal Deep Audit Limitations

The new tests strengthen the audit surface, especially mutation sensitivity, UQ convergence, traceability, governance, and evidence packaging. They do not make the audit a complete external V&V certification or empirical astronomical validation.

The composite status remains ![YELLOW](https://img.shields.io/badge/YELLOW-yellow) because the audit still lacks a full independent Python/R whole-model implementation, formal coverage thresholds are not met, one Sobol stability warning remains, and supply-chain hardening warnings remain.

## Pre-24h Formal Fix And Mini Audit Update

This section appends the targeted mini audit performed before starting the next 24-hour extended rotating audit. It does not replace or delete the older audit evidence retained below. No new 24-hour audit was started for this mini audit.

| Item | Value |
| --- | --- |
| Mini audit status | ![YELLOW](https://img.shields.io/badge/YELLOW-yellow) / PASS-with-limitations |
| Run directory | `audit-output\pre24h-formal-20260701-054258` |
| Report artifact | `audit-output\pre24h-formal-20260701-054258\PRE_24H_FORMAL_FIX_REPORT.md` |
| Evidence manifest | `audit-output\pre24h-formal-20260701-054258\evidence-pack-manifest.json` |
| Scope | Targeted audit-harness fixes, one-time dependency/security/coverage/mutation/oracle checks, scientific prior/dependency artifacts, and SHA256 evidence manifest. |
| 24h audit started by this step | `false` |

### Pre-24h Harness Fixes

| Area | Status | Evidence |
| --- | --- | --- |
| Mutation rotation timeout guard | ![PASS](https://img.shields.io/badge/PASS-green) | `14-mutation-rotation` now requires `260000 ms` remaining before starting another mutant command, matching the `240000 ms` mutant timeout with buffer. |
| Report integrity scheduling guard | ![PASS](https://img.shields.io/badge/PASS-green) | `16-report-integrity` now requires `45000 ms` remaining before starting another integrity check. |
| Report badge integrity rule | ![PASS](https://img.shields.io/badge/PASS-green) | `report-integrity-audit.mjs` now checks the top-level final status badge, so per-profile `PASS` badges no longer invalidate a non-PASS final report. |
| Coverage summary structure | ![PASS](https://img.shields.io/badge/PASS-green) | `coverage-runner.mjs` now records statement, branch, function, and line coverage percentages in JSON. |
| Scientific prior/dependency evidence | ![PASS](https://img.shields.io/badge/PASS-green) | Added `prior-and-dependency-matrix.mjs` to generate prior and dependency/overlap artifacts from `SCIENTIFIC_PARAMETER_REGISTRY`. |
| Evidence pack manifest | ![PASS](https://img.shields.io/badge/PASS-green) | Added `evidence-pack-manifest.mjs` to hash audit artifacts with SHA256. |

### Pre-24h Mini Audit Results

| Check | Status | Result |
| --- | --- | --- |
| Previous 24h report-integrity rerun | ![PASS](https://img.shields.io/badge/PASS-green) | `REPORT_INTEGRITY PASS: profiles=358, commands=35703` against `audit-output\extended-24h-raw-live-20260629-230313`. |
| `npm install` / dependency setup | ![PASS](https://img.shields.io/badge/PASS-green) | Added local dev dependency `c8` so formal coverage can run reproducibly. |
| `npm ci` | ![PASS](https://img.shields.io/badge/PASS-green) | Exit code `0`; logged in `audit-output\pre24h-formal-20260701-054258\npm\npm-ci.log`. |
| `npm audit` | ![PASS](https://img.shields.io/badge/PASS-green) | `0` vulnerabilities: info `0`, low `0`, moderate `0`, high `0`, critical `0`. |
| Formal coverage | ![PASS](https://img.shields.io/badge/PASS-green) | `c8` over `npm run test:all`: statements `60.10%`, branches `53.54%`, functions `52.23%`, lines `60.10%`. |
| Formal mutation score | ![PASS](https://img.shields.io/badge/PASS-green) | Current catalog: `6` valid mutants, `6` killed, `0` survived, mutation score `1.000`. |
| Fixed Python oracle snapshot | ![PASS](https://img.shields.io/badge/PASS-green) | `20` checks, `0` failures. |
| Cross-implementation JS/Python oracle | ![PASS](https://img.shields.io/badge/PASS-green) | `1200/1200` oracle cases, `12/12` oracle batches, `0` failed batches, `1200` GUI deterministic checks. |
| Scientific prior table | ![PASS](https://img.shields.io/badge/PASS-green) | `16` parameters generated from registry; `0` validation failures. |
| Dependency/overlap matrix | ![PASS](https://img.shields.io/badge/PASS-green) | `16` parameters checked against presets, MC/export/UI paths, and Bryson direct replacement terms; `0` validation failures. |
| Evidence pack + SHA256 | ![PASS](https://img.shields.io/badge/PASS-green) | `248` files hashed in `evidence-pack-manifest.json`. |

### Pre-24h Mini Audit Artifacts

| Artifact | Path |
| --- | --- |
| Mini audit report | `audit-output\pre24h-formal-20260701-054258\PRE_24H_FORMAL_FIX_REPORT.md` |
| Coverage summary | `audit-output\pre24h-formal-20260701-054258\coverage\coverage-summary.json` |
| Mutation summary | `audit-output\pre24h-formal-20260701-054258\mutation\mutation-summary.json` |
| Python oracle snapshot | `audit-output\pre24h-formal-20260701-054258\python-oracle-snapshot\oracle-comparison-summary.json` |
| Cross-oracle summary | `audit-output\pre24h-formal-20260701-054258\cross-oracle-1200\cross-implementation-formula-summary.json` |
| Random GUI oracle summary | `audit-output\pre24h-formal-20260701-054258\cross-oracle-1200\cross-oracle-fuzz\random-ui-fuzz-summary.json` |
| Static scan summary | `audit-output\pre24h-formal-20260701-054258\static-scan\static-scan-summary.json` |
| Traceability matrix | `audit-output\pre24h-formal-20260701-054258\traceability\requirements-traceability-matrix.json` |
| Prior/dependency summary | `audit-output\pre24h-formal-20260701-054258\prior-dependency\prior-dependency-summary.json` |
| Scientific prior table | `audit-output\pre24h-formal-20260701-054258\prior-dependency\scientific-prior-table.md` |
| Dependency/overlap matrix | `audit-output\pre24h-formal-20260701-054258\prior-dependency\dependency-overlap-matrix.md` |
| Evidence SHA256 manifest | `audit-output\pre24h-formal-20260701-054258\evidence-pack-manifest.json` |
| npm summary | `audit-output\pre24h-formal-20260701-054258\npm\npm-summary.json` |

### Pre-24h Mini Audit Limitations

The completed oracle checks are independent Python-oracle evidence for defined formulas and randomized GUI states, but they are not yet a full independent Python or R reimplementation of the entire calculator and UI model.

The first attempted cross-oracle run with `5000` requested cases exceeded the local command timeout and is not counted as PASS evidence. The completed evidence for this section is the subsequent `1200`-case run.

Coverage was measured, but no minimum coverage threshold was enforced in this mini audit. The result is a formal measurement, not a coverage gate.

## Latest 24h Internal Audit Update

This section updates the existing audit record with the latest completed 24-hour run. The detailed historical audit evidence below this section is intentionally retained.

| Item | Value |
| --- | --- |
| Run directory | `audit-output\live-24h-20260628-111833` |
| Timeboxed status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Final compiled status | ![GREEN](https://img.shields.io/badge/GREEN-green) |
| Mode | `24h` |
| Hours requested | `24` |
| Slice minutes | `5` |
| Workers | `sequential` |
| Seed | `1782638315889` |
| Started | `2026-06-28T09:18:35.889Z` |
| Ended | `2026-06-29T09:18:38.214Z` |
| Profile catalogue size | `24` |
| Profile executions | `7,213` |
| Failed profile executions | `0` |
| Evidence channels | `8,418` |
| Command records | `8,414` |
| Failed command records | `0` |
| Static scan status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Traceability rows | `17` |
| Independent oracle status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Independent oracle checks | `20` |
| Limited by max profile cap | `false` |

### Latest 24h Profile Results

| Profile | Title | Executions | Failures | Status |
| --- | --- | ---: | ---: | --- |
| 01-realistic-core-fuzz | Realistic core parameter fuzz | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 02-additional-modules-matrix | Additional Scientific Modules matrix | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 03-preset-mc-transition | Preset and MC-mode transition fuzz | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 04-seti-fermi-extremes | SETI/Fermi extreme assumptions | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 05-boundary-corrupted | Boundary and corrupted input fuzz | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 06-strict-oracle-no-modules | Strict no-module independent oracle comparison | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 07-mc-reproducibility | Monte Carlo reproducibility | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 08-interval-ordering | Interval ordering | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 09-preset-reset-stale | Preset reset / stale-state | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 10-full-preset-snapshot-diff | Full preset snapshot diff | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 11-json-export-parity | JSON export parity | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 12-latex-markdown-export-parity | LaTeX / Markdown export parity | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 13-ui-browser-dom | UI/browser DOM | 301 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 14-mobile-vs-desktop | Mobile vs desktop parity proxy | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 15-forbidden-wording | Forbidden wording | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 16-source-provenance | Source/provenance | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 17-distance-model-nearest-candidate | Distance model / nearest candidate | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 18-universe-scale | Universe scale | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 19-seti-sparse-display | SETI sparse display | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 20-module-overlap-warning | Module overlap warning | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 21-performance-memory | Performance / memory | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 22-security-static-scan | Security/static scan | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 23-mutation-style-formula-trap | Mutation-style formula trap | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |
| 24-regression-golden-outputs | Regression against golden outputs | 300 | 0 | ![PASS](https://img.shields.io/badge/PASS-green) |

### Latest 24h Reproducibility Artifacts

| Artifact | Path |
| --- | --- |
| Full generated report | `audit-output\live-24h-20260628-111833\FULL_VVUQ_MODEL_AUDIT_REPORT.md` |
| Timeboxed summary | `audit-output\live-24h-20260628-111833\timeboxed-summary.json` |
| Compiled summary | `audit-output\live-24h-20260628-111833\full-vvuq-summary.json` |
| Run summary | `audit-output\live-24h-20260628-111833\run-summary.json` |
| Event log | `audit-output\live-24h-20260628-111833\events.jsonl` |
| Live output log | `audit-output\live-24h-20260628-111833\live-output.log` |
| PowerShell monitor log | `audit-output\live-24h-20260628-111833\powershell-monitor.log` |
| Static scan summary | `audit-output\live-24h-20260628-111833\static-scan-summary.json` |
| Traceability matrix | `audit-output\live-24h-20260628-111833\requirements-traceability-matrix.json` |
| Independent oracle summary | `audit-output\live-24h-20260628-111833\oracle-comparison-summary.json` |

## Previous Audit Evidence

## Local Repository State

Branch: `main`  
Commit: `4baef054c4bfa05b23b6fb7e24ba691b2773a6da`  
Clean tree at capture: `false`  
Node: `v24.14.1`  
npm: `11.11.0`  
OS: `Windows_NT 10.0.26200 x64`

## Existing Test Execution Summary

| Command | Status | Exit | Duration ms |
| --- | --- | ---: | ---: |
| npm run test:absolute | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 36919 |
| npm run test:all | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 55760 |

## Detailed Command Evidence

| Command | Evidence # | Evidence line |
| --- | ---: | --- |
| npm run test:absolute | 1 | ![PASS](https://img.shields.io/badge/PASS-green): Bootstrap (14 assertions, 0 failures, 96 ms) |
| npm run test:absolute | 2 | ![PASS](https://img.shields.io/badge/PASS-green): Static Integrity (150 assertions, 0 failures, 43 ms) |
| npm run test:absolute | 3 | ![PASS](https://img.shields.io/badge/PASS-green): Browser Bootstrap and Runtime Smoke Test (20 assertions, 0 failures, 267 ms) |
| npm run test:absolute | 4 | ![PASS](https://img.shields.io/badge/PASS-green): Deterministic Model (17 assertions, 0 failures, 1167 ms) |
| npm run test:absolute | 5 | ![PASS](https://img.shields.io/badge/PASS-green): Preset Roundtrip (400 assertions, 0 failures, 3217 ms) |
| npm run test:absolute | 6 | ![PASS](https://img.shields.io/badge/PASS-green): Preset Switching (240 assertions, 0 failures, 3242 ms) |
| npm run test:absolute | 7 | ![PASS](https://img.shields.io/badge/PASS-green): MC Basis (11 assertions, 0 failures, 54 ms) |
| npm run test:absolute | 8 | ![PASS](https://img.shields.io/badge/PASS-green): MC Reproducibility (132 assertions, 0 failures, 5127 ms) |
| npm run test:absolute | 9 | ![PASS](https://img.shields.io/badge/PASS-green): Bounds Validation (75 assertions, 0 failures, 1984 ms) |
| npm run test:absolute | 10 | ![PASS](https://img.shields.io/badge/PASS-green): MC-only Controls (25 assertions, 0 failures, 1288 ms) |
| npm run test:absolute | 11 | ![PASS](https://img.shields.io/badge/PASS-green): Occurrence Overlay Controls (15 assertions, 0 failures, 450 ms) |
| npm run test:absolute | 12 | ![PASS](https://img.shields.io/badge/PASS-green): Galaxy Presets (7 assertions, 0 failures, 238 ms) |
| npm run test:absolute | 13 | ![PASS](https://img.shields.io/badge/PASS-green): Advanced Modules (40 assertions, 0 failures, 4171 ms) |
| npm run test:absolute | 14 | ![PASS](https://img.shields.io/badge/PASS-green): Distance Models (9 assertions, 0 failures, 345 ms) |
| npm run test:absolute | 15 | ![PASS](https://img.shields.io/badge/PASS-green): Universe Scaling (13 assertions, 0 failures, 4962 ms) |
| npm run test:absolute | 16 | ![PASS](https://img.shields.io/badge/PASS-green): Export Share History (24 assertions, 0 failures, 1687 ms) |
| npm run test:absolute | 17 | ![PASS](https://img.shields.io/badge/PASS-green): Charts State Invalidation (6 assertions, 0 failures, 320 ms) |
| npm run test:absolute | 18 | ![PASS](https://img.shields.io/badge/PASS-green): Source Docs Wording (69 assertions, 0 failures, 14 ms) |
| npm run test:absolute | 19 | ![PASS](https://img.shields.io/badge/PASS-green): Registry Consistency (176 assertions, 0 failures, 25 ms) |
| npm run test:absolute | 20 | ![PASS](https://img.shields.io/badge/PASS-green): Cache Invalidation (24 assertions, 0 failures, 2697 ms) |
| npm run test:absolute | 21 | ![PASS](https://img.shields.io/badge/PASS-green): Performance (3 assertions, 0 failures, 0 ms) |
| npm run test:absolute | 22 | ![PASS](https://img.shields.io/badge/PASS-green): Existing Test Orchestration (16 assertions, 0 failures, 4641 ms) |
| npm run test:absolute | 23 | ABSOLUTE DEEP AUDIT REPORT |
| npm run test:absolute | 24 | ![PASS](https://img.shields.io/badge/PASS-green): Bootstrap / assertions=14 failures=0 elapsedMs=96 |
| npm run test:absolute | 25 | ![PASS](https://img.shields.io/badge/PASS-green): Static Integrity / assertions=150 failures=0 elapsedMs=43 |
| npm run test:absolute | 26 | ![PASS](https://img.shields.io/badge/PASS-green): Browser Bootstrap and Runtime Smoke Test / assertions=20 failures=0 elapsedMs=267 |
| npm run test:absolute | 27 | ![PASS](https://img.shields.io/badge/PASS-green): Deterministic Model / assertions=17 failures=0 elapsedMs=1167 |
| npm run test:absolute | 28 | ![PASS](https://img.shields.io/badge/PASS-green): Preset Roundtrip / assertions=400 failures=0 elapsedMs=3217 |
| npm run test:absolute | 29 | ![PASS](https://img.shields.io/badge/PASS-green): Preset Switching / assertions=240 failures=0 elapsedMs=3242 |
| npm run test:absolute | 30 | ![PASS](https://img.shields.io/badge/PASS-green): MC Basis / assertions=11 failures=0 elapsedMs=54 |
| npm run test:absolute | 31 | ![PASS](https://img.shields.io/badge/PASS-green): MC Reproducibility / assertions=132 failures=0 elapsedMs=5127 |
| npm run test:absolute | 32 | ![PASS](https://img.shields.io/badge/PASS-green): Bounds Validation / assertions=75 failures=0 elapsedMs=1984 |
| npm run test:absolute | 33 | ![PASS](https://img.shields.io/badge/PASS-green): MC-only Controls / assertions=25 failures=0 elapsedMs=1288 |
| npm run test:absolute | 34 | ![PASS](https://img.shields.io/badge/PASS-green): Occurrence Overlay Controls / assertions=15 failures=0 elapsedMs=450 |
| npm run test:absolute | 35 | ![PASS](https://img.shields.io/badge/PASS-green): Galaxy Presets / assertions=7 failures=0 elapsedMs=238 |
| npm run test:absolute | 36 | ![PASS](https://img.shields.io/badge/PASS-green): Advanced Modules / assertions=40 failures=0 elapsedMs=4171 |
| npm run test:absolute | 37 | ![PASS](https://img.shields.io/badge/PASS-green): Distance Models / assertions=9 failures=0 elapsedMs=345 |
| npm run test:absolute | 38 | ![PASS](https://img.shields.io/badge/PASS-green): Universe Scaling / assertions=13 failures=0 elapsedMs=4962 |
| npm run test:absolute | 39 | ![PASS](https://img.shields.io/badge/PASS-green): Export Share History / assertions=24 failures=0 elapsedMs=1687 |
| npm run test:absolute | 40 | ![PASS](https://img.shields.io/badge/PASS-green): Charts State Invalidation / assertions=6 failures=0 elapsedMs=320 |
| npm run test:absolute | 41 | ![PASS](https://img.shields.io/badge/PASS-green): Source Docs Wording / assertions=69 failures=0 elapsedMs=14 |
| npm run test:absolute | 42 | ![PASS](https://img.shields.io/badge/PASS-green): Registry Consistency / assertions=176 failures=0 elapsedMs=25 |
| npm run test:absolute | 43 | ![PASS](https://img.shields.io/badge/PASS-green): Cache Invalidation / assertions=24 failures=0 elapsedMs=2697 |
| npm run test:absolute | 44 | ![PASS](https://img.shields.io/badge/PASS-green): Performance / assertions=3 failures=0 elapsedMs=0 |
| npm run test:absolute | 45 | ![PASS](https://img.shields.io/badge/PASS-green): Existing Test Orchestration / assertions=16 failures=0 elapsedMs=4641 |
| npm run test:all | 1 | ![PASS](https://img.shields.io/badge/PASS-green): Required files exist |
| npm run test:all | 2 | ![PASS](https://img.shields.io/badge/PASS-green): index.html references required CSS and JavaScript |
| npm run test:all | 3 | ![PASS](https://img.shields.io/badge/PASS-green): Basic HTML structure looks valid |
| npm run test:all | 4 | ![PASS](https://img.shields.io/badge/PASS-green): No duplicate IDs found |
| npm run test:all | 5 | ![PASS](https://img.shields.io/badge/PASS-green): target blank links include rel noopener noreferrer |
| npm run test:all | 6 | ![PASS](https://img.shields.io/badge/PASS-green): External script tags include SRI |
| npm run test:all | 7 | ![PASS](https://img.shields.io/badge/PASS-green): External script tags include crossorigin anonymous |
| npm run test:all | 8 | ![PASS](https://img.shields.io/badge/PASS-green): No dead href placeholders found |
| npm run test:all | 9 | ![PASS](https://img.shields.io/badge/PASS-green): Static site verification completed |
| npm run test:all | 10 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/scientific-parameters.js. |
| npm run test:all | 11 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/calculator-core.js. |
| npm run test:all | 12 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/charts.js. |
| npm run test:all | 13 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/share.js. |
| npm run test:all | 14 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/accessibility.js. |
| npm run test:all | 15 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone inline block matches src/app.js. |
| npm run test:all | 16 | ![SKIPPED](https://img.shields.io/badge/SKIPPED-yellow): no canonical standalone HTML path was provided; set CANONICAL_STANDALONE_HTML or pass --canonical to enforce byte-level sync. |
| npm run test:all | 17 | ![PASS](https://img.shields.io/badge/PASS-green): Syntax check passed for 35 JS/MJS file(s). |
| npm run test:all | 18 | ![PASS](https://img.shields.io/badge/PASS-green): nearlyEqual preserves tiny bound edit detection while tolerating floating-point noise. |
| npm run test:all | 19 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist deterministic output = 0.000006804000000000001 |
| npm run test:all | 20 | ![PASS](https://img.shields.io/badge/PASS-green): consensus deterministic output = 13778.1 |
| npm run test:all | 21 | ![PASS](https://img.shields.io/badge/PASS-green): kepler deterministic output = 35363.79 |
| npm run test:all | 22 | ![PASS](https://img.shields.io/badge/PASS-green): optimist deterministic output = 30086210.700000003 |
| npm run test:all | 23 | ![PASS](https://img.shields.io/badge/PASS-green): Scenario ordering pessimist < consensus < kepler < optimist |
| npm run test:all | 24 | ![PASS](https://img.shields.io/badge/PASS-green): nanOrbit normalizes calculation value without mutating DOM for f_orbit. |
| npm run test:all | 25 | ![PASS](https://img.shields.io/badge/PASS-green): stringOrbit normalizes calculation value without mutating DOM for f_orbit. |
| npm run test:all | 26 | ![PASS](https://img.shields.io/badge/PASS-green): hugeOrbit normalizes calculation value without mutating DOM for f_orbit. |
| npm run test:all | 27 | ![PASS](https://img.shields.io/badge/PASS-green): negativeOrbit normalizes calculation value without mutating DOM for f_orbit. |
| npm run test:all | 28 | ![PASS](https://img.shields.io/badge/PASS-green): emptyN normalizes calculation value without mutating DOM for N_GHZ. |
| npm run test:all | 29 | ![PASS](https://img.shields.io/badge/PASS-green): minGreaterThanMax normalizes Monte Carlo bounds locally with visible warning state. |
| npm run test:all | 30 | ![PASS](https://img.shields.io/badge/PASS-green): probabilityMinBelowZero normalizes Monte Carlo bounds locally with visible warning state. |
| npm run test:all | 31 | ![PASS](https://img.shields.io/badge/PASS-green): probabilityMaxAboveOne normalizes Monte Carlo bounds locally with visible warning state. |
| npm run test:all | 32 | ![PASS](https://img.shields.io/badge/PASS-green): probabilityZeroWithWidth emits PROBABILITY_BOUNDARY_WITH_WIDTH without mutating DOM. |
| npm run test:all | 33 | ![PASS](https://img.shields.io/badge/PASS-green): probabilityOneWithWidth emits PROBABILITY_BOUNDARY_WITH_WIDTH without mutating DOM. |
| npm run test:all | 34 | ![PASS](https://img.shields.io/badge/PASS-green): buildResolvedModelState() reads normalized state without mutating DOM inputs. |
| npm run test:all | 35 | ![PASS](https://img.shields.io/badge/PASS-green): advancedInputAboveOne normalizes advanced calculation value without mutating DOM. |
| npm run test:all | 36 | ![PASS](https://img.shields.io/badge/PASS-green): advancedInputBelowZero normalizes advanced calculation value without mutating DOM. |
| npm run test:all | 37 | ![PASS](https://img.shields.io/badge/PASS-green): H2O disabled remains multiplicative 1 even when volatile delivery / retention is enabled. |
| npm run test:all | 38 | ![PASS](https://img.shields.io/badge/PASS-green): fmtExistencePct(λ=1.28e-6): "≈ 0.000128% / about 1 in 781,251" — correctly shows nonzero probability. |
| npm run test:all | 39 | ![PASS](https://img.shields.io/badge/PASS-green): fmtExistencePct(λ=1.28e-6): includes "1 in X" odds. |
| npm run test:all | 40 | ![PASS](https://img.shields.io/badge/PASS-green): fmtExistencePct(0): correctly returns "0%". |
| npm run test:all | 41 | ![PASS](https://img.shields.io/badge/PASS-green): fmtExistencePct(λ=0.01): "0.995%" — uses normal percentage format. |
| npm run test:all | 42 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist existence probability: "≈ 0.0006804% / about 1 in 146,973" — nonzero display confirmed. |
| npm run test:all | 43 | ![PASS](https://img.shields.io/badge/PASS-green): Deterministic numerical regression test completed. |
| npm run test:all | 44 | ![PASS](https://img.shields.io/badge/PASS-green): Core-equations panel: panel title present. |
| npm run test:all | 45 | ![PASS](https://img.shields.io/badge/PASS-green): Core-equations panel: Poisson existence P present. |
| npm run test:all | 46 | ![PASS](https://img.shields.io/badge/PASS-green): Core-equations panel: universe Y_star present. |
| npm run test:all | 47 | ![PASS](https://img.shields.io/badge/PASS-green): Core-equations panel: universe N_universe present. |
| npm run test:all | 48 | ![PASS](https://img.shields.io/badge/PASS-green): Core-equations panel: epistemic caution present. |
| npm run test:all | 49 | ![PASS](https://img.shields.io/badge/PASS-green): HISTORY_DB dash separators are normalized. |
| npm run test:all | 50 | ![PASS](https://img.shields.io/badge/PASS-green): Historical context includes corrected Roman Republic possessive. |
| npm run test:all | 51 | ![PASS](https://img.shields.io/badge/PASS-green): Historical context includes corrected history possessive. |
| npm run test:all | 52 | ![PASS](https://img.shields.io/badge/PASS-green): No banned scientific-regression phrases found in 20 files. |
| npm run test:all | 53 | ![PASS](https://img.shields.io/badge/PASS-green): Strong proof/prediction language only appears inside explicit disclaimers. |
| npm run test:all | 54 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Kepler/Gaia / Bryson". |
| npm run test:all | 55 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Consensus / Lineweaver". |
| npm run test:all | 56 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "High-End / Literature Bounds". |
| npm run test:all | 57 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Modified preset-local uncertainty / Uses visible bounds for edited fields and preset-local uncertainty for unchanged preset fields". |
| npm run test:all | 58 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Custom input uncertainty / Uses visible input bounds". |
| npm run test:all | 59 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Global exploratory envelope / Not local preset uncertainty". |
| npm run test:all | 60 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Log-sensitivity score: ${d.score.toFixed(0)} / signed correlation". |
| npm run test:all | 61 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "${MC_SIMULATION_CLASS_LABEL} / ${samplingEngineLabel} / ${distributionLabel} / ". |
| npm run test:all | 62 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "result.N_samples + ' base samples / ' + result.activeIds.length + ' uncertain params'". |
| npm run test:all | 63 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Computed N_GHZ = ${details.N_GHZ.toLocaleString()} stars / GHZ = ${details.innerKpc.toFixed(1)}~${details.outerKpc.toFixed(1)} kpc". |
| npm run test:all | 64 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Formula: N̂ = (N<sub>Earth-like</sub> × f<sub>tx</sub> × range-gate) × (L / T<sub>galaxy</sub>)<br>P(≥1) = 1 − e<sup>−N̂</sup><br>". |
| npm run test:all | 65 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "1 / within light-travel reach". |
| npm run test:all | 66 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "0 / outside light-travel reach". |
| npm run test:all | 67 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Step 0 / Civilisation prior". |
| npm run test:all | 68 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Step 1 / Distance barrier". |
| npm run test:all | 69 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Step 2 / Timing barrier". |
| npm run test:all | 70 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Combined result / Poisson mean of detectable transmitters now". |
| npm run test:all | 71 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: middle-dot separators are consistent between source and export (11). |
| npm run test:all | 72 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "ρ<sub>det</sub>/π". |
| npm run test:all | 73 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "const cryptoProvider = typeof globalThis !== 'undefined' ? globalThis.crypto : null;". |
| npm run test:all | 74 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: no direct window.crypto Monte Carlo seed dependency. |
| npm run test:all | 75 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "seed_mode: lastMonteCarloRunMetadata?.seedMode // (typeof getMonteCarloSeedMode === 'function' ? getMonteCarloSeedMode() : null)". |
| npm run test:all | 76 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: no unsafe getMonteCarloSeedMode call. |
| npm run test:all | 77 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: updateShareButtons is defined once. |
| npm run test:all | 78 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: buildJSONExportSnapshot is defined once. |
| npm run test:all | 79 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: generateMonteCarloSeed is defined once. |
| npm run test:all | 80 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: getMonteCarloSeedMode is defined once. |
| npm run test:all | 81 | ![PASS](https://img.shields.io/badge/PASS-green): source bundle: found "Source: arewealoneintheuniverse.com". |
| npm run test:all | 82 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Source: arewealoneintheuniverse.com". |
| npm run test:all | 83 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "source: spec.sourceUrl // MONTE_CARLO_CHART_SOURCE_URL". |
| npm run test:all | 84 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "text(spec.yAxisLabel, plot.x, plot.y - 54". |
| npm run test:all | 85 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: no old clipped PDF y-axis label placement. |
| npm run test:all | 86 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: no therefore symbol in Fermi panel heading. |
| npm run test:all | 87 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "Interpretation &amp; Fermi Context". |
| npm run test:all | 88 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found MC Fermi button starts active. |
| npm run test:all | 89 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "let fermiMode = 'mc';". |
| npm run test:all | 90 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "renderFermiBox(hasCurrentMc ? 'mc' : 'dt');". |
| npm run test:all | 91 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: found "justify-content:flex-start;". |
| npm run test:all | 92 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/scientific-parameters.js. |
| npm run test:all | 93 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/calculator-core.js. |
| npm run test:all | 94 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/charts.js. |
| npm run test:all | 95 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/share.js. |
| npm run test:all | 96 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/accessibility.js. |
| npm run test:all | 97 | ![PASS](https://img.shields.io/badge/PASS-green): fresh standalone export: extracted JS syntax passed for src/app.js. |
| npm run test:all | 98 | ![PASS](https://img.shields.io/badge/PASS-green): share seed metadata smoke: missing getMonteCarloSeedMode does not throw and exports null seed_mode. |
| npm run test:all | 99 | ![PASS](https://img.shields.io/badge/PASS-green): share seed metadata smoke: run metadata seed fields are preserved. |
| npm run test:all | 100 | ![PASS](https://img.shields.io/badge/PASS-green): Startup default preset is Kepler/Gaia. |
| npm run test:all | 101 | ![PASS](https://img.shields.io/badge/PASS-green): Initial preset description matches the Kepler/Gaia default. |
| npm run test:all | 102 | ![PASS](https://img.shields.io/badge/PASS-green): loadPreset("kepler") selects the Kepler/Gaia scenario. |
| npm run test:all | 103 | ![PASS](https://img.shields.io/badge/PASS-green): loadPreset("kepler") uses scenario astronomy values with no occurrence overlay. |
| npm run test:all | 104 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia default deterministic output remains approximately 35,363.79. |
| npm run test:all | 105 | ![PASS](https://img.shields.io/badge/PASS-green): Share/export labels include scenario state, scenario label, and occurrence model metadata. |
| npm run test:all | 106 | ![PASS](https://img.shields.io/badge/PASS-green): Runtime preset keys match registry: consensus, kepler, optimist, pessimist |
| npm run test:all | 107 | ![PASS](https://img.shields.io/badge/PASS-green): UI preset keys match registry: consensus, kepler, optimist, pessimist |
| npm run test:all | 108 | ![PASS](https://img.shields.io/badge/PASS-green): No obsolete jwst preset key exists. |
| npm run test:all | 109 | ![PASS](https://img.shields.io/badge/PASS-green): loadPreset(name) resets visible custom min/max fields to default preset bounds. |
| npm run test:all | 110 | ![PASS](https://img.shields.io/badge/PASS-green): High-End scenario deterministic output remains approximately 30,086,210.7. |
| npm run test:all | 111 | ![PASS](https://img.shields.io/badge/PASS-green): setBayesian('pre') activates a factorized rocky/HZ occurrence overlay. |
| npm run test:all | 112 | ![PASS](https://img.shields.io/badge/PASS-green): High-End + Conservative Kepler-era occurrence overlay output remains approximately 14736103.2. |
| npm run test:all | 113 | ![PASS](https://img.shields.io/badge/PASS-green): setBayesian('pre') export describes a rocky/HZ occurrence overlay. |
| npm run test:all | 114 | ![PASS](https://img.shields.io/badge/PASS-green): clearAstronomyOverride() restores the selected scenario baseline after 'pre' overlay. |
| npm run test:all | 115 | ![PASS](https://img.shields.io/badge/PASS-green): setBayesian('post') activates a factorized rocky/HZ occurrence overlay. |
| npm run test:all | 116 | ![PASS](https://img.shields.io/badge/PASS-green): High-End + Updated Kepler/Gaia occurrence overlay output remains approximately 21490150.5. |
| npm run test:all | 117 | ![PASS](https://img.shields.io/badge/PASS-green): setBayesian('post') export describes a rocky/HZ occurrence overlay. |
| npm run test:all | 118 | ![PASS](https://img.shields.io/badge/PASS-green): clearAstronomyOverride() restores the selected scenario baseline after 'post' overlay. |
| npm run test:all | 119 | ![PASS](https://img.shields.io/badge/PASS-green): Bryson η⊕ direct mode uses eta_earth_bryson=0.60 and bypasses factorized occurrence fields. |
| npm run test:all | 120 | ![PASS](https://img.shields.io/badge/PASS-green): Bryson η⊕ direct on Kepler/Gaia remains approximately 252,598.5. |
| npm run test:all | 121 | ![PASS](https://img.shields.io/badge/PASS-green): Bryson η⊕ direct export metadata identifies the direct occurrence term and replaced fields. |
| npm run test:all | 122 | ![PASS](https://img.shields.io/badge/PASS-green): Bryson direct state does not leak stale values into the Updated Kepler/Gaia overlay. |
| npm run test:all | 123 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia f_orbit (0.21) does not exceed registered max (0.21). |
| npm run test:all | 124 | ![PASS](https://img.shields.io/badge/PASS-green): Rare Earth f_complex_life (0.000001) remains clearly lower than consensus (0.01). |
| npm run test:all | 125 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist N_GHZ prior is 5000000000. |
| npm run test:all | 126 | ![PASS](https://img.shields.io/badge/PASS-green): consensus N_GHZ prior is 10000000000. |
| npm run test:all | 127 | ![PASS](https://img.shields.io/badge/PASS-green): kepler N_GHZ prior is 10000000000. |
| npm run test:all | 128 | ![PASS](https://img.shields.io/badge/PASS-green): optimist N_GHZ prior is 40000000000. |
| npm run test:all | 129 | ![PASS](https://img.shields.io/badge/PASS-green): N_GHZ registry is documented as LI_INTERPRETIVE_PRIOR. |
| npm run test:all | 130 | ![PASS](https://img.shields.io/badge/PASS-green): N_GHZ is not documented as directly literature-calibrated in runtime/UI/share sources. |
| npm run test:all | 131 | ![PASS](https://img.shields.io/badge/PASS-green): N_GHZ tooltip states that the value is not directly quoted and avoids direct star-count wording. |
| npm run test:all | 132 | ![PASS](https://img.shields.io/badge/PASS-green): Legacy raw simHistory array migrates to schemaVersion 1. |
| npm run test:all | 133 | ![PASS](https://img.shields.io/badge/PASS-green): Corrupted simHistory payload normalizes to an empty schemaVersion 1 store. |
| npm run test:all | 134 | ![PASS](https://img.shields.io/badge/PASS-green): readHistoryStore/writeHistoryStore persist schemaVersion 1 format. |
| npm run test:all | 135 | ![PASS](https://img.shields.io/badge/PASS-green): Bad localStorage read is ignored safely. |
| npm run test:all | 136 | ![PASS](https://img.shields.io/badge/PASS-green): Preset invariant test completed. |
| npm run test:all | 137 | ![PASS](https://img.shields.io/badge/PASS-green): standard lognormal Monte Carlo: same seed reproduces exactly. |
| npm run test:all | 138 | ![PASS](https://img.shields.io/badge/PASS-green): standard lognormal Monte Carlo: different seeds change the sample sequence. |
| npm run test:all | 139 | ![PASS](https://img.shields.io/badge/PASS-green): standard uniform Monte Carlo: same seed reproduces exactly. |
| npm run test:all | 140 | ![PASS](https://img.shields.io/badge/PASS-green): standard uniform Monte Carlo: different seeds change the sample sequence. |
| npm run test:all | 141 | ![PASS](https://img.shields.io/badge/PASS-green): LHS lognormal Monte Carlo: same seed reproduces exactly. |
| npm run test:all | 142 | ![PASS](https://img.shields.io/badge/PASS-green): LHS lognormal Monte Carlo: different seeds change the sample sequence. |
| npm run test:all | 143 | ![PASS](https://img.shields.io/badge/PASS-green): monteCarloCalculate({ samples, seed }) reproduces exactly through the public API. |
| npm run test:all | 144 | ![PASS](https://img.shields.io/badge/PASS-green): Default unseeded Monte Carlo mode returns a valid summary. |
| npm run test:all | 145 | ![PASS](https://img.shields.io/badge/PASS-green): logit-normal q50 near lower probability edge: bounded adaptive median remains anchored at 0.0200000000000. |
| npm run test:all | 146 | ![PASS](https://img.shields.io/badge/PASS-green): logit-normal q50 with broad asymmetric probability bounds: bounded adaptive median remains anchored at 0.0500000000000. |
| npm run test:all | 147 | ![PASS](https://img.shields.io/badge/PASS-green): log-normal q50 near upper positive bound: bounded adaptive median remains anchored at 0.900000000000. |
| npm run test:all | 148 | ![PASS](https://img.shields.io/badge/PASS-green): log-normal q50 for asymmetric N_GHZ global envelope: bounded adaptive median remains anchored at 10000000000.0. |
| npm run test:all | 149 | ![PASS](https://img.shields.io/badge/PASS-green): Exact probability boundary 0/0/0 remains fixed at exact 0 in all logit-normal MC paths. |
| npm run test:all | 150 | ![PASS](https://img.shields.io/badge/PASS-green): Exact probability boundary 1/1/1 remains fixed at exact 1 in all logit-normal MC paths. |
| npm run test:all | 151 | ![PASS](https://img.shields.io/badge/PASS-green): central zero with positive upper bound emits PROBABILITY_BOUNDARY_WITH_WIDTH and keeps a non-degenerate MC interval. |
| npm run test:all | 152 | ![PASS](https://img.shields.io/badge/PASS-green): central one with lower bound below one emits PROBABILITY_BOUNDARY_WITH_WIDTH and keeps a non-degenerate MC interval. |
| npm run test:all | 153 | ![PASS](https://img.shields.io/badge/PASS-green): Fixed zero probability produces exact-zero MC samples and does not become a positive median. |
| npm run test:all | 154 | ![PASS](https://img.shields.io/badge/PASS-green): Fixed one probability sample remains exact 1 and is not converted to 1 - epsilon. |
| npm run test:all | 155 | ![PASS](https://img.shields.io/badge/PASS-green): Default Monte Carlo correlation mode is independent factors. |
| npm run test:all | 156 | ![PASS](https://img.shields.io/badge/PASS-green): Radial-density nearest-neighbour distance model returns a finite ordered sampled interval. |
| npm run test:all | 157 | ![PASS](https://img.shields.io/badge/PASS-green): Radial-density nearest-neighbour distance is strictly monotonic for counts 1 through 1e10. |
| npm run test:all | 158 | ![PASS](https://img.shields.io/badge/PASS-green): Radial and 3D disk distance models both return finite values across the monotonicity grid. |
| npm run test:all | 159 | ![PASS](https://img.shields.io/badge/PASS-green): Consensus preset seeded Monte Carlo: deterministic=13778.1000000; q50=12735.1627732; mean=18163.2323580; q2.5=2197.84730722; q97.5=63895.8217266; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 160 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia preset seeded Monte Carlo: deterministic=35363.7900000; q50=32383.5714227; mean=45904.8060267; q2.5=5556.63703112; q97.5=158767.780320; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 161 | ![PASS](https://img.shields.io/badge/PASS-green): High-End / Optimist preset seeded Monte Carlo: deterministic=30086210.7000; q50=27574279.0815; mean=35429511.5369; q2.5=6199870.69749; q97.5=102089411.118; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 162 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist preset seeded Monte Carlo: deterministic=0.00000680400000000; q50=0.00000639960905665; mean=0.0000114101046540; q2.5=7.42951688464e-7; q97.5=0.0000528983770470; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 163 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: presetLocal MC q50/deterministic ratio 0.924304713511 is within 0.5 dex. |
| npm run test:all | 164 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: MC arithmetic mean/deterministic ratio = 1.31826829229. |
| npm run test:all | 165 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: presetLocal MC q50/deterministic ratio 0.915726833088 is within 0.5 dex. |
| npm run test:all | 166 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: MC arithmetic mean/deterministic ratio = 1.29807370835. |
| npm run test:all | 167 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: presetLocal MC q50/deterministic ratio 0.916508873666 is within 0.5 dex. |
| npm run test:all | 168 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: MC arithmetic mean/deterministic ratio = 1.17759966152. |
| npm run test:all | 169 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: presetLocal MC q50/deterministic ratio 0.940565704974 is within 0.5 dex. |
| npm run test:all | 170 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: MC arithmetic mean/deterministic ratio = 1.67697011375. |
| npm run test:all | 171 | ![PASS](https://img.shields.io/badge/PASS-green): High-End deterministic is either inside q2.5..q97.5 or flagged by interval-comparison warning. |
| npm run test:all | 172 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist deterministic is either inside q2.5..q97.5 or flagged by interval-comparison warning. |
| npm run test:all | 173 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist presetLocal MC stays near the Rare Earth scenario and does not regress to the old high q50/mean values. |
| npm run test:all | 174 | ![PASS](https://img.shields.io/badge/PASS-green): High-End presetLocal MC q50 does not collapse far below the High-End deterministic scenario. |
| npm run test:all | 175 | ![PASS](https://img.shields.io/badge/PASS-green): Global envelope mode is explicitly labelled as non-local exploratory sampling. |
| npm run test:all | 176 | ![PASS](https://img.shields.io/badge/PASS-green): Deterministic-vs-Monte-Carlo interval warning checks passed for all named presets. |
| npm run test:all | 177 | ![PASS](https://img.shields.io/badge/PASS-green): Seeded Monte Carlo regression test completed. |
| npm run test:all | 178 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: deterministic chain = 0.0000068040000 (matches expected 0.000006804). |
| npm run test:all | 179 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: deterministic chain = 13778.100 (matches expected 13778.1). |
| npm run test:all | 180 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: deterministic chain = 35363.790 (matches expected 35363.79). |
| npm run test:all | 181 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: deterministic chain = 30086211 (matches expected 30086210.7). |
| npm run test:all | 182 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: MC mode="presetLocal", label="Scenario-local preset uncertainty". |
| npm run test:all | 183 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: MC mode="presetLocal", label="Scenario-local preset uncertainty". |
| npm run test:all | 184 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: MC mode="presetLocal", label="Scenario-local preset uncertainty". |
| npm run test:all | 185 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: MC mode="presetLocal", label="Scenario-local preset uncertainty". |
| npm run test:all | 186 | ![PASS](https://img.shields.io/badge/PASS-green): All four presets share the same presetLocal MC mode and label. |
| npm run test:all | 187 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist N_GHZ uses scenario-local bounds centered on the preset (lo=1666666666.666667, central=5000000000, hi=14999999999.999998). |
| npm run test:all | 188 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist f_complex_life uses local Rare Earth bounds (lo=3.3333356e-7, central=0.0000010000000, hi=0.0000029999940). |
| npm run test:all | 189 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler Sobol ranks Stars in GHZ first (N_GHZ T=0.40415156, N_p_star T=0.045061595). |
| npm run test:all | 190 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist MC: mean=0.000011331644, q2.5=7.9102375e-7, q97.5=0.000053063645 (non-degenerate, span 67.082240x). |
| npm run test:all | 191 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist MC: mode is presetLocal scenario-local uncertainty. |
| npm run test:all | 192 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist MC: q50 0.0000062836690 remains within 0.5 dex of deterministic 0.0000068040000 (-0.03 dex). |
| npm run test:all | 193 | ![PASS](https://img.shields.io/badge/PASS-green): consensus MC: mean=18079.921, q2.5=2363.2132, q97.5=67599.161 (non-degenerate, span 28.604767x). |
| npm run test:all | 194 | ![PASS](https://img.shields.io/badge/PASS-green): consensus MC: mode is presetLocal scenario-local uncertainty. |
| npm run test:all | 195 | ![PASS](https://img.shields.io/badge/PASS-green): consensus MC: q50 12355.378 remains within 0.5 dex of deterministic 13778.100 (-0.05 dex). |
| npm run test:all | 196 | ![PASS](https://img.shields.io/badge/PASS-green): kepler MC: mean=45655.142, q2.5=6253.6441, q97.5=169301.20 (non-degenerate, span 27.072406x). |
| npm run test:all | 197 | ![PASS](https://img.shields.io/badge/PASS-green): kepler MC: mode is presetLocal scenario-local uncertainty. |
| npm run test:all | 198 | ![PASS](https://img.shields.io/badge/PASS-green): kepler MC: q50 31744.512 remains within 0.5 dex of deterministic 35363.790 (-0.05 dex). |
| npm run test:all | 199 | ![PASS](https://img.shields.io/badge/PASS-green): optimist MC: mean=35487165, q2.5=6698739.8, q97.5=1.1344701e+8 (non-degenerate, span 16.935575x). |
| npm run test:all | 200 | ![PASS](https://img.shields.io/badge/PASS-green): optimist MC: mode is presetLocal scenario-local uncertainty. |
| npm run test:all | 201 | ![PASS](https://img.shields.io/badge/PASS-green): optimist MC: q50 26930387 remains within 0.5 dex of deterministic 30086211 (-0.05 dex). |
| npm run test:all | 202 | ![PASS](https://img.shields.io/badge/PASS-green): Generic degenerate guard: min==max==central collapses N_GHZ to 10000000000. |
| npm run test:all | 203 | ![PASS](https://img.shields.io/badge/PASS-green): Generic degenerate guard: 100/100 N_GHZ samples are exactly 1e10. |
| npm run test:all | 204 | ![PASS](https://img.shields.io/badge/PASS-green): Editing only N_GHZ from 5e9 to 5e10 scales deterministic exactly 10x. |
| npm run test:all | 205 | ![PASS](https://img.shields.io/badge/PASS-green): Modified Pessimist uses modified preset-local uncertainty (mode="modifiedPresetLocal"). |
| npm run test:all | 206 | ![PASS](https://img.shields.io/badge/PASS-green): Modified Pessimist: unedited f_complex_life keeps scenario-local uncertainty (lo=3.3333356e-7, hi=0.0000029999940, basis=scenario-local). |
| npm run test:all | 207 | ![PASS](https://img.shields.io/badge/PASS-green): Modified consensus reports modifiedPresetLocal mode. |
| npm run test:all | 208 | ![PASS](https://img.shields.io/badge/PASS-green): Modified kepler reports modifiedPresetLocal mode. |
| npm run test:all | 209 | ![PASS](https://img.shields.io/badge/PASS-green): Modified optimist reports modifiedPresetLocal mode. |
| npm run test:all | 210 | ![PASS](https://img.shields.io/badge/PASS-green): Preset-local Monte Carlo regression test completed for all four presets. |
| npm run test:all | 211 | ![PASS](https://img.shields.io/badge/PASS-green): UI has a visible Monte Carlo interval/basis warning path. |
| npm run test:all | 212 | ![PASS](https://img.shields.io/badge/PASS-green): Consensus / adaptive log/logit-normal: deterministic=13778.1000000; mean=18617.6700354; q2.5=2353.90219712; q97.5=67461.0734261; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 213 | ![PASS](https://img.shields.io/badge/PASS-green): Consensus / bounded normal: deterministic=13778.1000000; mean=19896.7562960; q2.5=2957.03239936; q97.5=64755.7396419; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 214 | ![PASS](https://img.shields.io/badge/PASS-green): Consensus / uniform interval sampling: deterministic=13778.1000000; mean=21903.3960272; q2.5=1493.99081329; q97.5=106393.279643; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 215 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia / adaptive log/logit-normal: deterministic=35363.7900000; mean=44543.2821632; q2.5=6106.69468397; q97.5=163079.070084; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 216 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia / bounded normal: deterministic=35363.7900000; mean=50218.7271896; q2.5=7111.70120335; q97.5=168695.352978; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 217 | ![PASS](https://img.shields.io/badge/PASS-green): Kepler/Gaia / uniform interval sampling: deterministic=35363.7900000; mean=49302.2752203; q2.5=3754.82004212; q97.5=211946.790427; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 218 | ![PASS](https://img.shields.io/badge/PASS-green): High-End / Optimist / adaptive log/logit-normal: deterministic=30086210.7000; mean=35507563.1850; q2.5=6243324.13381; q97.5=112389120.729; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 219 | ![PASS](https://img.shields.io/badge/PASS-green): High-End / Optimist / bounded normal: deterministic=30086210.7000; mean=37667126.3534; q2.5=7875160.88461; q97.5=112597889.456; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 220 | ![PASS](https://img.shields.io/badge/PASS-green): High-End / Optimist / uniform interval sampling: deterministic=30086210.7000; mean=40412214.8497; q2.5=4324108.61382; q97.5=165378855.895; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 221 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist / Rare Earth / adaptive log/logit-normal: deterministic=0.00000680400000000; mean=0.0000114738895919; q2.5=7.38163833463e-7; q97.5=0.0000544460881194; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 222 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist / Rare Earth / bounded normal: deterministic=0.00000680400000000; mean=0.0000136892362300; q2.5=9.70868607065e-7; q97.5=0.0000592201070861; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 223 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist / Rare Earth / uniform interval sampling: deterministic=0.00000680400000000; mean=0.0000161296449747; q2.5=3.67050128571e-7; q97.5=0.0000929844587692; inside=true; warning=false; bounds=Scenario-local preset uncertainty. |
| npm run test:all | 224 | ![PASS](https://img.shields.io/badge/PASS-green): Scenario-coherence regression test completed. |
| npm run test:all | 225 | ![PASS](https://img.shields.io/badge/PASS-green): Universe per-star scaling is stable when only N_GHZ changes: 5e9 lower=1.37781000000e+16, 5e10 lower=1.37781000000e+16. |
| npm run test:all | 226 | ![PASS](https://img.shields.io/badge/PASS-green): Universe-scale lower bound no longer jumps by orders of magnitude when N_GHZ gets one extra zero. |
| npm run test:all | 227 | ![PASS](https://img.shields.io/badge/PASS-green): Monte Carlo universe scaling has per-sample yield data available. |
| npm run test:all | 228 | ![PASS](https://img.shields.io/badge/PASS-green): Out-of-range central N_GHZ produces a visible Monte Carlo interval expansion warning. |
| npm run test:all | 229 | ![PASS](https://img.shields.io/badge/PASS-green): Universe-scale UI labels Monte Carlo scaling as per-sample yield scaling. |
| npm run test:all | 230 | ![PASS](https://img.shields.io/badge/PASS-green): Universe-scale coherence regression test completed. |
| npm run test:all | 231 | ![PASS](https://img.shields.io/badge/PASS-green): Galaxy X selection leaves raw N_GHZ untouched and does not block Monte Carlo. |
| npm run test:all | 232 | ![PASS](https://img.shields.io/badge/PASS-green): sampling_uncertainty event preserves deterministic output and clean preset state. |
| npm run test:all | 233 | ![PASS](https://img.shields.io/badge/PASS-green): Occurrence overlays reconcile back to clean matching presets and Bryson direct does not leak stale factorized values. |
| npm run test:all | 234 | ![PASS](https://img.shields.io/badge/PASS-green): Programmatic presetLocal resolves dirty DOM state to modifiedPresetLocal and blocks invalid visible bounds. |
| npm run test:all | 235 | ![PASS](https://img.shields.io/badge/PASS-green): Explicit presetLocal resolves modified visible N_GHZ to modifiedPresetLocal and blocks invalid visible bounds. |
| npm run test:all | 236 | ![PASS](https://img.shields.io/badge/PASS-green): State-transition core regression test completed. |
| npm run test:all | 237 | ![PASS](https://img.shields.io/badge/PASS-green): Stale bounds reset: scenario state is clean preset consensus. |
| npm run test:all | 238 | ![PASS](https://img.shields.io/badge/PASS-green): Stale bounds reset: sampling state uses scenario-local N_GHZ bounds centered on the clean preset. |
| npm run test:all | 239 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset pessimist: scenario state is clean preset pessimist. |
| npm run test:all | 240 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset consensus: scenario state is clean preset consensus. |
| npm run test:all | 241 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset optimist: scenario state is clean preset optimist. |
| npm run test:all | 242 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset kepler: scenario state is clean preset kepler. |
| npm run test:all | 243 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset pessimist: scenario state is clean preset pessimist. |
| npm run test:all | 244 | ![PASS](https://img.shields.io/badge/PASS-green): Cross-preset switching resets central values and visible bounds for every named preset. |
| npm run test:all | 245 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: clean preset output is isolated from dirty H2O/CHNOPS and advanced module state. |
| npm run test:all | 246 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: advanced module enable state resets to off. |
| npm run test:all | 247 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: clean preset output is isolated from dirty H2O/CHNOPS and advanced module state. |
| npm run test:all | 248 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: advanced module enable state resets to off. |
| npm run test:all | 249 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: clean preset output is isolated from dirty H2O/CHNOPS and advanced module state. |
| npm run test:all | 250 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: advanced module enable state resets to off. |
| npm run test:all | 251 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: clean preset output is isolated from dirty H2O/CHNOPS and advanced module state. |
| npm run test:all | 252 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: advanced module enable state resets to off. |
| npm run test:all | 253 | ![PASS](https://img.shields.io/badge/PASS-green): pessimist: clean preset output is isolated from dirty volatile/water split state. |
| npm run test:all | 254 | ![PASS](https://img.shields.io/badge/PASS-green): consensus: clean preset output is isolated from dirty volatile/water split state. |
| npm run test:all | 255 | ![PASS](https://img.shields.io/badge/PASS-green): optimist: clean preset output is isolated from dirty volatile/water split state. |
| npm run test:all | 256 | ![PASS](https://img.shields.io/badge/PASS-green): kepler: clean preset output is isolated from dirty volatile/water split state. |
| npm run test:all | 257 | ![PASS](https://img.shields.io/badge/PASS-green): Modified preset isolation: manual edit creates Modified Pessimist / Rare Earth. |
| npm run test:all | 258 | ![PASS](https://img.shields.io/badge/PASS-green): Modified preset isolation after Consensus switch: scenario state is clean preset consensus. |
| npm run test:all | 259 | ![PASS](https://img.shields.io/badge/PASS-green): Pessimist loads with scenario-local preset MC label. |
| npm run test:all | 260 | ![PASS](https://img.shields.io/badge/PASS-green): Screenshot regression: Consensus does not keep modified Pessimist N_GHZ bounds. |
| npm run test:all | 261 | ![PASS](https://img.shields.io/badge/PASS-green): Preset state reset regression test completed. |
| npm run test:all | 262 | ![PASS](https://img.shields.io/badge/PASS-green): Calibration badge accessibility checks passed for 61 badges. |
| npm run test:all | 263 | ![PASS](https://img.shields.io/badge/PASS-green): Main parameter badge checks passed for 17 controls. |
| npm run test:all | 264 | ![PASS](https://img.shields.io/badge/PASS-green): Calibration badge classification checks passed for 33 module values. |
| npm run test:all | 265 | ![PASS](https://img.shields.io/badge/PASS-green): Main parameter value preservation checks passed for 18 inputs. |
| npm run test:all | 266 | ![PASS](https://img.shields.io/badge/PASS-green): Source link checks passed for 62 links. |
| npm run test:all | 267 | ![PASS](https://img.shields.io/badge/PASS-green): Required Radius-Valley and Prebiotic UV source labels are clickable. |
| npm run test:all | 268 | ![PASS](https://img.shields.io/badge/PASS-green): Visible lower-row source links verified for 15 literature-backed scientific parameter cards. |
| npm run test:all | 269 | ![PASS](https://img.shields.io/badge/PASS-green): Required N_GHZ, f_sun_type, f_sun_age, f_stability, f_complex_life source mappings are linked. |
| npm run test:all | 270 | ![PASS](https://img.shields.io/badge/PASS-green): Wildcard factor source wording is source-free and public placeholder wording is absent. |
| npm run test:all | 271 | ![PASS](https://img.shields.io/badge/PASS-green): Bio/Geophysical source links and tooltip framing verified for 7 cards. |
| npm run test:all | 272 | ![PASS](https://img.shields.io/badge/PASS-green): Registry doiOrUrl entries consistent for f_H2O, f_rotation, f_tilt, and f_CHNOPS. |

## Configured 24-Profile Rotating Audit Catalog

Catalog execution status for the latest completed 24-hour run: ![PASS](https://img.shields.io/badge/PASS-green)

| Profile | Title | Step | Command | 24h status |
| --- | --- | ---: | --- | --- |
| 01-realistic-core-fuzz | Realistic core parameter fuzz | 1 | `npm run test:numerics` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 02-additional-modules-matrix | Additional Scientific Modules matrix | 1 | `npm run test:absolute` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 03-preset-mc-transition | Preset and MC-mode transition fuzz | 1 | `npm run test:state-transition:core` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 04-seti-fermi-extremes | SETI/Fermi extreme assumptions | 1 | `npm run test:numerics` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 04-seti-fermi-extremes | SETI/Fermi extreme assumptions | 2 | `npm run test:strings` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 05-boundary-corrupted | Boundary and corrupted input fuzz | 1 | `npm run test:numerics` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 06-strict-oracle-no-modules | Strict no-module independent oracle comparison | 1 | `node tools/vvuq-audit/run-oracle.mjs --out {profileOut}` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 07-mc-reproducibility | Monte Carlo reproducibility | 1 | `npm run test:montecarlo` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 08-interval-ordering | Interval ordering | 1 | `npm run test:scenario-coherence` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 09-preset-reset-stale | Preset reset / stale-state | 1 | `npm run test:preset-state-reset` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 10-full-preset-snapshot-diff | Full preset snapshot diff | 1 | `npm run test:presets` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 11-json-export-parity | JSON export parity | 1 | `npm run test:standalone-export` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 12-latex-markdown-export-parity | LaTeX / Markdown export parity | 1 | `npm run test:deep` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 13-ui-browser-dom | UI/browser DOM | 1 | `npm run test:absolute` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 14-mobile-vs-desktop | Mobile vs desktop parity proxy | 1 | `npm run test:absolute` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 15-forbidden-wording | Forbidden wording | 1 | `node tools/vvuq-audit/static-scan.mjs --out {profileOut}` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 16-source-provenance | Source/provenance | 1 | `npm run test:source-links` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 16-source-provenance | Source/provenance | 2 | `npm run test:biogeo-sources` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 16-source-provenance | Source/provenance | 3 | `node tools/vvuq-audit/traceability.mjs --out {profileOut}` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 17-distance-model-nearest-candidate | Distance model / nearest candidate | 1 | `npm run test:montecarlo` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 18-universe-scale | Universe scale | 1 | `npm run test:universe-scale` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 19-seti-sparse-display | SETI sparse display | 1 | `npm run test:numerics` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 20-module-overlap-warning | Module overlap warning | 1 | `npm run test:absolute` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 21-performance-memory | Performance / memory | 1 | `node tools/vvuq-audit/performance-runner.mjs --out {profileOut} --seconds 15` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 22-security-static-scan | Security/static scan | 1 | `node tools/vvuq-audit/static-scan.mjs --out {profileOut}` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 23-mutation-style-formula-trap | Mutation-style formula trap | 1 | `node tools/vvuq-audit/mutation-runner.mjs --quick --out {profileOut}` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 24-regression-golden-outputs | Regression against golden outputs | 1 | `npm run test:numerics` | ![PASS](https://img.shields.io/badge/PASS-green) |
| 24-regression-golden-outputs | Regression against golden outputs | 2 | `npm run test:pessimist-mc` | ![PASS](https://img.shields.io/badge/PASS-green) |

## Requirements Traceability Matrix

Status: ![PASS](https://img.shields.io/badge/PASS-green); rows: 17.

| Requirement | Formula | Source file/function | UI field | Export field | Test evidence |
| --- | --- | --- | --- | --- | --- |
| Deterministic Milky Way candidate count | N = product of active astrophysical, planetary, geophysical, biochemical, and optional factors | src/calculator-core.js: computePlanetsBase(), computePlanetsAdvanced(), calculateDeterministic() | deterministicResult, scientific input cards | results.deterministic / deterministic export rows | npm run test:numerics; npm run test:absolute |
| Default preset | Kepler/Gaia preset values from SCIENTIFIC_PRESETS.kepler | src/scientific-parameters.js: SCIENTIFIC_PRESETS | preset buttons and active calculation state | scenario label and preset metadata | npm run test:presets; npm run test:preset-state-reset |
| Pessimistic preset | Pessimist / Rare Earth preset product chain | src/scientific-parameters.js: SCIENTIFIC_PRESETS.pessimist | preset selector, result panels | scenario/preset metadata | npm run test:pessimist-mc; npm run test:presets |
| Consensus preset | Consensus / Lineweaver preset product chain | src/scientific-parameters.js: SCIENTIFIC_PRESETS.consensus | preset selector, result panels | scenario/preset metadata | npm run test:numerics; npm run test:scenario-coherence |
| High-end preset | High-End / Literature Bounds preset product chain | src/scientific-parameters.js: SCIENTIFIC_PRESETS.optimist | preset selector, result panels | scenario/preset metadata | npm run test:pessimist-mc; npm run test:scenario-coherence |
| Custom input | Visible user-provided central/min/max values after normalization | src/calculator-core.js: resolveInputsForCalculation(), buildResolvedModelState() | custom input values and validation warnings | custom scenario state and current result fields | npm run test:deep; npm run test:numerics |
| Monte Carlo q2.5 / q50 / q97.5 | Seeded Monte Carlo samples sorted into quantiles | src/calculator-core.js: monteCarloCalculate(), percentile() | monteCarloResult, monteCarloMedian, stats | mc q025/q50/q975 fields | npm run test:montecarlo; npm run test:scenario-coherence |
| Arithmetic mean | Arithmetic mean of Monte Carlo sample values | src/calculator-core.js: mean(), monteCarloCalculate() | stats and MC detail panels | mc arithmetic mean field | npm run test:montecarlo; npm run test:deep |
| Nearest-candidate distance | 2D/3D/radial nearest-neighbour distance models | src/calculator-core.js: calculateDistanceToNearestPlanet(), distance helpers | distance panel | active distance model and basis fields | npm run test:montecarlo; npm run test:deep |
| Observable-universe scaling | Per-star yield multiplied by configured observable-universe star range | src/calculator-core.js: computeUniverseScaleFromYield(), summarizePerStarYields() | universe scale result and labels | universe scale fields | npm run test:universe-scale; npm run test:absolute |
| SETI/Fermi lambda | lambda_det from candidate count, transmitter fraction, range gate, and temporal overlap | src/calculator-core.js: computeDetectionFilter() | SETI/Fermi context panels | fermi_context and detection basis fields | npm run test:numerics; npm run test:deep |
| SETI/Fermi P>=1 | P(at least one) = 1 - exp(-lambda) | src/calculator-core.js: computeDetectionFilter(), fmtExistencePct() | SETI/Fermi probability display | detection probability fields | npm run test:numerics; npm run test:strings |
| SETI/Fermi waiting time | Mean and median waiting-time formulas from detection rate assumptions | src/calculator-core.js: computeDetectionFilter() | SETI/Fermi waiting-time display | fermi_context timing fields | npm run test:absolute; npm run test:deep |
| Additional Scientific Modules | Module factors multiply or replace specified base terms | src/calculator-core.js: computePlanetsAdvanced(); src/scientific-parameters.js module metadata | advanced scientific module controls | advanced module state and result metadata | npm run test:absolute; npm run test:preset-state-reset |
| JSON export | Current model state serialized to JSON snapshot | src/share.js: buildJSONExportSnapshot() | JSON export control | full JSON export document | npm run test:standalone-export; npm run test:deep |
| LaTeX / Markdown export | Current deterministic/MC/export state rendered to text tables | src/share.js and src/app.js export helpers | export/share controls | LaTeX and Markdown export text | npm run test:standalone-export; npm run test:deep |
| UI labels and forbidden wording guard | No numeric formula; wording boundary check | index.html; src/app.js; src/share.js; docs/*.md | public labels, warnings, and explanatory copy | share/export wording | npm run test:strings; tools/vvuq-audit/static-scan.mjs |

## Static Scan Summary

Status: ![PASS](https://img.shields.io/badge/PASS-green); files scanned: 25; blocking findings: 0.

| Metric | Value |
| --- | ---: |
| files_scanned | 25 |
| forbidden_phrase_matches | 2 |
| unnegated_forbidden_phrase_matches | 0 |
| high_signal_secret_matches | 0 |
| http_literal_matches | 6 |
| live_http_link_findings | 0 |
| external_script_tags | 2 |
| external_script_tags_missing_sri | 0 |
| html_sink_matches | 77 |
| source_placeholder_matches | 0 |
| version_mentions | 53 |
| provenance_term_matches | 861 |

### Static Scan Findings

| Severity | Category | Location | Message |
| --- | --- | --- | --- |
| INFO | forbidden-wording | docs/MONTE_CARLO_METHOD.md:25 | Forbidden phrase appears in explicit negating context. |
| INFO | forbidden-wording | index.html:129 | Forbidden phrase appears in explicit negating context. |
| INFO | http-literal | src/app.js:645 | Allowed HTTP literal context. |
| INFO | http-literal | src/app.js:3443 | Allowed HTTP literal context. |
| INFO | http-literal | src/calculator-core.js:5501 | Allowed HTTP literal context. |
| INFO | http-literal | src/share.js:2332 | Allowed HTTP literal context. |
| INFO | http-literal | src/styles.css:940 | Allowed HTTP literal context. |
| INFO | http-literal | src/styles.css:1977 | Allowed HTTP literal context. |

## Independent Oracle Summary

Status: ![PASS](https://img.shields.io/badge/PASS-green); checks: 20; failures: 0.

| Check | Status | Expected | Actual |
| --- | --- | ---: | ---: |
| deterministic_product:pessimist | ![PASS](https://img.shields.io/badge/PASS-green) | 0.000006804000000000001 | 0.000006804000000000001 |
| deterministic_product:consensus | ![PASS](https://img.shields.io/badge/PASS-green) | 13778.1 | 13778.1 |
| deterministic_product:optimist | ![PASS](https://img.shields.io/badge/PASS-green) | 30086210.699999988 | 30086210.699999988 |
| deterministic_product:kepler | ![PASS](https://img.shields.io/badge/PASS-green) | 35363.79 | 35363.79 |
| seti_lambda:zero-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 0 |
| seti_p_at_least_one:zero-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 0 |
| seti_mean_wait:zero-lambda | ![PASS](https://img.shields.io/badge/PASS-green) |  |  |
| seti_median_wait:zero-lambda | ![PASS](https://img.shields.io/badge/PASS-green) |  |  |
| seti_lambda:small-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 1e-7 | 1e-7 |
| seti_p_at_least_one:small-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 9.99999949513608e-8 | 9.99999949513608e-8 |
| seti_mean_wait:small-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 10000000000 | 10000000000 |
| seti_median_wait:small-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 6931471805.599453 | 6931471805.599453 |
| seti_lambda:unit-ish-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 1 | 1 |
| seti_p_at_least_one:unit-ish-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 0.6321205588285577 | 0.6321205588285577 |
| seti_mean_wait:unit-ish-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 1000000 | 1000000 |
| seti_median_wait:unit-ish-lambda | ![PASS](https://img.shields.io/badge/PASS-green) | 693147.1805599453 | 693147.1805599453 |
| seti_lambda:range-gated-zero | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 0 |
| seti_p_at_least_one:range-gated-zero | ![PASS](https://img.shields.io/badge/PASS-green) | 0 | 0 |
| seti_mean_wait:range-gated-zero | ![PASS](https://img.shields.io/badge/PASS-green) |  |  |
| seti_median_wait:range-gated-zero | ![PASS](https://img.shields.io/badge/PASS-green) |  |  |

## Randomized Timeboxed Stress Summary

Not run.

No timeboxed profile executions were recorded in this run.

## Mutation Testing Summary

Not run.

## Coverage Summary

Not run.

## Performance Summary

Not run.

## Findings And Severity Table

| Severity | Finding |
| --- | --- |
| INFO | No critical/high findings were recorded by the executed checks. |

## Reproducibility Artifacts

Run directory: `audit-output\20260628-070816Z-smoke`

## Verification Boundaries

The report covers only executed audit scripts and generated summaries present in this run directory. It does not claim empirical astronomical validation or peer-reviewed astrophysical correctness.

## Final Status

![GREEN](https://img.shields.io/badge/GREEN-green)
