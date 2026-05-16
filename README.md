# Are We Alone in the Universe? Earth-like Planet Estimator

Browser-based estimator for exploring the possible number of potentially Earth-like planets across the Milky Way and the observable universe using transparent astrophysical assumptions.

## Official website

https://www.arewealoneintheuniverse.com/

## GitHub Pages

https://jerseroman.github.io/are-we-alone-in-the-universe/

## Project status

Public review version: 2.12

## Purpose

This project is intended as a transparent, inspectable, browser-based model for exploring assumptions about potentially Earth-like planets across the Milky Way and the observable universe.

The model focuses on planetary and astrophysical assumptions. It does not claim to prove the existence of extraterrestrial life, intelligence, technological civilizations, or detectable signals.

Its purpose is to make scale, uncertainty, and modelling assumptions visible in a structured form.

## What this project estimates

The estimator is designed to explore questions such as:

- how many potentially Earth-like planets may exist in the Milky Way;
- how such estimates change when astrophysical assumptions are adjusted;
- how uncertainty propagates through a simplified browser-based model;
- how estimates scale from the Milky Way to the observable universe.

The model should be interpreted as an exploratory estimation tool, not as a definitive astronomical census.

## What this project is not

This estimator is not a deterministic prediction, an observational exoplanet catalogue, or evidence for extraterrestrial life.
It is a structured modelling tool for exploring assumptions about potentially Earth-like planets, uncertainty, and cosmic scale.

Tofu & Pancake

## Repository structure

- `index.html` — GitHub Pages entry point
- `src/calculator-core.js` — core calculation logic
- `src/app.js` — page initialization and UI wiring
- `src/charts.js` — chart rendering logic
- `src/share.js` — share and export behavior
- `src/accessibility.js` — accessibility support helpers
- `src/styles.css` — visual styling
- `docs/MODEL_SCOPE.md` — model scope, assumptions, and limitations
- `docs/REUSE_AND_ATTRIBUTION.md` — reuse, fork, and attribution rules
- `LICENSE.md` — custom source-available attribution license
- `NOTICE.md` — short attribution notice
- `CITATION.cff` — citation metadata
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

## GitHub Pages deployment

This repository is designed to be served directly from the repository root through GitHub Pages.

Recommended GitHub Pages settings:

- Source: Deploy from branch
- Branch: `main`
- Folder: `/root`

After deployment, add the published GitHub Pages URL under the `GitHub Pages` section above.

## External dependencies

The website uses externally hosted browser assets. No vendored third-party libraries are included in this repository.

External assets used by the page may include:

- MathJax from jsDelivr for TeX and MathML rendering
- ApexCharts from jsDelivr for chart rendering
- Google Fonts for Orbitron and Nunito
- Font Awesome from cdnjs for icons
- Externally hosted project imagery from `static.wixstatic.com`, as referenced by the original page

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

## Contact

Official website:

https://www.arewealoneintheuniverse.com/
