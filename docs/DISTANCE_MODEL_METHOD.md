# Distance Model Method

The nearest-distance panel uses Poisson point-process approximations. These are geometric model expectations, not catalogue predictions of known planets.

## Uniform Comparison Models

The older comparison models treat modelled Earth-like candidates as uniformly distributed in a selected GHZ geometry:

- 2D GHZ annulus;
- 3D GHZ disk;
- 3D shell-style reference.

For a homogeneous Poisson process with constant intensity `lambda`, the nearest-neighbour expectation is:

`E[D] = Gamma(1 + 1/d) / (lambda * V_d)^(1/d)`

where `d` is the spatial dimension and `V_d` is the unit-ball volume in that dimension. This is mathematically coherent, but it assumes uniform density inside the chosen geometry.

## Radial GHZ Density Model

The default Milky Way distance reference now uses a radial-density Poisson approximation. The model assumes an exponential stellar disk, applies the GHZ radial boundaries, applies the same simplified metallicity and supernova-survival weighting used by the radial GHZ module, and normalizes the resulting intensity to the selected planet count.

For an inhomogeneous Poisson process with spatial intensity `lambda(x)`, the probability of finding no point inside a search region `B(r)` is:

`P(D > r) = exp(-Lambda(r))`

where:

`Lambda(r) = integral over B(r) of lambda(x) dx`

The expected nearest distance is then computed numerically as:

`E[D] = integral from 0 to infinity of exp(-Lambda(r)) dr`

In the calculator, `B(r)` is an observer-centred circle around the solar-neighbourhood reference radius, and `lambda(R)` varies with galactocentric radius. This keeps the Poisson framework but removes the strongest uniform-density assumption.

## Local Neighbourhood Counts

The Local neighbourhood panel uses the same active distance model as the headline nearest-distance result. If the active reference is the radial GHZ density model, local counts are computed as `Lambda(r)` inside observer-centred search circles. If a uniform 2D or 3D comparison model is selected instead, the local counts use that model's matching surface or volume density.

The headline nearest-distance value and the local-count pills are different statistics. The headline value is the mean nearest-neighbour distance `E[D]`; the local pills show `Lambda(r)`, the expected count inside radius `r`. `Lambda(E[D])` is not required to equal 1. Under the Poisson assumption, the probability of at least one object inside radius `r` is `1 - exp(-Lambda(r))`.

This avoids comparing a radial 2D nearest-distance estimate against an unrelated 3D spherical local-volume estimate.

## Interpretation Limits

The radial model is still a simplified model. It does not simulate spiral arms, local stellar clustering, migration, detailed metallicity distributions, real planet catalogues, or time-dependent star formation. It should be read as a better geometric expectation than the uniform models, not as a measured nearest model-selected Earth-like candidate distance.

## Source Basis

- Chandrasekhar 1943, `Stochastic Problems in Physics and Astronomy`, Review of Modern Physics 15, for the classical nearest-neighbour/random stellar-distribution framing.
- Freeman 1970, `On the Disks of Spiral and S0 Galaxies`, https://doi.org/10.1086/150474, for the exponential disk context.
- Lineweaver et al. 2004, `The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way`, https://arxiv.org/abs/astro-ph/0401024, for the GHZ annular/time-dependent framing.
