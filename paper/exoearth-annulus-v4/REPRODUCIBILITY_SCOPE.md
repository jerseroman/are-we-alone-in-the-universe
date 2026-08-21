# ExoEarth Annulus v4 reproducibility scope

## Scientific status

This release supports a **conditional model projection**, not a direct
candidate-supported occurrence measurement and not a census of habitable or
inhabited worlds. The exact nominal DR25 radius--instellation target contains
zero candidates and zero summed reliability. More than 95% of the corrected
catalog realizations also contain zero candidates in that target. The reported
posterior intervals are therefore conditional on the fitted occurrence-model
form, completeness scenario, frozen host model, and transport assumption.

## Included evidence

The compact reproducibility archive contains:

- the exact AASTeX v4 source, bibliography, standalone vector figures, and
  source/PDF audit records;
- the corrected and legacy measurement-error implementations and tests;
- the adaptive MCMC convergence and clustered Monte Carlo code;
- the frozen numerical, host/TAMS, DR25-support, sensitivity, and
  primary-literature summaries with their SHA-256 manifests;
- the pinned GitHub Actions workflows that generated the production evidence;
- the final manuscript PDF; and
- a machine-readable release manifest identifying the source commit, branch,
  production run IDs, every archived path, and every SHA-256 checksum.

The archive deliberately does not duplicate the large raw MCMC chains, public
DR25 catalog downloads, or JJ/PARSEC source archives. Those inputs are linked
to immutable GitHub Actions run IDs, upstream source identifiers, pinned
commits, and checksum manifests. This keeps the release auditable without
misrepresenting a compact evidence bundle as a complete mirror of external
data services.

## Pinned production environment

Python 3.10 was used for the production workflows. Install the pinned Python
requirements with:

```text
python -m pip install -r paper/exoearth-annulus-v4/requirements-v4.txt
```

The JJ population runs additionally use `askenja/jjmodel` commit
`2828a2e8bfc379ba9c8ef4b4d0477ab5febe3b54`. The manuscript build used
AASTeX 7.0.1; its official source URL and local class-file SHA-256 are recorded
in `AASTEX_BUILD_PROVENANCE.json`.

## Verification commands

From the repository root:

```text
python -m unittest discover -s research/v4-validation -p "test_*.py"
python -m unittest discover -s research/bryson-joint-posterior -p "test_*.py"
python -m unittest discover -s research/jj-host-export -p "test_*.py"
python research/v4-validation/validate_v4_manuscript.py
python research/v4-validation/make_v4_figures.py
```

From `paper/exoearth-annulus-v4`, build the manuscript with:

```text
pdflatex -interaction=nonstopmode -halt-on-error main.tex
bibtex main
pdflatex -interaction=nonstopmode -halt-on-error main.tex
pdflatex -interaction=nonstopmode -halt-on-error main.tex
pdflatex -interaction=nonstopmode -halt-on-error main.tex
```

Then, from the repository root, run:

```text
python research/v4-validation/pdf_hidden_object_preflight.py \
  paper/exoearth-annulus-v4/main.pdf \
  --out paper/exoearth-annulus-v4/PDF_PREFLIGHT.json
```

The frozen production evidence is associated with GitHub Actions runs
32470830404, 32472776218, 32506666772, and 32527877921.

