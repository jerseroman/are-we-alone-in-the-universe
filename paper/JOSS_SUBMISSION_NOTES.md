# JOSS submission notes for v2.18

Repository: https://github.com/jerseroman/are-we-alone-in-the-universe
Submission branch: `joss-v2.18-paper`
Paper path: `paper/paper.md`
Bibliography path: `paper/paper.bib`
Target software version: v2.18

## Submission title

Are We Alone in the Universe? Earth-like Planet Calculator: a browser-based scenario model for transparent astrobiological uncertainty exploration

## Short submission summary

Are We Alone in the Universe? Earth-like Planet Calculator is a browser-based research and science-communication tool for exploring how uncertain astrobiological assumptions propagate into estimates of potentially Earth-like planetary candidates. It combines published exoplanet-demography and Galactic Habitable Zone constraints with transparent presets, optional planetary filters, deterministic outputs, seeded Monte Carlo uncertainty propagation, warnings for extreme scenarios, and exportable results. The software is explicitly framed as a conditional scenario model, not as a catalogue of confirmed habitable worlds or a detector of life.

## Suggested JOSS submission form text

This submission describes v2.18.0 of a browser-based astrobiology scenario calculator. The software provides transparent, auditable estimates of potentially Earth-like candidates under user-selected assumptions, with deterministic calculations, seeded Monte Carlo uncertainty propagation, optional planetary constraints, validation warnings, release notes, tests, documentation, citation metadata, and a Zenodo software archive. The main scholarly contribution is not a new observational result, but a reusable and inspectable modelling workflow that makes the conditional structure of Earth-like-candidate estimates explicit.

The software is particularly relevant for astrobiology education, exoplanet-demography sensitivity analysis, and public-facing scientific communication where assumptions must remain visible and reproducible. It complements exoplanet catalogues and specialist simulation tools by providing a lightweight, browser-native, parameter-transparent scenario instrument.

Related publication status: no peer-reviewed article about this software has been published or submitted elsewhere. A separate short methods paper may be prepared later, but this JOSS submission concerns the software implementation and its research-software workflow.

Potential conflicts of interest: none declared. No external funding supported this work.

## AI disclosure

Generative AI tools were used in a limited assistive role during the preparation of this software. OpenAI ChatGPT, including GPT-5.5 Thinking, OpenAI Codex, and Anthropic Claude Opus 4.8 + VS supported drafting, copy-editing, partial code-writing assistance, code-review support, documentation review, audit-prompt design, and test-planning support. These tools were used across code, paper text, documentation, and review-preparation materials, but they did not originate or determine the project concept, core research questions, scientific framing, scientific rationale, model assumptions, parameter choices, software architecture, validation strategy, interpretation of results. 

All AI-assisted text, code suggestions, repository changes, and methodological suggestions were reviewed, edited, validated, and either accepted or rejected by the human author. The author remains responsible for the accuracy, originality, licensing, security, reproducibility, and compliance of the submitted work.

For any later JOSS review correspondence, generative AI will be limited to translation or language polishing where disclosed; substantive scientific and technical responses to editors and reviewers will be written and approved by the author.

## Critical readiness checks before pressing submit

- Ensure `README.md`, `package.json`, `CITATION.cff`, `.zenodo.json`, release notes, and GitHub release metadata all agree on v2.18 and the current DOI.
- Confirm that the project uses an OSI-approved license and that the license file is present.
- Confirm that issues are enabled and readable publicly.
- Confirm that a public development history of more than six months exists before submission; JOSS currently treats this as a pre-review gate.
- Confirm that the v2.18 release is tagged and archived on Zenodo, or be prepared to update the archive DOI during review.
- Run the full test suite immediately before submission.

## Suggested final pre-submit commands

```bash
npm ci
npm run test:all
npm run test:absolute
```

If a JOSS paper build workflow is added, also verify that `paper/paper.md` compiles with the Open Journals paper toolchain before submission.
