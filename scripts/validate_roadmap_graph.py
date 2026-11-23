#!/usr/bin/env python3
"""Validate the prerequisite graph used by the prospective radial roadmap."""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
graph = json.loads((ROOT / "data/roadmap_graph.json").read_text(encoding="utf-8"))
catalog = json.loads((ROOT / "data/notes.json").read_text(encoding="utf-8"))
details = json.loads((ROOT / "data/details.json").read_text(encoding="utf-8"))
assert graph["version"] == 1
nodes = graph["nodes"]
edges = graph["edges"]
ids = [n["id"] for n in nodes]
assert len(ids) == len(set(ids)), "Duplicate node IDs"
known = set(ids)
catalog_ids = {"note:" + n["id"] for n in catalog["notes"]}
graph_note_ids = {n["id"] for n in nodes if n["kind"] == "note"}
assert graph_note_ids == catalog_ids, "Note nodes must exactly match the catalog"
detail_ids = {d["id"] for d in details["notes"]}
assert detail_ids == {x.removeprefix("note:") for x in catalog_ids}
assert all(n["kind"] in {"note", "concept"} for n in nodes)
assert all(n["label"].strip() for n in nodes)
seen = set()
adj = defaultdict(list)
for edge in edges:
    a, b = edge["from"], edge["to"]
    assert a in known and b in known, ("Missing endpoint", a, b)
    assert a != b, ("Self-edge", a)
    assert edge["relation"] in {"recommended_reading", "concept_prerequisite"}
    assert edge["strength"] in {"strong", "weak", "unassessed"}
    assert edge["review"] in {"source_inspected", "catalogue_only"}
    assert not (edge["strength"] == "strong" and edge["review"] != "source_inspected"), edge
    if edge["relation"] == "recommended_reading":
        assert a.startswith("note:") and b.startswith("note:")
    else:
        assert a.startswith("concept:") and b.startswith("note:")
    evidence = edge.get("evidence")
    assert evidence and evidence["path"], ("Missing provenance", edge)
    key = (a, b, edge["relation"])
    assert key not in seen, ("Duplicate relation", key)
    seen.add(key)
    adj[a].append(b)

# The radial diagram should never loop through existing directed prerequisites.
state = {}
def visit(u):
    if state.get(u) == 1:
        raise AssertionError("Directed prerequisite cycle at " + u)
    if state.get(u) == 2:
        return
    state[u] = 1
    for v in adj[u]:
        visit(v)
    state[u] = 2
for n in ids:
    visit(n)

prior = {(f"note:{p}", f"note:{d['id']}")
         for d in details["notes"] for p in d.get("prerequisites", [])}
recorded = {(e["from"], e["to"]) for e in edges
            if e["relation"] == "recommended_reading"}
assert prior == recorded, "The graph must preserve the existing reading recommendations"
print(f"OK: {len(graph_note_ids)} note nodes, {len(ids)-len(graph_note_ids)} concept nodes, "
      f"{len(edges)} edges; references resolved, no cycles.")
