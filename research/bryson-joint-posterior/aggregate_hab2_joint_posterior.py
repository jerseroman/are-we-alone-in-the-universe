#!/usr/bin/env python3
"""Aggregate seeded Bryson hab2 posterior shards.

Every outer reliability/measurement realization contributes the same number of
post-burn samples, preserving the equal-mixture convention of the public
Bryson notebook.  The constant- and zero-completeness branches are aggregated
separately and are never merged into an implicit model-averaged posterior.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

PARAMETERS = ("F0", "alpha", "beta", "gamma")
ARCHIVED = {
    "constant": {
        "q16": [0.665, -1.934, -1.139, -4.242],
        "q50": [1.107, -1.082, -0.839, -2.671],
        "q84": [1.988, -0.142, -0.517, -1.084],
    },
    "zero": {
        "q16": [0.887, -2.048, -1.550, -3.152],
        "q50": [1.590, -1.175, -1.195, -1.376],
        "q84": [3.149, -0.219, -0.824, 0.467],
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--branch", required=True, choices=("constant", "zero"))
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--expected-shards", type=int, default=8)
    parser.add_argument("--trials-per-shard", type=int, default=50)
    parser.add_argument("--walkers", type=int, default=8)
    parser.add_argument("--steps", type=int, default=2000)
    parser.add_argument("--runner-thin", type=int, default=10)
    parser.add_argument(
        "--propagation-stride",
        type=int,
        default=5,
        help="Additional within-realization thinning for Galactic propagation only.",
    )
    return parser.parse_args()


def qsummary(values: np.ndarray) -> dict[str, float]:
    q025, q16, q50, q84, q975 = np.quantile(
        values, [0.025, 0.16, 0.5, 0.84, 0.975]
    )
    return {
        "q2.5": float(q025),
        "q16": float(q16),
        "q50": float(q50),
        "q84": float(q84),
        "q97.5": float(q975),
    }


def parse_shard(label: str) -> int:
    match = re.fullmatch(r"production-shard-(\d+)", label)
    if match is None:
        raise RuntimeError(f"Unexpected production run label: {label!r}")
    return int(match.group(1))


def main() -> None:
    args = parse_args()
    root = args.root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    chain_paths = sorted(
        root.rglob(f"joint_posterior_{args.branch}_production-shard-*.csv")
    )
    diagnostics_paths = sorted(
        root.rglob(f"trial_diagnostics_{args.branch}_production-shard-*.json")
    )
    summary_paths = sorted(
        root.rglob(f"posterior_summary_{args.branch}_production-shard-*.json")
    )
    if len(chain_paths) != args.expected_shards:
        raise RuntimeError(
            f"Expected {args.expected_shards} chain shards, found {len(chain_paths)}"
        )
    if len(diagnostics_paths) != args.expected_shards:
        raise RuntimeError(
            f"Expected {args.expected_shards} diagnostic shards, found {len(diagnostics_paths)}"
        )
    if len(summary_paths) != args.expected_shards:
        raise RuntimeError(
            f"Expected {args.expected_shards} summary shards, found {len(summary_paths)}"
        )

    samples_per_trial = args.walkers * (args.steps // args.runner_thin)
    expected_rows_per_shard = args.trials_per_shard * samples_per_trial
    frames: list[pd.DataFrame] = []
    shard_summaries: list[dict[str, Any]] = []

    for path in chain_paths:
        frame = pd.read_csv(path)
        if len(frame) != expected_rows_per_shard:
            raise RuntimeError(
                f"Unexpected row count {len(frame)} in {path}; expected {expected_rows_per_shard}"
            )
        if set(frame.branch.astype(str)) != {args.branch}:
            raise RuntimeError(f"Branch mismatch in {path}")
        labels = set(frame.run_label.astype(str))
        if len(labels) != 1:
            raise RuntimeError(f"Multiple run labels in {path}: {labels}")
        label = next(iter(labels))
        shard = parse_shard(label)
        if frame.trial.nunique() != args.trials_per_shard:
            raise RuntimeError(f"Trial count mismatch in {path}")
        counts = frame.groupby("trial", sort=False).size().to_numpy()
        if not np.all(counts == samples_per_trial):
            raise RuntimeError(f"Unequal mixture weights in {path}")
        frame.insert(2, "shard", shard)
        frame.insert(4, "global_trial", shard * args.trials_per_shard + frame.trial)
        frames.append(frame)

    full = pd.concat(frames, ignore_index=True)
    expected_total = args.expected_shards * expected_rows_per_shard
    if len(full) != expected_total:
        raise RuntimeError(f"Aggregate row count {len(full)} != {expected_total}")
    if full.global_trial.nunique() != args.expected_shards * args.trials_per_shard:
        raise RuntimeError("Global trial identifiers are incomplete or duplicated")
    if not np.isfinite(full.loc[:, PARAMETERS].to_numpy(dtype=float)).all():
        raise RuntimeError("Non-finite posterior values detected")

    full.sort_values(
        ["global_trial", "production_step", "walker"], inplace=True
    )
    full.reset_index(drop=True, inplace=True)
    full_path = out / f"joint_posterior_{args.branch}_full.csv.gz"
    full.to_csv(full_path, index=False, compression="gzip")

    # Preserve equal representation from every outer realization when creating
    # the smaller sample file used by the Galactic propagation stage.
    propagation = (
        full.groupby("global_trial", group_keys=False, sort=True)
        .apply(lambda frame: frame.iloc[:: args.propagation_stride])
        .reset_index(drop=True)
    )
    expected_propagation = (
        args.expected_shards
        * args.trials_per_shard
        * int(np.ceil(samples_per_trial / args.propagation_stride))
    )
    if len(propagation) != expected_propagation:
        raise RuntimeError(
            f"Propagation sample count {len(propagation)} != {expected_propagation}"
        )
    propagation_path = out / f"joint_posterior_{args.branch}_for_galactic_propagation.csv.gz"
    propagation.loc[
        :, ["branch", "global_trial", "F0", "alpha", "beta", "gamma"]
    ].to_csv(propagation_path, index=False, compression="gzip")

    values = full.loc[:, PARAMETERS].to_numpy(dtype=float)
    quantiles = {
        name: qsummary(values[:, index])
        for index, name in enumerate(PARAMETERS)
    }
    correlation = pd.DataFrame(
        np.corrcoef(values, rowvar=False), index=PARAMETERS, columns=PARAMETERS
    )
    correlation_path = out / f"joint_posterior_{args.branch}_correlation.csv"
    correlation.to_csv(correlation_path, index=True)

    archived = ARCHIVED[args.branch]
    comparison: dict[str, dict[str, float]] = {}
    for index, name in enumerate(PARAMETERS):
        comparison[name] = {
            "reconstructed_q16": quantiles[name]["q16"],
            "reconstructed_q50": quantiles[name]["q50"],
            "reconstructed_q84": quantiles[name]["q84"],
            "archived_q16_from_printed_summary": float(archived["q16"][index]),
            "archived_q50_from_printed_summary": float(archived["q50"][index]),
            "archived_q84_from_printed_summary": float(archived["q84"][index]),
            "median_difference": float(
                quantiles[name]["q50"] - archived["q50"][index]
            ),
        }

    diagnostics: list[dict[str, Any]] = []
    for path in diagnostics_paths:
        diagnostics.extend(json.loads(path.read_text(encoding="utf-8")))
    if len(diagnostics) != args.expected_shards * args.trials_per_shard:
        raise RuntimeError(
            f"Diagnostic realization count {len(diagnostics)} is incomplete"
        )

    acceptance = np.asarray(
        [entry["mean_acceptance_fraction"] for entry in diagnostics], dtype=float
    )
    runtime = np.asarray(
        [entry["runtime_seconds"] for entry in diagnostics], dtype=float
    )
    candidate_count = np.asarray(
        [entry["selected_after_domain"] for entry in diagnostics], dtype=float
    )
    optimizer_failures = int(
        sum(not bool(entry["optimizer_success"]) for entry in diagnostics)
    )

    tau_rows: list[np.ndarray] = []
    for entry in diagnostics:
        tau = entry.get("autocorrelation_time")
        if tau is None:
            continue
        array = np.asarray(tau, dtype=float)
        if array.shape == (4,) and np.all(np.isfinite(array)) and np.all(array > 0):
            tau_rows.append(array)
    tau_summary = None
    ess_summary = None
    if tau_rows:
        tau_matrix = np.vstack(tau_rows)
        # emcee reports tau in production steps for source order
        # F0, beta_inst, alpha_radius, gamma.
        source_names = ("F0", "beta", "alpha", "gamma")
        tau_summary = {
            name: {
                "q16": float(np.quantile(tau_matrix[:, index], 0.16)),
                "q50": float(np.quantile(tau_matrix[:, index], 0.50)),
                "q84": float(np.quantile(tau_matrix[:, index], 0.84)),
            }
            for index, name in enumerate(source_names)
        }
        ess_matrix = args.walkers * args.steps / tau_matrix
        ess_summary = {
            name: {
                "median_per_realization": float(np.median(ess_matrix[:, index])),
                "sum_over_realizations": float(np.sum(ess_matrix[:, index])),
            }
            for index, name in enumerate(source_names)
        }

    for path in summary_paths:
        summary = json.loads(path.read_text(encoding="utf-8"))
        if summary.get("branch") != args.branch:
            raise RuntimeError(f"Summary branch mismatch in {path}")
        if summary.get("period_cutoff_days") is not None:
            raise RuntimeError(f"Unexpected period cutoff in {path}")
        shard_summaries.append(summary)

    diagnostics_path = out / f"trial_diagnostics_{args.branch}_full.jsonl"
    with diagnostics_path.open("w", encoding="utf-8") as handle:
        for entry in diagnostics:
            handle.write(json.dumps(entry, sort_keys=True) + "\n")

    aggregate_summary = {
        "status": (
            "new seeded no-period-cutoff reconstruction; not the missing "
            "historical Bryson chain"
        ),
        "source_repository": "stevepur/DR25-occurrence-public",
        "source_commit": "d200f54b6f0df49e0dae530e69983cdce5397bfb",
        "branch": args.branch,
        "period_cutoff_days": None,
        "mixture_definition": (
            "equal number of post-burn ensemble samples from each of 400 "
            "reliability and measurement-error realizations"
        ),
        "parameter_order": ["F0", "alpha_radius", "beta_inst", "gamma"],
        "shards": args.expected_shards,
        "trials_per_shard": args.trials_per_shard,
        "total_trials": args.expected_shards * args.trials_per_shard,
        "walkers": args.walkers,
        "burnin_steps": int(shard_summaries[0]["burnin_steps"]),
        "production_steps": args.steps,
        "runner_thin": args.runner_thin,
        "full_sample_count": int(len(full)),
        "propagation_stride_within_each_realization": args.propagation_stride,
        "galactic_propagation_sample_count": int(len(propagation)),
        "posterior_quantiles": quantiles,
        "comparison_with_archived_printed_marginal_summary": comparison,
        "correlation_matrix_file": correlation_path.name,
        "diagnostics": {
            "optimizer_failures": optimizer_failures,
            "acceptance_fraction_q16_q50_q84": [
                float(value)
                for value in np.quantile(acceptance, [0.16, 0.50, 0.84])
            ],
            "runtime_seconds_per_realization_q16_q50_q84": [
                float(value)
                for value in np.quantile(runtime, [0.16, 0.50, 0.84])
            ],
            "candidate_count_q16_q50_q84": [
                float(value)
                for value in np.quantile(candidate_count, [0.16, 0.50, 0.84])
            ],
            "realizations_with_estimable_autocorrelation": len(tau_rows),
            "autocorrelation_time_by_source_parameter": tau_summary,
            "estimated_chain_ess_by_source_parameter": ess_summary,
        },
        "scientific_limits": [
            "This is a new reproducible rerun, not the unavailable historical chain.",
            "Each outer realization has its own conditional posterior; the pooled result is a mixture.",
            "The completeness branches remain separate model scenarios.",
            "Host-model and transport systematics are not included in these occurrence-only intervals.",
        ],
    }
    summary_path = out / f"joint_posterior_{args.branch}_aggregate_summary.json"
    summary_path.write_text(
        json.dumps(aggregate_summary, indent=2), encoding="utf-8"
    )

    manifest_targets = [
        full_path,
        propagation_path,
        correlation_path,
        diagnostics_path,
        summary_path,
    ]
    manifest_path = out / f"SHA256SUMS_{args.branch}_aggregate.txt"
    manifest_path.write_text(
        "".join(f"{sha256(path)}  {path.name}\n" for path in manifest_targets),
        encoding="utf-8",
    )
    print(json.dumps(aggregate_summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
