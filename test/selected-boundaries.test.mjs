import test from 'node:test';
import assert from 'node:assert/strict';
import { Kallfi, KallfiApiError, KallfiWorkspaceUnsupportedError } from '../dist/index.js';

const intent = '018f3f2a-0000-7000-8000-000000000001';
const entity = '018f3f2a-0000-7000-8000-000000000002';
const requestId = '018f3f2a-0000-7000-8000-000000000003';

test('funding preparation and explicit commit preserve one intent and exact opaque terms', async () => {
  const quote = { actionId:intent,entityId:entity,messageCount:50,
    quoteId:requestId,policyVersionId:'canonical-fixture-version',quotedCostCents:123 };
  const calls = [];
  const client = new Kallfi({apiKey:'synthetic-test-key',fetch:async (url,init) => {
    calls.push({url:String(url),headers:init.headers,body:JSON.parse(init.body)});
    return new Response(JSON.stringify(calls.length===1?{quote}:{budget:{entityId:entity}}),
      {status:200,headers:{'content-type':'application/json'}});
  }});
  const prepared = await client.operation('prepareAccountSoulMessageBudget',
    {body:{body:{entityId:entity,messageCount:50}}},{idempotencyKey:intent});
  assert.equal(calls.length,1,'Preparation must never automatically commit');
  await client.operation('commitAccountSoulMessageBudget',
    {body:{body:{entityId:entity,quote:prepared.data.quote}}},{idempotencyKey:intent});
  assert.equal(calls.length,2);
  assert.deepEqual(calls[1].body,{body:{entityId:entity,quote}});
  for(const call of calls) assert.equal(call.headers['Idempotency-Key'],intent);
  assert.equal(calls[1].url,'https://acr.kallfi.com/v1/account/actions/commitAccountSoulMessageBudget');
});

test('deletion receipt read uses its dedicated operation and original intent without generation lookup', async () => {
  const calls=[];
  const client=new Kallfi({apiKey:'synthetic-test-key',fetch:async(url,init)=>{
    calls.push({url:String(url),init});
    return new Response(JSON.stringify({deletion:{entityId:entity,requestId,state:'pending'}}),
      {status:200,headers:{'content-type':'application/json'}});
  }});
  const result=await client.operation('getAccountSoulDeletionStatus',
    {body:{query:{entityId:entity,requestId}}},{idempotencyKey:intent});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://acr.kallfi.com/v1/account/actions/getAccountSoulDeletionStatus');
  assert.equal(calls[0].init.headers['Idempotency-Key'],intent);
  assert.deepEqual(JSON.parse(calls[0].init.body),{query:{entityId:entity,requestId}});
  assert.equal(result.data.deletion.state,'pending');
});

test('actual new mutation operation preserves finite unknown outcome and never retries', async () => {
  let calls=0;
  const client=new Kallfi({apiKey:'synthetic-test-key',fetch:async()=>{
    calls++;
    return new Response(JSON.stringify({error:'native_success_projection_unavailable',
      outcome:'mutation_outcome_unknown',reconciliationRequired:true,automaticRetryAllowed:false,
      nativePrivatePayload:'must not escape'}),{status:502,headers:{'content-type':'application/json'}});
  }});
  await assert.rejects(client.operation('commitAccountSoulMessageBudget',
    {body:{body:{entityId:entity,quote:{actionId:intent,entityId:entity}}}},{idempotencyKey:intent}),error=>{
    assert.ok(error instanceof KallfiApiError);
    assert.equal(error.outcome,'mutation_outcome_unknown');
    assert.equal(error.reconciliationRequired,true);
    assert.equal(error.automaticRetryAllowed,false);
    assert.equal(error.details,undefined);
    assert.ok(!error.message.includes('must not escape'));
    return true;
  });
  assert.equal(calls,1);
});

test('explicit workspace on old capability server never reaches a business operation', async () => {
  const paths=[];
  const client=new Kallfi({apiKey:'synthetic-test-key',workspaceId:entity,fetch:async(url,init)=>{
    paths.push(new URL(String(url)).pathname);
    assert.equal(init.headers.Authorization,undefined);
    return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
  }});
  // Existing workspace operation exercises the shared transport, not an Account-only shortcut.
  await assert.rejects(client.operation('createSoul',{body:{name:'synthetic'}}),
    error=>error instanceof KallfiWorkspaceUnsupportedError);
  assert.deepEqual(paths,['/v1/capabilities']);
});
