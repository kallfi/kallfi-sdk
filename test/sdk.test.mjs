import test from "node:test";
import assert from "node:assert/strict";
import { Kallfi, KallfiApiError, KallfiNetworkError, KallfiTimeoutError } from "../dist/index.js";

const response = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", ...headers },
});

test("creates a source asset with bearer auth and idempotency", async () => {
  let call;
  const client = new Kallfi({ apiKey: "secret", baseUrl: "https://example.test/", fetch: async (url, init) => {
    call = { url, init };
    return response(202, { source_asset: {}, operation: {} });
  }});
  await client.sourceAssets.create({ type: "appearance_reference", media: { content_type: "image/png", byte_length: 1, sha256: "a".repeat(64) }, rights_attestation: { basis: "owned_or_licensed", subject_consent: true } }, { idempotencyKey: "idem-1" });
  assert.equal(call.url, "https://example.test/v1/soul-source-assets");
  assert.equal(call.init.headers.Authorization, "Bearer secret");
  assert.equal(call.init.headers["Idempotency-Key"], "idem-1");
});

test("encodes opaque path identifiers and enforces mutation idempotency", async () => {
  let url;
  const client = new Kallfi({ apiKey: "key", fetch: async (input) => { url = input; return response(200, { soul_id: "soul_x" }); } });
  await client.souls.retrieve("soul/a?b");
  assert.equal(url, "https://api.kallfi.com/v1/souls/soul%2Fa%3Fb");
  await assert.rejects(() => client.souls.create({ external_soul_id: "x", kind: "human", description: "x", source_asset_ids: [] }, { idempotencyKey: "" }), TypeError);
});

test("surfaces structured API error fields including retry-after", async () => {
  const client = new Kallfi({ apiKey: "key", fetch: async () => response(429, { error: { code: "rate_limited", message: "slow down", request_id: "req-1", details: { scope: "company" } } }, { "retry-after": "7" }) });
  await assert.rejects(() => client.operations.retrieve("op_1"), (error) => {
    assert.ok(error instanceof KallfiApiError);
    assert.equal(error.status, 429); assert.equal(error.code, "rate_limited");
    assert.equal(error.request_id, "req-1"); assert.equal(error.details.scope, "company"); assert.equal(error.retry_after, "7");
    return true;
  });
});

test("handles non-json, network, and timeout failures without retrying", async () => {
  const nonJson = new Kallfi({ apiKey: "key", fetch: async () => new Response("bad gateway", { status: 502 }) });
  await assert.rejects(() => nonJson.operations.retrieve("op_1"), (error) => error instanceof KallfiApiError && error.status === 502 && error.code === "http_error");
  const network = new Kallfi({ apiKey: "key", fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(() => network.operations.retrieve("op_1"), (error) => error instanceof KallfiNetworkError && !(error instanceof KallfiTimeoutError));
  const timeout = new Kallfi({ apiKey: "key", timeoutMs: 1, fetch: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))) });
  await assert.rejects(() => timeout.operations.retrieve("op_1"), (error) => error instanceof KallfiTimeoutError && error.timeoutMs === 1);
});

test("constructs from the server environment and bounds operation polling", async () => {
  const previous = process.env.KALLFI_API_KEY;
  process.env.KALLFI_API_KEY = "environment-secret";
  let calls = 0;
  try {
    const client = Kallfi.fromEnv({
      fetch: async (_url, init) => {
        assert.equal(init.headers.Authorization, "Bearer environment-secret");
        calls += 1;
        return response(200, {
          operation_id: "op_1",
          kind: "soul_creation",
          status: calls === 1 ? "accepted" : "succeeded",
          created_at: "2026-09-03T00:00:00Z",
          updated_at: "2026-09-03T00:00:00Z",
        });
      },
    });
    const operation = await client.operations.wait("op_1", { timeoutMs: 1_000, intervalMs: 100 });
    assert.equal(operation.status, "succeeded");
    assert.equal(calls, 2);
  } finally {
    if (previous === undefined) delete process.env.KALLFI_API_KEY;
    else process.env.KALLFI_API_KEY = previous;
  }
});
