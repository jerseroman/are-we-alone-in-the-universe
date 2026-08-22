#!/usr/bin/env python3
"""Audit manuscript PDF for hidden text, active objects, and embedding defects."""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
from typing import Any

from pypdf import PdfReader
from pypdf.generic import ContentStream, DictionaryObject


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def resolve(value: Any) -> Any:
    return value.get_object() if hasattr(value, "get_object") else value


def audit_content(
    content: Any,
    reader: PdfReader,
    audit: dict[str, Any],
    resources_value: Any,
) -> None:
    if content is None:
        return
    resources = resolve(resources_value)
    extgstates = resolve(resources.get("/ExtGState", {})) if isinstance(resources, DictionaryObject) else {}
    alpha_by_name: dict[str, tuple[float, float]] = {}
    if isinstance(extgstates, DictionaryObject):
        for name, state_value in extgstates.items():
            state = resolve(state_value)
            if isinstance(state, DictionaryObject):
                alpha_by_name[str(name)] = (
                    float(state.get("/ca", 1.0)),
                    float(state.get("/CA", 1.0)),
                )

    stream = ContentStream(content, reader)
    fill_alpha = 1.0
    stroke_alpha = 1.0
    text_render_mode = 0
    graphics_stack: list[tuple[float, float, int]] = []
    for operands, operator in stream.operations:
        if operator == b"q":
            graphics_stack.append((fill_alpha, stroke_alpha, text_render_mode))
        elif operator == b"Q" and graphics_stack:
            fill_alpha, stroke_alpha, text_render_mode = graphics_stack.pop()
        elif operator == b"gs" and operands:
            fill_alpha, stroke_alpha = alpha_by_name.get(str(operands[0]), (fill_alpha, stroke_alpha))
        elif operator == b"Tr" and operands:
            text_render_mode = int(operands[0])
            if text_render_mode == 3:
                audit["invisible_text_render_operations"] += 1
        elif operator == b"Tf" and len(operands) >= 2 and float(operands[1]) <= 0.0:
            audit["nonpositive_text_size_operations"] += 1
        elif operator in {b"Tj", b"TJ", b"'", b'"'}:
            audit["text_show_operations"] += 1
            fill_is_used = text_render_mode in {0, 2, 4, 6}
            stroke_is_used = text_render_mode in {1, 2, 5, 6}
            if (fill_is_used and fill_alpha == 0.0) or (stroke_is_used and stroke_alpha == 0.0):
                audit["zero_opacity_text_show_operations"] += 1
        elif operator in {b"BDC", b"BMC"}:
            audit["marked_content_operations"] += 1


def audit_resources(
    resources_value: Any,
    reader: PdfReader,
    audit: dict[str, Any],
    visited_xobjects: set[tuple[int, int]],
) -> None:
    resources = resolve(resources_value)
    if not isinstance(resources, DictionaryObject):
        return

    extgstates = resolve(resources.get("/ExtGState", {}))
    if isinstance(extgstates, DictionaryObject):
        for state_value in extgstates.values():
            state = resolve(state_value)
            if not isinstance(state, DictionaryObject):
                continue
            fill_alpha = float(state.get("/ca", 1.0))
            stroke_alpha = float(state.get("/CA", 1.0))
            if fill_alpha == 0.0 or stroke_alpha == 0.0:
                audit["zero_opacity_graphics_states"] += 1

    fonts = resolve(resources.get("/Font", {}))
    if isinstance(fonts, DictionaryObject):
        for font_value in fonts.values():
            font = resolve(font_value)
            if not isinstance(font, DictionaryObject):
                continue
            audit["font_resources"] += 1
            subtype = str(font.get("/Subtype", "unknown"))
            audit["font_subtypes"][subtype] = audit["font_subtypes"].get(subtype, 0) + 1
            descriptor = resolve(font.get("/FontDescriptor"))
            if descriptor is None and subtype == "/Type0":
                descendants = resolve(font.get("/DescendantFonts", []))
                if descendants:
                    descendant = resolve(descendants[0])
                    descriptor = resolve(descendant.get("/FontDescriptor"))
            if subtype != "/Type3":
                embedded = isinstance(descriptor, DictionaryObject) and any(
                    key in descriptor for key in ("/FontFile", "/FontFile2", "/FontFile3")
                )
                if not embedded:
                    audit["unembedded_font_resources"] += 1

    xobjects = resolve(resources.get("/XObject", {}))
    if not isinstance(xobjects, DictionaryObject):
        return
    for xobject_value in xobjects.values():
        reference = xobject_value if hasattr(xobject_value, "idnum") else None
        identity = (reference.idnum, reference.generation) if reference is not None else (id(xobject_value), 0)
        if identity in visited_xobjects:
            continue
        visited_xobjects.add(identity)
        xobject = resolve(xobject_value)
        if not isinstance(xobject, DictionaryObject):
            continue
        subtype = str(xobject.get("/Subtype", "unknown"))
        audit["xobject_subtypes"][subtype] = audit["xobject_subtypes"].get(subtype, 0) + 1
        if subtype == "/Image":
            audit["image_xobjects"] += 1
        elif subtype == "/Form":
            audit["form_xobjects"] += 1
            form_resources = xobject.get("/Resources", {})
            audit_content(xobject, reader, audit, form_resources)
            audit_resources(form_resources, reader, audit, visited_xobjects)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    pdf = args.pdf.resolve()
    try:
        pdf_label = pdf.relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        # Audit records are publication metadata; never leak a workstation path.
        pdf_label = pdf.name
    reader = PdfReader(str(pdf), strict=True)
    if reader.is_encrypted:
        raise RuntimeError("Encrypted PDF is not accepted")

    root = resolve(reader.trailer["/Root"])
    names = resolve(root.get("/Names", {}))
    forbidden_root_entries = [key for key in ("/AA", "/AcroForm", "/OCProperties") if key in root]
    open_action = resolve(root.get("/OpenAction"))
    open_action_type = "none"
    if isinstance(open_action, DictionaryObject):
        open_action_type = str(open_action.get("/S", "dictionary"))
        if open_action_type != "/GoTo":
            forbidden_root_entries.append("/OpenAction-action-dictionary")
    elif open_action is not None:
        open_action_type = "destination"
    forbidden_name_entries: list[str] = []
    if isinstance(names, DictionaryObject):
        forbidden_name_entries = [key for key in ("/EmbeddedFiles", "/JavaScript") if key in names]

    metadata = {str(key): str(value) for key, value in (reader.metadata or {}).items()}
    audit: dict[str, Any] = {
        "status": "PENDING",
        "pdf": pdf_label,
        "sha256": sha256(pdf),
        "pages": len(reader.pages),
        "encrypted": reader.is_encrypted,
        "forbidden_root_entries": forbidden_root_entries,
        "forbidden_name_entries": forbidden_name_entries,
        "open_action_type": open_action_type,
        "invisible_text_render_operations": 0,
        "nonpositive_text_size_operations": 0,
        "zero_opacity_graphics_states": 0,
        "zero_opacity_text_show_operations": 0,
        "text_show_operations": 0,
        "marked_content_operations": 0,
        "font_resources": 0,
        "unembedded_font_resources": 0,
        "font_subtypes": {},
        "image_xobjects": 0,
        "form_xobjects": 0,
        "xobject_subtypes": {},
        "annotations": {},
        "document_metadata": metadata,
        "external_uris": [],
        "doi_uris": [],
        "page_text_characters": [],
        "page_boxes_points": [],
        "empty_text_pages": [],
    }

    visited_xobjects: set[tuple[int, int]] = set()
    forbidden_actions = {"/JavaScript", "/Launch", "/SubmitForm", "/ImportData", "/GoToR"}
    active_action_hits: list[dict[str, Any]] = []
    page_texts: list[str] = []
    external_uris: list[str] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        page_texts.append(text)
        audit["page_text_characters"].append(len(text))
        if not text.strip():
            audit["empty_text_pages"].append(page_number)
        media = page.mediabox
        width = float(media.right) - float(media.left)
        height = float(media.top) - float(media.bottom)
        audit["page_boxes_points"].append([width, height])
        if width <= 0 or height <= 0:
            raise RuntimeError(f"Invalid page box on page {page_number}")
        page_resources = page.get("/Resources", {})
        audit_content(page.get_contents(), reader, audit, page_resources)
        audit_resources(page_resources, reader, audit, visited_xobjects)

        if "/AA" in page:
            active_action_hits.append({"page": page_number, "type": "/AA"})
        annotations = resolve(page.get("/Annots", []))
        for annotation_value in annotations or []:
            annotation = resolve(annotation_value)
            subtype = str(annotation.get("/Subtype", "unknown"))
            audit["annotations"][subtype] = audit["annotations"].get(subtype, 0) + 1
            if subtype == "/Widget":
                active_action_hits.append({"page": page_number, "type": "/Widget"})
            action = resolve(annotation.get("/A"))
            if isinstance(action, DictionaryObject):
                action_type = str(action.get("/S", "unknown"))
                if action_type in forbidden_actions:
                    active_action_hits.append({"page": page_number, "type": action_type})
                if action_type == "/URI" and action.get("/URI"):
                    external_uris.append(str(action["/URI"]))

    audit["active_action_hits"] = active_action_hits
    all_text = "\n".join(page_texts)
    figure_counts = Counter(re.findall(r"Figure\s+(\d+)\.", all_text))
    table_counts = Counter(re.findall(r"Table\s+(\d+)\.", all_text))
    expected_figures = [str(number) for number in range(1, 7)]
    expected_tables = [str(number) for number in range(1, 5)]
    required_numerical_anchors = [
        "263,061,992.37",
        "3.224",
        "4.572",
        "1.522",
        "6.189",
        "2.103",
        "8.912",
        "95.75",
        "96.75",
        "-28.58",
        "-29.58",
        "-57.28",
        "41.83",
    ]
    missing_numerical_anchors = [
        anchor for anchor in required_numerical_anchors if anchor not in all_text
    ]
    doi_uris = [uri for uri in external_uris if "doi.org/" in uri]
    malformed_doi_uris = [
        uri
        for uri in doi_uris
        if re.fullmatch(r"https?://doi\.org/10\.\d{4,9}/\S+", uri) is None
    ]
    expected_metadata = {
        "/Title": "A Posterior Model Projection of Narrow-domain ExoEarth Candidates in the Milky Way's 7–9 kpc Annulus",
        "/Author": "Roman Jerše",
        "/Subject": "Posterior model projection of narrow-domain ExoEarth candidates around old G dwarfs",
    }
    metadata_mismatches = {
        key: {"expected": expected, "actual": metadata.get(key)}
        for key, expected in expected_metadata.items()
        if metadata.get(key) != expected
    }
    if not metadata.get("/Keywords", "").strip():
        metadata_mismatches["/Keywords"] = {
            "expected": "non-empty",
            "actual": metadata.get("/Keywords"),
        }
    audit["external_uris"] = external_uris
    audit["doi_uris"] = doi_uris
    audit["malformed_doi_uris"] = malformed_doi_uris
    audit["caption_number_counts"] = dict(sorted(figure_counts.items()))
    audit["table_number_counts"] = dict(sorted(table_counts.items()))
    audit["expected_caption_numbers"] = expected_figures
    audit["expected_table_numbers"] = expected_tables
    audit["missing_numerical_anchors"] = missing_numerical_anchors
    audit["metadata_mismatches"] = metadata_mismatches
    failures: list[str] = []
    if forbidden_root_entries or forbidden_name_entries:
        failures.append("forbidden document-level active or hidden objects")
    if active_action_hits:
        failures.append("forbidden page annotation/action")
    if audit["invisible_text_render_operations"]:
        failures.append("invisible text rendering mode")
    if audit["nonpositive_text_size_operations"]:
        failures.append("non-positive text size")
    if audit["zero_opacity_text_show_operations"]:
        failures.append("text shown under zero-opacity graphics state")
    if audit["unembedded_font_resources"]:
        failures.append("unembedded font resource")
    if audit["empty_text_pages"]:
        failures.append("page with no extractable text")
    if sorted(figure_counts) != expected_figures or any(count != 1 for count in figure_counts.values()):
        failures.append("missing or duplicated figure caption number")
    if sorted(table_counts) != expected_tables or any(count != 1 for count in table_counts.values()):
        failures.append("missing or duplicated table caption number")
    if missing_numerical_anchors:
        failures.append("frozen numerical anchor missing from extracted PDF text")
    if malformed_doi_uris:
        failures.append("malformed DOI hyperlink")
    if metadata_mismatches:
        failures.append("missing or incorrect PDF metadata")
    audit["failures"] = failures
    audit["status"] = "PASS_HIDDEN_TEXT_OBJECT_PREFLIGHT" if not failures else "FAIL"

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(audit, handle, indent=2)
        handle.write("\n")
    print(json.dumps({"status": audit["status"], "failures": failures, "sha256": audit["sha256"]}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
