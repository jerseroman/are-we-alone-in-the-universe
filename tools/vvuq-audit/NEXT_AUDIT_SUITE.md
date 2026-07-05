# Next V&V/UQ Audit Suite

This file documents the prepared follow-up audit suite. It is a runbook and implementation map, not a completed audit report.

## Commands

| Purpose | Command |
| --- | --- |
| Fast smoke/preflight | `npm run audit:vvuq:next-suite:smoke` |
| Standard prepared suite | `npm run audit:vvuq:next-suite` |
| Fuller one-off run with export, oracle, coverage, build, manifest, and security | `npm run audit:vvuq:next-suite:full` |
| Include browser screenshots if Playwright browsers are installed | `npm run audit:vvuq:next-suite -- --run-browser` |
| Adjudicate a specific long-run directory | `npm run audit:vvuq:next-suite -- --run-dir audit-output/extended-72h-live-20260701-095425` |

The runner writes JSON and Markdown evidence into `audit-output/<run-id>/`.

## Audit Coverage Map

| # | Audit | Implemented by |
| ---: | --- | --- |
| 1 | Metamorphic / property-based invariant audit | `tools/vvuq-audit/next-audit-suite.mjs`, core metamorphic component |
| 2 | UI -> internal state -> display metamorphic audit | `tools/vvuq-audit/next-audit-suite.mjs`, UI/state/display component |
| 3 | Export metamorphic audit | Existing `export-consistency-audit.mjs`, orchestrated by next suite |
| 4 | Bryson/direct occurrence exclusivity audit | Core metamorphic component |
| 5 | Advanced modules metamorphic audit | Core metamorphic component |
| 6 | Preset restoration invariant audit | Core metamorphic component |
| 7 | Monte Carlo distribution invariant audit | Core metamorphic component |
| 8 | Cross-browser DOM/display audit | Browser/visual component; requires Playwright browser runtime |
| 9 | Visual regression screenshot audit | Browser/visual component; screenshot capture prepared, pixel baselines still optional |
| 10 | Final adjudication audit | Final adjudication component, classifies CODE_FAIL vs TIMEOUT_PARTIAL |
| 11 | Timeout-aware runner audit | Timeout-aware runner component |
| 12 | Full independent Python/R oracle expansion | Existing independent model scope audit, orchestrated by next suite |
| 13 | Coverage improvement audit | Existing coverage threshold audit, run with `--run-coverage` |
| 14 | Scientific assumption consistency audit | Existing prior/dependency and methodology governance audits |
| 15 | Release reproducibility audit | New release reproducibility component plus optional evidence manifest |

## Status Semantics

`PASS` means the executed checks for that audit item passed.

`PARTIAL` means the audit item is prepared and generated evidence, but either an optional dependency was missing, a heavy command was intentionally skipped, or the current implementation is intentionally scoped rather than complete.

`FAIL` means the executed check found a blocking issue or command failure that was not adjudicated as a timeout/harness limitation.

The suite exits non-zero only for `FAIL`. `PARTIAL` is preserved in the report and should not be rewritten as `PASS` unless the missing scope is actually executed or explicitly adjudicated.
