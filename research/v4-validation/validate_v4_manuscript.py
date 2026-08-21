#!/usr/bin/env python3
"""Static cross-check of v4 LaTeX against frozen evidence before compilation."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_lf(path: Path, content: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(content)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    root = args.repo_root.resolve()
    paper = root / "paper" / "exoearth-annulus-v4"
    numerical_path = root / "research" / "bryson-joint-posterior" / "frozen-v4" / "V4_NUMERICAL_FREEZE.json"
    dr25_path = root / "research" / "v4-validation" / "frozen-dr25-support" / "dr25_support_audit.json"
    sensitivity_path = root / "research" / "v4-validation" / "frozen-sensitivities" / "V4_SENSITIVITY_FREEZE.json"
    literature_path = root / "research" / "v4-validation" / "frozen-literature" / "primary_literature_comparison.json"

    numerical = load_json(numerical_path)
    dr25 = load_json(dr25_path)
    sensitivity = load_json(sensitivity_path)
    literature = load_json(literature_path)
    provenance = load_json(paper / "V3_SOURCE_PROVENANCE.json")
    aastex = load_json(paper / "AASTEX_BUILD_PROVENANCE.json")
    if numerical.get("status") != "PASS":
        raise RuntimeError("Numerical freeze is not PASS")
    if dr25.get("status") != "FAIL_LOCAL_EMPIRICAL_SUPPORT":
        raise RuntimeError("DR25 support finding changed")
    if sensitivity.get("scientific_readiness") != "CONDITIONAL_MODEL_PROJECTION_ONLY":
        raise RuntimeError("Sensitivity scientific-readiness state changed")
    if literature.get("status") != "PASS_ESTIMAND_AWARE_COMPARISON":
        raise RuntimeError("Literature comparison is not frozen PASS")
    if provenance.get("source_commit") != "5a3528aea6d6f28da8e9db4d40f0c84cbb43d501":
        raise RuntimeError("Unexpected v3 source commit")
    if provenance.get("pdf_reconstruction_used") is not False:
        raise RuntimeError("Source provenance permits PDF reconstruction")
    if aastex.get("class") != "aastex701.cls" or aastex.get("version") != "7.0.1":
        raise RuntimeError("Unexpected AASTeX build dependency")

    tex_paths = [paper / "main.tex", *sorted((paper / "sections").glob("*.tex"))]
    all_text = "\n".join(path.read_text(encoding="utf-8") for path in tex_paths)
    bib_path = paper / "references.bib"
    bib_text = bib_path.read_text(encoding="utf-8")
    bib_keys = set(re.findall(r"@\w+\{([^,]+),", bib_text))
    citation_keys: list[str] = []
    for match in re.finditer(r"\\cite[pt]?\s*(?:\[[^]]*\]\s*)*\{([^}]+)\}", all_text):
        citation_keys.extend(key.strip() for key in match.group(1).split(","))
    missing_citations = sorted(set(citation_keys).difference(bib_keys))
    if missing_citations:
        raise RuntimeError(f"Missing bibliography keys: {missing_citations}")

    labels = re.findall(r"\\label\{([^}]+)\}", all_text)
    references = re.findall(r"\\(?:auto|page|eq)?ref\{([^}]+)\}", all_text)
    duplicate_labels = sorted({label for label in labels if labels.count(label) > 1})
    undefined_references = sorted(set(references).difference(labels))
    if duplicate_labels or undefined_references:
        raise RuntimeError(
            f"LaTeX cross-reference failure: duplicates={duplicate_labels}, "
            f"undefined={undefined_references}"
        )

    required_fragments = {
        "host_count": "263{,}061{,}992.37",
        "constant_median_millions": "3.224",
        "zero_median_millions": "4.572",
        "constant_q16_millions": "1.522",
        "constant_q84_millions": "6.189",
        "zero_q16_millions": "2.103",
        "zero_q84_millions": "8.912",
        "constant_zero_fraction": "95.75",
        "zero_zero_fraction": "96.75",
        "constant_legacy_host_change": "-28.58",
        "zero_legacy_host_change": "-29.58",
        "low_mass_climate_change": "-57.28",
        "branch_median_change": "41.83",
    }
    missing_fragments = [name for name, fragment in required_fragments.items() if fragment not in all_text]
    if missing_fragments:
        raise RuntimeError(f"Frozen manuscript anchors missing: {missing_fragments}")

    if "$3.430\\times10^6$" in all_text:
        raise RuntimeError("Retracted metallicity-TAMS value remains in manuscript")
    if "cannot be reconstructed from the published marginal summaries alone" in all_text:
        raise RuntimeError("Obsolete no-posterior statement remains in manuscript")

    figure_names = re.findall(r"\\includegraphics(?:\[[^]]*\])?\{([^}]+)\}", all_text)
    missing_figures = [name for name in figure_names if not (paper / "figures" / name).is_file()]
    if missing_figures:
        raise RuntimeError(f"Referenced figures are missing: {missing_figures}")

    source_files = [
        *tex_paths,
        bib_path,
        paper / "V3_SOURCE_PROVENANCE.json",
        paper / "AASTEX_BUILD_PROVENANCE.json",
    ]
    source_manifest = paper / "SHA256SUMS_source.txt"
    write_lf(
        source_manifest,
        "".join(
            f"{sha256(path)}  {path.relative_to(paper).as_posix()}\n"
            for path in source_files
        ),
    )
    audit = {
        "status": "PASS_STATIC_PRECOMPILE",
        "scientific_interpretation": "CONDITIONAL_MODEL_PROJECTION_ONLY",
        "inputs": {
            "numerical_freeze": sha256(numerical_path),
            "dr25_support_audit": sha256(dr25_path),
            "sensitivity_freeze": sha256(sensitivity_path),
            "literature_comparison": sha256(literature_path),
        },
        "source_provenance": {
            "v3_commit": provenance["source_commit"],
            "v3_tree": provenance["source_tree"],
            "pdf_reconstruction_used": provenance["pdf_reconstruction_used"],
            "aastex701_sha256": aastex["sha256"],
        },
        "cross_references": {
            "citation_key_count": len(set(citation_keys)),
            "label_count": len(labels),
            "reference_count": len(references),
            "missing_citations": missing_citations,
            "duplicate_labels": duplicate_labels,
            "undefined_references": undefined_references,
        },
        "figures": {name: sha256(paper / "figures" / name) for name in figure_names},
        "required_numerical_anchors": required_fragments,
        "source_manifest_sha256": sha256(source_manifest),
    }
    audit_path = paper / "V4_MANUSCRIPT_AUDIT.json"
    write_lf(audit_path, json.dumps(audit, indent=2) + "\n")
    print(json.dumps({"status": audit["status"], "audit_sha256": sha256(audit_path)}, indent=2))


if __name__ == "__main__":
    main()
