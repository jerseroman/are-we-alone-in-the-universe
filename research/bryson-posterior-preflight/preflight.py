#!/usr/bin/env python3
"""Audit the pinned Bryson public snapshot for joint-posterior reproducibility.

This scanner does not infer or manufacture a posterior. It inventories notebooks,
posterior-related code, serialized-chain candidates, and literal data dependencies.
"""
from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import json
import re
from pathlib import Path

PINNED_COMMIT = "d200f54b6f0df49e0dae530e69983cdce5397bfb"
NOTEBOOKS = (
    "insolation/computeOccurrencefixedTeff_uncertainty.ipynb",
    "insolation/eta_earth_v5.ipynb",
)
KEY_PATTERN = re.compile(
    r"emcee|EnsembleSampler|MCMC|approximate\s+Bayesian|\bABC\b|posterior|"
    r"chain|sampler|lnprob|log[_ ]?prob|autocorr|burn|thin|seed|"
    r"np\.random|random\.|save|pickle|joblib|RData|read_csv|readRDS|load\(",
    re.IGNORECASE,
)
PATH_PATTERN = re.compile(
    r"['\"]([^'\"]+\.(?:csv|RData|rds|npy|npz|pkl|pickle|fits|json|txt))['\"]",
    re.IGNORECASE,
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def normalize_source(source: object) -> str:
    if isinstance(source, list):
        return "".join(str(part) for part in source)
    return str(source or "")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    root = args.root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    report: dict[str, object] = {
        "source_repository": "stevepur/DR25-occurrence-public",
        "source_commit": PINNED_COMMIT,
        "notebooks": {},
        "candidate_posterior_files": [],
        "readme_findings": [],
    }

    readme = root / "insolation" / "README.md"
    readme_text = readme.read_text(encoding="utf-8", errors="replace")
    for lineno, line in enumerate(readme_text.splitlines(), 1):
        if re.search(r"approximate Bayesian|not included|eta_earth|uncertaint|posterior", line, re.I):
            report["readme_findings"].append({"line": lineno, "text": line})
    (out / "insolation_README.md").write_text(readme_text, encoding="utf-8")

    candidate_files: list[dict[str, object]] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        low = path.name.lower()
        if (
            any(term in low for term in ("posterior", "chain", "sample", "mcmc", "trace"))
            or path.suffix.lower() in {".npy", ".npz", ".pkl", ".pickle"}
        ):
            candidate_files.append(
                {
                    "path": str(path.relative_to(root)),
                    "size_bytes": path.stat().st_size,
                    "sha256": sha256(path),
                }
            )
    report["candidate_posterior_files"] = candidate_files

    all_dependencies: list[list[object]] = []
    all_imports: set[str] = set()
    findings_rows: list[list[object]] = []
    notebook_report: dict[str, object] = {}

    for rel in NOTEBOOKS:
        nb_path = root / rel
        if not nb_path.exists():
            notebook_report[rel] = {"exists": False}
            continue

        raw = json.loads(nb_path.read_text(encoding="utf-8"))
        cells = raw.get("cells", [])
        code_cells = [cell for cell in cells if cell.get("cell_type") == "code"]
        kernel = raw.get("metadata", {}).get("kernelspec", {})
        code_out: list[str] = []
        key_hits: list[dict[str, object]] = []
        dependencies: list[dict[str, object]] = []
        imports: set[str] = set()
        execution_counts: list[object] = []
        output_types: dict[str, int] = {}

        for cell_index, cell in enumerate(cells):
            if cell.get("cell_type") != "code":
                continue
            src = normalize_source(cell.get("source"))
            execution_counts.append(cell.get("execution_count"))
            code_out.extend((f"\n# ===== NOTEBOOK CELL {cell_index} =====\n", src))
            if not src.endswith("\n"):
                code_out.append("\n")

            for line_index, line in enumerate(src.splitlines(), 1):
                if KEY_PATTERN.search(line):
                    item = {
                        "cell": cell_index,
                        "line_in_cell": line_index,
                        "text": line.strip(),
                    }
                    key_hits.append(item)
                    findings_rows.append([rel, cell_index, line_index, line.strip()])

                for match in PATH_PATTERN.finditer(line):
                    literal = match.group(1)
                    candidates = (nb_path.parent / literal, root / literal)
                    resolved = next((path for path in candidates if path.exists()), None)
                    item = {
                        "cell": cell_index,
                        "literal": literal,
                        "resolved_path": str(resolved.relative_to(root)) if resolved else None,
                        "exists": bool(resolved),
                    }
                    if item not in dependencies:
                        dependencies.append(item)
                        all_dependencies.append(
                            [rel, cell_index, literal, item["resolved_path"] or "", item["exists"]]
                        )

            cleaned = "\n".join(
                line for line in src.splitlines()
                if not line.lstrip().startswith(("%", "!"))
            )
            try:
                tree = ast.parse(cleaned)
            except SyntaxError:
                tree = None
            if tree is not None:
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.add(alias.name)
                            all_imports.add(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        module = node.module or ""
                        if module:
                            imports.add(module)
                            all_imports.add(module)

            for output in cell.get("outputs", []):
                output_type = output.get("output_type", "unknown")
                output_types[output_type] = output_types.get(output_type, 0) + 1

        stem = nb_path.stem
        (out / f"{stem}_extracted.py").write_text("".join(code_out), encoding="utf-8")
        (out / f"{stem}_key_hits.json").write_text(json.dumps(key_hits, indent=2), encoding="utf-8")
        (out / f"{stem}_dependencies.json").write_text(json.dumps(dependencies, indent=2), encoding="utf-8")

        notebook_report[rel] = {
            "exists": True,
            "sha256": sha256(nb_path),
            "size_bytes": nb_path.stat().st_size,
            "kernel": kernel,
            "total_cells": len(cells),
            "code_cells": len(code_cells),
            "executed_code_cells": sum(value is not None for value in execution_counts),
            "output_types": output_types,
            "imports": sorted(imports),
            "key_hit_count": len(key_hits),
            "dependency_count": len(dependencies),
            "missing_dependency_literals": sorted(
                {str(item["literal"]) for item in dependencies if not item["exists"]}
            ),
        }

    report["notebooks"] = notebook_report
    report["all_imports"] = sorted(all_imports)

    with (out / "posterior_key_hits.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["notebook", "cell", "line_in_cell", "text"])
        writer.writerows(findings_rows)

    with (out / "notebook_dependencies.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["notebook", "cell", "literal", "resolved_path", "exists"])
        writer.writerows(all_dependencies)

    (out / "preflight.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    md: list[str] = [
        "# Bryson joint-posterior reproducibility preflight\n\n",
        "- Repository: `stevepur/DR25-occurrence-public`\n",
        f"- Commit: `{PINNED_COMMIT}`\n\n",
        "## Source README findings\n\n",
    ]
    findings = report["readme_findings"]
    if findings:
        for item in findings:
            md.append(f"- L{item['line']}: {item['text']}\n")
    else:
        md.append("- No matching README statements found.\n")

    md.append("\n## Notebook inventory\n\n")
    for name, info in notebook_report.items():
        md.append(f"### `{name}`\n\n")
        for key, value in info.items():
            md.append(f"- **{key}:** `{value}`\n")
        md.append("\n")

    md.append("## Candidate serialized posterior/chain files\n\n")
    if candidate_files:
        for item in candidate_files:
            md.append(f"- `{item['path']}` ({item['size_bytes']} bytes)\n")
    else:
        md.append("- None detected by filename or serialized-array extension.\n")

    md.extend(
        (
            "\n## Interpretation rule\n\n",
            "This preflight establishes only what is present in the pinned public snapshot. "
            "It does not treat independently sampled marginal summaries as a joint posterior "
            "and does not manufacture missing correlations.\n",
        )
    )
    (out / "PREFLIGHT_REPORT.md").write_text("".join(md), encoding="utf-8")


if __name__ == "__main__":
    main()
