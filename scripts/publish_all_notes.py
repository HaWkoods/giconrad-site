#!/usr/bin/env python3
"""Publish only catalogued note PDFs and pLaTeX sources from a private checkout."""
import json
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_private_source" / "notes"
OUTPUT = ROOT / "public_notes"
CATALOG = ROOT / "data" / "notes.json"
MANIFEST = ROOT / "data" / "public_pdf_links.json"

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
ids = {n["id"] for n in catalog["notes"]}
assert len(ids) == 157, f"Unexpected catalog size: {len(ids)}"
assert SOURCE.is_dir(), "Private source checkout missing"
paths = {}
for path in SOURCE.rglob("*"):
    if not path.is_file() or path.suffix not in {".pdf", ".tex"}:
        continue
    prefix = path.stem[:6]
    if prefix not in ids or path.stem[:6] != prefix:
        continue
    assert path.stem.startswith(prefix + "_"), f"Unexpected file name: {path}"
    record = paths.setdefault(prefix, {})
    assert path.suffix not in record, f"Duplicate {prefix} {path.suffix}"
    record[path.suffix] = path

assert set(paths) == ids, f"Missing note files: {sorted(ids - set(paths))}"
notes = {}
for note_id in sorted(ids):
    pair = paths[note_id]
    assert set(pair) == {".pdf", ".tex"}, f"Incomplete note: {note_id}"
    entries = {}
    for suffix in (".pdf", ".tex"):
        source = pair[suffix]
        relative = source.relative_to(SOURCE)
        destination = OUTPUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        copy2(source, destination)
        entries[suffix[1:]] = "./" + destination.relative_to(ROOT).as_posix()
    notes[note_id] = {**entries, "status": "draft-review"}
MANIFEST.write_text(
    json.dumps({"version": 1, "notes": notes}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Prepared {len(notes)} public PDFs and {len(notes)} pLaTeX sources.")
