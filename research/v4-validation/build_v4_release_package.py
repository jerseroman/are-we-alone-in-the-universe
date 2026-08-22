#!/usr/bin/env python3
"""Build a deterministic compact ExoEarth manuscript-v4 release archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path


EXPECTED_BRANCH = "work/exoearth-v4-statistics"
ARCHIVE_ROOT = "ExoEarth_Annulus_v4"
PRODUCTION_RUNS = [32470830404, 32472776218, 32506666772, 32527877921]
TRACKED_INPUTS = [
    "README.md",
    "LICENSE.md",
    "CITATION.cff",
    ".github/workflows/bryson-v4-corrected-pilot.yml",
    ".github/workflows/bryson-v4-corrected-production.yml",
    ".github/workflows/bryson-v4-corrected-zero-extended.yml",
    ".github/workflows/bryson-v4-measurement-tests.yml",
    ".github/workflows/bryson-v4-propagate-constant.yml",
    ".github/workflows/jj-g-host-export.yml",
    ".github/workflows/jj-tams-metallicity-differential.yml",
    ".github/workflows/jj-tams-radial-convergence.yml",
    "paper/exoearth-annulus-v4",
    "research/bryson-joint-posterior",
    "research/jj-host-export",
    "research/v4-validation",
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=repo, text=True, encoding="utf-8"
    ).strip()


def add_bytes(archive: zipfile.ZipFile, name: str, data: bytes) -> None:
    info = zipfile.ZipInfo(name, date_time=(2026, 8, 22, 0, 0, 0))
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, data, compresslevel=9)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument(
        "--pdf",
        type=Path,
        default=Path("output/pdf/ExoEarth_Annulus_Manuscript_v4_RC2.pdf"),
    )
    parser.add_argument("--out", type=Path, default=Path("output/release"))
    parser.add_argument("--release-doi", required=True)
    args = parser.parse_args()

    repo = args.repo_root.resolve()
    branch = git(repo, "branch", "--show-current")
    if branch != EXPECTED_BRANCH:
        raise RuntimeError(f"Refusing release build from branch {branch!r}")
    if subprocess.run(["git", "diff", "--quiet"], cwd=repo).returncode != 0:
        raise RuntimeError("Tracked working tree is dirty")
    if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=repo).returncode != 0:
        raise RuntimeError("Index is dirty")
    if re.fullmatch(r"10\.5281/zenodo\.\d+", args.release_doi) is None:
        raise RuntimeError("A manuscript-specific reserved Zenodo DOI is required")

    paper = repo / "paper" / "exoearth-annulus-v4"
    main_text = (paper / "main.tex").read_text(encoding="utf-8")
    if "\\email{}" in main_text or "orcid=" not in main_text:
        raise RuntimeError("RC2 author email and ORCID are not complete")
    zenodo_metadata = json.loads((paper / "zenodo-v4-metadata.json").read_text(encoding="utf-8"))
    creators = zenodo_metadata.get("creators", [])
    if len(creators) != 1 or not creators[0].get("orcid") or not creators[0].get("affiliation"):
        raise RuntimeError("RC2 Zenodo author metadata are not complete")
    manuscript_audit = json.loads((paper / "V4_MANUSCRIPT_AUDIT.json").read_text(encoding="utf-8"))
    pdf_preflight = json.loads((paper / "PDF_PREFLIGHT.json").read_text(encoding="utf-8"))
    aastex = json.loads((paper / "AASTEX_BUILD_PROVENANCE.json").read_text(encoding="utf-8"))
    v3_provenance = json.loads((paper / "V3_SOURCE_PROVENANCE.json").read_text(encoding="utf-8"))
    if manuscript_audit.get("status") != "PASS_STATIC_PRECOMPILE":
        raise RuntimeError("Manuscript static audit is not PASS")
    if pdf_preflight.get("status") != "PASS_HIDDEN_TEXT_OBJECT_PREFLIGHT":
        raise RuntimeError("PDF technical preflight is not PASS")
    if aastex.get("version") != "7.0.2":
        raise RuntimeError("RC2 was not built with AASTeX 7.0.2")

    commit = git(repo, "rev-parse", "HEAD")
    tracked = git(repo, "ls-files", "--", *TRACKED_INPUTS).splitlines()
    files: list[tuple[str, Path]] = [(name, repo / name) for name in tracked if name]

    pdf = args.pdf if args.pdf.is_absolute() else repo / args.pdf
    if not pdf.is_file():
        raise FileNotFoundError(pdf)
    if pdf_preflight.get("sha256") != sha256_file(pdf):
        raise RuntimeError("Final PDF hash does not match PDF preflight")
    pdf_name = "output/pdf/ExoEarth_Annulus_Manuscript_v4_RC2.pdf"
    files.append((pdf_name, pdf))
    files.sort(key=lambda item: item[0])

    checksums = {name: sha256_file(path) for name, path in files}
    manifest = {
        "status": "AUDITED_RC2_DRAFT_RELEASE_PACKAGE",
        "scientific_interpretation": "CONDITIONAL_MODEL_PROJECTION_ONLY",
        "local_empirical_support": "FAIL_EXACT_DR25_TARGET_ZERO_CANDIDATES",
        "repository": "https://github.com/jerseroman/are-we-alone-in-the-universe",
        "branch": branch,
        "source_commit": commit,
        "manuscript_release_doi": args.release_doi,
        "production_github_actions_runs": PRODUCTION_RUNS,
        "archived_fixed_vector_predecessor_commit": v3_provenance["archived_predecessor"]["source_commit"],
        "current_v3_pdf_sha256": v3_provenance["current_v3_pdf_reference"]["sha256"],
        "current_v3_exact_latex_source_available": False,
        "v3_pdf_reconstruction_used": False,
        "aastex": {
            "version": aastex["version"],
            "class_sha256": aastex["sha256"],
            "bibliography_style_sha256": aastex["bibliography_style_sha256"],
        },
        "file_count": len(files),
        "files_sha256": checksums,
    }
    manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode("utf-8")

    out_dir = args.out if args.out.is_absolute() else repo / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / "ExoEarth_Annulus_v4_reproducibility.zip"
    with zipfile.ZipFile(zip_path, "w") as archive:
        for name, path in files:
            add_bytes(archive, f"{ARCHIVE_ROOT}/{name}", path.read_bytes())
        add_bytes(archive, f"{ARCHIVE_ROOT}/RELEASE_MANIFEST.json", manifest_bytes)

    audit = {
        "status": "PASS_RELEASE_ARCHIVE_AUDIT",
        "branch": branch,
        "source_commit": commit,
        "archive": zip_path.name,
        "archive_sha256": sha256_file(zip_path),
        "manifest_sha256": sha256_bytes(manifest_bytes),
        "archived_file_count": len(files) + 1,
        "final_pdf_sha256": checksums[pdf_name],
    }
    audit_path = out_dir / "RELEASE_AUDIT.json"
    audit_path.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
