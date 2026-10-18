import assert from 'node:assert/strict';
import test from 'node:test';
import { Kallfi, KallfiWorkspaceUnsupportedError, KallfiTimeoutError, KallfiNetworkError } from '../dist/client.js';
const workspaceId='00000000-0000-4000-8000-000000000001';
const capability={protocolVersion:1,workspaceSelection:'account-principal-v1',selectorHeader:'X-Kallfi-Workspace-ID',omittedWorkspace:'personal',explicitWorkspaceScopes:['organization-runtime'],accountOperationWorkspace:'personal-only'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
test('explicit workspace probes every request without auth/selector/idempotency/cache before dispatch',async()=>{
 let probes=0,business=0;const order:string[]=[];
 const client=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async(url,init)=>{
  const h=init!.headers as Record<string,string>;
  if(String(url).endsWith('/v1/capabilities')){probes++;order.push('probe');assert.deepEqual(h,{Accept:'application/json'});assert.equal(init!.method,'GET');assert.equal(init!.cache,'no-store');assert.equal(init!.redirect,'manual');return json(capability);}
  business++;order.push('business');assert.equal(h['X-Kallfi-Workspace-ID'],workspaceId);return json({});}});
 await client.operation('getSoul',{path:{soul_id:'soul_owned'}});
 await client.operation('updateSoul',{path:{soul_id:'soul_owned'},body:{}},{idempotencyKey:'fixed'});
 assert.equal(probes,2);assert.equal(business,2);assert.deepEqual(order,['probe','business','probe','business']);
});
test('old missing HTML redirect unsupported servers dispatch no explicit-workspace reads or mutations',async()=>{
 for(const response of [()=>json({},404),()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}}),()=>new Response(null,{status:302,headers:{location:'https://login.example'}}),()=>json(capability,503)]){
  let calls=0;const client=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async(url)=>{calls++;assert.ok(String(url).endsWith('/v1/capabilities'));return response();}});
  for(const invoke of [()=>client.operation('getSoul',{path:{soul_id:'soul_owned'}}),()=>client.operation('updateSoul',{path:{soul_id:'soul_owned'},body:{}},{idempotencyKey:'fixed'})])await assert.rejects(invoke,(e:unknown)=>e instanceof KallfiWorkspaceUnsupportedError&&e.code==='workspace_capability_unsupported'&&!('status'in e));
  assert.equal(calls,2);
 }
});
test('strict capability mismatch extra fields and excessive body cannot attest server support',async()=>{
 for(const value of [{...capability,protocolVersion:2},{...capability,selectorHeader:'other'},{...capability,explicitWorkspaceScopes:['organization-runtime','account']},{...capability,extra:true},{...capability,padding:'x'.repeat(5000)}]){
  let business=0;const client=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async(url)=>{if(!String(url).endsWith('/v1/capabilities'))business++;return json(value);}});
  await assert.rejects(()=>client.souls.retrieve('soul_owned'),KallfiWorkspaceUnsupportedError);assert.equal(business,0);
 }
});
test('Personal omitted workspace never probes capability and account scope rejects selector before any request',async()=>{
 let calls=0;const plain=new Kallfi({apiKey:'private-fixture',fetch:async(url)=>{calls++;assert.ok(!String(url).endsWith('/v1/capabilities'));return json({});}});
 await plain.operation('getAccountSoul',{body:{}},{idempotencyKey:'fixed'});assert.equal(calls,1);
 const selected=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async()=>{throw Error('must not request');}});
 await assert.rejects(()=>selected.operation('getAccountSoul',{body:{}},{idempotencyKey:'fixed'}),TypeError);
});
test('capability and business body share one deadline with abort and no fallback',async()=>{
 let business=0;const client=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async(url)=>{
  if(String(url).endsWith('/v1/capabilities')){await new Promise(resolve=>setTimeout(resolve,12));return json(capability);}business++;return new Promise<Response>(()=>{});}});
 const start=Date.now();await assert.rejects(()=>client.requestDetailed('GET','/v1/souls/soul_owned',{timeoutMs:25}),KallfiTimeoutError);assert.ok(Date.now()-start<500);assert.equal(business,1);
 const controller=new AbortController();let dispatched=0;const aborted=new Kallfi({apiKey:'private-fixture',workspaceId,fetch:async()=>{dispatched++;controller.abort();return Promise.reject(new Error('private'));}});
 await assert.rejects(()=>aborted.requestDetailed('GET','/v1/souls/soul_owned',{signal:controller.signal}),KallfiNetworkError);assert.equal(dispatched,1);
});
