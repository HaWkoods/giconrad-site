#!/usr/bin/env python3
"""Check draft note-relation review. Does NOT modify the live roadmap graph."""
import json
from collections import defaultdict
from pathlib import Path

root = Path(__file__).resolve().parents[1]
load = lambda name: json.loads((root / name).read_text(encoding="utf-8"))
catalog = load("data/notes.json")
original = load("data/roadmap_graph.json")
audit = load("data/roadmap_relations_audit_draft.json")
assert audit["version"] == 1
assert audit["status"] == "audit_draft_not_used_by_site"
IDs = {"note:" + note["id"] for note in catalog["notes"]}
original_relations = {(e["from"], e["to"]) for e in original["edges"]
                      if e["relation"] == "recommended_reading"}
reviewed = audit["existing_edges"]
assert len(IDs) == 157
assert len(reviewed) == len(original_relations) == 202
reviewed_relations = {(e["from"], e["to"]) for e in reviewed}
assert reviewed_relations == original_relations
assert len(reviewed_relations) == len(reviewed)
valid_proposals = {"core_concept", "supporting_only", "not_supported",
                   "requires_further_proof_review"}
stats = defaultdict(int)
for e in reviewed:
    assert {e["from"], e["to"]} <= IDs, e
    assert e["proposal"] in valid_proposals, e
    assert (e["target_tex"] is not None
            and (root / e["target_tex"]).is_file()), e
    assert e["rationale"].strip()
    stats[e["proposal"]] += 1

added = audit["proposed_new_edges"]
assert len(added) == audit["scope"]["suggested_additions"]
seen_new = set()
for e in added:
    pair = (e["from"], e["to"])
    assert {e["from"], e["to"]} <= IDs
    assert pair not in original_relations and pair not in seen_new, e
    assert (root / e["target_tex"]).is_file(), e
    assert e["proposal"] in valid_proposals
    seen_new.add(pair)

assert dict(stats) == audit["scope"]["proposal_counts"], (stats, audit["scope"])
assert sum(stats.values()) == 202

# Check whether applying all suggested additions and omitting unsupported links
# would preserve DAG structure. This does not approve each mathematical edge.
adj = defaultdict(list)
for e in reviewed + added:
    if e["proposal"] == "not_supported":
        continue
    adj[e["from"]].append(e["to"])
state = {}
def visit(u):
    if state.get(u) == 1:
        raise AssertionError("Suggested graph has a cycle at " + u)
    if state.get(u) == 2:
        return
    state[u] = 1
    for v in adj[u]:
        visit(v)
    state[u] = 2
for x in IDs:
    visit(x)

print(f"OK: {len(IDs)} notes; {len(reviewed)} existing relations; "
      f"{len(added)} proposals; categories={dict(stats)}; no cycles")
