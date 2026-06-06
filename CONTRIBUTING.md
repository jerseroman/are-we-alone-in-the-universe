# Contributing

Contributions are welcome through Pull Requests.

This project is a scientific modelling calculator. Any proposed change that affects formulas, parameters, presets, probability factors, Monte Carlo logic, distance models, SETI/Fermi interpretation, exports, or scientific wording must be scientifically justified.

A contribution should clearly explain:

* what was changed;
* why the change is needed;
* what scientific source, mathematical argument, or modelling reason supports it;
* whether the change affects calculations or only wording;
* whether tests were run.

Please avoid unsupported claims, speculative additions, unrelated refactors, or wording that implies confirmed planets, detected life, detected civilisations, or proof of the Fermi paradox.

Before submitting calculation-related changes, run:

```bash
npm run test:all
npm run test:absolute
```

If tests cannot be run, explain what was checked manually.

All outputs must remain framed as conditional model estimates, not observational detections.
