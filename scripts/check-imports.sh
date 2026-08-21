#!/bin/bash
normalize() {
  local path=$1
  local parts=() IFS='/'
  for p in $path; do
    case "$p" in
      ""|".") ;;
      "..") if [ ${#parts[@]} -gt 0 ]; then unset "parts[${#parts[@]}-1]"; fi ;;
      *) parts+=("$p") ;;
    esac
  done
  local out=""
  for p in "${parts[@]}"; do out="$out/$p"; done
  echo "${out#/}"
}
check() {
  local ref=$1
  local files=$(git ls-tree -r --name-only "$ref" src | grep -E '\.(ts|tsx)$')
  local filelist=$(git ls-tree -r --name-only "$ref" | grep -E '\.(ts|tsx)$')
  for f in $files; do
    local content=$(git show "$ref:$f" 2>/dev/null)
    [ -z "$content" ] && { echo "  [NO CONTENT] $f"; continue; }
    local imports=$(echo "$content" | grep -E "^import .* from ['\"]" | sed -E "s/.*from ['\"]([^'\"]+)['\"].*/\1/")
    echo "$imports" | while read -r m; do
      [ -z "$m" ] && continue
      case "$m" in
        *:*|react*|react-dom*|zustand*|dexie*|lucide-react*|@capacitor/*|@aparajita/*|electron*|vite*|tsx*|jsdom*|fake-indexeddb*|*.css|*.woff2|*.json) continue;;
      esac
      case "$m" in
        ./*|../*)
          local dir=$(dirname "$f")
          local norm=$(normalize "$dir/$m")
          local ok=""
          for cand in "$norm.ts" "$norm.tsx" "$norm/index.ts" "$norm/index.tsx"; do
            if echo "$filelist" | grep -qx "$cand"; then ok=1; break; fi
          done
          if [ -z "$ok" ]; then echo "  $f -> MISSING: $m"; fi
          ;;
      esac
    done
  done
}
for ref in "$@"; do
  echo "=== $ref ==="
  check "$ref"
done
