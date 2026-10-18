#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT
./scripts/generate-models.sh "$tmp_file"
diff -u src/kallfi/models.py "$tmp_file"
echo "Generated Python models are up to date."
