import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Kallfi, KallfiNetworkError } from '../dist/client.js';
import { KALLFI_OPERATIONS } from '../dist/operations.js';
const json=()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}});
test('all canonical operations dispatch generated method/path/body only through detailed transport',async()=>{
 const canonical=JSON.parse(readFileSync(new URL('../openapi/openapi.v1.json',import.meta.url),'utf8')) as {paths:Record<string,Record<string,{operationId?:string}>>};
 const ids=Object.values(canonical.paths).flatMap(item=>Object.values(item).flatMap(operation=>operation.operationId?[operation.operationId]:[]));
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(Object.keys(KALLFI_OPERATIONS).sort(),ids.sort());
 for(const [operationId,operation] of Object.entries(KALLFI_OPERATIONS)){
  const calls:Array<{url:string;init:RequestInit}>=[];
  const client=new Kallfi({apiKey:'private-fixture',fetch:async(url,init)=>{calls.push({url:String(url),init:init!});return json();}});
  const path=Object.fromEntries(operation.pathParameters.map(parameter=>[parameter.name,parameter.name==='soul_id'?'soul_owned':'op_owned']));
  const args={...(Object.keys(path).length?{path}:{}),...(operation.bodyRequired?{body:{fixture:true}}:{})};
  const result=await client.operation(operationId as keyof typeof KALLFI_OPERATIONS,args,{idempotencyKey:'fixed-intent'});
  assert.equal(result.status,200);assert.equal(calls.length,1);
  assert.equal(calls[0]!.init.method,operation.method);assert.equal(calls[0]!.init.redirect,'manual');
  let expected:string=operation.path;for(const [name,value] of Object.entries(path))expected=expected.replace(`{${name}}`,encodeURIComponent(value));
  assert.equal(calls[0]!.url,'https://acr.kallfi.com'+expected);
  if(operation.bodyRequired)assert.equal(calls[0]!.init.body,JSON.stringify({fixture:true}));
  if(operation.method!=='GET')assert.equal((calls[0]!.init.headers as Record<string,string>)['Idempotency-Key'],'fixed-intent');
 }
});
test('account operation rejects configured workspace without fetch while workspace operation retains single selector',async()=>{
 let calls=0;const client=new Kallfi({apiKey:'private-fixture',workspaceId:'00000000-0000-4000-8000-000000000001',fetch:async(url)=>{if(String(url).endsWith('/v1/capabilities'))return new Response(JSON.stringify({protocolVersion:1,workspaceSelection:'account-principal-v1',selectorHeader:'X-Kallfi-Workspace-ID',omittedWorkspace:'personal',explicitWorkspaceScopes:['organization-runtime'],accountOperationWorkspace:'personal-only'}),{headers:{'content-type':'application/json'}});calls++;return json();}});
 await assert.rejects(()=>client.operation('getAccountSoul',{body:{}},{idempotencyKey:'fixed'}),TypeError);assert.equal(calls,0);
 await client.operation('getSoul',{path:{soul_id:'soul_owned'}});assert.equal(calls,1);
});
test('operation boundaries reject unknown args/query/path/missing required body or path before fetch',async()=>{
 let calls=0;const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>{calls++;return json();}});
 for(const invoke of [
  ()=>client.operation('unknown' as never),()=>client.operation('getSoul'),
  ()=>client.operation('getSoul',{path:{soul_id:'soul_owned',other:'x'}}),
  ()=>client.operation('getSoul',{path:{soul_id:'soul_owned'},query:{unknown:'x'}}),
  ()=>client.operation('createSoul',{}, {idempotencyKey:'fixed'}),
  ()=>client.operation('getSoul',{path:{soul_id:'soul_owned'},body:{}}),
  ()=>client.operation('getSoul',{...{headers:{workspace:'x'}},path:{soul_id:'soul_owned'}}),
 ])await assert.rejects(invoke,TypeError);
 assert.equal(calls,0);
});
test('exact and repeatedly encoded dot traversal rejects across operation, legacy helper and direct transport before normalization',async()=>{
 let calls=0;const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>{calls++;return json();}});
 for(const value of ['.','..','%2e','%2e%2e','%252e%252e','prefix/../secret','prefix%2f%2e%2e%2fsecret','prefix\\..\\secret']){
  await assert.rejects(()=>client.operation('getSoul',{path:{soul_id:value}}),TypeError);
  assert.throws(()=>client.souls.retrieve(value),TypeError);
 }
 for(const path of ['/v1/souls/../account','/v1/souls/%2e%2e/account','/v1/souls/%252e%252e/account'])await assert.rejects(()=>client.requestDetailed('GET',path),TypeError);
 assert.equal(calls,0);
});
test('canonical idempotency boundary accepts128 and rejects129 before fetch',async()=>{
 let calls=0;const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>{calls++;return json();}});
 await client.operation('getAccountSoul',{body:{}},{idempotencyKey:'a'.repeat(128)});assert.equal(calls,1);
 await assert.rejects(()=>client.operation('getAccountSoul',{body:{}},{idempotencyKey:'a'.repeat(129)}),TypeError);assert.equal(calls,1);
});
test('synchronous custom-fetch abort plus rejecting promise is observed with no unhandled rejection',async()=>{
 const signal=new AbortController();const unhandled:unknown[]=[];const listener=(reason:unknown)=>unhandled.push(reason);process.on('unhandledRejection',listener);
 try{
  const client=new Kallfi({apiKey:'private-fixture',fetch:()=>{signal.abort();return Promise.reject(new Error('private transport value'));}});
  await assert.rejects(()=>client.requestDetailed('GET','/v1/operations/op',{signal:signal.signal}),KallfiNetworkError);
  await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(unhandled,[]);
 }finally{process.removeListener('unhandledRejection',listener);}
});
