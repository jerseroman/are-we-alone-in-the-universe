# PARSEC-TAMS host-selection method note

The canonical JJ host provider defines the main-sequence condition with the public Berger/Huber PARSEC terminal-age main-sequence (TAMS) boundary rather than the former fixed `logg > 4.3` proxy. For each JJ stellar-assembly row, the stellar radius is reconstructed as

`Rstar/Rsun = sqrt[(Mf/Msun) * 10^(logg_sun - logg)]`,

with `logg_sun = 4.438`, and the row is retained when `Rstar <= R_TAMS(Teff)`. A separate `logg < 7` condition is retained only as a compact-remnant veto because the one-sided TAMS upper-radius boundary would otherwise admit very compact synthetic remnants. An independent luminosity-temperature radius reconstruction,

`Rstar/Rsun = 10^(logL/2) * (5772/Teff)^2`,

is used as a consistency diagnostic.

## TAMS source and interpolation

The frozen one-dimensional boundary is the public `tams_parsec.txt` table from `danxhuber/evolstate`. A verbatim repository copy is stored under `reference-data/tams_parsec_danxhuber.txt` and is protected by SHA-256 `d2c47b264a298a599064a9e58f19f309886e7b96f36cc9603c9ca55494f87aac`. The upstream table is based on PARSEC v1.2S solar-composition tracks (`Z=0.017`, `Y=0.279`). The associated public generator identifies TAMS from the first `PHASE == 7` point of each evolutionary track and reconstructs radius from luminosity and effective temperature.

Within the project G-star interval, interpolation is linear in `Teff` and `log10(R_TAMS/Rsun)`. Extrapolation outside the reference table is forbidden. The published low-temperature table anchor `(5200 K, 1.15 Rsun)` is retained as part of the frozen Berger/Huber boundary. Direct regeneration from the currently public PARSEC track archive reproduces the physical reference points from 5390.13944 through 6060.24246 K to better than `5e-6 K` in temperature and `3e-6` in relative radius; the special 5200-K boundary anchor is not produced by the current phase-7 track set under the generator's `<20 Gyr` condition.

## Metallicity-transfer limitation and sensitivity test

The canonical Berger/Huber TAMS boundary is a one-dimensional relation `R_TAMS(Teff)` and has no explicit `[Fe/H]` coordinate. It is intentionally retained as the primary selector because it most closely matches the evolutionary-state selection inherited by the Bryson/Kepler occurrence-rate calibration. This is an approximation, not a claim that the TAMS radius is metallicity-independent.

JJ stellar-assembly tables carry a row-level `FeH` value assigned from the model age-metallicity relation. In the canonical 7–9 kpc sample, 19.8939% of the integrated one-dimensional-TAMS host weight is assigned to the thick disk. A dedicated sensitivity test therefore evaluated a metallicity-dependent PARSEC TAMS correction on the exact same weighted JJ parent population.

To avoid replacing the empirically inherited Berger/Huber absolute boundary with a differently constructed absolute track envelope, the sensitivity is formulated differentially:

`R_TAMS,2D(T,Z) = R_TAMS,Huber(T) * R_TAMS,PARSEC(T,Z) / R_TAMS,PARSEC(T,Z_solar)`.

Thus the sensitivity selector is identically equal to the frozen canonical selector at solar metallicity, while public PARSEC v1.2S tracks supply only the metallicity response. PARSEC scaled-solar metallicity anchors bracket the actual JJ parent range `-0.9056 <= FeH <= +0.4158`. Raw phase-7 curves use the available low-mass track horizon up to 30 Gyr to maintain complete 5300–6000 K coverage. For this sensitivity calculation JJ `FeH` is treated as scaled-solar `[M/H]`; alpha enhancement is not modeled and remains a limitation.

For the Lineweaver 7–9 kpc domain, replacing the one-dimensional selector by this differential metallicity-dependent selector changes:

- `N_G`: 263,061,992.37 -> 267,357,883.68 (**+1.6330%**),
- `Lambda_ESHZ`: 105,716,685.08 -> 107,436,371.65 (**+1.6267%**),
- `Lambda_earth10`: 3,376,462.67 -> 3,430,154.46 (**+1.5902%**).

The thin-disk host contribution increases by approximately 1.388%, and the thick-disk contribution by approximately 2.620%. The resulting thick-disk host fraction is 20.087%, compared with 19.894% in the canonical one-dimensional selection. Across the full JJ 4–14 kpc model domain, the corresponding L2 change is +2.375%.

Therefore the metallicity dependence of the TAMS boundary is **not negligible but is modest relative to the major occurrence/HZ systematics** in this implementation. Importantly, the weighted aggregate test does not support assuming a priori that the solar one-dimensional boundary must always be overly permissive for the metal-poor population; the direction is population- and temperature-dependent and is treated empirically as a model sensitivity.

No absolute `P_metals` multiplier is introduced. The TAMS metallicity test concerns stellar evolutionary-state classification only. Any metallicity dependence of planet occurrence would require a separate occurrence-rate transport model.

## Reproducibility diagnostics

For the dR = 0.5 kpc validation run, the legacy `4.3 < logg < 7` selection is a strict subset of the canonical TAMS selection. The TAMS provider adds late-main-sequence G stars that the fixed-gravity threshold removed. The resulting canonical 7–9 kpc host count is `263061992.37` and the canonical L2 plug-in baseline is `3376462.67`.

A separate final radial-convergence experiment fully regenerated the final TAMS model at dR = 1.0, 0.5, and 0.25 kpc. The 0.5-to-0.25-kpc changes are +0.1752% in `N_G`, +0.1997% in L1, and +0.2307% in L2, all below the predeclared 1% publication tolerance. The production grid therefore remains dR = 0.5 kpc.
