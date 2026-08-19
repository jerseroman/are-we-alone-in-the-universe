#!/usr/bin/env python3
"""Reconstruct Bryson Model-1 hab2 Poisson joint samples with fixed randomness.

The implementation follows the public notebook
``insolation/computeOccurrencefixedTeff_uncertainty.ipynb`` at commit
``d200f54b6f0df49e0dae530e69983cdce5397bfb``.  It preserves the published
reliability-resampling construction but adds an explicit random seed, machine-
readable provenance, per-trial diagnostics, and parameter-order conversion for
the Galactic propagation engine.

This is a new reproducible reconstruction, not the missing historical chain.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import emcee
import numpy as np
import pandas as pd
from astropy.io import fits
from scipy import interpolate
from scipy.optimize import minimize

PINNED_COMMIT = "d200f54b6f0df49e0dae530e69983cdce5397bfb"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def lnlike(theta, cs, koi_insolation, koi_rps, koi_teffs, sum_comp, teff_means, model):
    norm = 0.0
    for index in range(cs.nTemp):
        rate = model.rateModel(
            cs.period2D,
            cs.rp2D,
            teff_means[index],
            cs.periodRange,
            cs.rpRange,
            cs.tempRange,
            theta,
        )
        pop = rate * sum_comp[:, :, index]
        pop = 0.5 * (pop[:-1, :-1] + pop[1:, 1:])
        norm += np.sum(pop * cs.vol2D)
    values = model.rateModel(
        koi_insolation,
        koi_rps,
        koi_teffs,
        cs.periodRange,
        cs.rpRange,
        cs.tempRange,
        theta,
    )
    if np.any(values <= 0) or np.any(~np.isfinite(values)):
        return -np.inf
    result = np.sum(np.log(values)) - norm
    return result if np.isfinite(result) else -np.inf


def lnprior(theta, model):
    for value, bounds in zip(theta, model.getBounds()):
        if bounds[0] > value or value >= bounds[1]:
            return -np.inf
    # The source notebook returns 1.0 rather than 0.0.  This additive constant
    # does not change the posterior and is retained for source fidelity.
    return 1.0


def lnprob(theta, cs, koi_insolation, koi_rps, koi_teffs, sum_comp, teff_means, model):
    lp = lnprior(theta, model)
    if not np.isfinite(lp):
        return -np.inf
    return lp + lnlike(theta, cs, koi_insolation, koi_rps, koi_teffs, sum_comp, teff_means, model)


def nll(theta, cs, koi_insolation, koi_rps, koi_teffs, sum_comp, teff_means, model):
    value = lnlike(theta, cs, koi_insolation, koi_rps, koi_teffs, sum_comp, teff_means, model)
    return -value if np.isfinite(value) else 1.0e15


def load_completeness(path: Path, cs):
    with fits.open(path, memmap=True) as hdulist:
        cumulative = np.asarray(hdulist[0].data)
        header = hdulist[0].header
        kiclist = np.asarray(hdulist[1].data, dtype=np.int32)
        prob_total = cumulative[2]
        prob_teff = cumulative[3:, :, :]

        n_period = int(header["NPER"])
        n_rp = int(header["NRP"])
        min_rp = float(header["MINRP"])
        max_rp = float(header["MAXRP"])
        min_flux = float(header["MINFLX"])
        max_flux = float(header["MAXFLX"])
        n_teff = int(header["NTEFF"])
        nstars = np.array([header[f"NSTEFF{i}"] for i in range(n_teff)], dtype=float)
        mean_teff = np.array([header[f"MEANT{i}"] for i in range(n_teff)], dtype=float)

        flux_grid = np.linspace(max_flux, min_flux, n_period)
        radius_grid = np.linspace(min_rp, max_rp, n_rp)

        interp_total = interpolate.interp2d(flux_grid, radius_grid, prob_total)
        summed = np.transpose(interp_total(cs.period1D, cs.rp1D))

        summed_teff = np.zeros((cs.nPeriod, cs.nRp, n_teff), dtype=float)
        for index in range(n_teff):
            interp_teff = interpolate.interp2d(flux_grid, radius_grid, prob_teff[index, :, :])
            summed_teff[:, :, index] = np.transpose(interp_teff(cs.period1D, cs.rp1D))

    if summed_teff.shape[2] != cs.nTemp:
        raise RuntimeError(f"Completeness Teff bins {summed_teff.shape[2]} != model bins {cs.nTemp}")
    return summed, summed_teff, mean_teff, nstars, len(kiclist)


def perturb_candidates(all_kois: pd.DataFrame, rng: np.random.RandomState, cs):
    selected = rng.rand(len(all_kois)) < all_kois.totalReliability.to_numpy(dtype=float)
    kois = all_kois.loc[selected].copy()

    insolation = np.zeros(len(kois), dtype=float)
    plus = rng.rand(len(kois)) > 0.5
    minus = ~plus
    insolation[plus] = (
        kois.loc[plus, "gaia_iso_insol"].to_numpy(dtype=float)
        + kois.loc[plus, "gaia_iso_insol_errp"].to_numpy(dtype=float) * rng.randn(np.sum(plus))
    )
    insolation[minus] = (
        kois.loc[minus, "gaia_iso_insol"].to_numpy(dtype=float)
        - kois.loc[minus, "gaia_iso_insol_errm"].to_numpy(dtype=float) * rng.randn(np.sum(minus))
    )

    radii = np.zeros(len(kois), dtype=float)
    plus = rng.rand(len(kois)) > 0.5
    minus = ~plus
    radii[plus] = (
        kois.loc[plus, "gaia_iso_prad"].to_numpy(dtype=float)
        + kois.loc[plus, "gaia_iso_prad_errp"].to_numpy(dtype=float) * rng.randn(np.sum(plus))
    )
    radii[minus] = (
        kois.loc[minus, "gaia_iso_prad"].to_numpy(dtype=float)
        - kois.loc[minus, "gaia_iso_prad_errm"].to_numpy(dtype=float) * rng.randn(np.sum(minus))
    )

    teffs = np.zeros(len(kois), dtype=float)
    plus = rng.rand(len(kois)) > 0.5
    minus = ~plus
    teffs[plus] = (
        kois.loc[plus, "teff"].to_numpy(dtype=float)
        + kois.loc[plus, "teff_err1"].to_numpy(dtype=float) * rng.randn(np.sum(plus))
    )
    teffs[minus] = (
        kois.loc[minus, "teff"].to_numpy(dtype=float)
        - kois.loc[minus, "teff_err2"].to_numpy(dtype=float) * rng.randn(np.sum(minus))
    )

    keep = (cs.periodRange[0] <= insolation) & (insolation <= cs.periodRange[1])
    keep &= np.isfinite(radii) & (cs.rpRange[0] <= radii) & (radii <= cs.rpRange[1])
    keep &= kois.koi_period.to_numpy(dtype=float) <= 400.0
    return insolation[keep], radii[keep], teffs[keep], kois.loc[keep].copy()


def direct_domain_candidates(base_kois: pd.DataFrame) -> pd.DataFrame:
    mask = base_kois.koi_period.to_numpy(dtype=float) <= 400.0
    mask &= (5300.0 <= base_kois.teff.to_numpy(dtype=float)) & (base_kois.teff.to_numpy(dtype=float) <= 6000.0)
    mask &= (0.9 <= base_kois.gaia_iso_prad.to_numpy(dtype=float)) & (base_kois.gaia_iso_prad.to_numpy(dtype=float) <= 1.1)
    mask &= (0.9 <= base_kois.insolation.to_numpy(dtype=float)) & (base_kois.insolation.to_numpy(dtype=float) <= 1.1)
    columns = [
        name for name in (
            "kepoi_name", "kepid_x", "koi_period", "teff", "gaia_iso_prad",
            "insolation", "totalReliability", "reliability"
        ) if name in base_kois.columns
    ]
    return base_kois.loc[mask, columns].copy()


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True, type=Path)
    ap.add_argument("--branch", required=True, choices=("constant", "zero"))
    ap.add_argument("--completeness", required=True, type=Path)
    ap.add_argument("--stellar-catalog", required=True, type=Path)
    ap.add_argument("--planet-catalog", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--seed", type=int, default=20260819)
    ap.add_argument("--trials", type=int, default=400)
    ap.add_argument("--walkers", type=int, default=8)
    ap.add_argument("--burn", type=int, default=400)
    ap.add_argument("--steps", type=int, default=2000)
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    if args.walkers < 8 or args.walkers % 2:
        raise ValueError("walkers must be an even integer >= 8 for the four-parameter model")
    for value, name in ((args.trials, "trials"), (args.burn, "burn"), (args.steps, "steps")):
        if value <= 0:
            raise ValueError(f"{name} must be positive")

    root = args.source_root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(root / "completenessContours"))
    sys.path.insert(0, str(root))
    sys.path.insert(0, str(root / "insolation"))

    import rateModels3D as rm3d  # type: ignore

    cs = rm3d.compSpace(
        periodName="Instellation",
        periodUnits="$I_\\oplus$",
        periodRange=(0.2, 2.2),
        nPeriod=61,
        radiusName="Radius",
        radiusUnits="$R_\\oplus$",
        rpRange=(0.5, 2.5),
        nRp=61,
        tempName="$T_\\mathrm{eff}$",
        tempUnits="K",
        tempRange=(3900, 6300),
        nTemp=10,
    )
    model = rm3d.triplePowerLawTeffAvg(cs)

    stellar_targets = pd.read_csv(args.stellar_catalog)
    base_kois = pd.read_csv(args.planet_catalog)
    base_kois = pd.merge(
        base_kois,
        stellar_targets[["kepid", "logg"]],
        left_on="kepid_x",
        right_on="kepid",
        how="inner",
    )

    _, summed_teff, mean_teff, nstars, kic_count = load_completeness(args.completeness, cs)
    rng = np.random.RandomState(args.seed)

    direct = direct_domain_candidates(base_kois)
    direct.to_csv(out / "direct_narrow_domain_candidates.csv", index=False)

    raw_chains: list[np.ndarray] = []
    propagation_chains: list[np.ndarray] = []
    diagnostics: list[dict[str, object]] = []
    start_all = time.time()

    for trial in range(args.trials):
        start_trial = time.time()
        insolation, radii, teffs, selected_kois = perturb_candidates(base_kois, rng, cs)
        if len(radii) == 0:
            raise RuntimeError(f"Trial {trial}: no candidates survived")

        theta0 = np.asarray(model.initRateModel(), dtype=float)
        optimum = minimize(
            nll,
            theta0,
            method="L-BFGS-B",
            bounds=model.getBounds(),
            args=(cs, insolation, radii, teffs, summed_teff, mean_teff, model),
        )
        ndim = len(optimum.x)
        positions = np.asarray(
            [optimum.x + 1.0e-5 * rng.randn(ndim) for _ in range(args.walkers)],
            dtype=float,
        )
        sampler = emcee.EnsembleSampler(
            args.walkers,
            ndim,
            lnprob,
            args=(cs, insolation, radii, teffs, summed_teff, mean_teff, model),
        )
        positions, _, _ = sampler.run_mcmc(positions, args.burn)
        sampler.reset()
        positions, _, _ = sampler.run_mcmc(positions, args.steps)
        raw = np.asarray(sampler.flatchain, dtype=float)
        if raw.ndim != 2 or raw.shape[1] != 4 or not np.isfinite(raw).all():
            raise RuntimeError(f"Trial {trial}: invalid chain shape/content {raw.shape}")

        # Source model order is F0, beta(instellation), alpha(radius), gamma.
        # Galactic propagation order is F0, alpha(radius), beta(instellation), gamma.
        propagation = raw[:, [0, 2, 1, 3]]
        raw_chains.append(raw)
        propagation_chains.append(propagation)

        autocorr = None
        try:
            autocorr = np.asarray(sampler.get_autocorr_time(), dtype=float).tolist()
        except Exception:
            autocorr = None
        diagnostics.append(
            {
                "trial": trial,
                "n_reliability_selected_before_domain": int(len(selected_kois)),
                "n_used": int(len(radii)),
                "optimizer_success": bool(optimum.success),
                "optimizer_status": int(optimum.status),
                "optimizer_message": str(optimum.message),
                "optimizer_theta_source_order": np.asarray(optimum.x, dtype=float).tolist(),
                "mean_acceptance_fraction": float(np.mean(sampler.acceptance_fraction)),
                "autocorrelation_time_if_estimable": autocorr,
                "elapsed_seconds": float(time.time() - start_trial),
            }
        )
        print(json.dumps(diagnostics[-1]), flush=True)

    raw_all = np.concatenate(raw_chains, axis=0)
    prop_all = np.concatenate(propagation_chains, axis=0)
    np.save(out / "joint_samples_source_order.npy", raw_all)
    np.save(out / "joint_samples_propagation_order.npy", prop_all)

    sample_table = pd.DataFrame(prop_all, columns=["F0", "alpha", "beta", "gamma"])
    sample_table.insert(0, "branch", args.branch)
    sample_table.to_csv(out / "joint_samples_propagation_order.csv.gz", index=False, compression="gzip")

    raw_table = pd.DataFrame(raw_all, columns=["F0", "beta", "alpha", "gamma"])
    raw_table.insert(0, "branch", args.branch)
    raw_table.to_csv(out / "joint_samples_source_order.csv.gz", index=False, compression="gzip")

    quantiles = np.quantile(prop_all, [0.16, 0.5, 0.84], axis=0)
    summary = {
        "status": "new reproducible reconstruction; not the missing historical chain",
        "source_repository": "stevepur/DR25-occurrence-public",
        "source_commit": PINNED_COMMIT,
        "branch": args.branch,
        "seed": args.seed,
        "trials": args.trials,
        "walkers": args.walkers,
        "burn": args.burn,
        "steps": args.steps,
        "samples_per_trial": args.walkers * args.steps,
        "n_joint_samples": int(len(prop_all)),
        "source_parameter_order": ["F0", "beta_instellation", "alpha_radius", "gamma"],
        "propagation_parameter_order": ["F0", "alpha_radius", "beta_instellation", "gamma"],
        "q16_q50_q84_propagation_order": {
            name: {"q16": float(quantiles[0, i]), "q50": float(quantiles[1, i]), "q84": float(quantiles[2, i])}
            for i, name in enumerate(("F0", "alpha", "beta", "gamma"))
        },
        "direct_narrow_domain_candidate_count_unperturbed": int(len(direct)),
        "stellar_target_count": int(len(stellar_targets)),
        "planet_catalog_rows_after_stellar_merge": int(len(base_kois)),
        "completeness_target_count": int(kic_count),
        "completeness_nstars_by_teff_bin": nstars.tolist(),
        "completeness_mean_teff": mean_teff.tolist(),
        "mean_acceptance_fraction": float(np.mean([d["mean_acceptance_fraction"] for d in diagnostics])),
        "elapsed_seconds": float(time.time() - start_all),
        "inputs": {
            "stellar_catalog": {"path": str(args.stellar_catalog), "sha256": sha256(args.stellar_catalog)},
            "planet_catalog": {"path": str(args.planet_catalog), "sha256": sha256(args.planet_catalog)},
            "completeness": {"path": str(args.completeness), "sha256": sha256(args.completeness)},
        },
        "diagnostics": diagnostics,
    }
    (out / "joint_posterior_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
