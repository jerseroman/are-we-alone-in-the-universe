---
title: 'Are We Alone in the Universe? Earth-like Planet Calculator: a browser-based scenario model for transparent astrobiological uncertainty exploration'
tags:
  - JavaScript
  - astrobiology
  - exoplanets
  - Monte Carlo
  - uncertainty propagation
  - Galactic Habitable Zone
  - research software
authors:
  - name: Roman Jerše
    affiliation: 1
affiliations:
  - name: Independent researcher, Slovenia
    index: 1
date: 13 June 2026
bibliography: paper.bib
---

# Summary

*Are We Alone in the Universe? Earth-like Planet Calculator* is a browser-based research and communication tool for exploring how uncertain astrophysical and planetary assumptions propagate into estimates of potentially Earth-like planetary candidates in the Milky Way and in an observable-universe scaling. The software is not a catalogue of confirmed habitable planets and does not claim detections of life or civilizations. Instead, it provides an auditable scenario model in which users can inspect assumptions, compare presets, vary uncertain inputs, run Monte Carlo uncertainty propagation, and export structured results.

The calculator is designed for astrobiology-adjacent sensitivity analysis, reproducible popular-science communication, and methods teaching. It combines occurrence-rate reasoning from exoplanet demographics, Galactic Habitable Zone constraints, and optional planetary filters such as moon stabilization, magnetosphere-related protection, water delivery, and bioessential-element availability. Version 2.15 adds a more explicit scientific-method layer around additional planetary filters, stronger explanation of uncertainty semantics, warning logic for extreme scenarios, and formal release notes tied to the current public release.

# Statement of need

The number of potentially Earth-like planets is often discussed through single headline estimates. Such estimates can be pedagogically powerful, but they easily conceal the conditional structure of the argument: different assumptions about planet occurrence, rocky composition, orbital location, Galactic environment, water delivery, chemical inventory, and long-term planetary stability can shift the result by orders of magnitude. A useful research-facing communication tool should therefore make the assumptions explicit rather than present the output as an observational fact.

This software addresses that need by converting a Drake-equation-like public question into an inspectable exoplanet-demography and uncertainty-propagation workflow. The model is anchored in published work on the Galactic Habitable Zone [@lineweaver2004], rocky-planet occurrence in habitable zones [@bryson2021], radius-composition transitions [@rogers2015; @fulton2017; @berger2020], and planetary or chemical factors that plausibly affect long-term surface habitability [@laskar1993; @lissauer2012; @tian2015; @mulders2015; @hinkel2020; @krijt2022]. The target users are researchers, educators, students, science communicators, and technically literate readers who need a transparent way to reason about scenario sensitivity without installing a domain-specific simulation stack.

# State of the field

Existing exoplanet resources and research software primarily serve adjacent but different purposes. The NASA Exoplanet Archive is a data service for confirmed exoplanets and candidate systems, with tools for querying observational records rather than for constructing a transparent, adjustable scenario model of potentially Earth-like candidates [@akeson2013]. Numerical packages such as REBOUND provide high-precision dynamical integration for planetary systems, but they do not address the public-facing question of how exoplanet occurrence rates, Galactic environment assumptions, and habitability-related filters combine in a simple uncertainty workflow [@rein2012]. Climate, interior, and atmospheric models can examine individual planetary scenarios at much higher physical fidelity, but they are not designed to expose the conditional chain behind a Milky Way-scale candidate estimate.

The build-vs-contribute justification is therefore methodological rather than infrastructural. The project does not attempt to replace catalogues, N-body solvers, climate models, or peer-reviewed occurrence-rate analyses. Its contribution is an integrative, browser-native scenario instrument: a deliberately constrained model that keeps all assumptions visible, produces reproducible deterministic and Monte Carlo outputs, and translates interstellar distance and signal-travel-time quantities into a form that non-specialist users can inspect without losing the numerical provenance. This niche is insufficiently covered by existing research tools, which are typically either observational databases, specialist simulators, or informal calculators with limited traceability.

# Software design

The central design decision is to separate the scientific model from the presentation layer while keeping the entire system runnable as static browser software. This choice reduces installation friction and makes reviewer testing straightforward, but it also imposes constraints: model functions must be deterministic where appropriate, browser performance must remain acceptable for Monte Carlo runs, and explanatory text must not overstate the epistemic status of speculative filters.

The core architecture therefore uses explicit parameter objects, named presets, deterministic calculations, seeded Monte Carlo sampling, validation warnings, and exportable JSON-style outputs. The model is intentionally scenario-based. Baseline estimates can be run with conservative, consensus, high-end, or custom assumptions, while additional planetary modules are framed as optional multiplicative filters rather than as confirmed necessary conditions for life. This design preserves scientific caution: the software can ask how estimates change if a filter is imposed, but it does not claim that the filter is empirically established as necessary or sufficient.

Version 2.15 further clarifies this epistemic boundary. The new release emphasizes transparent parameter provenance, release-auditable warnings, and stronger documentation around optional planetary constraints. The trade-off is deliberate: rather than maximizing physical completeness, the software maximizes inspectability, reproducibility, and falsifiability of assumptions. This makes it useful as a teaching and sensitivity-analysis instrument, while leaving detailed astrophysical, geophysical, and atmospheric simulation to specialist packages.

# Research impact statement

The current impact claim is intentionally limited and specific. The project provides a reproducible reference workflow for transparent astrobiological uncertainty exploration, with public source code, versioned releases, release notes, citation metadata, a Zenodo software archive, automated tests, continuous-integration checks, and user-facing scientific documentation. Its scholarly value is strongest as a methods and communication instrument: it lets users reproduce a defined set of assumptions, compare preset scenarios, and audit how uncertainty intervals are produced.

At submission time, the software should not be represented as an externally adopted community standard unless independent use is documented. Its credible near-term significance is instead supported by the combination of a public release series, explicit model provenance, testable browser execution, and a reproducible paper-facing workflow. These properties make the tool suitable for classroom demonstrations, public-science articles, sensitivity-analysis examples, and as a compact reference implementation for discussing how exoplanet-demography assumptions propagate into large-scale candidate estimates.

# AI usage disclosure

OpenAI ChatGPT, including GPT-5.5 Thinking, and OpenAI Codex were used as assistive tools during parts of the project workflow. Assistance included drafting and copy-editing documentation and release text, reviewing scientific wording for overclaiming, proposing test and audit prompts, identifying consistency issues across repository metadata, and helping draft this JOSS paper. AI tools were not treated as scientific authorities. The author reviewed, edited, and accepted or rejected all AI-assisted outputs; all core modelling choices, parameter interpretations, final scientific wording, release decisions, and responsibility for correctness remain with the human author.

AI-assisted code or documentation suggestions were checked against the project’s scientific constraints, automated tests, release notes, and cited literature before inclusion. During the JOSS review process, generative AI will not be used to produce substantive author responses to editors or reviewers, except for possible translation or language polishing where this is explicitly disclosed.

# Acknowledgements

No external funding supported this work. The author thanks the open-source and exoplanet-research communities whose published catalogues, models, and methodological discussions make transparent public reasoning about astrobiological uncertainty possible.

# References