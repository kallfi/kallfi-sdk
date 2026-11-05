# Kallfi JavaScript SDK

Typed, server-side JavaScript and TypeScript client for the Kallfi API. Supports the canonical 63-operation API with generated request and response types.

## Install

Requires Node.js 20 or later.

```sh
npm install @kallfi/sdk
```

## Quickstart

Create an Account ACR key in Kallfi and keep it in your server environment as `KALLFI_API_KEY`. This example reads your Creator Plan; it does not create content or start a paid generation.

```ts
import { Kallfi } from "@kallfi/sdk";

const kallfi = new Kallfi({
  apiKey: process.env.KALLFI_API_KEY!,
  surface: "nsfw-disabled", // kallfi.com; use "nsfw-enabled" for kallfi.red
});

const result = await kallfi.operation("getAccountCreatorPlan", {
  body: { query: { historyLimit: "1" }, body: {} },
}, { idempotencyKey: crypto.randomUUID() });

console.log(result.status, result.data);
```

Use the key issued for the selected surface. Never put API keys in browser bundles, mobile apps, public repositories, or logs. Authorization, account eligibility, and pricing are enforced by Kallfi.

## Using the client

- `operation(operationId, arguments, options)` calls canonical operations with `path`, `query`, and `body` arguments. Responses expose `status`, `data`, and optional request metadata.
- `sourceAssets`, `souls`, and `operations` provide resource helpers. Request and response types are exported from `@kallfi/sdk`.
- Account operations use the current Personal account. An explicit `workspaceId` applies only to supported organization-resource operations; it is rejected for Account operations.
- Mutations require a caller-owned idempotency key. Keep the same intent and payload when reconciling an uncertain outcome; do not automatically repeat a paid action.
- `KallfiApiError` exposes stable `status` and `code` fields. Network and timeout failures use `KallfiNetworkError` and `KallfiTimeoutError`.

## Documentation and support

[API reference and guides](https://developers.kallfi.com) · [RED API documentation](https://developers.kallfi.red) · [Python SDK](https://pypi.org/project/kallfi-sdk/)

For API access or account help, use the support options in Kallfi. Never include API keys in support messages.

## License

MIT. See [LICENSE](./LICENSE).

### Account API hosts

Account-scoped `operation()` calls use `https://kallfi.com/api/v1` or `https://kallfi.red/api/v1` by default. The ACR dashboard hosts remain suspended. Legacy Enterprise resources default to `https://api.kallfi.com/v1` or `https://api.kallfi.red/v1` and are not exposed on the main hosts. An explicit `baseUrl` preserves the selected trusted host; selecting a main host admits account operations only. Surface matching, no redirects, caller-owned mutation idempotency and authoritative lifecycle state remain unchanged. These source changes require package publication and a hosted API release before they establish runtime availability.

### Uploaded generation references

SDK 0.3.6 adds the Account reference-preflight operation. Use the canonical uploaded reference values from your upload flow:

```ts
const admission = await kallfi.operation("prepareAccountPostGenerationReferences", {
  body: { body: { version: 1, references: uploadedReferences } },
}, { idempotencyKey: crypto.randomUUID() });
```

Retain the returned receipt unchanged. A pending response is not accepted reference admission; use the canonical receipt read mode and wait for acceptance before requesting generation. This call does not launch generation. Availability requires the matching main API release.

### Pending reference receipt recovery

SDK 0.3.7 retains a narrowly typed `KallfiApiError.referencePreflight` on canonical HTTP 409 pending reference preparation. It contains only `referenceSafetyState: "pending"` and the validated version/package/fingerprint receipt. Preserve that locator and explicitly call the same operation in read mode with unchanged references and owner scope. Pending is not accepted admission, and the SDK never retries preparation or launches generation. Other error bodies, arbitrary details and malformed receipts remain excluded.


### Soul publication

Use the current persistent Soul wizard operations for Looks and Voice, then submit final display name, public handle, selected languages and authored Lore together through `promoteAccountSoul`. Final name, handle and Lore have no separate draft-save operation. The language-selection operation retains the canonical Voice/revision contract. `updateAccountSoulDetails`, `reviewAccountSoul` and `prepareAccountSoulEditSeed` are removed from the canonical operation catalog. Published Soul Lore editing remains supported. This source catalog change is not a package release or hosted execution proof.

The existing `npm run generate` owner also emits the Python operation manifest, so both clients retire the same command IDs from one canonical snapshot.
