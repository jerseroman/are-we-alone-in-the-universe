"""Independent oracle for randomized calculator UI states.

The Node fuzz runner writes JSONL cases containing the calculator's resolved
input state and observed deterministic result. This script recomputes the same
factorized no-advanced-module formula without executing JavaScript.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import sys
from typing import Any

from oracle_formulas import deterministic_product, p_at_least_one


DEFAULT_REL_TOL = 1e-10
DEFAULT_ABS_TOL = 1e-15
ETA_EARTH_DEFAULT = 0.60
ETA_REPLACED_TERMS = {"N_p_star", "f_composition", "f_orbit"}


def finite_number(value: Any, fallback: float | None = None) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if math.isfinite(parsed) else fallback


def read_cases(path: pathlib.Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    if text.startswith("["):
        data = json.loads(text)
        if not isinstance(data, list):
            raise ValueError("JSON input must be a list or JSONL records.")
        return data

    cases: list[dict[str, Any]] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            item = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL at line {line_no}: {exc}") from exc
        if not isinstance(item, dict):
            raise ValueError(f"JSONL line {line_no} is not an object.")
        cases.append(item)
    return cases


def deterministic_product_for_state(
    values: dict[str, Any],
    parameter_order: list[str],
    enable_complex: bool,
    enable_x: bool,
    occurrence: dict[str, Any],
) -> float:
    if (occurrence or {}).get("mode") != "eta_earth_direct":
        return deterministic_product(values, parameter_order, enable_complex, enable_x)

    eta = finite_number((occurrence or {}).get("etaEarthBryson"))
    if eta is None:
        eta = finite_number(values.get("_eta_earth_bryson"), ETA_EARTH_DEFAULT)
    adjusted_values = dict(values)
    adjusted_values["_eta_earth_bryson"] = ETA_EARTH_DEFAULT if eta is None else eta
    adjusted_order = [key for key in parameter_order if key not in ETA_REPLACED_TERMS and key != "_eta_earth_bryson"]
    adjusted_order.append("_eta_earth_bryson")
    return deterministic_product(adjusted_values, adjusted_order, enable_complex, enable_x)


def compare_case(case: dict[str, Any], rel_tol: float, abs_tol: float) -> dict[str, Any]:
    state = case.get("state") or {}
    values = state.get("values") or {}
    parameter_order = state.get("parameter_order") or case.get("parameter_order") or []
    actual = case.get("actual") or {}
    occurrence = state.get("occurrence") or {}

    expected = deterministic_product_for_state(
        values,
        parameter_order,
        bool(state.get("enable_complex", True)),
        bool(state.get("enable_x", True)),
        occurrence,
    )
    observed = finite_number(actual.get("deterministic"))
    if observed is None:
        return {
            "status": "FAIL",
            "index": case.get("index"),
            "reason": "Observed deterministic result is not finite.",
            "expected": expected,
            "observed": actual.get("deterministic"),
        }

    abs_error = abs(observed - expected)
    rel_error = abs_error / max(abs(expected), abs(observed), 1.0)
    ok = abs_error <= max(abs_tol, rel_tol * max(abs(expected), 1.0))

    sparse_expected = None
    sparse_observed = finite_number(actual.get("sparse_probability"))
    sparse_status = "SKIPPED"
    sparse_abs_error = None
    if expected < 1:
        sparse_expected = p_at_least_one(expected)
        if sparse_observed is None:
            sparse_status = "FAIL"
            ok = False
        else:
            sparse_abs_error = abs(sparse_observed - sparse_expected)
            sparse_ok = sparse_abs_error <= max(abs_tol, rel_tol * max(abs(sparse_expected), 1.0))
            sparse_status = "PASS" if sparse_ok else "FAIL"
            ok = ok and sparse_ok

    return {
        "status": "PASS" if ok else "FAIL",
        "index": case.get("index"),
        "action": case.get("action"),
        "expected": expected,
        "observed": observed,
        "abs_error": abs_error,
        "rel_error": rel_error,
        "sparse_expected": sparse_expected,
        "sparse_observed": sparse_observed,
        "sparse_abs_error": sparse_abs_error,
        "sparse_status": sparse_status,
    }


def build_summary(cases: list[dict[str, Any]], rel_tol: float, abs_tol: float) -> dict[str, Any]:
    comparisons = [compare_case(case, rel_tol, abs_tol) for case in cases]
    failures = [item for item in comparisons if item["status"] != "PASS"]
    max_abs_error = max((float(item.get("abs_error") or 0.0) for item in comparisons), default=0.0)
    max_rel_error = max((float(item.get("rel_error") or 0.0) for item in comparisons), default=0.0)
    return {
        "status": "FAIL" if failures else "PASS",
        "cases": len(cases),
        "failures": len(failures),
        "max_abs_error": max_abs_error,
        "max_rel_error": max_rel_error,
        "rel_tol": rel_tol,
        "abs_tol": abs_tol,
        "failure_examples": failures[:20],
        "comparisons": comparisons,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare randomized UI states against an independent Python oracle.")
    parser.add_argument("--input", required=True, help="Path to JSONL or JSON array case file.")
    parser.add_argument("--out", help="Optional output summary JSON path.")
    parser.add_argument("--rel-tol", type=float, default=DEFAULT_REL_TOL)
    parser.add_argument("--abs-tol", type=float, default=DEFAULT_ABS_TOL)
    args = parser.parse_args()

    input_path = pathlib.Path(args.input)
    cases = read_cases(input_path)
    summary = build_summary(cases, args.rel_tol, args.abs_tol)
    summary["input"] = str(input_path)

    text = json.dumps(summary, indent=2) + "\n"
    if args.out:
      pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
      pathlib.Path(args.out).write_text(text, encoding="utf-8")
    else:
      sys.stdout.write(text)

    sys.stdout.write(f"RANDOM_STATE_ORACLE {summary['status']}: {summary['cases']} cases, {summary['failures']} failures\n")
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
