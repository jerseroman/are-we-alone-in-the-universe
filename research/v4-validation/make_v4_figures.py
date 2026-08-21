#!/usr/bin/env python3
"""Generate fresh standalone vector figures from frozen v4 audit artifacts."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import pandas as pd


BLUE = "#1769AA"
ORANGE = "#D97706"
GREEN = "#15803D"
RED = "#B91C1C"
PURPLE = "#7E22CE"
GRAY = "#64748B"
LIGHT = "#CBD5E1"

PDF_DATE = dt.datetime(2026, 8, 22, tzinfo=dt.timezone.utc)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def pdf_metadata(title: str, subject: str) -> dict[str, object]:
    return {
        "Title": title,
        "Author": "Roman Jerse",
        "Subject": subject,
        "Keywords": "ExoEarth, Kepler DR25, occurrence rate, Milky Way",
        "Creator": "research/v4-validation/make_v4_figures.py",
        "CreationDate": PDF_DATE,
        "ModDate": PDF_DATE,
    }


def configure_style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 9,
            "axes.titlesize": 10,
            "axes.labelsize": 9,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "legend.fontsize": 8,
            "figure.titlesize": 11,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "axes.grid.axis": "x",
            "grid.alpha": 0.22,
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
            "savefig.bbox": "tight",
        }
    )


def draw_interval(ax: plt.Axes, row: pd.Series, y: float, color: str) -> None:
    ax.hlines(y, row["q2.5"], row["q97.5"], color=LIGHT, linewidth=7, zorder=1)
    ax.hlines(y, row["q16"], row["q84"], color=color, linewidth=4, zorder=2)
    ax.plot(row["q50"], y, marker="o", color="white", markeredgecolor=color,
            markeredgewidth=2, markersize=7, zorder=3)


def posterior_figure(quantiles_path: Path, output: Path) -> None:
    data = pd.read_csv(quantiles_path)
    quantile_columns = ["q2.5", "q16", "q50", "q84", "q97.5"]
    occurrence = (
        data[data["quantity"] == "mean_f_EE"]
        .set_index("branch")[quantile_columns]
        .mul(100.0)
    )
    counts = (
        data[data["quantity"] == "Lambda_EE"]
        .set_index("branch")[quantile_columns]
        .div(1_000_000.0)
    )
    branches = [("constant", "Constant completeness", BLUE), ("zero", "Zero completeness", ORANGE)]

    fig, axes = plt.subplots(1, 2, figsize=(7.3, 3.15), constrained_layout=True)
    for ax, frame, title, xlabel in (
        (axes[0], occurrence, "Narrow-domain occurrence", "Mean planets per star (%)"),
        (axes[1], counts, "7-9 kpc population expectation", "Expected planets (millions)"),
    ):
        for y, (branch, _, color) in zip((1.0, 0.0), branches):
            draw_interval(ax, frame.loc[branch], y, color)
        ax.set_yticks([1.0, 0.0], [label for _, label, _ in branches])
        ax.set_title(title, loc="left", fontweight="bold")
        ax.set_xlabel(xlabel)
        ax.set_ylim(-0.55, 1.55)
        ax.axvline(0.0, color="#0F172A", linewidth=0.7)

    axes[0].set_xlim(0.0, 6.5)
    axes[1].set_xlim(0.0, 17.0)
    fig.suptitle("Corrected v4 posterior: median, 68%, and 95% intervals", x=0.02,
                 ha="left", fontweight="bold")
    fig.text(0.02, -0.01, "Pale: 95% posterior interval   Dark: 68% posterior interval   Circle: median",
             fontsize=8, color="#334155")
    fig.savefig(
        output,
        format="pdf",
        metadata=pdf_metadata(
            "Corrected v4 posterior intervals",
            "Frozen posterior intervals for occurrence and Galactic population expectation",
        ),
    )
    plt.close(fig)


def dr25_support_figure(near_path: Path, frequency_path: Path, output: Path) -> None:
    near = pd.read_csv(near_path)
    frequency = pd.read_csv(frequency_path)
    radius_mask = near["radius_0p9_1p1"].astype(bool)
    hz_mask = near["conservative_hz_instellation_intersection"].astype(bool)

    fig, axes = plt.subplots(1, 2, figsize=(7.3, 3.45), constrained_layout=True)
    ax = axes[0]
    ax.scatter(
        near.loc[radius_mask, "gaia_iso_prad"],
        near.loc[radius_mask, "gaia_iso_insol"],
        s=24,
        facecolor=BLUE,
        edgecolor="white",
        linewidth=0.4,
        alpha=0.80,
        label="Radius-near candidates (n=54)",
    )
    ax.scatter(
        near.loc[hz_mask, "gaia_iso_prad"],
        near.loc[hz_mask, "gaia_iso_insol"],
        s=42,
        marker="D",
        facecolor=ORANGE,
        edgecolor="white",
        linewidth=0.5,
        label="Conservative-HZ candidates (n=3)",
    )
    ax.add_patch(Rectangle((0.9, 0.9), 0.2, 0.2, facecolor=GREEN, edgecolor=GREEN,
                           alpha=0.25, linewidth=1.5))
    ax.set_yscale("log")
    ax.set_xlim(0.82, 3.65)
    ax.set_ylim(0.7, 6000)
    ax.set_xlabel(r"Planet radius ($R_\oplus$)")
    ax.set_ylabel(r"Instellation ($I_\oplus$)")
    ax.set_title("Nominal DR25 near-support set", loc="left", fontweight="bold")
    ax.legend(loc="upper right", frameon=False)

    zoom = axes[1]
    zoom.set_xlim(0.84, 1.60)
    zoom.set_ylim(0.75, 1.25)
    zoom.add_patch(Rectangle((0.9, 0.9), 0.2, 0.2, facecolor=GREEN, edgecolor=GREEN,
                             alpha=0.20, linewidth=1.8))
    in_zoom = (
        near["gaia_iso_prad"].between(0.84, 1.60)
        & near["gaia_iso_insol"].between(0.75, 1.25)
    )
    zoom.scatter(
        near.loc[in_zoom, "gaia_iso_prad"],
        near.loc[in_zoom, "gaia_iso_insol"],
        s=50,
        marker="D",
        facecolor=ORANGE,
        edgecolor="white",
        linewidth=0.6,
    )
    entrant_rows = frequency.drop_duplicates("kepoi_name")
    for _, row in entrant_rows.iterrows():
        zoom.scatter(row["nominal_radius"], row["nominal_flux"], s=60, facecolor="none",
                     edgecolor=RED, linewidth=1.4, zorder=4)
        zoom.annotate(
            row["kepoi_name"],
            (row["nominal_radius"], row["nominal_flux"]),
            xytext=(5, 7),
            textcoords="offset points",
            fontsize=7.5,
            color=RED,
        )
    zoom.text(1.0, 1.0, "0 nominal\ncandidates", ha="center", va="center",
              color=GREEN, fontweight="bold", fontsize=8)
    zoom.set_xlabel(r"Planet radius ($R_\oplus$)")
    zoom.set_ylabel(r"Instellation ($I_\oplus$)")
    zoom.set_title("Exact target neighborhood", loc="left", fontweight="bold")
    zoom.text(
        0.02,
        0.02,
        "Green box: fixed 0.9-1.1 domain;\ntarget is additionally climate-clipped.",
        transform=zoom.transAxes,
        va="bottom",
        fontsize=7.2,
        color="#334155",
    )

    fig.suptitle("Direct DR25 support audit for the v4 target", x=0.02, ha="left",
                 fontweight="bold")
    fig.savefig(
        output,
        format="pdf",
        metadata=pdf_metadata(
            "DR25 local-support audit",
            "Nominal Kepler DR25 support near the v4 Earth-analog target",
        ),
    )
    plt.close(fig)


def sensitivity_figure(register_path: Path, output: Path) -> None:
    data = pd.read_csv(register_path)
    selected_labels = {
        "legacy measurement-error propagation": "Legacy measurement propagation",
        "zero versus constant completeness": "Zero vs. constant completeness",
        "legacy fixed-logg selector (constant)": "Legacy host selector (constant)",
        "native solar curve without the 5200 K anchor": "Native TAMS without 5200 K anchor",
        "radial grid 0.5 to 0.25 kpc": "Radial grid: 0.5 to 0.25 kpc",
        "Bryson Model 2 versus Model 1": "Occurrence Model 2 vs. Model 1",
        "runaway-greenhouse flux scale 0.95": "Inner HZ flux x0.95",
        "runaway-greenhouse flux scale 1.05": "Inner HZ flux x1.05",
        "Kopparapu runaway boundary for 0.1 Earth masses": "0.1 Earth-mass HZ prescription",
        "Kopparapu runaway boundary for 5 Earth masses": "5 Earth-mass HZ prescription",
        "optimistic versus conservative HZ": "Optimistic vs. conservative HZ",
        "JJ-weighted versus uniform 5300--6000 K average": "JJ vs. uniform temperature weighting",
    }
    frame = data[data["sensitivity"].isin(selected_labels)].copy()
    frame["label"] = frame["sensitivity"].map(selected_labels)
    ordered = list(selected_labels)
    frame["order"] = frame["sensitivity"].map({value: idx for idx, value in enumerate(ordered)})
    frame = frame.sort_values("order", ascending=False)

    status_colors = {
        "PASS": GREEN,
        "PASS_SENSITIVITY": GREEN,
        "SCENARIO_NOT_INTERVAL": ORANGE,
        "MODEL_SENSITIVITY": RED,
        "POINT_ESTIMATE_ONLY": PURPLE,
        "NUMERICAL_PERTURBATION": BLUE,
        "ALTERNATIVE_PRESCRIPTION": PURPLE,
        "ALTERNATIVE_ESTIMAND": PURPLE,
    }
    colors = [status_colors.get(status, GRAY) for status in frame["status"]]

    fig = plt.figure(figsize=(7.5, 6.7), constrained_layout=True)
    grid = fig.add_gridspec(2, 1, height_ratios=[5.2, 1.2])
    ax = fig.add_subplot(grid[0])
    y = range(len(frame))
    ax.axvline(0.0, color="#0F172A", linewidth=0.9)
    ax.hlines(y, 0.0, frame["percent_change"], color=colors, linewidth=2.2)
    ax.scatter(frame["percent_change"], y, color=colors, s=38, zorder=3)
    for yi, value in zip(y, frame["percent_change"]):
        ax.annotate(
            f"{value:+.2f}%",
            (value, yi),
            xytext=(5, 0),
            textcoords="offset points",
            va="center",
            ha="left",
            fontsize=7.5,
            bbox={"facecolor": "white", "edgecolor": "none", "alpha": 0.82, "pad": 0.4},
        )
    ax.set_yticks(list(y), frame["label"])
    ax.set_xlim(-65, 50)
    ax.set_xlabel(r"Change in $\Lambda_{\rm EE}$ relative to stated reference (%)")
    ax.set_title("One-at-a-time checks, scenarios, and alternative prescriptions",
                 loc="left", fontweight="bold")

    spatial = data[data["category"] == "spatial domain"].copy()
    spatial["label"] = spatial["sensitivity"].replace(
        {
            "Broad solar annulus 6-10 kpc": "6-10 kpc domain",
            "Full JJ disk 4-14 kpc": "4-14 kpc domain",
        }
    )
    ax2 = fig.add_subplot(grid[1])
    sy = range(len(spatial))
    ax2.barh(list(sy), spatial["percent_change"], color=PURPLE, height=0.45)
    for yi, value in zip(sy, spatial["percent_change"]):
        ax2.text(value + 6, yi, f"{value:+.1f}%", va="center", fontsize=8)
    ax2.set_yticks(list(sy), spatial["label"])
    ax2.set_xlim(0, 400)
    ax2.set_xlabel("Change from redefining the spatial estimand (%)")
    ax2.set_title("Alternative spatial estimands (not uncertainty intervals)",
                  loc="left", fontweight="bold")

    fig.suptitle("Frozen v4 sensitivity register", x=0.01, ha="left", fontweight="bold")
    fig.text(
        0.01,
        -0.01,
        "Categorical gates: DR25 local support = FAIL; metallicity-dependent TAMS test = FAIL / excluded.",
        color=RED,
        fontsize=8,
        fontweight="bold",
    )
    fig.savefig(
        output,
        format="pdf",
        metadata=pdf_metadata(
            "Frozen v4 sensitivity register",
            "Audited sensitivity checks and alternative estimands for the v4 ExoEarth projection",
        ),
    )
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    output = (args.out or root / "paper" / "exoearth-annulus-v4" / "figures").resolve()
    output.mkdir(parents=True, exist_ok=True)
    configure_style()

    figures = [
        output / "v4_posterior_intervals.pdf",
        output / "v4_dr25_local_support.pdf",
        output / "v4_sensitivity_register.pdf",
    ]
    posterior_figure(
        root / "research" / "bryson-joint-posterior" / "frozen-v4" / "v4_galactic_quantiles.csv",
        figures[0],
    )
    dr25_support_figure(
        root / "research" / "v4-validation" / "frozen-dr25-support" / "dr25_nominal_near_support.csv",
        root / "research" / "v4-validation" / "frozen-dr25-support" / "dr25_perturbed_candidate_frequency.csv",
        figures[1],
    )
    sensitivity_figure(
        root / "research" / "v4-validation" / "frozen-sensitivities" / "v4_sensitivity_register.csv",
        figures[2],
    )
    for figure in figures:
        if not figure.is_file() or figure.stat().st_size < 10_000:
            raise RuntimeError(f"Figure was not created correctly: {figure}")
    manifest = output / "SHA256SUMS_figures.txt"
    with manifest.open("w", encoding="utf-8", newline="\n") as handle:
        for figure in figures:
            handle.write(f"{sha256(figure)}  {figure.name}\n")
    print("\n".join(f"{figure.name}: {sha256(figure)}" for figure in figures))


if __name__ == "__main__":
    main()
