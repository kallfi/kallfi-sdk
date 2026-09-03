#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT
datamodel-codegen --input ../openapi/openapi.v1.json --input-file-type openapi --output "$tmp_file" --output-model-type pydantic_v2.BaseModel --target-python-version 3.10 --use-standard-collections --use-double-quotes --disable-timestamp
diff -u src/kallfi/models.py "$tmp_file"
echo "Generated Python models are up to date."
