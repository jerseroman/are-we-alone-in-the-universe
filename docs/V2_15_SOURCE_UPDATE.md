# v2.15 Source and Prior Update

This note records why four mechanism-supported filters were updated in v2.15.
The values remain `interpretive_midpoint` model priors, not directly measured
universal occurrence rates.

| Filter | v2.14 source/value | v2.15 source/value | Reason |
| --- | --- | --- | --- |
| `f_CHNOPS` | Asplund et al. 2009; `0.10 [0.05, 0.50]` | Krijt et al. 2022; Hinkel et al. 2020; `0.10 [0.05, 0.50]` | Krijt et al. address chemical habitability and CHNOPS supply/retention during planet formation, which is closer to the filter than solar photospheric abundances. Hinkel et al. add the phosphorus-limitation uncertainty. The numerical prior is unchanged because neither source supplies a hard population fraction. |
| `f_H2O` | Morbidelli et al. 2012; `0.10 [0.05, 0.30]` | Tian & Ida 2015; Mulders et al. 2015; `0.30 [0.10, 0.80]` | The new sources model water contents and snow-line-driven water delivery for terrestrial planets, so they better match a water-availability fraction than a generic terrestrial-planet volatile-delivery review. The wider interval remains a model prior because stable surface-water retention is not directly measured as a universal frequency. |
| `f_tilt` | Williams & Pollard 2002; Linsenmeier et al. 2015; `0.50 [0.30, 0.65]` | Lissauer et al. 2012; Linsenmeier et al. 2015; `0.60 [0.40, 0.85]` | Lissauer et al. weaken the strict assumption that a large moon is required to keep Earth-like obliquity within habitable bounds. Linsenmeier remains climate context for high-obliquity planets. |
| `f_lunar_stability` | Laskar et al. 1993; Lissauer et al. 2012; `0.50 [0.20, 0.80]` | Lissauer et al. 2012; Laskar et al. 1993; `0.70 [0.40, 0.90]` | Lissauer et al. become the primary source because they directly test moonless-Earth obliquity evolution. Laskar remains the stabilizing-moon contrast case. The DOI anchor is now Lissauer's `10.1016/j.icarus.2011.10.013`. |
| `f_magnetosphere` | Zuluaga et al. 2013; Driscoll & Bercovici 2014; `0.50 [0.20, 0.70]` | unchanged | No robust population-level occurrence source exists for exoplanet dynamos, so the existing mechanism-supported framing remains more honest than adding a weaker source. |

Primary source links:

- Krijt et al. 2022: https://arxiv.org/abs/2203.10056
- Hinkel et al. 2020: https://doi.org/10.3847/2041-8213/abb3cb
- Tian & Ida 2015: https://doi.org/10.1038/ngeo2372
- Mulders et al. 2015: https://arxiv.org/abs/1505.03516
- Lissauer et al. 2012: https://doi.org/10.1016/j.icarus.2011.10.013
