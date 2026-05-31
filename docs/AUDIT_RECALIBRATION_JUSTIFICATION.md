# Audit Recalibration Justification

## N_GHZ GHZ Star-Count Prior

`N_GHZ` was re-baselined from `5e9` to `1e10` for the default Kepler/Gaia and Consensus scenarios. The value `5e9` is retained as a strict Rare Earth lower-bound prior. The value `4e10` is retained as an upper Lineweaver-style prior.

None of these are direct star-count values quoted by Lineweaver et al. 2004. They are literature-informed GHZ star-count priors derived from Lineweaver-style GHZ reasoning and adopted Milky Way star-count assumptions.

The preset structure is:

- Pessimist / Rare Earth Stress Test: `N_GHZ = 5e9`.
- Consensus / Lineweaver: `N_GHZ = 1e10`.
- Kepler/Gaia / Bryson: `N_GHZ = 1e10`.
- High-End / Literature Bounds: `N_GHZ = 4e10`.

Users should expect deterministic outputs to change because `N_GHZ` is a leading multiplicative factor. The previous Kepler/Gaia result was about `5,262`; changing only `N_GHZ` from `5e9` to `1e10` approximately doubles that result to about `10,525`. This is an expected recalibration effect, not a bug.

## Calibration Badge Taxonomy

The calculator uses four calibration badges:

- `LC` = direct literature/reference value.
- `LI` = literature-informed numerical prior.
- `MS` = mechanism-supported model prior.
- `MP` = speculative/user model prior.

`MS` is not a failure label; it indicates that the cited literature supports the mechanism but not the exact displayed number. `MP` is not necessarily wrong; it marks scenario/user-driven assumptions. `LC` is the only class that should be interpreted as direct literature/reference calibration.

## Post-audit Transparency Notes (v2.13)

After the full Math/Fermi audit, additional UI transparency was added for conceptually overlapping filters, Fermi-tension heuristic buckets, and maintenance risks around duplicated citation metadata. These changes do not alter formulas or numerical defaults. The specific items:

- Configuration alerts panel now flags compound atmosphere/shielding stacks, binary + stability stacks, and radiation/shielding stacks when relevant modules and base factors are simultaneously restrictive.
- Each advanced module that multiplies (rather than replaces) a conceptually related base factor now carries an overlap-context note inside its body.
- Fermi-paradox tension category text now appends "Fermi-tension labels are heuristic UI buckets... They are not literature-defined thresholds."
- `src/share.js` exportBibtex carries a maintenance comment pointing to the parallel registry in `src/scientific-parameters.js`.
- The 0.85 GHZ outer and 0.26 GHZ inner annular fractions are now named constants (`GHZ_OUTER_FRAC`, `GHZ_INNER_FRAC`); numeric behaviour is unchanged.
- A `<noscript>` block warns no-JavaScript users that the calculator requires JavaScript for preset loading, Monte Carlo, and exports.
