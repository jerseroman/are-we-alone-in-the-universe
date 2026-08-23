# ExoEarth Annulus manuscript v4 -- draft release notes

This draft release freezes the corrected statistical production series and the
resulting AASTeX manuscript v4.

## Principal result

For the frozen old G-star host population in the Milky Way's 7--9 kpc annulus,
the host count is 263,061,992.37. The separate completeness scenarios project:

- constant-completeness median: 3.224 million narrow-domain candidates
  (16th--84th percentiles: 1.522--6.189 million);
- zero-completeness median: 4.572 million
  (16th--84th percentiles: 2.103--8.912 million).

All 400 outer realizations in each branch pass the declared adaptive
convergence gate. The two branches are scenarios and are not pooled into a
single uncertainty interval.

## Interpretation boundary

The exact nominal DR25 target contains zero candidates and zero summed
reliability, and more than 95% of corrected catalog realizations also contain
zero. These values are therefore conditional projections of a fitted separable
occurrence surface through the frozen JJ/PARSEC/TAMS population. They are not a
direct locally supported occurrence measurement, a full astrophysical
uncertainty budget, or an estimate of inhabited worlds.

## Audit trail

- pilot run: 32470830404;
- superseded partially failed production attempt: 32472776218 (successful
  constant aggregate retained; failed 20,000-step zero aggregate excluded);
- extended zero-completeness run: 32506666772;
- constant-branch Galactic propagation run: 32527877921;
- archived fixed-vector predecessor commit:
  `5a3528aea6d6f28da8e9db4d40f0c84cbb43d501` (not the exact source of the
  attached current v3 PDF);
- current v3 reference PDF SHA-256:
  `0cdbfae23478b2bc28477b0cb26746e0f486ec584f803b1517336d35ebf13f29`;
- the previously cited concept DOI `10.5281/zenodo.20474527` belongs to the
  Earth-like Planet Calculator and is not used as this manuscript's project
  DOI;
- the analysis software and reproducibility materials are archived as
  `ExoEarth Annulus v4 Software`, version 4.0.2, under the version-specific DOI
  `10.5281/zenodo.22070762`. The corresponding public source release is tag
  `v4.0.2` in `jerseroman/exoearth-annulus-v4-software`.

The attached release audit and archive manifest provide the exact v4 source
commit and SHA-256 checksum for every distributed file.
