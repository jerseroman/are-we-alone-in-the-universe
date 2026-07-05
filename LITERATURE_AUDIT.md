# Literature Audit

![provenance_schema](https://img.shields.io/badge/provenance_schema-PASS-green) ![direct_preset_quotes](https://img.shields.io/badge/direct_preset_quotes-PARTIAL-yellow) ![preset_values](https://img.shields.io/badge/preset_values-64-blue) ![evidence_entries](https://img.shields.io/badge/evidence_entries-16-blue)

This audit checks whether every named preset number in `SCIENTIFIC_PARAMETER_REGISTRY.presets` has an explicit provenance path. It records the source link, a compact quoted evidence text where available, quoted numbers, the calibration class, and whether the preset number itself is directly quoted by the literature or is an internal literature-informed/model prior.

Important scope note: most preset numbers in this calculator are not claimed to be exact numbers copied from a paper. They are documented as registry lower bounds, central values, upper bounds, or internal scenario values inside literature-informed intervals. `provenance_schema=PASS` means the provenance classification is explicit and internally consistent. `direct_preset_quotes=PARTIAL` means only the listed preset values have a direct numeric quote; the remaining values are model-derived priors and must not be described as quoted literature numbers.

## Summary

| Item | Value |
| --- | --- |
| Provenance schema status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Direct preset-value quote status | ![PARTIAL](https://img.shields.io/badge/PARTIAL-yellow) |
| Generated at | `2026-07-05T21:21:24.992Z` |
| Calculator version | `2.18` |
| Registry version | `1.0.0` |
| Presets checked | `4` |
| Parameters checked | `16` |
| Preset numeric values checked | `64` |
| Evidence entries | `16` |
| Parameters with direct numeric quote evidence | `1` |
| Preset values with direct numeric quote coverage | `3/64` |
| Literature-informed/model-prior entries | `15` |
| Failures | `0` |
| Warnings | `0` |

## Calibration Classes

| Class | Meaning |
| --- | --- |
| LC | Direct literature/reference calibration. |
| LI | Literature-informed numerical prior; source supports context, but the exact value is an internal prior. |
| MS | Mechanism-supported model prior; source supports the mechanism, not an exact occurrence value. |
| MP | Speculative/model/user prior; not a direct literature-backed numeric value. |

## Parameter Evidence

| Evidence ID | Parameter | Citation | Link | Quoted evidence text | Quoted numbers | Directly quoted preset values | Text type | Class | Value claim |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LIT-N-GHZ | N_GHZ | Lineweaver et al. 2004 | https://doi.org/10.1126/science.1092322 | an annular region between 7 and 9 kiloparsecs | 7, 9 | none | abstract excerpt | LI | GHZ star-count preset values are derived from GHZ framing and Milky Way star-count assumptions, not quoted star counts. |
| LIT-F-SUN-TYPE | f_sun_type | Henry 2006; Gaia DR3 2022/2023 | https://doi.org/10.1086/508233 | No direct preset-value quote recorded. | none | none | audit finding | LI | Host-star fraction is an interpretive solar-type range, not a quoted census fraction. |
| LIT-F-SUN-AGE | f_sun_age | Lineweaver et al. 2004 | https://doi.org/10.1126/science.1092322 | 75% of the stars in the GHZ are older than the Sun | 75% | 0.75 | abstract excerpt | LI | The 0.75 central value is directly anchored to the quoted 75% GHZ-age statement; 0.60 and 0.80 remain interval choices. |
| LIT-N-P-STAR | N_p_star | Cassan 2012; Hsu 2019 | https://doi.org/10.1038/nature10684 | stars are orbited by planets as a rule, rather than the exception | none | none | abstract excerpt | LI | Planet multiplicity values are selected inside broad occurrence-rate context, not directly quoted as 1.0/1.5/1.6/2.0. |
| LIT-F-COMPOSITION | f_composition | Dressing 2015; Rogers 2015 | https://doi.org/10.1088/0004-637X/807/1/45 | the majority of 1.6 Earth-radius planets are too low density | 1.6 | none | abstract excerpt | LI | Rocky-fraction values are model splits inside a literature-informed radius/composition context. |
| LIT-F-ORBIT | f_orbit | Bryson et al. 2021; Kopparapu et al. 2013 | https://doi.org/10.3847/1538-3881/abc418 | conservative HZ is between 0.37 and 0.60 planets per star | 0.37, 0.60 | none | abstract excerpt | LI | Bryson quotes eta-Earth as a combined occurrence rate; f_orbit preset values are factorized model proxies. |
| LIT-F-STABILITY | f_stability | Lissauer et al. 2011; Steffen et al. 2012 | https://ui.adsabs.harvard.edu/abs/2011ApJS..197....8L/abstract | No direct preset-value quote recorded. | none | none | audit finding | MS | Orbital-stability values are mechanism-supported model priors. |
| LIT-F-MAGNETOSPHERE | f_magnetosphere | Zuluaga 2013 | https://doi.org/10.1088/0004-637X/770/1/23 | No direct preset-value quote recorded. | none | none | audit finding | MS | Magnetic/atmospheric retention values are mechanism-supported model priors. |
| LIT-F-LUNAR-STABILITY | f_lunar_stability | Lissauer 2012; Laskar 1993 | https://doi.org/10.1016/j.icarus.2011.10.013 | No direct preset-value quote recorded. | none | none | audit finding | MS | Moon/stabilizer values are mechanism-supported climate-stability priors. |
| LIT-F-SIZE | f_size | Rogers 2015; Fulton 2017 | https://doi.org/10.1088/0004-637X/801/1/41 | the majority of 1.6 Earth-radius planets are too low density | 1.6 | none | abstract excerpt | LI | Earth-size window values are literature-informed, not a quoted universal occurrence fraction. |
| LIT-F-ROTATION | f_rotation | Edson 2011; Way & Del Genio 2020 | https://doi.org/10.1016/j.icarus.2010.11.023 | No direct preset-value quote recorded. | none | none | audit finding | MS | Rotation-suitability values are mechanism-supported climate priors. |
| LIT-F-TILT | f_tilt | Lissauer 2012; Linsenmeier 2015 | https://doi.org/10.1016/j.icarus.2011.10.013 | No direct preset-value quote recorded. | none | none | audit finding | MS | Axial-tilt values are mechanism-supported climate-stability priors. |
| LIT-F-H2O | f_H2O | Tian & Ida 2015; Mulders 2015 | https://doi.org/10.1038/ngeo2372 | No direct preset-value quote recorded. | none | none | audit finding | MS | Surface-water values are mechanism-supported water-availability priors. |
| LIT-F-CHNOPS | f_CHNOPS | Krijt et al. 2022; Hinkel et al. 2020 | https://arxiv.org/abs/2203.10056 | CHNOPS are likely crucial to most habitable worlds | none | none | abstract excerpt | MS | CHNOPS values are mechanism-supported chemical-habitability priors. |
| LIT-F-COMPLEX-LIFE | f_complex_life | Sandberg et al. 2018; Kipping 2020 | https://arxiv.org/abs/1806.02404 | uncertainties that span multiple orders of magnitude | none | none | abstract excerpt | MP | Complex-life values are broad exploratory biological-filter priors. |
| LIT-F-X | f_x | User defined | not applicable | User-defined wildcard factor; no literature-backed numeric claim. | none | none | local model-scope statement | MP | Wildcard values are intentionally user/model defined and outside literature-backed claims. |

## Preset Number Trace Matrix

| Preset | Parameter | Value | Registry interval | Basis | Evidence ID | Quoted numbers | Class | Direct preset-value quote? | Status |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| pessimist | N_GHZ | 5000000000 | [5000000000, 10000000000, 40000000000] | registry lower bound | LIT-N-GHZ | 7, 9 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_sun_type | 0.07 | [0.07, 0.08, 0.2] | registry lower bound | LIT-F-SUN-TYPE | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_sun_age | 0.6 | [0.6, 0.75, 0.8] | registry lower bound | LIT-F-SUN-AGE | 75% | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | N_p_star | 1 | [1, 1.5, 2.5] | registry lower bound | LIT-N-P-STAR | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_composition | 0.15 | [0.15, 0.2, 0.35] | registry lower bound | LIT-F-COMPOSITION | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_orbit | 0.1 | [0.1, 0.18, 0.21] | registry lower bound | LIT-F-ORBIT | 0.37, 0.60 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_stability | 0.3 | [0.3, 0.5, 0.7] | registry lower bound | LIT-F-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_magnetosphere | 0.2 | [0.2, 0.5, 0.7] | registry lower bound | LIT-F-MAGNETOSPHERE | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_lunar_stability | 0.4 | [0.4, 0.7, 0.9] | registry lower bound | LIT-F-LUNAR-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_size | 0.3 | [0.3, 0.5, 0.65] | registry lower bound | LIT-F-SIZE | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_rotation | 0.15 | [0.15, 0.27, 0.35] | registry lower bound | LIT-F-ROTATION | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_tilt | 0.4 | [0.4, 0.6, 0.85] | registry lower bound | LIT-F-TILT | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_H2O | 0.1 | [0.1, 0.3, 0.8] | registry lower bound | LIT-F-H2O | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_CHNOPS | 0.05 | [0.05, 0.1, 0.5] | registry lower bound | LIT-F-CHNOPS | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_complex_life | 0.000001 | [1e-9, 0.01, 1] | inside registry interval | LIT-F-COMPLEX-LIFE | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | N_GHZ | 10000000000 | [5000000000, 10000000000, 40000000000] | registry central value | LIT-N-GHZ | 7, 9 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_sun_type | 0.08 | [0.07, 0.08, 0.2] | registry central value | LIT-F-SUN-TYPE | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | 75% | LI | yes | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | N_p_star | 1.5 | [1, 1.5, 2.5] | registry central value | LIT-N-P-STAR | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_composition | 0.2 | [0.15, 0.2, 0.35] | registry central value | LIT-F-COMPOSITION | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_orbit | 0.18 | [0.1, 0.18, 0.21] | registry central value | LIT-F-ORBIT | 0.37, 0.60 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_stability | 0.5 | [0.3, 0.5, 0.7] | registry central value | LIT-F-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_magnetosphere | 0.5 | [0.2, 0.5, 0.7] | registry central value | LIT-F-MAGNETOSPHERE | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_lunar_stability | 0.7 | [0.4, 0.7, 0.9] | registry central value | LIT-F-LUNAR-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_size | 0.5 | [0.3, 0.5, 0.65] | registry central value | LIT-F-SIZE | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_rotation | 0.27 | [0.15, 0.27, 0.35] | registry central value | LIT-F-ROTATION | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_tilt | 0.6 | [0.4, 0.6, 0.85] | registry central value | LIT-F-TILT | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_H2O | 0.3 | [0.1, 0.3, 0.8] | registry central value | LIT-F-H2O | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_CHNOPS | 0.1 | [0.05, 0.1, 0.5] | registry central value | LIT-F-CHNOPS | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_complex_life | 0.01 | [1e-9, 0.01, 1] | registry central value | LIT-F-COMPLEX-LIFE | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | N_GHZ | 40000000000 | [5000000000, 10000000000, 40000000000] | registry upper bound | LIT-N-GHZ | 7, 9 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_sun_type | 0.2 | [0.07, 0.08, 0.2] | registry upper bound | LIT-F-SUN-TYPE | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | 75% | LI | yes | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | N_p_star | 2 | [1, 1.5, 2.5] | inside registry interval | LIT-N-P-STAR | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_composition | 0.35 | [0.15, 0.2, 0.35] | registry upper bound | LIT-F-COMPOSITION | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_orbit | 0.21 | [0.1, 0.18, 0.21] | registry upper bound | LIT-F-ORBIT | 0.37, 0.60 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_stability | 0.7 | [0.3, 0.5, 0.7] | registry upper bound | LIT-F-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_magnetosphere | 0.7 | [0.2, 0.5, 0.7] | registry upper bound | LIT-F-MAGNETOSPHERE | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_lunar_stability | 0.9 | [0.4, 0.7, 0.9] | registry upper bound | LIT-F-LUNAR-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_size | 0.65 | [0.3, 0.5, 0.65] | registry upper bound | LIT-F-SIZE | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_rotation | 0.35 | [0.15, 0.27, 0.35] | registry upper bound | LIT-F-ROTATION | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_tilt | 0.85 | [0.4, 0.6, 0.85] | registry upper bound | LIT-F-TILT | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_H2O | 0.8 | [0.1, 0.3, 0.8] | registry upper bound | LIT-F-H2O | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_CHNOPS | 0.5 | [0.05, 0.1, 0.5] | registry upper bound | LIT-F-CHNOPS | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_complex_life | 1 | [1e-9, 0.01, 1] | registry upper bound | LIT-F-COMPLEX-LIFE | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | N_GHZ | 10000000000 | [5000000000, 10000000000, 40000000000] | registry central value | LIT-N-GHZ | 7, 9 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_sun_type | 0.08 | [0.07, 0.08, 0.2] | registry central value | LIT-F-SUN-TYPE | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | 75% | LI | yes | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | N_p_star | 1.6 | [1, 1.5, 2.5] | inside registry interval | LIT-N-P-STAR | none | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_composition | 0.25 | [0.15, 0.2, 0.35] | inside registry interval | LIT-F-COMPOSITION | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_orbit | 0.21 | [0.1, 0.18, 0.21] | registry upper bound | LIT-F-ORBIT | 0.37, 0.60 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_stability | 0.5 | [0.3, 0.5, 0.7] | registry central value | LIT-F-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_magnetosphere | 0.5 | [0.2, 0.5, 0.7] | registry central value | LIT-F-MAGNETOSPHERE | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_lunar_stability | 0.7 | [0.4, 0.7, 0.9] | registry central value | LIT-F-LUNAR-STABILITY | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_size | 0.55 | [0.3, 0.5, 0.65] | inside registry interval | LIT-F-SIZE | 1.6 | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_rotation | 0.27 | [0.15, 0.27, 0.35] | registry central value | LIT-F-ROTATION | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_tilt | 0.6 | [0.4, 0.6, 0.85] | registry central value | LIT-F-TILT | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_H2O | 0.3 | [0.1, 0.3, 0.8] | registry central value | LIT-F-H2O | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_CHNOPS | 0.15 | [0.05, 0.1, 0.5] | inside registry interval | LIT-F-CHNOPS | none | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_complex_life | 0.01 | [1e-9, 0.01, 1] | registry central value | LIT-F-COMPLEX-LIFE | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | none | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |

## Findings

- No missing evidence entries, missing source-text anchors, missing literature links for literature-backed entries, non-numeric preset values, or out-of-interval preset values were found.

- No warnings were recorded.

## Interpretation Boundary

This audit verifies provenance traceability for preset numbers. It does not independently validate the cited scientific papers, does not prove that the selected priors are empirically correct, and does not convert mechanism-supported or model-prior values into direct literature measurements.
