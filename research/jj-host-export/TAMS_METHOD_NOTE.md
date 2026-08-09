# PARSEC-TAMS host-selection method note

The canonical JJ host provider defines the main-sequence condition with the public Berger/Huber PARSEC terminal-age main-sequence (TAMS) boundary rather than the former fixed `logg > 4.3` proxy. For each JJ stellar-assembly row, the stellar radius is reconstructed as

`Rstar/Rsun = sqrt[(Mf/Msun) * 10^(logg_sun - logg)]`,

with `logg_sun = 4.438`, and the row is retained when `Rstar <= R_TAMS(Teff)`. A separate `logg < 7` condition is retained only as a compact-remnant veto because the one-sided TAMS upper-radius boundary would otherwise admit very compact synthetic remnants. An independent luminosity-temperature radius reconstruction,

`Rstar/Rsun = 10^(logL/2) * (5772/Teff)^2`,

is used as a consistency diagnostic.

## Metallicity-transfer limitation

The Berger/Huber PARSEC TAMS boundary used here is a one-dimensional relation `R_TAMS(Teff)` and has no explicit `[Fe/H]` coordinate. It is intentionally transferred unchanged to both JJ thin- and thick-disk hosts so that the Galactic host selection remains as close as possible to the main-sequence selection function underlying the Bryson/Kepler occurrence-rate calibration.

This is an approximation, not a claim that the TAMS radius is metallicity-independent. In the corrected 7–9 kpc JJ host sample, 19.8939% of the integrated TAMS-selected host weight is assigned to the thick disk. That population is substantially more metal-poor than the predominantly thin-disk Kepler calibration population. At fixed effective temperature, a metallicity-dependent TAMS boundary can differ from the transferred Berger/Huber relation; in the relevant metal-poor regime the adopted one-dimensional boundary may therefore be too permissive. We treat this as a host-selection/transportability systematic.

No absolute `P_metals` multiplier is introduced to compensate for this limitation. A future metallicity-aware refinement would require a consistently defined `R_TAMS(Teff,[Fe/H])` selector and, separately, an occurrence-rate transport model if planet occurrence itself is to be conditioned on metallicity.

## Reproducibility diagnostic

For the current dR = 0.5 kpc validation run, the legacy `4.3 < logg < 7` selection is a strict subset of the TAMS selection. The TAMS provider adds late-main-sequence G stars that the fixed-gravity threshold removed. The resulting 7–9 kpc host count is approximately `2.63062e8` and the thick-disk host-weight fraction is `0.198939`.
