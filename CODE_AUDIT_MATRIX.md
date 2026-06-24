# Calculator Code Audit Matrix

> **Status: placeholder — not a completed audit.**

The previous detailed audit matrix was removed because it documented an earlier
audit cycle and no longer represents the current v2.18 code state. It is retained
in the repository git history if the earlier v2.17-baseline details are needed.

A revised audit matrix for v2.18 will be added after the next full audit cycle.
Until then, please use the following current sources:

- **Verification instructions:** see [`REPRODUCIBILITY.md`](REPRODUCIBILITY.md)
  for how to install dependencies and run the test suite
  (`npm run test:all`, `npm run test:deep`, `npm run test:absolute`).
- **What changed in v2.18:** see [`RELEASE_NOTES_v2.18.md`](RELEASE_NOTES_v2.18.md).
- **Release history:** see [`CHANGELOG.md`](CHANGELOG.md).

### Scope note

This placeholder makes no audit pass/fail claims. v2.18 changed only the Monte
Carlo transparency, exceedance-probability visualization, sensitivity-analysis
wording, Monte Carlo state-consistency and export-metadata presentation layer; it
did not change scientific parameter values, priors, scenario preset values,
deterministic formulae, or Monte Carlo sampling logic. The automated regression
suite for v2.18 is described in `REPRODUCIBILITY.md`.
