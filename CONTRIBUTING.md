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
