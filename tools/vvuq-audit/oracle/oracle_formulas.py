"""Independent V&V/UQ oracle formulas.

These helpers intentionally do not import or execute calculator JavaScript.
They operate on JSON snapshots produced for the audit and recompute a small
independent formula set for implementation-verification support.
"""

from __future__ import annotations

import math
from typing import Mapping, Sequence


def clamp01(value: float) -> float:
    if not math.isfinite(float(value)):
        return 0.0
    return min(1.0, max(0.0, float(value)))


def deterministic_product(
    values: Mapping[str, float],
    parameter_order: Sequence[str],
    enable_complex: bool,
    enable_x: bool,
) -> float:
    product = max(0.0, float(values.get("N_GHZ", 0.0)))
    for key in parameter_order:
        if key == "N_GHZ":
            continue
        if key == "f_complex_life" and not enable_complex:
            continue
        if key == "f_x" and not enable_x:
            continue
        raw = float(values.get(key, 0.0))
        factor = max(0.0, raw) if key == "N_p_star" else clamp01(raw)
        product *= factor
    return max(0.0, product)


def seti_lambda(count: float, f_tx: float, range_gate: float, lifetime_years: float, galaxy_years: float) -> float:
    if galaxy_years <= 0:
        return 0.0
    return max(0.0, count) * clamp01(f_tx) * clamp01(range_gate) * max(0.0, lifetime_years) / galaxy_years


def p_at_least_one(lambda_det: float) -> float:
    lam = max(0.0, float(lambda_det))
    return 1.0 - math.exp(-lam)


def mean_wait_years(lambda_det: float, lifetime_years: float) -> float | None:
    lam = max(0.0, float(lambda_det))
    if lam <= 0:
        return None
    return max(0.0, float(lifetime_years)) / lam


def median_wait_years(lambda_det: float, lifetime_years: float) -> float | None:
    mean = mean_wait_years(lambda_det, lifetime_years)
    return None if mean is None else math.log(2.0) * mean


def nearest_distance_2d_poisson(area: float, count: float) -> float | None:
    if area <= 0 or count <= 0:
        return None
    density = count / area
    return 1.0 / (2.0 * math.sqrt(density))


def universe_scale(per_star_yield: float, min_stars: float = 1e22, max_stars: float = 1e24) -> dict[str, float]:
    y = max(0.0, float(per_star_yield)) if math.isfinite(float(per_star_yield)) else 0.0
    lo = max(0.0, float(min_stars))
    hi = max(lo, float(max_stars))
    return {
        "per_star_yield": y,
        "min": y * lo,
        "max": y * hi,
    }

