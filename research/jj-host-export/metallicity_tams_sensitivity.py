#!/usr/bin/env python3
"""Metallicity-dependent PARSEC-TAMS sensitivity for the frozen JJ host provider.

This is a research/systematics calculation. It does NOT replace the canonical
one-dimensional Berger/Huber TAMS selector.

Method:
  * read the exact JJ pre-logg parent population, including row-level FeH;
  * regenerate PARSEC v1.2S TAMS points at several published metallicity grids
    using the same rule as danxhuber/evolstate parsec.py: first PHASE==7 model
    of each evolutionary track, age < 20 Gyr, with radius reconstructed from
    LOG_L and LOG_TE;
  * validate the Z=0.017 curve against the immutable Berger/Huber source table;
  * interpolate log10(R_TAMS) linearly in Teff within each metallicity curve;
  * interpolate log10(R_TAMS) linearly in [M/H] between PARSEC metallicity
    anchors, with no metallicity or temperature extrapolation;
  * reselect the exact same JJ rows with Rstar <= R_TAMS(Teff,[Fe/H]) and
    logg < 7, then recompute N_G, L1 and L2.

The result quantifies the host-selection systematic caused by transporting a
solar-metallicity one-dimensional TAMS boundary to the JJ thin+thick disk.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import tarfile
from pathlib import Path

import numpy as np
import requests
from astropy.io import ascii

BASE_URL = "https://people.sissa.it/~sbressan/CAF09_V1.2S_M36_LT"
TMIN, TMAX = 5300.0, 6000.0
LOGG_MAX = 7.0

# PARSEC v1.2S scaled-solar metallicity grids that bracket the JJ disk AMR.
# Archive names are from the public PARSEC/SISSA track database.
ANCHORS = [
    (0.0005, 0.249, "Z0.0005Y0.249.tar.gz"),
    (0.0010, 0.250, "Z0.001Y0.25.tar.gz"),
    (0.0020, 0.252, "Z0.002Y0.252.tar.gz"),
    (0.0040, 0.256, "Z0.004Y0.256.tar.gz"),
    (0.0060, 0.259, "Z0.006Y0.259.tar.gz"),
    (0.0080, 0.263, "Z0.008Y0.263.tar.gz"),
    (0.0100, 0.267, "Z0.01Y0.267.tar.gz"),
    (0.0140, 0.273, "Z0.014Y0.273.tar.gz"),
    (0.0170, 0.279, "Z0.017Y0.279.tar.gz"),
    (0.0200, 0.284, "Z0.02Y0.284.tar.gz"),
    (0.0300, 0.302, "Z0.03Y0.302.tar.gz"),
    (0.0400, 0.321, "Z0.04Y0.321.tar.gz"),
]

# Official PARSEC/CMD convention for v1.2S scaled-solar composition.
ZX_SUN = 0.0207
Y_P = 0.2485
DYDZ = 1.78


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def mh_from_z(z: float) -> float:
    y = Y_P + DYDZ * z
    x = 1.0 - y - z
    if x <= 0:
        raise ValueError((z, x))
    return math.log10((z / x) / ZX_SUN)


def safe_extract(tf: tarfile.TarFile, dest: Path) -> None:
    root = dest.resolve()
    for member in tf.getmembers():
        target = (dest / member.name).resolve()
        if root not in target.parents and target != root:
            raise RuntimeError(f"Unsafe tar member: {member.name}")
    tf.extractall(dest)


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with path.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def build_curve(z: float, y: float, archive_name: str, cache: Path):
    archive = cache / archive_name
    download(f"{BASE_URL}/{archive_name}", archive)
    dest = cache / archive_name.replace(".tar.gz", "")
    marker = dest / ".extracted"
    if not marker.exists():
        dest.mkdir(parents=True, exist_ok=True)
        with tarfile.open(archive, "r:gz") as tf:
            safe_extract(tf, dest)
        marker.write_text("ok\n", encoding="utf-8")

    pts = []
    parsed_files = 0
    for p in sorted(dest.rglob("*")):
        if not p.is_file() or "ADD" in p.name.upper() or p.name.startswith("."):
            continue
        try:
            tab = ascii.read(p)
        except Exception:
            continue
        cols = set(tab.colnames)
        if not {"PHASE", "AGE", "LOG_TE", "LOG_L"}.issubset(cols):
            continue
        parsed_files += 1
        phase = np.asarray(tab["PHASE"], float)
        age = np.asarray(tab["AGE"], float)
        idx = np.where((phase == 7.0) & (age < 20.0e9))[0]
        if len(idx) == 0:
            continue
        k = int(idx[0])
        teff = float(10.0 ** float(tab["LOG_TE"][k]))
        logl = float(tab["LOG_L"][k])
        radius = float(math.sqrt(10.0**logl * (teff / 5777.0) ** (-4.0)))
        mass = float(tab["MASS"][k]) if "MASS" in cols else float("nan")
        pts.append((teff, radius, mass, p.name))

    if parsed_files == 0 or len(pts) < 5:
        raise RuntimeError(f"Failed to recover TAMS track points for Z={z}: parsed={parsed_files}, points={len(pts)}")

    # Keep the low/intermediate-mass branch relevant to the 5300-6000 K G-star
    # interval.  The public Berger/Huber curve is monotonic on this segment.
    pts = [q for q in pts if 4800.0 <= q[0] <= 6300.0]
    pts.sort(key=lambda q: q[0])
    if len(pts) < 4:
        raise RuntimeError(f"Insufficient G-star TAMS coverage for Z={z}: {pts}")

    # Deduplicate nearly identical Teff values, keeping the smallest-radius TAMS
    # point. This protects against archive merge duplicates while retaining the
    # lower TAMS envelope.
    dedup = []
    for q in pts:
        if dedup and abs(q[0] - dedup[-1][0]) < 0.05:
            if q[1] < dedup[-1][1]:
                dedup[-1] = q
        else:
            dedup.append(q)
    pts = dedup
    t = np.array([q[0] for q in pts], float)
    r = np.array([q[1] for q in pts], float)
    if t.min() > TMIN or t.max() < TMAX:
        raise RuntimeError(f"TAMS curve Z={z} does not bracket 5300-6000 K: {t.min()}..{t.max()}")
    return {
        "Z": z,
        "Y": y,
        "MH": mh_from_z(z),
        "archive": archive_name,
        "archive_sha256": sha256(archive),
        "points": pts,
        "T": t,
        "R": r,
    }


def interp_curve(curve, T):
    T = np.asarray(T, float)
    if np.any(T < curve["T"].min()) or np.any(T > curve["T"].max()):
        raise ValueError("Temperature extrapolation forbidden")
    return 10.0 ** np.interp(T, curve["T"], np.log10(curve["R"]))


def validate_solar(curve, reference_path: Path):
    ref = np.loadtxt(reference_path)
    ref = ref[(ref[:, 0] >= 5200.0) & (ref[:, 0] <= 6060.3)]
    generated = np.array([[q[0], q[1]] for q in curve["points"]], float)
    matches = []
    for T, R in ref:
        j = int(np.argmin(np.abs(generated[:, 0] - T)))
        dT = abs(float(generated[j, 0] - T))
        dRrel = abs(float(generated[j, 1] - R)) / R
        matches.append((T, R, generated[j, 0], generated[j, 1], dT, dRrel))
    max_dt = max(q[4] for q in matches)
    max_dr = max(q[5] for q in matches)
    # The public source table was produced from these same PARSEC tracks using
    # this same PHASE==7 rule.  Allow only tiny text/rounding differences.
    if max_dt > 0.2 or max_dr > 5e-4:
        raise RuntimeError(f"Solar TAMS regeneration does not reproduce Berger/Huber table: max_dT={max_dt}, max_relR={max_dr}")
    return matches, max_dt, max_dr


def metallicity_tams_radius(T, feh, curves):
    T = np.asarray(T, float)
    feh = np.asarray(feh, float)
    mh = np.array([c["MH"] for c in curves], float)
    order = np.argsort(mh)
    curves = [curves[i] for i in order]
    mh = mh[order]
    if np.any(feh < mh[0]) or np.any(feh > mh[-1]):
        raise ValueError(f"Metallicity extrapolation forbidden: host FeH {feh.min()}..{feh.max()}, anchors {mh[0]}..{mh[-1]}")

    # Evaluate each metallicity anchor at each row's Teff, then interpolate
    # log10 radius in [M/H] independently for every stellar assembly.
    anchor_logr = np.vstack([np.log10(interp_curve(c, T)) for c in curves])
    out = np.empty_like(T)
    for i, zfe in enumerate(feh):
        out[i] = 10.0 ** np.interp(zfe, mh, anchor_logr[:, i])
    return out


def integrate_radial(rows, field, lo, hi):
    q = [r for r in rows if lo <= r["R_kpc"] <= hi]
    R = np.array([r["R_kpc"] for r in q], float)
    y = np.array([r[field] for r in q], float)
    if len(R) < 2 or abs(R[0] - lo) > 1e-9 or abs(R[-1] - hi) > 1e-9:
        raise RuntimeError(f"Missing radial endpoints {lo}-{hi}: {R}")
    return float(np.trapz(y, R))


def weighted_quantile(values, weights, qs):
    values = np.asarray(values, float)
    weights = np.asarray(weights, float)
    o = np.argsort(values)
    v = values[o]
    w = weights[o]
    c = np.cumsum(w)
    if c[-1] <= 0:
        return [float("nan") for _ in qs]
    c /= c[-1]
    return [float(np.interp(q, c, v)) for q in qs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="jj_g_hosts_parent_prelogg_padova.csv with FeH")
    ap.add_argument("--reference-tams", required=True)
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    inp = Path(args.input)
    ref = Path(args.reference_tams)
    cache = Path(args.cache)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)

    parent = []
    with inp.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            parent.append({
                "R_kpc": float(r["R_kpc"]),
                "component": r["component"],
                "FeH": float(r["FeH"]),
                "Teff_K": float(r["Teff_K"]),
                "logg": float(r["logg"]),
                "N": float(r["N_surface_pc-2"]),
                "Rstar": float(r["Rstar_g_Rsun"]),
                "B_1D": int(r["B_TAMS_MS"]) == 1,
                "f_HZ": float(r["f_HZ"]),
                "f10": float(r["f_earth10"]),
            })
    if not parent:
        raise RuntimeError("Empty parent population")

    feh_all = np.array([r["FeH"] for r in parent], float)
    # Download only PARSEC anchors that bracket the actual parent metallicity
    # range, plus one anchor on either side when available.
    anchor_mh = np.array([mh_from_z(z) for z, _, _ in ANCHORS])
    lo_idx = max(0, int(np.searchsorted(anchor_mh, feh_all.min(), side="right")) - 1)
    hi_idx = min(len(ANCHORS) - 1, int(np.searchsorted(anchor_mh, feh_all.max(), side="left")))
    selected_anchors = ANCHORS[lo_idx:hi_idx + 1]
    if len(selected_anchors) < 2:
        raise RuntimeError("Metallicity range not bracketed")

    curves = [build_curve(*a, cache) for a in selected_anchors]
    solar = min(curves, key=lambda c: abs(c["Z"] - 0.017))
    if abs(solar["Z"] - 0.017) > 1e-12:
        # Always include the Huber/solar validation anchor.
        solar = build_curve(0.017, 0.279, "Z0.017Y0.279.tar.gz", cache)
        curves.append(solar)
        curves.sort(key=lambda c: c["MH"])
    matches, max_dt, max_dr = validate_solar(solar, ref)

    # Export all regenerated TAMS points and solar validation matches.
    with (out / "metallicity_tams_anchor_points.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Z", "Y", "MH", "Teff_K", "R_TAMS_Rsun", "track_mass_Msun", "track_file"])
        for c in curves:
            for T, R, M, name in c["points"]:
                w.writerow([c["Z"], c["Y"], c["MH"], T, R, M, name])
    with (out / "metallicity_tams_solar_validation.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ref_Teff_K", "ref_R_Rsun", "generated_Teff_K", "generated_R_Rsun", "abs_dT_K", "rel_dR"])
        w.writerows(matches)

    T = np.array([r["Teff_K"] for r in parent], float)
    feh = np.array([r["FeH"] for r in parent], float)
    rstar = np.array([r["Rstar"] for r in parent], float)
    logg = np.array([r["logg"] for r in parent], float)
    rt_metal = metallicity_tams_radius(T, feh, curves)
    B2 = (rstar <= rt_metal) & (logg < LOGG_MAX)

    for i, r in enumerate(parent):
        r["B_2D"] = bool(B2[i])
        r["R_TAMS_2D"] = float(rt_metal[i])

    radial = []
    for R in sorted({r["R_kpc"] for r in parent}):
        rr = [r for r in parent if r["R_kpc"] == R]
        d = {"R_kpc": R}
        fac = 2.0 * math.pi * R * 1.0e6
        for key, selector in [("1D", "B_1D"), ("2D", "B_2D")]:
            sel = [r for r in rr if r[selector]]
            d[f"N_{key}"] = fac * sum(r["N"] for r in sel)
            d[f"L1_{key}"] = fac * sum(r["N"] * r["f_HZ"] for r in sel)
            d[f"L2_{key}"] = fac * sum(r["N"] * r["f10"] for r in sel)
            for comp in ("thin", "thick"):
                sc = [r for r in sel if r["component"] == comp]
                d[f"N_{key}_{comp}"] = fac * sum(r["N"] for r in sc)
        radial.append(d)

    with (out / "metallicity_tams_radial.csv").open("w", newline="", encoding="utf-8") as f:
        cols = list(radial[0].keys())
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader(); w.writerows(radial)

    result = {
        "experiment": "metallicity_dependent_PARSEC_TAMS_sensitivity",
        "canonical_selector": "Berger/Huber Z=0.017 one-dimensional R_TAMS(Teff) + logg<7",
        "sensitivity_selector": "PARSEC v1.2S R_TAMS(Teff,[M/H]) + logg<7",
        "metallicity_interpolation": "linear in [M/H] and log10(R_TAMS); temperature interpolation linear in Teff and log10(R_TAMS); no extrapolation",
        "parsec_source": BASE_URL,
        "parsec_phase_rule": "first PHASE==7 model per track, age<20 Gyr, matching danxhuber/evolstate parsec.py",
        "parent_FeH_min": float(feh.min()),
        "parent_FeH_max": float(feh.max()),
        "anchor_summary": [
            {"Z": c["Z"], "Y": c["Y"], "MH": c["MH"], "archive": c["archive"], "archive_sha256": c["archive_sha256"], "n_G_segment_points": len(c["points"])}
            for c in curves
        ],
        "solar_regeneration_validation": {"max_abs_dT_K": max_dt, "max_relative_dR": max_dr},
        "domains": {},
    }

    for name, lo, hi in [("lineweaver_7_9", 7.0, 9.0), ("full_JJ_4_14", 4.0, 14.0)]:
        d = {}
        for key in ("1D", "2D"):
            N = integrate_radial(radial, f"N_{key}", lo, hi)
            L1 = integrate_radial(radial, f"L1_{key}", lo, hi)
            L2 = integrate_radial(radial, f"L2_{key}", lo, hi)
            thin = integrate_radial(radial, f"N_{key}_thin", lo, hi)
            thick = integrate_radial(radial, f"N_{key}_thick", lo, hi)
            assert N > 0 and 0 <= L2 <= L1
            d[key] = {"N_G": N, "Lambda_ESHZ": L1, "Lambda_earth10": L2, "thin_hosts": thin, "thick_hosts": thick, "thick_fraction": thick / N}
        d["delta_2D_vs_1D"] = {k: (d["2D"][k] - d["1D"][k]) / d["1D"][k] for k in ("N_G", "Lambda_ESHZ", "Lambda_earth10")}
        result["domains"][name] = d

    # Canonical baseline must exactly reproduce the current TAMS provider before
    # interpreting the metallicity sensitivity.
    b = result["domains"]["lineweaver_7_9"]["1D"]
    assert abs(b["N_G"] - 263061992.3667424) < 1e-2, b
    assert abs(b["Lambda_ESHZ"] - 105716685.0799756) < 1e-2, b
    assert abs(b["Lambda_earth10"] - 3376462.6740267) < 1e-2, b

    # Diagnostics for rows whose classification changes in 7-9 kpc.
    changed = [r for r in parent if 7.0 <= r["R_kpc"] <= 9.0 and r["B_1D"] != r["B_2D"]]
    gained = [r for r in changed if (not r["B_1D"]) and r["B_2D"]]
    lost = [r for r in changed if r["B_1D"] and (not r["B_2D"])]
    for label, rows in [("gained", gained), ("lost", lost)]:
        if rows:
            vals = [r["FeH"] for r in rows]
            wts = [r["N"] for r in rows]
            qs = weighted_quantile(vals, wts, [0.16, 0.5, 0.84])
        else:
            qs = [float("nan")] * 3
        result[f"changed_rows_{label}"] = {"rows": len(rows), "FeH_weighted_q16_q50_q84": qs}

    (out / "metallicity_tams_sensitivity.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    with (out / "metallicity_tams_anchor_summary.csv").open("w", newline="", encoding="utf-8") as f:
        cols = ["Z", "Y", "MH", "archive", "archive_sha256", "n_G_segment_points"]
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(result["anchor_summary"])

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
