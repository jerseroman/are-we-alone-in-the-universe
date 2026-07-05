# Literature Audit

![PASS](https://img.shields.io/badge/PASS-green) ![preset_values](https://img.shields.io/badge/preset_values-64-blue) ![evidence_entries](https://img.shields.io/badge/evidence_entries-16-blue)

This audit checks whether every named preset number in `SCIENTIFIC_PARAMETER_REGISTRY.presets` has an explicit provenance path. It records the source link, a compact exact source-text anchor, the calibration class, and whether the preset number is a direct numeric quote or an internal literature-informed/model prior.

Important scope note: most preset numbers in this calculator are not claimed to be exact numbers copied from a paper. They are documented as registry lower bounds, central values, upper bounds, or internal scenario values inside literature-informed intervals. A PASS here means the provenance classification is explicit and internally consistent; it does not mean every number is a direct literature quotation.

## Summary

| Item | Value |
| --- | --- |
| Status | ![PASS](https://img.shields.io/badge/PASS-green) |
| Generated at | `2026-07-05T21:05:00.122Z` |
| Calculator version | `2.18` |
| Registry version | `1.0.0` |
| Presets checked | `4` |
| Parameters checked | `16` |
| Preset numeric values checked | `64` |
| Evidence entries | `16` |
| Direct numeric quote claims | `0` |
| Literature-informed/model-prior entries | `16` |
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

| Evidence ID | Parameter | Citation | Link | Exact source text | Text type | Class | Direct numeric quote? | Value claim |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LIT-N-GHZ | N_GHZ | Lineweaver et al. 2004 | https://doi.org/10.1126/science.1092322 | The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way | source title | LI | no | GHZ star-count prior derived from GHZ framing and Milky Way star-count assumptions. |
| LIT-F-SUN-TYPE | f_sun_type | Henry 2006; Gaia DR3 2022/2023 | https://doi.org/10.1086/508233 | The Solar Neighborhood. XVII. Parallax Results from the CTIOPI 0.9 m Program | source title | LI | no | Host-star fraction is an interpretive solar-type range, not a quoted census fraction. |
| LIT-F-SUN-AGE | f_sun_age | Lineweaver et al. 2004 | https://doi.org/10.1126/science.1092322 | The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way | source title | LI | no | Age-qualified host fraction follows the GHZ age framing as an internal preset prior. |
| LIT-N-P-STAR | N_p_star | Cassan 2012; Hsu 2019 | https://doi.org/10.1038/nature10684 | One or more bound planets per Milky Way star from microlensing observations | source title | LI | no | Planet multiplicity prior is selected inside the broad occurrence-rate context. |
| LIT-F-COMPOSITION | f_composition | Dressing 2015; Rogers 2015 | https://doi.org/10.1088/0004-637X/807/1/45 | Most 1.6 Earth-radius Planets are Not Rocky | source title | LI | no | Rocky-fraction values are model splits inside a literature-informed radius/composition context. |
| LIT-F-ORBIT | f_orbit | Bryson et al. 2021; Kopparapu et al. 2013 | https://doi.org/10.3847/1538-3881/abc418 | The Occurrence of Rocky Habitable-zone Planets around Solar-like Stars from Kepler Data | source title | LI | no | Habitable-zone factor is a factorized model proxy; Bryson eta-Earth is handled separately. |
| LIT-F-STABILITY | f_stability | Lissauer et al. 2011; Steffen et al. 2012 | https://ui.adsabs.harvard.edu/abs/2011ApJS..197....8L/abstract | Architecture and Dynamics of Kepler Candidate Multiple Transiting Planet Systems | source title | MS | no | Orbital-stability values are mechanism-supported model priors. |
| LIT-F-MAGNETOSPHERE | f_magnetosphere | Zuluaga 2013 | https://doi.org/10.1088/0004-637X/770/1/23 | The Influence of Thermal Evolution in the Magnetic Protection of Terrestrial Planets | source title | MS | no | Magnetic/atmospheric retention values are mechanism-supported model priors. |
| LIT-F-LUNAR-STABILITY | f_lunar_stability | Lissauer 2012; Laskar 1993 | https://doi.org/10.1016/j.icarus.2011.10.013 | Obliquity variations of a moonless Earth | source title | MS | no | Moon/stabilizer values are mechanism-supported climate-stability priors. |
| LIT-F-SIZE | f_size | Rogers 2015; Fulton 2017 | https://doi.org/10.1088/0004-637X/801/1/41 | Most 1.6 Earth-radius Planets are Not Rocky | source title | LI | no | Earth-size window values are literature-informed, not a quoted universal occurrence fraction. |
| LIT-F-ROTATION | f_rotation | Edson 2011; Way & Del Genio 2020 | https://doi.org/10.1016/j.icarus.2010.11.023 | Atmospheric circulations of terrestrial planets orbiting low-mass stars | source title | MS | no | Rotation-suitability values are mechanism-supported climate priors. |
| LIT-F-TILT | f_tilt | Lissauer 2012; Linsenmeier 2015 | https://doi.org/10.1016/j.icarus.2011.10.013 | Obliquity variations of a moonless Earth | source title | MS | no | Axial-tilt values are mechanism-supported climate-stability priors. |
| LIT-F-H2O | f_H2O | Tian & Ida 2015; Mulders 2015 | https://doi.org/10.1038/ngeo2372 | Water contents of Earth-mass planets around M dwarfs | source title | MS | no | Surface-water values are mechanism-supported water-availability priors. |
| LIT-F-CHNOPS | f_CHNOPS | Krijt et al. 2022; Hinkel et al. 2020 | https://arxiv.org/abs/2203.10056 | Chemical Habitability: Supply and Retention of Life Essential Elements During Planet Formation | source title | MS | no | CHNOPS values are mechanism-supported chemical-habitability priors. |
| LIT-F-COMPLEX-LIFE | f_complex_life | Sandberg et al. 2018; Kipping 2020 | https://arxiv.org/abs/1806.02404 | Dissolving the Fermi Paradox | source title | MP | no | Complex-life values are broad exploratory biological-filter priors. |
| LIT-F-X | f_x | User defined | not applicable | User-defined wildcard factor; no literature-backed numeric claim. | local model-scope statement | MP | no | Wildcard values are intentionally user/model defined and outside literature-backed claims. |

## Preset Number Trace Matrix

| Preset | Parameter | Value | Registry interval | Basis | Evidence ID | Class | Direct numeric quote? | Status |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| pessimist | N_GHZ | 5000000000 | [5000000000, 10000000000, 40000000000] | registry lower bound | LIT-N-GHZ | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_sun_type | 0.07 | [0.07, 0.08, 0.2] | registry lower bound | LIT-F-SUN-TYPE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_sun_age | 0.6 | [0.6, 0.75, 0.8] | registry lower bound | LIT-F-SUN-AGE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | N_p_star | 1 | [1, 1.5, 2.5] | registry lower bound | LIT-N-P-STAR | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_composition | 0.15 | [0.15, 0.2, 0.35] | registry lower bound | LIT-F-COMPOSITION | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_orbit | 0.1 | [0.1, 0.18, 0.21] | registry lower bound | LIT-F-ORBIT | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_stability | 0.3 | [0.3, 0.5, 0.7] | registry lower bound | LIT-F-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_magnetosphere | 0.2 | [0.2, 0.5, 0.7] | registry lower bound | LIT-F-MAGNETOSPHERE | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_lunar_stability | 0.4 | [0.4, 0.7, 0.9] | registry lower bound | LIT-F-LUNAR-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_size | 0.3 | [0.3, 0.5, 0.65] | registry lower bound | LIT-F-SIZE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_rotation | 0.15 | [0.15, 0.27, 0.35] | registry lower bound | LIT-F-ROTATION | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_tilt | 0.4 | [0.4, 0.6, 0.85] | registry lower bound | LIT-F-TILT | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_H2O | 0.1 | [0.1, 0.3, 0.8] | registry lower bound | LIT-F-H2O | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_CHNOPS | 0.05 | [0.05, 0.1, 0.5] | registry lower bound | LIT-F-CHNOPS | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_complex_life | 0.000001 | [1e-9, 0.01, 1] | inside registry interval | LIT-F-COMPLEX-LIFE | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| pessimist | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | N_GHZ | 10000000000 | [5000000000, 10000000000, 40000000000] | registry central value | LIT-N-GHZ | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_sun_type | 0.08 | [0.07, 0.08, 0.2] | registry central value | LIT-F-SUN-TYPE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | N_p_star | 1.5 | [1, 1.5, 2.5] | registry central value | LIT-N-P-STAR | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_composition | 0.2 | [0.15, 0.2, 0.35] | registry central value | LIT-F-COMPOSITION | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_orbit | 0.18 | [0.1, 0.18, 0.21] | registry central value | LIT-F-ORBIT | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_stability | 0.5 | [0.3, 0.5, 0.7] | registry central value | LIT-F-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_magnetosphere | 0.5 | [0.2, 0.5, 0.7] | registry central value | LIT-F-MAGNETOSPHERE | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_lunar_stability | 0.7 | [0.4, 0.7, 0.9] | registry central value | LIT-F-LUNAR-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_size | 0.5 | [0.3, 0.5, 0.65] | registry central value | LIT-F-SIZE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_rotation | 0.27 | [0.15, 0.27, 0.35] | registry central value | LIT-F-ROTATION | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_tilt | 0.6 | [0.4, 0.6, 0.85] | registry central value | LIT-F-TILT | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_H2O | 0.3 | [0.1, 0.3, 0.8] | registry central value | LIT-F-H2O | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_CHNOPS | 0.1 | [0.05, 0.1, 0.5] | registry central value | LIT-F-CHNOPS | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_complex_life | 0.01 | [1e-9, 0.01, 1] | registry central value | LIT-F-COMPLEX-LIFE | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| consensus | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | N_GHZ | 40000000000 | [5000000000, 10000000000, 40000000000] | registry upper bound | LIT-N-GHZ | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_sun_type | 0.2 | [0.07, 0.08, 0.2] | registry upper bound | LIT-F-SUN-TYPE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | N_p_star | 2 | [1, 1.5, 2.5] | inside registry interval | LIT-N-P-STAR | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_composition | 0.35 | [0.15, 0.2, 0.35] | registry upper bound | LIT-F-COMPOSITION | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_orbit | 0.21 | [0.1, 0.18, 0.21] | registry upper bound | LIT-F-ORBIT | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_stability | 0.7 | [0.3, 0.5, 0.7] | registry upper bound | LIT-F-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_magnetosphere | 0.7 | [0.2, 0.5, 0.7] | registry upper bound | LIT-F-MAGNETOSPHERE | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_lunar_stability | 0.9 | [0.4, 0.7, 0.9] | registry upper bound | LIT-F-LUNAR-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_size | 0.65 | [0.3, 0.5, 0.65] | registry upper bound | LIT-F-SIZE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_rotation | 0.35 | [0.15, 0.27, 0.35] | registry upper bound | LIT-F-ROTATION | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_tilt | 0.85 | [0.4, 0.6, 0.85] | registry upper bound | LIT-F-TILT | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_H2O | 0.8 | [0.1, 0.3, 0.8] | registry upper bound | LIT-F-H2O | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_CHNOPS | 0.5 | [0.05, 0.1, 0.5] | registry upper bound | LIT-F-CHNOPS | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_complex_life | 1 | [1e-9, 0.01, 1] | registry upper bound | LIT-F-COMPLEX-LIFE | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| optimist | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | N_GHZ | 10000000000 | [5000000000, 10000000000, 40000000000] | registry central value | LIT-N-GHZ | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_sun_type | 0.08 | [0.07, 0.08, 0.2] | registry central value | LIT-F-SUN-TYPE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_sun_age | 0.75 | [0.6, 0.75, 0.8] | registry central value | LIT-F-SUN-AGE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | N_p_star | 1.6 | [1, 1.5, 2.5] | inside registry interval | LIT-N-P-STAR | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_composition | 0.25 | [0.15, 0.2, 0.35] | inside registry interval | LIT-F-COMPOSITION | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_orbit | 0.21 | [0.1, 0.18, 0.21] | registry upper bound | LIT-F-ORBIT | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_stability | 0.5 | [0.3, 0.5, 0.7] | registry central value | LIT-F-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_magnetosphere | 0.5 | [0.2, 0.5, 0.7] | registry central value | LIT-F-MAGNETOSPHERE | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_lunar_stability | 0.7 | [0.4, 0.7, 0.9] | registry central value | LIT-F-LUNAR-STABILITY | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_size | 0.55 | [0.3, 0.5, 0.65] | inside registry interval | LIT-F-SIZE | LI | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_rotation | 0.27 | [0.15, 0.27, 0.35] | registry central value | LIT-F-ROTATION | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_tilt | 0.6 | [0.4, 0.6, 0.85] | registry central value | LIT-F-TILT | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_H2O | 0.3 | [0.1, 0.3, 0.8] | registry central value | LIT-F-H2O | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_CHNOPS | 0.15 | [0.05, 0.1, 0.5] | inside registry interval | LIT-F-CHNOPS | MS | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_complex_life | 0.01 | [1e-9, 0.01, 1] | registry central value | LIT-F-COMPLEX-LIFE | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |
| kepler | f_x | 1 | [0.5, 1, 1] | registry central value | LIT-F-X | MP | no | ![PASS](https://img.shields.io/badge/PASS-green) |

## Findings

- No missing evidence entries, missing source-text anchors, missing literature links for literature-backed entries, non-numeric preset values, or out-of-interval preset values were found.

- No warnings were recorded.

## Interpretation Boundary

This audit verifies provenance traceability for preset numbers. It does not independently validate the cited scientific papers, does not prove that the selected priors are empirically correct, and does not convert mechanism-supported or model-prior values into direct literature measurements.
