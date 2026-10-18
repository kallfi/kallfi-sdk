# Contributing

Thank you for helping improve the Kallfi SDKs.

1. Open an issue before making a large API or compatibility change.
2. Keep the OpenAPI document authoritative. Do not hand-copy schema constraints
   or server pricing, safety, quota, or lifecycle rules into a client.
3. Run `npm run check` at the repository root and `uv run --directory python
   check` before opening a pull request.
4. Add focused tests for changed transport, error, or public client behavior.
5. Do not include credentials, generated media, partner data, or production
   request/response bodies in commits or test fixtures.

By contributing, you agree that your contribution is licensed under the MIT
License in this repository.

Keep handwritten client code readable with explicit control flow and meaningful
names. Generated types and operation metadata remain owned by the OpenAPI
generator; change their source rather than hand-formatting generated output.

## Client source ownership

Keep request setup, cancellation, and bounded response consumption together in the
TypeScript transport. Its private metadata and API-error readers own the finite
response policy. Python's sync and async bounded readers are shared by resource
helpers and canonical operation calls; workspace discovery retains its separate
4096-byte capability limit. Refactoring these paths must preserve public types,
caller-owned idempotency keys, timeout budgets, and the absence of mutation retries.

Both Python resource methods and canonical `call` methods dispatch through their
sync or async transport's `send` method. It owns workspace preflight, headers,
deadlines, bounded reading, and HTTP transport errors; the caller selects typed
model decoding or detailed response decoding. Python model generation and its
check share `python/scripts/generate-models.sh`; an optional output path supports
temporary verification without duplicating code-generator flags.
