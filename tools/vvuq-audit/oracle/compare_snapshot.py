from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from oracle_formulas import (
    deterministic_product,
    mean_wait_years,
    median_wait_years,
    p_at_least_one,
    seti_lambda,
)


def rel_close(a: float, b: float, rel: float = 1e-10, abs_tol: float = 1e-12) -> bool:
    return abs(a - b) <= max(abs_tol, rel * max(abs(a), abs(b), 1.0))


def compare(snapshot: dict) -> dict:
    checks: list[dict] = []
    parameter_order = snapshot["parameter_order"]

    for preset in snapshot.get("presets", []):
        expected = deterministic_product(
            preset["values"],
            parameter_order,
            bool(preset.get("enable_complex")),
            bool(preset.get("enable_x")),
        )
        actual = float(preset["deterministic_candidate_estimate"])
        ok = rel_close(actual, expected)
        checks.append({
            "name": f"deterministic_product:{preset['key']}",
            "status": "PASS" if ok else "FAIL",
            "expected": expected,
            "actual": actual,
            "rel_error": 0.0 if expected == actual else abs(actual - expected) / max(abs(expected), 1.0),
        })

    for case in snapshot.get("seti_cases", []):
        lam = seti_lambda(
            float(case["count"]),
            float(case["f_tx"]),
            float(case["range_gate"]),
            float(case["lifetime_years"]),
            float(case["galaxy_years"]),
        )
        p = p_at_least_one(lam)
        mean = mean_wait_years(lam, float(case["lifetime_years"]))
        median = median_wait_years(lam, float(case["lifetime_years"]))
        checks.append({
            "name": f"seti_lambda:{case['name']}",
            "status": "PASS" if rel_close(float(case["lambda_det"]), lam) else "FAIL",
            "expected": lam,
            "actual": float(case["lambda_det"]),
        })
        checks.append({
            "name": f"seti_p_at_least_one:{case['name']}",
            "status": "PASS" if rel_close(float(case["p_at_least_one"]), p) else "FAIL",
            "expected": p,
            "actual": float(case["p_at_least_one"]),
        })
        actual_mean = case.get("mean_wait_years")
        mean_ok = (actual_mean is None and mean is None) or (
            actual_mean is not None and mean is not None and rel_close(float(actual_mean), float(mean))
        )
        checks.append({
            "name": f"seti_mean_wait:{case['name']}",
            "status": "PASS" if mean_ok else "FAIL",
            "expected": mean,
            "actual": actual_mean,
        })
        actual_median = case.get("median_wait_years")
        median_ok = (actual_median is None and median is None) or (
            actual_median is not None and median is not None and rel_close(float(actual_median), float(median))
        )
        checks.append({
            "name": f"seti_median_wait:{case['name']}",
            "status": "PASS" if median_ok else "FAIL",
            "expected": median,
            "actual": actual_median,
        })

    failures = [c for c in checks if c["status"] != "PASS"]
    return {
        "status": "PASS" if not failures else "FAIL",
        "checks": checks,
        "check_count": len(checks),
        "failure_count": len(failures),
    }


def write_report(summary: dict, out_dir: Path) -> None:
    lines = [
        "# Independent Oracle Comparison",
        "",
        f"Status: **{summary['status']}**",
        "",
        f"Checks: {summary['check_count']}",
        f"Failures: {summary['failure_count']}",
        "",
        "| Check | Status | Expected | Actual |",
        "| --- | --- | ---: | ---: |",
    ]
    for check in summary["checks"]:
        lines.append(
            f"| {check['name']} | {check['status']} | {check.get('expected')} | {check.get('actual')} |"
        )
    (out_dir / "oracle-comparison-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out_dir / "oracle-comparison-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    snapshot = json.loads(Path(args.snapshot).read_text(encoding="utf-8"))
    summary = compare(snapshot)
    write_report(summary, out_dir)
    print(f"ORACLE_COMPARE {summary['status']}: {summary['check_count']} checks, {summary['failure_count']} failures")
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

