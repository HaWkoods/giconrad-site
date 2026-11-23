#!/usr/bin/env bash
# Compile exclusively from public_notes; never checkout or read the private repo.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-.}"
root=public_notes
if [[ ! -d "$root" ]]; then
  echo 'public_notes directory does not exist' >&2
  exit 1
fi

files=()
all_notes() {
  mapfile -t files < <(find "$root" -type f -name '*.tex' | LC_ALL=C sort)
}

if [[ "${GITHUB_EVENT_NAME:-}" == workflow_dispatch ]]; then
  note="${MANUAL_NOTE:-all}"
  if [[ -z "$note" || "$note" == all ]]; then
    all_notes
  elif [[ "$note" =~ ^[0-9]{2}\.[0-9]{3}$ ]]; then
    mapfile -t files < <(find "$root" -type f -name "${note}_*.tex" | LC_ALL=C sort)
    if (( ${#files[@]} == 0 )); then
      echo "No public source for $note" >&2
      exit 1
    fi
  else
    echo 'Manual note must be all or AA.BBB' >&2
    exit 1
  fi
elif [[ -n "${BEFORE_SHA:-}" ]] && git cat-file -e "${BEFORE_SHA}^{commit}" 2>/dev/null; then
  if [[ -f scripts/notation_build_queue.txt ]] && { [[ -n "$(git diff --name-only "$BEFORE_SHA" HEAD -- scripts/notation_build_queue.txt)" ]] || [[ -n "$(git diff --name-only "$BEFORE_SHA" HEAD -- scripts/build_public_notes.sh)" ]]; }; then
    # Rebuild exactly the audited batch, including sources from intermediate
    # commits whose automatically queued workflow runs were superseded.
    mapfile -t files < scripts/notation_build_queue.txt
    for source in "${files[@]}"; do
      if [[ "$source" != public_notes/*.tex || ! -f "$source" ]]; then
        echo "Invalid or missing queued source: $source" >&2
        exit 1
      fi
    done
  elif [[ -n "$(git diff --name-only "$BEFORE_SHA" HEAD -- scripts/build_public_notes.sh .github/workflows/build_public_notes.yml)" ]]; then
    all_notes
  else
    mapfile -t files < <(git diff --name-only --diff-filter=AMR "$BEFORE_SHA" HEAD -- "$root" | grep -E '^public_notes/.*\.tex$' | LC_ALL=C sort || true)
  fi
else
  all_notes
fi

if (( ${#files[@]} == 0 )); then
  echo 'No changed public pLaTeX sources. Nothing to compile.'
  exit 0
fi

for source in "${files[@]}"; do
  [[ -f "$source" ]] || continue
  dir="$(dirname "$source")"
  stem="$(basename "$source" .tex)"
  work="${RUNNER_TEMP:-/tmp}/giconrad-pdf-build/$stem"
  mkdir -p "$work"
  echo "::group::Compiling $source"
  (
    cd "$dir"
    platex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory="$work" "$stem.tex"
    platex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory="$work" "$stem.tex"
  )
  dvipdfmx -o "$dir/$stem.pdf" "$work/$stem.dvi"
  if grep -Eq 'Overfull \\hbox|Underfull \\hbox|LaTeX Warning: Reference|LaTeX Warning: There were undefined references' "$work/$stem.log"; then
    echo "Typesetting warnings detected in $work/$stem.log" >&2
    exit 1
  fi
  pdfinfo "$dir/$stem.pdf" | grep '^Pages:'
  echo '::endgroup::'
done scripts/notation_build_queue.txt | LC_ALL=C sort -u)
    for source in "${files[@]}"; do
      if [[ ! -f "$source" ]]; then
        echo "Missing queued note: $source" >&2
        exit 1
      fi
    done
  elif [[ -n "$(git diff --name-only "$BEFORE_SHA" HEAD -- scripts/build_public_notes.sh .github/workflows/build_public_notes.yml)" ]]; then
    all_notes
  else
    mapfile -t files < <(git diff --name-only --diff-filter=AMR "$BEFORE_SHA" HEAD -- "$root" | grep -E '^public_notes/.*\.tex$' | LC_ALL=C sort || true)
  fi
else
  all_notes
fi

if (( ${#files[@]} == 0 )); then
  echo 'No changed public pLaTeX sources. Nothing to compile.'
  exit 0
fi

for source in "${files[@]}"; do
  [[ -f "$source" ]] || continue
  dir="$(dirname "$source")"
  stem="$(basename "$source" .tex)"
  work="${RUNNER_TEMP:-/tmp}/giconrad-pdf-build/$stem"
  mkdir -p "$work"
  echo "::group::Compiling $source"
  (
    cd "$dir"
    platex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory="$work" "$stem.tex"
    platex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory="$work" "$stem.tex"
  )
  dvipdfmx -o "$dir/$stem.pdf" "$work/$stem.dvi"
  if grep -Eq 'Overfull \\hbox|Underfull \\hbox|LaTeX Warning: Reference|LaTeX Warning: There were undefined references' "$work/$stem.log"; then
    echo "Typesetting warnings detected in $work/$stem.log" >&2
    exit 1
  fi
  pdfinfo "$dir/$stem.pdf" | grep '^Pages:'
  echo '::endgroup::'
done