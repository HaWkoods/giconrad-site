#!/usr/bin/env python3
"""Validate public search data, publication allowlist, and note-concept relations.

No file is written. This does not assess mathematical proof correctness.
"""
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

notes = load("data/notes.json")["notes"]
details = load("data/details.json")["notes"]
concepts = load("data/concepts.json")["concepts"]
relations = load("data/relations.json")["relations"]
taxonomy = load("data/taxonomy.json")
graph = load("data/roadmap_graph.json")
public_links = load("data/public_pdf_links.json")["notes"]

note_ids = [n["id"] for n in notes]
concept_ids = [c["id"] for c in concepts]
assert len(note_ids) == len(set(note_ids)), "duplicate note IDs"
assert len(concept_ids) == len(set(concept_ids)), "duplicate concept IDs"
N, C = set(note_ids), set(concept_ids)
assert {d["id"] for d in details} == N
assert len(details) == len(notes)
assert all(re.fullmatch(r"(?:[0-9]{2}[.][0-9]{3}|P5[.][0-9]{3})", n) for n in N)

field_ids = {t["id"] for g in taxonomy["fields"] for t in [g, *g.get("children", [])]}
topic_ids = {t["id"] for g in taxonomy["topic_groups"] for t in g["items"]}
for n in notes:
    assert set(n["fields"]) <= field_ids, n["id"]
    assert set(n["topics"]) <= topic_ids, n["id"]
    assert set(n["main_concepts"]) <= C, n["id"]
    assert set(n["prerequisites"]) <= N - {n["id"]}, n["id"]
    assert set(n["recommended_prior"]) <= N - {n["id"]}, n["id"]
    assert n["publicly_available"] == (n["id"] in public_links), n["id"]
    if n["publicly_available"]:
        assert n["pdf_url"] and n["source_url"], n["id"]
    else:
        assert n["pdf_url"] is None and n["source_url"] is None, n["id"]

for c in concepts:
    assert set(c["related_note_ids"]) <= N, c["id"]
    assert set(c["related_concept_ids"]) <= C - {c["id"]}, c["id"]

kinds = {"prerequisite", "generalization", "special_case", "application",
         "alternative_method", "shared_concept", "theoretical_connection",
         "recommended_next"}
statuses = {"確認済み", "数学的に推論可能", "要確認"}
seen = set()
for r in relations:
    a, b, kind = r["source_id"], r["target_id"], r["relation_type"]
    assert a in N and b in N and a != b and kind in kinds, (a, b, kind)
    assert (a, b, kind) not in seen, (a, b, kind)
    seen.add((a, b, kind))
    assert r["verification_status"] in statuses
    assert r["relevance"] in {"高", "中", "低"}
    assert set(r["related_concepts"]) <= C
    assert r["evidence"] and r["explanation"].strip(), (a, b, kind)
    assert r["direction"] == ("undirected" if r["symmetric"] else "source_to_target")

for nid, obj in public_links.items():
    assert nid in N
    for ext in ("pdf", "tex"):
        url = obj[ext]
        assert url.startswith("./public_notes/") and ".." not in url
        assert (ROOT / url[2:]).is_file(), (nid, ext, url)

graph_nodes = {x["id"] for x in graph["nodes"]}
assert len(graph_nodes) == len(graph["nodes"])
assert {x["id"] for x in graph["nodes"] if x["kind"] == "note"} == {"note:" + n for n in N}
adj = defaultdict(list)
for edge in graph["edges"]:
    a, b = edge["from"], edge["to"]
    assert a in graph_nodes and b in graph_nodes and a != b
    adj[a].append(b)

state = {}
def visit(v):
    assert state.get(v) != 1, "prerequisite graph cycle at " + v
    if state.get(v) == 2:
        return
    state[v] = 1
    for w in adj[v]:
        visit(w)
    state[v] = 2
for x in graph_nodes:
    visit(x)

recommended = {(x["from"], x["to"]) for x in graph["edges"]
               if x["relation"] == "recommended_reading"}
for d in details:
    for n in d["prerequisites"]:
        assert ("note:" + n, "note:" + d["id"]) in recommended
for n in notes:
    strict = {r["source_id"] for r in relations
              if r["target_id"] == n["id"] and r["relation_type"] == "prerequisite"}
    assert set(n["prerequisites"]) == strict, n["id"]

print(f"OK: {len(notes)} notes; {len(concepts)} concepts; "
      f"{len(relations)} relations; {len(public_links)} published PDF/TeX pairs; "
      f"{len(graph['nodes'])} graph nodes.")
