# JOSS submission notes for v2.15

Repository: https://github.com/jerseroman/are-we-alone-in-the-universe
Submission branch: `joss-v2.15-paper`
Paper path: `paper/paper.md`
Bibliography path: `paper/paper.bib`
Target software version: v2.15

## Submission title

Are We Alone in the Universe? Earth-like Planet Calculator: a browser-based scenario model for transparent astrobiological uncertainty exploration

## Short submission summary

Are We Alone in the Universe? Earth-like Planet Calculator is a browser-based research and science-communication tool for exploring how uncertain astrobiological assumptions propagate into estimates of potentially Earth-like planetary candidates. It combines published exoplanet-demography and Galactic Habitable Zone constraints with transparent presets, optional planetary filters, deterministic outputs, seeded Monte Carlo uncertainty propagation, warnings for extreme scenarios, and exportable results. The software is explicitly framed as a conditional scenario model, not as a catalogue of confirmed habitable worlds or a detector of life.

## Suggested JOSS submission form text

This submission describes v2.15 of a browser-based astrobiology scenario calculator. The software provides transparent, auditable estimates of potentially Earth-like candidates under user-selected assumptions, with deterministic calculations, Monte Carlo uncertainty propagation, optional planetary constraints, release notes, tests, documentation, and citation metadata. The main scholarly contribution is not a new observational result, but a reusable and inspectable modelling workflow that makes the conditional structure of Earth-like-candidate estimates explicit.

The software is particularly relevant for astrobiology education, exoplanet-demography sensitivity analysis, and public-facing scientific communication where assumptions must remain visible and reproducible. It complements exoplanet catalogues and specialist simulation tools by providing a lightweight, browser-native, parameter-transparent scenario instrument.

## AI disclosure to keep consistent everywhere

OpenAI ChatGPT, including GPT-5.5 Thinking, OpenAI Codex, and Anthropic Claude were used as assistive tools for drafting, copy-editing, repository review, audit-prompt design, and test-planning support. All AI-assisted outputs were reviewed, edited, validated, and accepted or rejected by the human author. The author made the core scientific, modelling, release, and wording decisions and remains responsible for accuracy, originality, licensing, and compliance.

During JOSS review, do not use AI to generate substantive replies to editors or reviewers, except for translation or language polishing where disclosed.

## Critical readiness checks before pressing submit

- Ensure `README.md`, `package.json`, `CITATION.cff`, `.zenodo.json`, release notes, and GitHub release metadata all agree on v2.15 and the current DOI.
- Confirm that the project uses an OSI-approved license and that the license file is present.
- Confirm that issues are enabled and readable publicly.
- Confirm that a public development history of more than six months exists before submission; JOSS currently treats this as a pre-review gate.
- Confirm that the v2.15 release is tagged and archived on Zenodo, or be prepared to update the archive DOI during review.
- Run the full test suite immediately before submission.

## Suggested final pre-submit commands

```bash
npm ci
npm run test:all
npm run test:absolute
```

If a JOSS paper build workflow is added, also verify that `paper/paper.md` compiles with the Open Journals paper toolchain before submission.
