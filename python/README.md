# Kallfi Python SDK

Native synchronous and asynchronous Python clients for the Kallfi API. Python 3.10+.

```sh
pip install kallfi-sdk
```

`uv add` adds the dependency to a uv project and its lockfile. `uv pip install`
installs into the selected Python environment:

```sh
uv add kallfi-sdk
uv pip install kallfi-sdk
```

Install an immutable Git repository release when needed:

```sh
pip install "kallfi-sdk @ git+https://github.com/kallfi/kallfi-sdk.git@v0.2.0#subdirectory=python"
uv add "kallfi-sdk @ git+https://github.com/kallfi/kallfi-sdk.git@v0.2.0#subdirectory=python"
uv pip install "kallfi-sdk @ git+https://github.com/kallfi/kallfi-sdk.git@v0.2.0#subdirectory=python"
```

```python
from kallfi import Kallfi

with Kallfi.from_env(surface="nsfw-disabled") as client:
    response = client.call(
        "createPost",
        body={"caption": "Hello"},
        idempotency_key="a-stable-key-for-this-intent",
    )
    print(response.status, response.data, response.request_id)
```

The body must satisfy the operation's canonical request schema. This example
illustrates transport usage; it is not evidence that an operation is admitted.
`AsyncKallfi` exposes the same API with awaited calls and an async context manager.
Typed Pydantic request and response models are exported from `kallfi.models`.
The original typed Soul resources remain available. Operation responses now use
`operation.root.status`, because the canonical operation is a shared/surface union.

`call(operation_id, body=..., path_params=..., query=..., idempotency_key=...)`
accepts all 61 operation IDs in the bundled canonical OpenAPI snapshot. It returns
`APIResponse` containing status, parsed JSON data, request ID, Retry-After,
Location and Content-Type. Responses are bounded to 8 MiB by default; configure
`max_response_bytes` per call. HTTP errors raise `KallfiAPIError`; malformed JSON,
transport failures and timeouts have dedicated exceptions. Redirects are never
followed, including with an injected HTTP client. Mutations require an explicit
idempotency key of 1 to 128 characters and are never automatically retried. Async task cancellation
propagates normally. Configure the timeout at construction. Discovery consumes
the same timeout budget as the operation. Async calls enforce an overall
cancellation deadline. Sync calls use HTTPX phase/inactivity timeouts, pass the
remaining budget to the operation and check the deadline while consuming chunks;
they do not promise a strict wall-clock interrupt of a blocking slow stream.

The default surface is `nsfw-disabled` (`https://acr.kallfi.com`);
`nsfw-enabled` uses `https://acr.kallfi.red`. An explicit trusted origin must
agree with the surface. Custom remote origins are rejected; loopback origins
are available for local development. An injected HTTP client is caller-owned;
its base URL must match the selected surface; it must not preconfigure workspace
headers. SDK authentication and workspace headers are attached per request;
constructing clients does not mutate the shared HTTP client headers.

`workspace_id` is a fixed UUID selector sent as `X-Kallfi-Workspace-ID`.
Omit it for Personal. It is untrusted input, never an authorization grant.
Every explicit workspace read or mutation first makes a fresh, unauthenticated
same-origin `GET /v1/capabilities` request, bounded to 4096 bytes, without workspace,
idempotency or cookie
headers. HTTP 200 JSON must match the account-principal-v1 discovery protocol.
Missing, old, redirected, HTML or malformed responses raise
`WorkspaceUnsupportedError` with code `workspace_capability_unsupported` before
the operation is sent. There is no fallback to Personal and no capability cache.
Default Personal requests do not perform discovery.

Account operations reject explicit workspace selection. The server must verify
current membership, resource ownership and economy permissions. This selector
contract is prepared source, not a claim that the workspace runtime is deployed.
Credentials belong in server environments, never browser code. Media capability
URLs are not fetched automatically and API authorization is never forwarded.

## Contract and publication

`openapi/openapi.v1.json` is the backend-owned 61-operation shared snapshot.
Its SHA256 is recorded in `src/kallfi/operations.json`; tests detect snapshot or
operation drift. `scripts/generate-models.sh` generates Pydantic models from it;
`scripts/check-models.sh` checks deterministic output.

```sh
uv sync --all-extras --locked
uv run sh scripts/check-models.sh
uv run ruff check src tests
uv run mypy src
uv run pytest
uv build
```

The distribution is `kallfi-sdk`; the Python import namespace remains `kallfi`.
It is MIT, maintained in
`kallfi/kallfi-sdk`. The existing GitHub workflow `publish-pypi.yml` publishes
an immutable release tag through PyPI trusted publishing, environment `pypi`.
Set repository variable `PYPI_TRUSTED_PUBLISHING_ENABLED=true` only once its
trusted publisher is configured. PyPI's pending publisher must name owner
`kallfi`, repository `kallfi-sdk`, workflow `publish-pypi.yml`, environment `pypi`,
project `kallfi-sdk`. Package version, npm version and release tag must agree.
No PyPI token is required for this path. An artifact build is not publication;
verify the public PyPI version and install its wheel after the workflow succeeds.


## 0.3.0 source qualification

This candidate uses the canonical 61-operation schema. The generated Python models,
lockfile, deterministic model drift, lint, typing and 132 tests passed locally.
Wheel and source archive built with the existing Hatchling 1.27.0 backend.
This source qualification is not publication or evidence that every hosted
operation was exercised. Follow the exact release tag and public registry version.

Workspace selectors accept canonical hyphenated UUID versions 1 through 8 with
the RFC variant; accepted input is case-insensitive and wire values normalize to
lowercase. Server capability and membership checks still apply.

API errors expose finite machine codes, optional `outcome` values
`mutation_outcome_unknown` or `read_projection_unavailable`, and strict boolean
`reconciliation_required` / `automatic_retry_allowed` hints. Raw provider details
and human error prose are discarded. Hints never trigger automatic mutation retries.


## 0.3.1 metadata following patch

The canonical settings operation is explicitly non-read-only. The SDK catalog
checksum follows that owner metadata; request/response schemas, methods, paths
and Python runtime behavior are unchanged. This candidate does not imply
publication or new hosted journey acceptance.
