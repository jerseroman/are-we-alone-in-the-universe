#!/usr/bin/env python3
"""Extract posterior-related text from Bryson's archived notebook HTML outputs."""
from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(data)


def html_text(path: Path) -> str:
    parser = TextExtractor()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parser.parts)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    root = args.root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    archive = root / "insolation" / "htmlArchive"
    names = [
        "computeOccurrencefixedTeff_dr25_hab2_triplePowerLawTeffAvg_extrap_const_uncertainty_out.html",
        "computeOccurrencefixedTeff_dr25_hab2_triplePowerLawTeffAvg_extrap_zero_uncertainty_out.html",
        "computeOccurrencefixedTeff_dr25_hab2_triplePowerLawTeffAvg_extrap_const_zero400_uncertainty_out.html",
        "computeOccurrencefixedTeff_dr25_hab2_triplePowerLawTeffAvg_extrap_zero_zero400_uncertainty_out.html",
    ]
    pattern = re.compile(
        r"MCMC|reliability|posterior|maximum likelihood|Kopparapu|0\.5-1\.5|"
        r"F_?0|alpha|beta|gamma|extrap_(?:const|zero)|nTrials|nMcmc|nBurnin|nWalkers",
        re.IGNORECASE,
    )
    numeric_targets = [
        "1.107", "-1.082", "-0.839", "-2.671",
        "1.590", "-1.175", "-1.195", "-1.376",
    ]

    report: dict[str, object] = {}
    for name in names:
        path = archive / name
        info: dict[str, object] = {"exists": path.exists()}
        if path.exists():
            text = html_text(path)
            lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
            hits = []
            for index, line in enumerate(lines):
                if pattern.search(line):
                    lo = max(0, index - 2)
                    hi = min(len(lines), index + 3)
                    context = [item for item in lines[lo:hi] if item]
                    if context and context not in hits:
                        hits.append(context)
            info.update(
                {
                    "size_bytes": path.stat().st_size,
                    "hit_contexts": hits,
                    "numeric_target_presence": {value: value in text for value in numeric_targets},
                }
            )
            (out / f"{path.stem}_text.txt").write_text(text, encoding="utf-8")
        report[name] = info

    (out / "archived_output_findings.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    md = ["# Bryson archived-output extraction\n\n"]
    for name, info in report.items():
        md.append(f"## `{name}`\n\n")
        md.append(f"- Exists: `{info['exists']}`\n")
        if info["exists"]:
            md.append(f"- Size: `{info['size_bytes']}` bytes\n")
            md.append(f"- Numeric target presence: `{info['numeric_target_presence']}`\n\n")
            for context in info["hit_contexts"]:
                md.append("```text\n" + "\n".join(context) + "\n```\n\n")
    (out / "ARCHIVED_OUTPUT_REPORT.md").write_text("".join(md), encoding="utf-8")


if __name__ == "__main__":
    main()
