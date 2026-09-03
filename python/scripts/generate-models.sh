#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
datamodel-codegen \
  --input ../openapi/openapi.v1.json \
  --input-file-type openapi \
  --output src/kallfi/models.py \
  --output-model-type pydantic_v2.BaseModel \
  --target-python-version 3.10 \
  --use-standard-collections \
  --use-double-quotes \
  --disable-timestamp
