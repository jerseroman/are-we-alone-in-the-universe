# Are We Alone? · Galactic Habitability Calculator

A source-available browser-based calculator for exploring probabilistic assumptions about galactic habitability, technological civilizations, detectability, and the Fermi-paradox problem space.

## Official website

https://www.arewealoneintheuniverse.com/

## GitHub Pages

After publishing, add the GitHub Pages URL here.

## Project status

Public review version: 2.12

## Repository structure

- `index.html` — GitHub Pages entry point
- `src/calculator-core.js` — core calculation logic
- `src/app.js` — page initialization and UI wiring
- `src/charts.js` — chart rendering logic
- `src/share.js` — share and export behavior
- `src/accessibility.js` — accessibility support helpers
- `src/styles.css` — visual styling
- `docs/MODEL_SCOPE.md` — model scope and limitations
- `docs/REUSE_AND_ATTRIBUTION.md` — reuse, fork, and attribution rules
- `LICENSE.md` — custom source-available attribution license
- `NOTICE.md` — short attribution notice
- `CITATION.cff` — citation metadata

## Purpose

This project is intended as a transparent, inspectable, browser-based model for exploring assumptions about life, intelligence, technological civilization, detection probability, and galactic-scale uncertainty.

## What this project is not

This calculator is not a deterministic prediction.
It is not proof that extraterrestrial civilizations exist or do not exist.
It is not an empirical measurement of the number of civilizations in the Milky Way.
It is a structured modelling tool for exploring assumptions and uncertainty.

## Running locally

Open `index.html` directly in a modern browser.

No installation and no build process are required.

## GitHub Pages deployment

This repository is designed to be served directly from the repository root through GitHub Pages.

Recommended settings:

- Source: Deploy from branch
- Branch: main
- Folder: /root

## External dependencies

The website uses externally hosted browser assets only. No vendored third-party libraries are included.

- MathJax 3.2.2 from jsDelivr for TeX and MathML rendering: `https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js`
- ApexCharts 5.12.0 from jsDelivr for charts: `https://cdn.jsdelivr.net/npm/apexcharts@5.12.0`
- Google Fonts for Orbitron and Nunito: `https://fonts.googleapis.com/`
- Font Awesome 5.15.4 from cdnjs for icons: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css`
- Externally hosted project imagery from `static.wixstatic.com`, as already referenced by the original page.

## Attribution

Original project by Roman Jerše:
https://www.arewealoneintheuniverse.com/

Any fork, redistribution, derivative version, or hosted copy must preserve attribution according to LICENSE.md.

## License

This project is source-available, not open source.

Forking and non-commercial derivative use are allowed only under the conditions in LICENSE.md.

Commercial use requires prior explicit written permission from Roman Jerše.

## Citation

If you cite, review, or discuss this project, use the citation information in `CITATION.cff`.
