#!/usr/bin/env python3
"""Execute ``run_joint_posterior.py`` with a reproducible global NumPy seed.

``emcee==2.2.1`` uses NumPy's module-level random state for ensemble proposals.
The main runner separately uses a local ``RandomState`` for reliability and
measurement perturbations.  This wrapper reads the same ``--seed`` argument,
seeds NumPy's global state, and then executes the main runner in-process.
"""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

import numpy as np


def seed_from_argv(argv: list[str]) -> int:
    try:
        index = argv.index("--seed")
    except ValueError as exc:
        raise SystemExit("The reproducible wrapper requires an explicit --seed value") from exc
    try:
        return int(argv[index + 1])
    except (IndexError, ValueError) as exc:
        raise SystemExit("--seed must be followed by an integer") from exc


seed = seed_from_argv(sys.argv)
np.random.seed(seed)
runner = Path(__file__).with_name("run_joint_posterior.py")
runpy.run_path(str(runner), run_name="__main__")
