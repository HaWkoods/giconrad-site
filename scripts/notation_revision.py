#!/usr/bin/env python3
"""Conservative notation amendments. Ambiguities are flagged, never guessed."""
import argparse, json, re
from pathlib import Path

HEAD = r"\begin{document}"
MARK = r"\textbf{記号と約束.}"

def revise(text, path):
    if HEAD not in text:
        return text, [], ["no_document"]
    body = text.split(HEAD, 1)[1]
    code = re.sub(r"(?m)^\s*%[^\n]*$", "", body)
    items, pending = [], []
    functional = any(p in path.lower() for p in
                     ("functional_analysis", "banach", "hilbert", "operator_theory"))
    measure = any(p in path.lower() for p in
                  ("measure", "probability", "integration", "statistics"))
    def add(flag, label, statement):
        if flag:
            items.append((label, statement))
    add(r"\subseteq" in code, "subseteq",
        r"集合の包含 $A\subseteq B$ は等号を許すものとする．")
    if re.search(r"\\subset(?!eq|neq)", code):
        pending.append("subset: 記号の真包含性を確認")
    if r"\mathbb{N}" in code or re.search(r"\\N\b", code):
        pending.append("N: 0を含むか確認")
    if re.search(r"\\langle\b", code):
        pending.append("pairing: 内積の線形規約またはペアリングの意味を確認")
    if re.search(r"(?<![A-Za-z])B\s*\(", code):
        pending.append("ball: 開球／閉球を確認")
    if re.search(r"\\widehat\s*[{\\]|\\hat\s*[{\\]", code):
        pending.append("hat: 記号の意味を確認")
    add(bool(re.search(r"\\(?:operatorname|mathrm)\{Spec\}|\\Spec\b", code)),
        "Spec", r"$\operatorname{Spec}A$ は可換環 $A$ の素イデアル全体の集合とする．")
    add(bool(re.search(r"\\mathbb\{F\}_\{?[^} \n]+\}?", code)),
        "finite_field", r"$\mathbb F_q$ は $q$ 元の有限体を表す（存在する場合）．")
    add(bool(re.search(r"C_\{?c\}?(?![A-Za-z])", code)),
        "compact_support", r"関数空間の添字 $c$ はコンパクトな台をもつことを表す．")
    add(measure and bool(re.search(r"\\mathcal\{B\}\s*(?:\(|_)|\\mathcal B\s*\(", code)),
        "Borel", r"$\mathcal B(X)$ は位相空間 $X$ のBorel $\sigma$-加法族とする．")
    add(functional and bool(re.search(r"(?:X|M|E|V|H)\s*\^\s*(?:\*|\{\*\})", code)),
        "dual", r"ノルム空間 $E$ に対する $E^*$ は有界線形汎関数全体の連続双対空間であり，そのノルムは $\|f\|=\sup_{\|x\|_E\le1}|f(x)|$ とする．")
    if MARK in text or "ノルム空間 $E$ の連続双対空間" in text:
        return text, [], pending
    if not items:
        return text, [], pending
    section = re.search(r"(?m)^\\section\{", body)
    if not section:
        return text, [], pending + ["no_section_anchor"]
    at = text.index(HEAD) + len(HEAD) + section.start()
    paragraph = ("\n\\par\\noindent" + MARK + "\\quad\n"
                 + "\n".join(statement for _, statement in items) + "\n\\par\n\n")
    return text[:at] + paragraph + text[at:], [name for name, _ in items], pending

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--report", required=True)
    args = ap.parse_args()
    results = []
    for path in sorted(Path(args.root).rglob("*.tex")):
        old = path.read_text(encoding="utf8")
        new, added, pending = revise(old, str(path))
        if new != old:
            path.write_text(new, encoding="utf8")
        results.append(dict(path=str(path), changed=new != old,
                            added=added, needs_contextual_review=pending))
    result = dict(total=len(results), changed=sum(x["changed"] for x in results),
                  warning="機械的な記号点検のみ。数学的査読・全ページ検査の代わりではない。",
                  notes=results)
    target = Path(args.report)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf8")
    print("TOTAL", result["total"], "CHANGED", result["changed"])

if __name__ == "__main__":
    main()
