# Kallfi SDKs

Typed, server-side JavaScript/TypeScript and Python clients for Kallfi's proposed
third-party Soul API.

> [!IMPORTANT]
> The API and commercial terms are proposals. `https://api.kallfi.com/v1` is
> not implemented or generally available yet. This repository does not prove
> runtime availability, partner admission, or package-registry publication.

## Install

The repository is ready for one shared `v0.1.0` source tag. Until registry
publication is configured, install that tag directly from GitHub:

```sh
npm install 'github:kallfi/kallfi-sdk#v0.1.0'
python -m pip install \
  'kallfi @ git+https://github.com/kallfi/kallfi-sdk.git@v0.1.0#subdirectory=python'
```

After the packages are published by Kallfi, the registry commands will be:

```sh
npm install @kallfi/sdk
python -m pip install kallfi
```

Both packages are for trusted application servers. Never put an organization
credential in browser, mobile, desktop, or other distributed client code.

## JavaScript / TypeScript

```ts
import { Kallfi } from "@kallfi/sdk";

const kallfi = new Kallfi({ apiKey: process.env.KALLFI_API_KEY! });

const accepted = await kallfi.souls.create(
  {
    external_soul_id: "performer-17",
    kind: "human",
    description: "An energetic live host with warm, concise delivery.",
    source_asset_ids: [],
  },
  { idempotencyKey: crypto.randomUUID() },
);

const operation = await kallfi.operations.wait(accepted.operation.operation_id, {
  timeoutMs: 120_000,
});
```

Request and response types are generated from `openapi/openapi.v1.json` and are
exported by the root package. API failures throw `KallfiApiError`; branch on its
stable `code`, not its human-readable message.

## Python

```python
import os
import uuid

from kallfi import Kallfi, SoulCreateRequest

with Kallfi(api_key=os.environ["KALLFI_API_KEY"]) as kallfi:
    accepted = kallfi.souls.create(
        SoulCreateRequest(
            external_soul_id="performer-17",
            kind="human",
            description="An energetic live host with warm, concise delivery.",
            source_asset_ids=[],
        ),
        idempotency_key=str(uuid.uuid4()),
    )
    operation = kallfi.operations.wait(accepted.operation.operation_id, timeout=120.0)
```

API failures raise `KallfiAPIError` and retain the HTTP status, stable code, request
ID, details, and optional retry delay.

## Surface

Each SDK exposes the seven operations in the canonical contract:

- `sourceAssets.create` / `source_assets.create`
- `souls.create`, `souls.retrieve`, and `souls.update`
- `souls.createResponse` / `souls.create_response`
- `souls.createGeneration` / `souls.create_generation`
- `operations.retrieve`

Mutation methods require an explicit idempotency key. The clients do not retry
implicitly, calculate prices, infer capabilities, or reproduce server-side
safety, quota, lifecycle, and quote rules.

## Develop

```sh
# JavaScript: generate/check contract types, test, type-check, and build
npm ci
npm run check
npm pack --dry-run

# Python: sync the lock, check generated models, lint/type-check/test, and build
uv sync --directory python --locked --all-extras
uv run --directory python ruff check src tests
uv run --directory python mypy src
uv run --directory python pytest
uv build --directory python
```

The repository pins the canonical contract digest and verifies generated-code
drift in CI. See [openapi/README.md](openapi/README.md) for provenance.

## Publishing

The manual workflows use GitHub OIDC trusted publishing and contain no registry
tokens. They remain skipped until maintainers create protected `npm` and `pypi`
repository environments, establish package ownership/trusted publishers at both
registries, and explicitly set the matching `*_TRUSTED_PUBLISHING_ENABLED`
repository variable to `true`. Both workflows verify an existing immutable tag
whose `vX.Y.Z` version matches both packages.

## License

[MIT](LICENSE)
