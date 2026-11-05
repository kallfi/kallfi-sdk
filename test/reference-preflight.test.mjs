import test from 'node:test';
import assert from 'node:assert/strict';
import { Kallfi, KallfiApiError } from '../dist/index.js';

const intent = '018f3f2a-0000-7000-8000-000000000001';
const receipt = {version: 1, packageId: '018f3f2a-0000-7000-8000-000000000002', bindingFingerprint: 'a'.repeat(64)};
const pending = {referenceSafetyState: 'pending', receipt};

test('pending preflight preserves only the bounded locator for one explicit read, without replaying preparation', async () => {
  const calls = [];
  const sdk = new Kallfi({apiKey: 'synthetic-test-key', fetch: async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify(calls.length === 1
      ? {...pending, code: 'reference_media_processing', details: {private: 'discard'}}
      : {referenceSafetyState: 'accepted', receipt}), {
      status: calls.length === 1 ? 409 : 200, headers: {'content-type': 'application/json'},
    });
  }});
  let locator;
  await assert.rejects(sdk.operation('prepareAccountPostGenerationReferences', {
    body: {body: {version: 1, references: [], mode: 'prepare'}},
  }, {idempotencyKey: intent}), error => {
    assert.ok(error instanceof KallfiApiError);
    assert.deepEqual(error.referencePreflight, pending);
    assert.equal(error.details, undefined);
    locator = error.referencePreflight.receipt;
    return true;
  });
  assert.equal(calls.length, 1);
  const read = await sdk.operation('prepareAccountPostGenerationReferences', {
    body: {body: {version: 1, references: [], mode: 'read', receipt: locator}},
  }, {idempotencyKey: intent});
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body.receipt, receipt);
  assert.equal(read.data.referenceSafetyState, 'accepted');
});

test('other statuses, malformed pointers and extra receipt fields never become pending authority', async () => {
  const cases = [
    [401, pending], [409, {...pending, referenceSafetyState: 'accepted'}],
    [409, {...pending, receipt: {...receipt, version: true}}],
    [409, {...pending, receipt: {...receipt, packageId: 'private-prose'}}],
    [409, {...pending, receipt: {...receipt, bindingFingerprint: 'short'}}],
    [409, {...pending, receipt: {...receipt, private: 'discard'}}],
  ];
  for (const [status, payload] of cases) {
    const sdk = new Kallfi({apiKey: 'synthetic-test-key', fetch: async () => new Response(JSON.stringify(payload), {
      status, headers: {'content-type': 'application/json'},
    })});
    await assert.rejects(sdk.operation('prepareAccountPostGenerationReferences', {body: {}}, {idempotencyKey: intent}), error => {
      assert.equal(error.referencePreflight, undefined);
      assert.equal(error.details, undefined);
      return true;
    });
  }
});
