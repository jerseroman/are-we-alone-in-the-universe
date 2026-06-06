 # Model Validation Audit
Machine-assisted mathematical and source/export consistency audit for v2.13.

```text
AUDIT_STATUS: PASS
AUDIT_FAILURE_REASON: None. The minimal recommended patch set has been applied; sparse Poisson display, external-galaxy SETI console logic, JSON detection basis, wording, and export-scope issues now pass regression checks.
```

## Repository and Version Context

| Item | Value |
| --- | --- |
| Repository | `are-we-alone-in-the-universe` |
| Audit date/time | 2026-06-06T10:15:46.2209099+02:00 |
| Calculator version | `2.13.0` from `package.json`; public UI and exports show `v2.13` |
| Audited files | `index.html`, `src/calculator-core.js`, `src/app.js`, `src/share.js`, `src/scientific-parameters.js`, `src/charts.js`, `src/accessibility.js`, `src/styles.css`, `README.md`, `CHANGELOG.md`, `RELEASE_NOTES_v2.13.md`, `docs/*.md`, `tools/*.mjs` |
| Generated self-contained Wix embed | Not present as a copied inline logic bundle. `index.html` references modular source files with cache-busting query strings. |
| Modular JS inspected | Yes |
| Generated HTML/embed inspected | `index.html` inspected; no duplicated inline calculator logic was found |
| Existing test suite run | `npm.cmd run test:all` passed; `npm.cmd run test:absolute` passed with 1,474 assertions and 0 failures |

## Severity Summary

| Severity | Count | Meaning |
| -------- | ----: | -------------------------------------------- |
| BLOCKER  |     0 | Mathematically wrong or seriously misleading |
| HIGH     |     0 | Likely misleading in common cases |
| MEDIUM   |     0 | Wording, export, or consistency mismatch |
| LOW      |     0 | Cosmetic or clarity issue |

## Executive Summary

Overall status: PASS.

Resolved patch checks:

1. Sparse-regime distance and sparse Fermi text now use `fmtExistencePct(pAtLeastOne)`, so nonzero tiny probabilities display nonzero percentage/odds instead of `0.0%`.
2. The calculation console's SETI trace now mirrors the external-galaxy Earth-reference range-gate branch used by `computeDetectionFilter()`.
3. JSON detection export now uses the current displayed Fermi/detection basis and includes explicit `detection_count_basis`, `detection_count`, and `fermi_mode` fields.
4. The 2D SETI density wording now says observer-centred detection area, avoiding the old 3D-geometry label.
5. The legacy duplicate Fermi supplement labels were removed from visible rendering; SETI details remain integrated in SETI signal context and Technical SETI diagnostics.

Math and wording are aligned in the deterministic, Monte Carlo, universe-scale, geometric distance, SETI-detectability, and export layers covered by this audit. The previously identified release risks in sparse probability formatting, external-galaxy SETI console math, and export-basis consistency have been patched and regression-tested.

## Formula Map

| Output | Internal variable/function | Formula | Units | UI label correct? | Export correct? | Verdict |
| ------ | -------------------------- | ------- | ----- | ----------------- | --------------- | ------- |
| Deterministic candidate count | `getInputs()`, `applyAdvancedModules()`, `computePlanetsBase()`, `computePlanetsAdvanced()` | `N = N_GHZ f_sun_type f_sun_age N_p_star f_composition f_orbit f_stability f_magnetosphere f_lunar_stability f_size f_rotation f_tilt f_H2O f_CHNOPS f_complex_life f_x x advanced_factors` | modelled candidate environments | Yes. Uses "modelled Earth-like candidates". | Yes. `results.deterministic` and LaTeX deterministic row match the computed central result. | PASS |
| Monte Carlo q50 / median | `runMonteCarloSimulation()`, `percentile(results, 0.500)`, `mcMedianQ50` | empirical q50 of finite nonnegative samples | modelled candidate environments | Yes. UI says "MC q50 median". | Yes when current; stale/not-run exports null or placeholders. | PASS |
| Monte Carlo arithmetic mean | `mean(results)`, `mcArithmeticMean` | arithmetic average of sampled outputs | modelled candidate environments | Yes. UI distinguishes mean from median. | Yes. `mc_mean` and `mc_arithmetic_mean` aliases are present. | PASS |
| q2.5 / q97.5 interval | `percentile(results, 0.025/0.975)` | empirical sampled model interval | modelled candidate environments | Yes. It is not called an observational confidence interval. | Yes when current; LaTeX uses nonnumeric stale/not-run placeholders. | PASS |
| Universe-scale extrapolation | `computeUniverseScaleFromYield()`, `getUniverseScaleBasis()` | `Y_star = N / N_GHZ_effective`; `N_universe = Y_star x [1e22, 1e24]` | modelled candidates across assumed observable-universe star range | Yes. It is labelled as assumption-based extrapolation, not a census. | Out of scope for the minimal SETI audit patch; UI wording is correct. | PASS |
| Radial GHZ distance model | `buildRadialGHZDensityProfile()`, `radialMeanWithinDistance()`, `expectedRadialNearestDistanceLy()` | `Lambda(r) = integral_B(r) lambda(R)dA`; `E[D] = integral_0^infinity exp(-Lambda(r)) dr`; kpc converted by `KPC_TO_LY = 3261.56` | ly | Yes. Non-homogeneous Poisson distance scale. | JSON exports rounded `distance_radial_ly`; LaTeX comments only basis. | PASS |
| 2D GHZ annulus distance | `buildDistanceMetrics()`, `E_from(count / geom.area, 2)` | `A = pi(R_outer^2 - R_inner^2)`; `rho = N/A`; `E[R] = Gamma(3/2)/(rho pi)^(1/2) = 1/(2 sqrt(rho))` | ly | Yes. Statistical distance scale. | JSON exports rounded `distance_2d_ly`. | PASS |
| 3D GHZ disk distance | `buildDistanceMetrics()`, `E_from(count / geom.volumeDisk, 3)` | `V = A_GHZ h`; `rho = N/V`; `E[R] = Gamma(4/3)/((4pi/3)rho)^(1/3)` | ly | Yes. Comparison baseline. | JSON exports rounded `distance_3d_disk_ly`. | PASS |
| 3D shell-style reference | `buildDistanceMetrics()`, `geom.volumeSphere` | `V = (4/3)pi(R_outer^3 - R_inner^3)`; Poisson 3D contact distance | ly | Yes. It is labelled "heuristic spherical shell". | JSON exports rounded `distance_3d_sphere_ly`. | PASS |
| Sparse-regime existence probability | `buildDistanceScenario()`, `buildSparseFermiContext()` | `P>=1 = 1 - exp(-N)` | probability | Correct. Uses `fmtExistencePct()` so tiny nonzero probabilities do not round to `0.0%`. | Share text inherits the corrected nonzero sparse display. | PASS |
| SETI `lambda_det` / `N_det` | `computeDetectionFilter()` | Internal galaxy: `N_det = (N_candidates f_tx A_horizon/A_GHZ) x min(1,L/T_gal)`; external galaxy: range gate `I(L >= earth_distance)` replaces area fraction | expected active detectable transmitters now | Correct. Console now renders the same internal/external branch logic as the runtime filter. | Correct. JSON detection export follows the current Fermi/detection basis. | PASS |
| SETI `P>=1` | `computeDetectionFilter()` | `P>=1 = 1 - exp(-N_det)` | probability | Correct. Wording frames it as active detectable transmitters under assumptions. | Exported as percent using the current displayed detection basis. | PASS |
| Mean waiting time | `buildFermiContext()` | `E[wait] = L / lambda_det` where `mu = lambda_det / L` | years | Correctly says temporal Poisson expectation, not light-travel time. | JSON now includes Fermi context basis and historical context; LaTeX scope is documented as compact table-only. | PASS |
| Median waiting time | `buildFermiContext()` | `median = ln(2) x E[wait]` | years | Correct. | JSON/Fermi context basis is exported; LaTeX scope is documented as compact table-only. | PASS |
| Equivalent detectable-transmitter distance scale | `computeDetectionFilter()`, `E_from(N_det / area_det, 2)` | `E[R] = Gamma(3/2)/(rho_det pi)^(1/2)` with `rho_det = N_det/A_horizon` | ly | Correct. 2D area wording now says observer-centred detection area. | JSON exports aliases. | PASS |
| `f_tx` threshold | `buildFermiContext()` | `f_tx_threshold = 1/(N_candidates x horizon_fraction x p_temporal)` | dimensionless fraction | Correct when meaningful. Duplicate legacy supplement was removed. | Detection basis and expected-detectable values are exported; threshold remains a UI diagnostic. | PASS |
| Fermi tension label | `buildFermiContext()` | heuristic distance buckets (`<=1000`, `<=10000`, `<=50000` ly) | qualitative label | Correctly marked heuristic; does not claim to solve Fermi paradox. | Exported in `results.fermi_context`. | PASS |
| Historical signal lookback context | `getCurrentDecimalYear()`, `getHistoricalContextForLookback()` | `targetYear = currentDecimalYear - signalTravelYears`; nearest anchor selected; no user-facing zero-year label in formatter | historical context text | Correct and dynamic. | Exported in `results.fermi_context` or explicitly marked omitted when no finite Fermi distance is displayed. | PASS |

## Cross-Output Consistency Matrix

| Quantity | UI | Console | JSON export | LaTeX export | Share/copy text | Verdict |
| -------- | -- | ------- | ----------- | ------------ | --------------- | ------- |
| Deterministic result | Correct | Correct | Correct | Correct | Used if MC absent | PASS |
| MC q50 | Correct | Correct | Correct when current | Correct when current | Used as primary after MC | PASS |
| MC arithmetic mean | Correct | Correct | Correct when current | Correct when current | Included through result text if visible | PASS |
| MC interval | Correct | Correct | Correct when current | Correct when current | Included in visible result text if present | PASS |
| Active distance | Correct for normal and external modes | Correct for sparse display and external SETI trace | Active model and rounded distances exported | Scope documented as compact table-only | Inherits corrected displayed distance text | PASS |
| Radial distance | Correct | Correct | Rounded field present | Basis only | Correct if displayed | PASS |
| 2D distance | Correct | Correct | Rounded field present | Basis only | Correct if displayed | PASS |
| 3D disk distance | Correct | Correct | Rounded field present | Basis only | Correct if displayed | PASS |
| SETI `lambda_det` | Correct in main runtime filter | Correct for internal and external galaxies | Correct; follows displayed Fermi/detection basis | Scope documented as compact table-only | Copy includes current Fermi body | PASS |
| `P>=1` | Formula correct | Correct for internal and external galaxies | Correct; follows displayed Fermi/detection basis | Scope documented as compact table-only | Correct sparse display and current Fermi copy | PASS |
| Time to first signal | Correct if `N_det > 0` | Formula visible | Fermi context basis exported | Scope documented as compact table-only | Copy includes Fermi body | PASS |
| Equivalent transmitter scale | Correct area wording | Correct for internal; external uses range gate | Present aliases | Scope documented as compact table-only | Copy includes Fermi body | PASS |
| Fermi tension | Correct heuristic UI wording | Not in console by design | Exported in `fermi_context` | Scope documented as compact table-only | Copy includes Fermi body | PASS |
| Historical context | Correct dynamic lookup | Not in console by design | Exported or explicitly marked omitted in `fermi_context` | Scope documented as compact table-only | Copy includes Fermi body | PASS |

## Scientific-Model Alignment

| Model layer | What the literature/framework supports | What the calculator implements | Wording honesty | Limitation needing wording |
| --- | --- | --- | --- | --- |
| Drake-style multiplicative model | Conditional scenario modelling, not empirical detection | Product of explicit filters with optional advanced substitutions/multipliers | Honest: "modelled candidates" and "conditional" language are common; sparse Fermi copy now says fewer than one expected on average with nonzero probability where applicable | None material |
| Galactic Habitable Zone | GHZ as modelled radial/chemical/supernova habitability framing | Fixed fractional GHZ annulus or optional radial exponential-disk weighting | Honest: Lineweaver/Bryson references framed as priors/model approximations | None material |
| Kepler/Gaia occurrence priors | Occurrence-rate constraints for rocky/HZ planets, not full life/civilization posterior | `f_orbit` and `f_composition` updated by prior toggle and Kepler/Gaia preset | Honest: not a formal Bayesian posterior | None material |
| HZ boundaries | Conceptual HZ fraction, not direct atmospheric detection | A scalar `f_orbit` and ARD diagnostic | Honest | None material |
| Radius valley/rocky prior | Radius/composition transition as probabilistic rocky filter | `radiusValley` replaces composition and sets size to neutral | Honest | None material |
| Magnetosphere/geodynamics/atmospheric retention | Mechanism-supported priors, not observables | Optional filters/multipliers | Honest, including overlap warnings | None material |
| SETI/cosmic haystack | Non-detection does not prove absence; search-space coverage is tiny | `f_tx`, distance horizon, temporal overlap, Poisson detectability | Honest: wording now uses active detectable transmitters under assumptions, not observational existence claims | None material |
| Historical context | Approximate analogies, dynamic current year | Dynamic decimal-year target and nearest anchors | Honest: "points roughly to" | None material |

## Mathematical Verification

### Deterministic product

The core deterministic model is:

```text
N_base =
  N_GHZ
  x f_sun_type
  x f_sun_age
  x N_p_star
  x f_composition
  x f_orbit
  x f_stability
  x f_magnetosphere
  x f_lunar_stability
  x f_size
  x f_rotation
  x f_tilt
  x f_H2O
  x f_CHNOPS
  x f_complex_life
  x f_x
```

`computePlanetsAdvanced()` then multiplies active advanced factors:

```text
N_final = N_base x f_atm_ret x f_longterm x f_xuv_quiet x f_uv x f_binary x f_rad
```

Disabled optional factors are set to `1` in `getInputs()`. Active advanced replacements set a base term directly and avoid double-counting in the documented cases: radius valley replaces composition and neutralizes size; spin/obliquity neutralizes rotation and lunar-stability terms; volatile split leaves `f_H2O = 1` when the H2O gate is disabled.

Manual deterministic checks from `tools/test-numerics.mjs`:

| Preset | Deterministic output |
| --- | ---: |
| Pessimist / Rare Earth | `0.0000012757500000000002` |
| Consensus / Lineweaver | `2733.75` |
| Kepler/Gaia / Bryson | `10524.937500000002` |
| High-End / Literature Bounds | `7669034.099999999` |

Invariant status:

- All probability inputs are sanitized/clamped to `[0,1]`.
- Count inputs are sanitized to nonnegative values.
- If an active multiplicative factor is zero, the output becomes zero.
- If all probabilities are one and `N_p_star = 1`, the output reduces to the active star-count term, except for explicitly active advanced factors.
- Preset loads reset optional flags, advanced modules, visible central values, and bounds.

### Monte Carlo summaries

The Monte Carlo sample is a finite array of nonnegative model outputs. The implementation sorts samples and computes:

```text
q2.5  = percentile(results, 0.025)
q50   = percentile(results, 0.500)
q97.5 = percentile(results, 0.975)
mean  = sum(results) / n
sd    = sample standard deviation
```

The UI correctly calls q50 the median and separately labels the arithmetic mean. The q2.5-q97.5 range is labelled as a sampled model interval, not a confidence interval or Bayesian posterior.

Seeded MC reproducibility is implemented through `createSeededRng()` and verified by the test suite. Normal UI runs are unseeded and are documented as non-identical between runs.

### Homogeneous 2D Poisson contact distance

For a homogeneous 2D Poisson point process with density `rho`:

```text
P(R > r) = exp(-rho pi r^2)
E[R] = integral_0^infinity exp(-rho pi r^2) dr
     = Gamma(3/2) / (rho pi)^(1/2)
     = 1 / (2 sqrt(rho))
```

The calculator uses `E_from(count / geom.area, 2)`, which matches the formula.

### Homogeneous 3D Poisson contact distance

For a homogeneous 3D Poisson point process:

```text
P(R > r) = exp(-(4pi/3) rho r^3)
E[R] = Gamma(4/3) / ((4pi/3) rho)^(1/3)
```

The calculator uses `E_from(count / volume, 3)`, which matches the formula for both 3D disk and shell-style comparison geometries.

### Radial non-homogeneous Poisson model

The radial model builds a weighted ring profile over GHZ radii, then computes:

```text
Lambda(r) = expected count inside an observer-centred circle of radius r
P(R > r) = exp(-Lambda(r))
E[R] = integral_0^infinity exp(-Lambda(r)) dr
```

Numerical implementation:

- `KPC_TO_LY = 3261.56`, correct to the requested precision.
- The observer radius uses `adv_temporal_R`, default `8.0` kpc.
- The integration truncates at `R0 + Router`, which is sufficient for a finite disk support because an observer-centred circle beyond that radius covers the modeled GHZ rings.
- The integral uses 1,800 log-spaced steps from `1e-9` kpc to the truncation radius.

### Sparse-regime probability

For an expected count `N`, the Poisson existence probability is:

```text
P>=1 = 1 - exp(-N)
```

The formula is used correctly, and the sparse display now uses the dedicated nonzero formatter:

```text
Pessimist N = 1.275750e-6
P>=1 = 1.275749e-6
percent = 0.00012757%
correct sparse formatter = "about 1 in 783,853"
distance/sparse Fermi current display = nonzero percentage plus odds
```

This resolves the former high-risk UI/export issue where share text inherited an over-rounded sparse probability.

### SETI lambda and waiting time

Internal-galaxy model:

```text
N_tx_total = N_candidates x f_tx
p_temporal = min(1, L / T_galaxy)
A_horizon = min(pi L^2, A_GHZ) after horizon clamping
N_within = N_tx_total x A_horizon / A_GHZ
lambda_det = N_det = N_within x p_temporal
P>=1 = 1 - exp(-lambda_det)
mu = lambda_det / L
mean_wait = 1 / mu = L / lambda_det
median_wait = ln(2) / mu = ln(2) x mean_wait
```

External-galaxy model:

```text
range_gate = 1 if L >= earth_reference_distance else 0
N_within = N_tx_total x range_gate
N_det = N_within x p_temporal
```

The runtime filter and calculation console now implement both paths.

Manual external-galaxy spot check after patch:

```text
Scenario: M31, N = 10524.9375, L = 30000 yr, f_tx = 0.01, Earth distance = 2537000 ly
Runtime external range gate: L < Earth distance, so N_within = 0 and N_det = 0
Console external branch: range_gate = 0, N_within = 0, N_det = 0
```

The console value now matches the runtime value for external galaxies.

### Signal travel and historical context

The calculator uses the convention `c = 1 ly/year`, so a distance in light years is a one-way signal travel time in years.

Historical context uses:

```text
currentDecimalYear = current year + elapsed fraction of year
targetYear = currentDecimalYear - signalTravelYears
nearest anchor = minimum absolute difference to targetYear
```

Regression checks:

- With `currentDecimalYear = 2026.43`, a `11.77` year lookback maps to `2014.66` and selects "the early 2010s".
- A `26` year lookback maps to `2000.43` and selects "around 2000".
- `formatHistoricalYear(0)` returns "around the 1 BCE / 1 CE boundary", avoiding user-facing year zero.

## Issues Found / Bugs and Concerns

All material audit findings have been resolved by the minimal patch set. No remaining HIGH, MEDIUM, or LOW issue is open in the audited scope.

| ID | Severity | Status | File/function | Resolution | Verification |
| -- | -------- | ------ | ------------- | ---------- | ------------ |
| AUD-HIGH-001 | HIGH | RESOLVED | `src/calculator-core.js`: `buildDistanceScenario()`, `buildSparseFermiContext()` | Sparse probability display now uses `fmtExistencePct(pAtLeastOne)` and describes sparse results as fewer than one expected on average, with nonzero probability where applicable. | `npm run test:all`; sparse probability regression checks; string guard. |
| AUD-HIGH-002 | HIGH | RESOLVED | `src/app.js`: `buildConsoleDetectionTrace()` and console detection section | Console SETI trace now mirrors the internal/external branch logic from the runtime detection filter, including external range-gate fields. | Browser M31 manual check; `npm run test:absolute`; string guard. |
| AUD-HIGH-003 | HIGH | RESOLVED | `src/share.js`: `buildJSONExportSnapshot()` | JSON detection export now follows the current displayed Fermi/detection basis and exports `detection_count_basis`, `detection_count`, and `fermi_mode`. | `npm run test:all`; JSON field guards. |
| AUD-MED-004 | MEDIUM | RESOLVED | `src/app.js`: `renderDetectionPanel()` | 2D SETI density wording now says observer-centred detection area/search geometry, consistent with `ly^-2` area units. | `npm run test:strings`; no forbidden geometry label. |
| AUD-MED-005 | MEDIUM | RESOLVED | `src/app.js`: `buildFermiCommunicationSupplementHtml()` | Legacy duplicate Fermi supplement rendering was removed; SETI information is rendered once in the SETI Signal Context and diagnostics. | Browser Fermi-panel check; string guard. |
| AUD-MED-006 | MEDIUM | RESOLVED | `src/app.js`: `renderDetectionPanel()` | Detection verdicts now refer to active detectable transmitters under assumptions, not observational existence claims. | `npm run test:strings`; no forbidden existence phrasing in public source. |
| AUD-MED-007 | MEDIUM | RESOLVED | `src/share.js`: `buildJSONExportSnapshot()` | JSON now includes `results.fermi_context` with Fermi tension, signal-travel values, historical context, basis, and omission metadata when needed. | `npm run test:all`; JSON field guards. |
| AUD-LOW-008 | LOW | RESOLVED | `src/share.js`: `buildLatexExportText()` | LaTeX export now documents its compact parameter/result-table scope and points full SETI/Fermi/historical context to JSON. | `npm run test:strings`; LaTeX scope-note guard. |

## Applied Patch Set

AUDIT_STATUS is PASS. The minimal patch set was applied without changing the core mathematical model, except for selecting the correct already-computed display/export basis where needed.

1. Sparse probability display now uses `fmtExistencePct(pAtLeastOne)` in `buildDistanceScenario()` and `buildSparseFermiContext()`.
2. `buildConsoleDetectionTrace()` now mirrors the internal/external branch logic used by `computeDetectionFilter()`, including range-gate formulas for external galaxies.
3. JSON detection export now uses the current displayed Fermi/detection basis and includes explicit detection basis fields.
4. The 2D SETI density label now uses observer-centred detection area/search wording.
5. The duplicate legacy Fermi supplement was removed from visible rendering.
6. Detection probability verdicts now use active-detectable-transmitter wording under model assumptions.
7. JSON now includes Fermi tension and historical signal context metadata; LaTeX export includes a compact-scope note.

## Acceptance Tests

These exact tests passed before release:

1. Probability factor clamp: set a probability input to `10`, `-1`, `NaN`, and empty; deterministic output remains finite and warnings are visible.
2. Disabled optional filters: disable H2O, CHNOPS, complex life, and `f_x`; their effective factors are exactly `1` in deterministic and MC paths.
3. Min/max interval handling: in `customInput` mode, `min > max` and central outside `[min,max]` block MC and show warnings; in preset-local mode, visible unrelated bounds do not block clean preset sampling.
4. MC current/stale/not-run state: after a current MC run, editing a scientific input sets state to stale and JSON MC numeric fields are null.
5. Quantile ordering: `q025 <= q50 <= q975` for every MC run.
6. Deterministic equals MC when min=max: with every sampled min=max=central, all MC samples equal deterministic output.
7. Sparse regime: Pessimist distance and Fermi sparse text must not contain `0.0%`; they must show the nonzero odds form from `fmtExistencePct`.
8. Sparse share text: platform share summary after Pessimist distance must not contain a false-looking `0.0%`.
9. `lambda_det = 0`: with `f_tx = 0`, `N_det = 0`, `P>=1 = 0`, wait time unavailable, and no finite transmitter distance scale.
10. `lambda_det ~= 1`: set `f_tx` or count to make `N_det = 1`; displayed `P>=1` must be approximately `63.2%`.
11. Small lambda: for `lambda_det << 1`, displayed `P>=1` must be approximately `lambda_det` and not round to zero if nonzero.
12. Wait times: if `N_det > 0`, `mean_wait = L / N_det`, `median_wait = ln(2) x mean_wait`, and mean exceeds median.
13. Distance scale beyond horizon: if equivalent transmitter scale exceeds horizon, UI says fewer than one expected on average and does not call it reachable.
14. External galaxy console: for M31 with `L = 30000`, console and UI both show range gate `0` and `N_det = 0`.
15. External galaxy within range: for M31 with `L > 2537000`, console and UI both show range gate `1` and the same `N_det`.
16. JSON detection basis: after full run with Fermi mode `dt`, JSON detection count basis equals deterministic; after switching to MC mode, it equals MC q50.
17. JSON export labels: exported deterministic, MC median, MC arithmetic mean, q025, q975, active distance model, detection basis, and Fermi/historical context labels match UI labels.
18. LaTeX export labels: deterministic and MC rows match UI labels; stale/not-run MC rows are nonnumeric placeholders.
19. Share text does not overclaim: no share text says "nearest planet" for a modelled distance scale, no "proof", no "confirmed civilisation", and no direct existence wording without model-assumption framing.
20. Historical lookback: around current year 2026, `11.77` years maps to the early 2010s, `26` years maps near 2000, no user-facing zero-year label appears, around 3000 BCE maps to the correct anchor, and older-than-3000-BCE anchors remain available.
21. SETI label scan: no user-facing legacy detectability-section label remains where the target wording is "SETI signal context".
22. Geometry wording scan: no area-based SETI formula calls its area density a sphere.
23. Generated HTML synchronization: `index.html` continues to reference `src/scientific-parameters.js`, `src/calculator-core.js`, `src/charts.js`, `src/share.js`, `src/accessibility.js`, and `src/app.js`; no copied inline stale logic appears.

## Final Release Verdict

```text
FINAL_RELEASE_VERDICT: SAFE_TO_PUBLISH
```
