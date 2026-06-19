# Parameter Registry

The calculator keeps an auditable scientific parameter registry in `src/scientific-parameters.js`. The registry records the central value, min/max bounds, source metadata, and value semantics for the core parameters used by the base calculator.

The registry is a transparency aid inside a literature-informed exploratory model. It does not turn the calculator into proof of extraterrestrial life, an empirical census of life, or a definitive astronomical estimate.

## Central Value

The `central` value is the value loaded into the calculator as the default midpoint for a parameter. Deterministic calculations use central values unless the user changes the inputs or loads a scenario preset.

Scenario presets can set different central values. Selecting a named preset resets the displayed min/max fields to the registry/default bounds, then unedited named presets use scenario-local Monte Carlo sampling bands centered on the selected preset central values.

## Min/Max Bounds

The `min` and `max` values define the custom/global interval exposed in the parameter cards. Loading a named scenario resets stale visible min/max edits before applying the preset's central values. Named scenario presets use `presetLocal` transformed-space bands centered on their central values by default, while explicit `presetLocal` always remains strict preset-local sampling and explicit `globalEnvelope` mode uses the broad visible registry/user bounds. If the user edits a preset value or min/max field, the scenario becomes a modified preset and auto-mode Monte Carlo uses `modifiedPresetLocal`: edited fields use their visible bounds while unchanged preset fields keep scenario-local preset uncertainty. Full `customInput` sampling applies only when the user explicitly selects it. These bounds are uncertainty controls for the calculator, not necessarily exact lower and upper limits reported by a single paper.

For probability-like parameters, runtime validation constrains values to valid probability ranges. For positive count-like parameters, runtime validation constrains values to non-negative values.

## Value Type

Each parameter has a `valueType` field:

- `direct`: the value is intended to follow a literature value closely.
- `transformed`: the value is derived from a source concept by conversion or model-specific mapping.
- `interpretive_midpoint`: the value is a model midpoint chosen within a literature-informed range.
- `user_defined`: the value is intentionally controlled by the user and is not claimed as a literature value.

If an exact table, page, or section is not yet recorded, the registry uses `exactLocation: null` and `needsCitationPrecision: true`.

## User-Defined `f_x`

`f_x` is a wildcard factor for unknown filters. It is explicitly marked as:

```js
valueType: "user_defined"
isLiteratureBacked: false
```

`f_x` must remain outside literature-backed preset claims. It can be useful for user exploration, but it should not be presented as a published parameter.

## N_GHZ GHZ Star-Count Prior

`N_GHZ` is marked as a literature-informed interpretive prior, not as a directly quoted literature value.

Lineweaver et al. 2004 define the Galactic Habitable Zone as a time-dependent annular region and age/metallicity/supernova framing. They do not directly quote a fixed GHZ star-count value for this calculator.

The current preset structure uses:

- `5e9`: strict Rare Earth lower-bound GHZ prior.
- `1e10`: balanced conservative Lineweaver-informed default used by Consensus and Kepler/Gaia.
- `4e10`: upper Lineweaver-style GHZ prior.

These values are GHZ star-count priors derived from GHZ reasoning and adopted Milky Way star-count assumptions. Users should expect deterministic outputs to change when `N_GHZ` changes because it is a leading multiplicative factor.

## Calibration Badge Taxonomy

The calculator uses compact calibration badges beside displayed defaults:

- `LC`: direct literature/reference value. The value is directly anchored in cited literature, directly transformed from cited literature, or is a standard astronomical reference default.
- `LI`: literature-informed numerical prior. The cited literature supports the approximate numerical context, but the displayed value is a model prior rather than a directly quoted value.
- `MS`: mechanism-supported model prior. The cited literature supports the mechanism, but it does not provide the exact displayed numerical value or range.
- `MP`: speculative/user model prior. The value is a scenario assumption, user-defined factor, philosophical prior, or broad modelling control rather than a directly literature-calibrated quantity.

`MS` is not a failure label. It means the mechanism is scientifically motivated while the numeric value is model-level.

`MP` is not necessarily wrong. It means the value is speculative, scenario-driven, or user-defined and should not be read as literature calibration.

`LC` is the only class that should be interpreted as direct literature/reference calibration.

## Galaxy Settings Source Note

Galaxy Settings are user-defined model inputs. Star counts, disk geometry, thickness, and distance values are approximate configurable priors unless a specific source table is selected and cited for a future named-galaxy preset.

Future recalibration note: if named-galaxy presets are reintroduced, their star counts and geometry should be reviewed against one consistent stellar-mass or star-count source table before being presented as calibrated defaults.

## Exploratory Status

This calculator is an exploratory modelling tool. It exposes assumptions, ranges, and uncertainty propagation so users can inspect how sensitive the result is to those assumptions.

It should not be interpreted as any of the following:

- It is not proof of extraterrestrial life.
- It is not proof of absence of extraterrestrial life.
- It is not an empirical census of life.
- It is not a definitive estimate of inhabited worlds.
- It is not settled scientific consensus.

The registry exists to make assumptions easier to audit and correct. Values marked as transformed or interpretive should be reviewed against their cited literature before being described as exact published values.
