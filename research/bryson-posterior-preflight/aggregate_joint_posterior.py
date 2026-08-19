#!/usr/bin/env python3
"""Aggregate independent fixed-seed Bryson posterior shards.

Each shard contains an equal number of reliability/measurement realizations and
an equal number of MCMC samples per realization. Concatenation therefore
preserves the equal-mixture weighting used by the public Bryson notebook.
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
from pathlib import Path

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


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, type=Path)
    ap.add_argument("--branch", required=True, choices=("constant", "zero"))
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--expected-shards", type=int, default=8)
    ap.add_argument("--trials-per-shard", type=int, default=50)
    ap.add_argument("--walkers", type=int, default=8)
    ap.add_argument("--steps", type=int, default=2000)
    ap.add_argument("--thin-stride", type=int, default=20)
    return ap.parse_args()


def write_csv_gz(path: Path, array: np.ndarray) -> None:
    frame = pd.DataFrame(array, columns=PARAMETERS)
    frame.insert(0, "branch", path.stem.split("_")[0])
    frame.to_csv(path, index=False, compression="gzip")


def main() -> None:
    args = parse_args()
    root = args.root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    propagation_paths = sorted(root.rglob("joint_samples_propagation_order.npy"))
    source_paths = sorted(root.rglob("joint_samples_source_order.npy"))
    summary_paths = sorted(root.rglob("joint_posterior_summary.json"))
    if len(propagation_paths) != args.expected_shards:
        raise RuntimeError(f"Expected {args.expected_shards} propagation shards, found {len(propagation_paths)}")
    if len(source_paths) != args.expected_shards or len(summary_paths) != args.expected_shards:
        raise RuntimeError("Incomplete source-order arrays or shard summaries")

    expected_rows_per_shard = args.trials_per_shard * args.walkers * args.steps
    propagation_arrays = []
    source_arrays = []
    shard_summaries = []
    for p_path, s_path, j_path in zip(propagation_paths, source_paths, summary_paths):
        p_array = np.load(p_path)
        s_array = np.load(s_path)
        summary = json.loads(j_path.read_text(encoding="utf-8"))
        if p_array.shape != (expected_rows_per_shard, 4):
            raise RuntimeError(f"Unexpected propagation shape {p_array.shape} in {p_path}")
        if s_array.shape != p_array.shape:
            raise RuntimeError(f"Source/propagation shape mismatch in {p_path.parent}")
        if summary.get("branch") != args.branch:
            raise RuntimeError(f"Branch mismatch in {j_path}: {summary.get('branch')}")
        propagation_arrays.append(p_array)
        source_arrays.append(s_array)
        shard_summaries.append(summary)

    propagation = np.concatenate(propagation_arrays, axis=0)
    source = np.concatenate(source_arrays, axis=0)
    expected_total = args.expected_shards * expected_rows_per_shard
    if propagation.shape != (expected_total, 4):
        raise RuntimeError(f"Unexpected aggregate shape {propagation.shape}")
    if not np.isfinite(propagation).all() or not np.isfinite(source).all():
        raise RuntimeError("Non-finite posterior samples detected")

    np.save(out / "joint_samples_propagation_order_full.npy", propagation)
    np.save(out / "joint_samples_source_order_full.npy", source)

    thinned = propagation[:: args.thin_stride]
    thin_frame = pd.DataFrame(thinned, columns=PARAMETERS)
    thin_frame.insert(0, "branch", args.branch)
    thin_frame.to_csv(
        out / "joint_samples_propagation_order_thinned.csv.gz",
        index=False,
        compression="gzip",
    )

    quantiles = np.quantile(propagation, [0.16, 0.5, 0.84], axis=0)
    archived = ARCHIVED[args.branch]
    comparison = {}
    for index, name in enumerate(PARAMETERS):
        comparison[name] = {
            "reconstructed_q16": float(quantiles[0, index]),
            "reconstructed_q50": float(quantiles[1, index]),
            "reconstructed_q84": float(quantiles[2, index]),
            "archived_q16_from_printed_summary": float(archived["q16"][index]),
            "archived_q50_from_printed_summary": float(archived["q50"][index]),
            "archived_q84_from_printed_summary": float(archived["q84"][index]),
            "median_difference": float(quantiles[1, index] - archived["q50"][index]),
        }

    diagnostics = []
    seeds = []
    direct_counts = set()
    for shard in shard_summaries:
        seeds.append(int(shard["seed"]))
        direct_counts.add(int(shard["direct_narrow_domain_candidate_count_unperturbed"]))
        diagnostics.extend(shard.get("diagnostics", []))
    if len(direct_counts) != 1:
        raise RuntimeError(f"Direct candidate count differs across shards: {direct_counts}")

    acceptance = np.array([float(item["mean_acceptance_fraction"]) for item in diagnostics], dtype=float)
    optimizer_failures = sum(not bool(item["optimizer_success"]) for item in diagnostics)
    elapsed = np.array([float(item["elapsed_seconds"]) for item in diagnostics], dtype=float)
    n_used = np.array([int(item["n_used"]) for item in diagnostics], dtype=int)

    tau_rows = []
    ess_rows = []
    for item in diagnostics:
        tau = item.get("autocorrelation_time_if_estimable")
        if tau is None:
            continue
        tau_array = np.asarray(tau, dtype=float)
        if tau_array.shape == (4,) and np.all(np.isfinite(tau_array)) and np.all(tau_array > 0):
            tau_rows.append(tau_array)
            ess_rows.append(args.walkers * args.steps / tau_array)
    tau_summary = None
    ess_summary = None
    if tau_rows:
        tau_matrix = np.vstack(tau_rows)
        ess_matrix = np.vstack(ess_rows)
        tau_summary = {
            name: {
                "median": float(np.median(tau_matrix[:, i])),
                "q16": float(np.quantile(tau_matrix[:, i], 0.16)),
                "q84": float(np.quantile(tau_matrix[:, i], 0.84)),
            }
            for i, name in enumerate(("F0", "beta", "alpha", "gamma"))
        }
        ess_summary = {
            name: {
                "sum_over_realizations": float(np.sum(ess_matrix[:, i])),
                "median_per_realization": float(np.median(ess_matrix[:, i])),
            }
            for i, name in enumerate(("F0", "beta", "alpha", "gamma"))
        }

    with (out / "trial_diagnostics.jsonl").open("w", encoding="utf-8") as handle:
        for item in diagnostics:
            handle.write(json.dumps(item, sort_keys=True) + "\n")

    summary = {
        "status": "new fixed-seed reconstruction; not the missing historical Bryson chain",
        "branch": args.branch,
        "source_repository": "stevepur/DR25-occurrence-public",
        "source_commit": "d200f54b6f0df49e0dae530e69983cdce5397bfb",
        "mixture_definition": "equal number of post-burn ensemble samples from each of 400 reliability/measurement realizations",
        "shards": args.expected_shards,
        "trials_per_shard": args.trials_per_shard,
        "total_trials": args.expected_shards * args.trials_per_shard,
        "walkers": args.walkers,
        "production_steps": args.steps,
        "n_joint_samples_full": int(len(propagation)),
        "thin_stride": args.thin_stride,
        "n_joint_samples_thinned_for_galactic_propagation": int(len(thinned)),
        "seeds": sorted(seeds),
        "direct_narrow_domain_candidate_count_unperturbed": int(next(iter(direct_counts))),
        "parameter_quantiles": {
            name: {
                "q16": float(quantiles[0, i]),
                "q50": float(quantiles[1, i]),
                "q84": float(quantiles[2, i]),
            }
            for i, name in enumerate(PARAMETERS)
        },
        "comparison_to_archived_printed_marginal_summary": comparison,
        "diagnostics": {
            "optimizer_failures": int(optimizer_failures),
            "mean_acceptance_fraction": float(np.mean(acceptance)),
            "acceptance_fraction_q16_q50_q84": [float(x) for x in np.quantile(acceptance, [0.16, 0.5, 0.84])],
            "elapsed_seconds_per_realization_q16_q50_q84": [float(x) for x in np.quantile(elapsed, [0.16, 0.5, 0.84])],
            "candidate_count_used_q16_q50_q84": [float(x) for x in np.quantile(n_used, [0.16, 0.5, 0.84])],
            "realizations_with_estimable_autocorrelation": len(tau_rows),
            "autocorrelation_time_by_source_parameter": tau_summary,
            "estimated_chain_ess_by_source_parameter": ess_summary,
        },
    }
    (out / "joint_posterior_aggregate_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
