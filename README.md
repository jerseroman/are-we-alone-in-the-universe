# Are We Alone in the Universe? Earth-like Planet Calculator
![Version](https://img.shields.io/badge/Version-v2.13-2ea44f?labelColor=24292f&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8%2F9hAAACtElEQVR42oVSTYtcRRQ991a9j%2F5werqZ150IMgrqMCEIgkMWonERELIUZiGudCFIFNzlHwQF0Y0Ld4rLEVy4UiGIGIjCwCQLlSxktKHndU8n3a8nk%2F569epkkZ4wNoIHDhTcuueeunWEpOAURIQnZ5IiIryXpucbSbJ5fzBYeaJW09HR0d5qkuySVBURnuaSoAEAq%2FrSbDz%2B1BVFpSCbniyfXLBZu92QOL4A74fi%2FV8i0iepCzcOAGqt1leDbveiiPxu4%2Fj6KbdeGYavgjwzms9v05jnJsPhMyLiRcQDQJqmFZJSD8MPRfWTwcHB%2Bs7Ojjlxag0gXjVaiaInNQiOZ3l%2B4ajff6EoiiSw9mJRFFZE3hz2%2By8KeSCl0mh7e1uxGKBQbYAcwvvLfjzu1JJkh851xZhN5%2F3TBL5ku11CUVw15Dv1ej0TkVwAAoCKyL6Q52HtrxJFr9xL0w1rrZMwvCbk9dVW68csit4vVSrPemPey4%2BPP8t6vSsnv2Sra2s3R4eHG%2BLcGVrrQ2M2K0nyLQDcv3v3Rtbvb9G5b6JqdW82nZbxaEGDx4sEgNHh4ecgs3w%2B%2FyKI49fofX%2Fi%2FY3YmOcD0msQZOVG4x%2F8B5S9XpVAFcDrJoquEPhTRaYl1bdRFFm11brt8vypTqdTJmkW1Mc5GJFNAOsUcaG1HxTOnSPwh38k9FbW7e5D9bjiXARgspxWrbVafwNgYG1bVcsgbxbA90Zk1UZRx4tYAHdW19eHy80AYAfd7jljTOS8%2F8EAL1PkUqPZ%2FAjAz8vvXW4GAA1UN4T8yTu3Mp%2FNPhaRRpamVwGA%2B%2FsxyWB3dzcgaRYJ1H%2BJZr3ed6J6C96TwBaAX8IwfGOW5%2B%2FWm809%2FA9kkmVc2IO1FpPJBFEcYzwe%2Fwby60VtqsADsfaBm07T2tmzt0SkAICHy%2F5hHtoP4SMAAAAASUVORK5CYII%3D)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20474528-blue)](https://doi.org/10.5281/zenodo.20474528)
![Model](https://img.shields.io/badge/Model-Scenario--based%20estimate-informational)
![Static App](https://img.shields.io/badge/APP-Static%20browser%20calculator-6f42c1)
![Status](https://img.shields.io/badge/Status-Public%20review%20build-orange)
[![CI](https://github.com/jerseroman/are-we-alone-in-the-universe/actions/workflows/ci.yml/badge.svg)](https://github.com/jerseroman/are-we-alone-in-the-universe/actions/workflows/ci.yml)

<p align="center">
  <img src="https://raw.githubusercontent.com/jerseroman/are-we-alone-in-the-universe/refs/heads/main/assets/images/Banner.jpg" alt="Are We Alone in the Universe? Earth-like Planet Calculator banner" width="100%">
</p>

Browser-based calculator for exploring the possible number of modelled Earth-like candidates across the Milky Way and the observable universe using transparent astrophysical assumptions.

## Official website

https://www.arewealoneintheuniverse.com/

## GitHub Pages

https://jerseroman.github.io/are-we-alone-in-the-universe/

## Project status

Public review version: 2.13

## Purpose

This project is intended as a transparent, inspectable, browser-based model for exploring assumptions about modelled Earth-like candidates across the Milky Way and the observable universe.

The model focuses on planetary and astrophysical assumptions. It does not claim to prove the existence of extraterrestrial life, intelligence, technological civilizations, or detectable signals.

Its purpose is to make scale, uncertainty, and modelling assumptions visible in a structured form.

## What this project estimates

The calculator is designed to explore questions such as:

- how many modelled Earth-like candidates a selected scenario implies for the Milky Way;
- how such estimates change when astrophysical assumptions are adjusted;
- how uncertainty propagates through a simplified browser-based model;
- how estimates scale from the Milky Way to the observable universe.

The model should be interpreted as an exploratory estimation tool, not as a definitive astronomical census.

## What this project is not

This calculator is not a deterministic prediction, an observational exoplanet catalogue, or evidence for extraterrestrial life.
It is a structured modelling tool for exploring assumptions about modelled Earth-like candidates, uncertainty, and cosmic scale.

## Repository structure

- `index.html` — GitHub Pages entry point
- `CHANGELOG.md` — release history
- `src/calculator-core.js` — core calculation logic
- `src/app.js` — page initialization and UI wiring
- `src/charts.js` — chart rendering logic
- `src/share.js` — share and export behavior
- `src/accessibility.js` — accessibility support helpers
- `src/styles.css` — visual styling
- `assets/images/` — local project imagery and UI image assets
- `CODE_AUDIT_MATRIX.md` — calculator code audit matrix
- `docs/MODEL_SCOPE.md` — model scope, assumptions, and limitations
- `docs/MONTE_CARLO_METHOD.md` — Monte Carlo sampling and sampled model interval semantics
- `docs/DISTANCE_MODEL_METHOD.md` — nearest-neighbour distance model assumptions
- `docs/REUSE_AND_ATTRIBUTION.md` — reuse, fork, and attribution rules
- `.github/ISSUE_TEMPLATE/` — structured issue report templates
- `LICENSE.md` — custom source-available attribution license
- `NOTICE.md` — short attribution notice
- `CITATION.cff` — citation metadata
- `.zenodo.json` — Zenodo GitHub-release metadata
- `RELEASE_NOTES_v2.13.md` — release notes for manual GitHub release creation
- `404.html` — fallback page for GitHub Pages
- `.nojekyll` — disables Jekyll processing on GitHub Pages
- `.gitattributes` — line-ending and text-file handling rules
- `.gitignore` — ignored local/system files

## Running locally

Open `index.html` directly in a modern browser.

No installation, package manager, server, or build process is required.

Recommended browsers:

- Chrome
- Edge
- Firefox
- Safari

## Verification

Repository verification instructions are in `REPRODUCIBILITY.md`.

The v2.13 release verification status is summarized in `RELEASE_NOTES_v2.13.md`.

The calculator code audit matrix is documented in `CODE_AUDIT_MATRIX.md`.

## GitHub Pages deployment

This repository is designed to be served directly from the repository root through GitHub Pages.

Recommended GitHub Pages settings:

- Source: Deploy from branch
- Branch: `main`
- Folder: `/ (root)`

## External dependencies

The website uses externally hosted browser assets. No vendored third-party libraries are included in this repository.

External assets used by the page may include:

- MathJax from jsDelivr for TeX and MathML rendering
- ApexCharts from jsDelivr for chart rendering
- Google Fonts for Orbitron and Nunito
- Font Awesome from cdnjs for icons

These dependencies are loaded in the browser from their respective CDN sources.

## Source availability

This repository is source-available for transparency, inspection, citation, and review.

Source-available does not mean open source.

The project may be viewed, studied, cited, and reviewed under the conditions described in `LICENSE.md`.

Forking, redistribution, derivative use, hosted copies, and commercial use are governed by the custom license terms in `LICENSE.md`.

## Attribution

Original project by Roman Jerše:

https://www.arewealoneintheuniverse.com/

Any fork, redistribution, derivative version, public copy, or hosted version must preserve attribution to Roman Jerše and include a visible link to:

https://www.arewealoneintheuniverse.com/

See `LICENSE.md`, `NOTICE.md`, and `docs/REUSE_AND_ATTRIBUTION.md` for the full attribution and reuse conditions.

## License

This project is source-available, not open source.

Non-commercial review, inspection, citation, and limited derivative use are allowed only under the conditions stated in `LICENSE.md`.

Commercial use requires prior explicit written permission from Roman Jerše.

Do not assume that standard open-source permissions apply.

## Citation

If you cite, review, discuss, or reference this project, use the citation information provided in `CITATION.cff`.

## Zenodo Publication

Zenodo-ready metadata is provided in `.zenodo.json`. The project uses a custom source-available non-commercial attribution license, represented in Zenodo metadata with the closest controlled-vocabulary license identifier `other-nc`; the authoritative terms remain in `LICENSE.md`, `NOTICE.md`, and `docs/REUSE_AND_ATTRIBUTION.md`.

Review `.zenodo.json`, `LICENSE.md`, `NOTICE.md`, and `docs/REUSE_AND_ATTRIBUTION.md` before creating a Zenodo record or GitHub-Zenodo release archive.

## Contact

Official website:

https://www.arewealoneintheuniverse.com/
