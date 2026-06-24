# Monte Carlo Method

_This document remains applicable to v2.18 unless otherwise stated. v2.18 changed Monte Carlo presentation and export metadata only; the sampling method described here is unchanged._

This calculator uses Monte Carlo sampling to explore how uncertainty in the input parameters propagates through the multiplicative habitability chain. The Monte Carlo output is an uncertainty diagnostic for the current model settings, not an observational census and not a prediction of confirmed life.

## Sampling Mode

The default simulation engine is standard Monte Carlo. Active parameters with usable uncertainty intervals are sampled around the configured central value, then the model recomputes the final planet count for each draw. Selecting a named scenario resets visible min/max fields to the registry/default bounds before applying that preset's central values. Named scenario presets default to `presetLocal` mode: scenario-local transformed-space uncertainty bands centered on the selected preset central values. Explicit `presetLocal` always remains strict preset-local sampling, even if the visible form currently contains modified values. `customInput` mode uses the visible custom central values and min/max fields. `globalEnvelope` mode is an explicit exploratory diagnostic and is not local preset uncertainty.

The UI limits normal interactive runs to a bounded sample count so the static browser page remains responsive. Programmatic audit calls can run the same engine through `monteCarloCalculate({ samples, seed })`.

This is uncertainty propagation through the calculator's chosen model inputs. It is not a Bayesian posterior over the true number of planets in the Galaxy, and it is not an observational confidence interval from a survey catalogue.

The implementation follows the same broad uncertainty-propagation framing used by JCGM 101:2008 for propagating distributions through a model by Monte Carlo sampling. In this calculator the input distributions are user/model assumptions rather than fully measured input quantities.

## Distribution Assumptions

The calculator supports three distribution modes:

- `lognormal`: adaptive mode. Probability-like parameters use a bounded logit-normal transform, while positive count-like parameters use a bounded log-normal transform.
- `normal`: parameters use bounded normal sampling around the central value.
- `uniform`: parameters are sampled uniformly from the configured min/max interval.

For positive count-like parameters in adaptive log-normal mode, the implementation uses a small spread floor equal to 10% of the central value when the configured interval would otherwise imply a narrower standard deviation. Bounded normal mode does not apply that 10% central-value floor; it uses the configured interval spread directly. Therefore switching between `lognormal` and `normal` changes both distribution shape and, for very narrow positive intervals, the effective spread. This is a model-internal uncertainty setting, not an empirical confidence interval.

Adaptive log-normal and logit-normal sampling is median-anchored after truncation. The sampler adjusts the transformed normal center before drawing from the bounded interval so the q50 value of an individual sampled parameter remains at the configured central value even when the min/max bounds are asymmetric. This avoids a systematic median shift in `customInput` and `globalEnvelope` runs where a central value sits near one side of its interval.

All modes respect the configured ranges. Probability-like values are constrained to valid probability ranges. Positive count-like values are constrained to non-negative values. If a parameter that is sampled from its visible min/max interval has inconsistent bounds — minimum greater than maximum, or a central value outside `[min, max]` — Monte Carlo is blocked and a configuration warning is shown until the bounds are corrected; the bounds are not silently expanded or swapped, and no Monte Carlo result is produced or exported for that state.

## Preset and Modified-Preset State

Unedited named presets carry an explicit scenario state. Their default Monte Carlo basis is `presetLocal`, meaning q50/median is expected to remain close to the deterministic preset result because each sampled parameter distribution is centered on the selected preset central value.

If the user edits a preset value or a preset min/max field, the scenario becomes a modified preset and auto-mode Monte Carlo uses `modifiedPresetLocal`: edited fields are sampled from their visible bounds, while unchanged preset fields keep clean scenario-local preset uncertainty. This prevents a single edit from widening unrelated preset fields. Explicit `presetLocal` remains strict and uses the origin preset's central values and preset-local uncertainty instead of the modified visible fields. Full `customInput` sampling (all fields from their visible central values and visible bounds) applies only when the user explicitly selects it. If all edited fields are restored to their preset defaults, the scenario returns to a clean preset and auto-mode Monte Carlo returns to `presetLocal`.

## Uncertainty Profiles

The UI provides four sampling profiles:

- `Conservative/narrow`: 25% spread, adaptive log/logit-normal distribution, standard Monte Carlo, independent factors.
- `Balanced/default`: 50% spread, adaptive log/logit-normal distribution, standard Monte Carlo, independent factors.
- `Broad exploratory`: 75% spread, adaptive log/logit-normal distribution, Latin Hypercube sampling, independent factors, and `globalEnvelope` basis.
- `Stress-test extremes`: 100% spread, uniform interval sampling, Latin Hypercube sampling, `globalEnvelope` basis, and the robust bounds envelope enabled.

These profiles change only the uncertainty propagation settings. They do not change the deterministic central-value calculation.

## Latin Hypercube Sampling

When the `lhs` engine is selected, the sampler builds a Latin Hypercube sequence for each samplable parameter. Each sequence divides the unit interval into equal strata, draws one point inside each stratum, then shuffles the sequence. The parameter sampler maps those quantiles through the selected distribution.

LHS is intended to cover the uncertainty interval more evenly than ordinary independent random draws at the same sample count. It does not make the scientific assumptions more certain; it only changes how the uncertainty space is explored.

## Correlation Behavior

The default correlation mode is independent factors. This avoids adding an artificial covariance structure that has not been measured.

The optional heuristic scaffold adjusts:

- `f_magnetosphere` based on deviations in `f_size`
- `f_tilt` based on deviations in `f_lunar_stability`

The independent mode skips this heuristic and leaves sampled factors independent. The heuristic is intentionally modest and should be treated as a model assumption, not a measured covariance matrix.

## Seeded Versus Unseeded Mode

Normal UI usage is unseeded and uses ordinary runtime randomness. Re-running the same Monte Carlo settings can produce different sample sequences and slightly different summary values.

Audit/test/export usage can provide a seed:

```js
monteCarloCalculate({ samples: 2000, seed: 12345 })
```

With the same seed and settings, the calculator uses a deterministic PRNG and reproduces the same sample sequence exactly. Different seeds should produce different sample sequences.

## Why Exploratory Values Differ

Exact Monte Carlo values differ in exploratory mode because random sampling changes the sampled parameter combinations. The deterministic estimate is a single central-value calculation; the Monte Carlo q50 median, arithmetic mean, and q2.5-q97.5 interval are separate summaries of sampled uncertainty around that central state.

Different engines, distributions, correlation modes, bounds, and optional advanced modules can all change the output. This is expected behavior.

## 2.5% and 97.5% Sampled Model Intervals

The displayed 95% sampled model interval is the empirical interval from the sorted Monte Carlo sample:

- `q2.5` is the 2.5th percentile of simulated outcomes.
- `q97.5` is the 97.5th percentile of simulated outcomes.

This interval describes the spread of outcomes under the selected model assumptions and configured parameter ranges. It is not a formal confidence interval from observational survey data, and it is not a probability statement that the true galaxy contains a value inside that interval.

## Source Basis

- JCGM 101:2008, `Evaluation of measurement data - Supplement 1 to the Guide to the expression of uncertainty in measurement - Propagation of distributions using a Monte Carlo method`, https://www.bipm.org/documents/20126/2071204/JCGM_101_2008_E.pdf
