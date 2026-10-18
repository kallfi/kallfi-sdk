import assert from 'node:assert/strict';
import test from 'node:test';
import type { DetailedRequestOptions } from '../dist/client.js';
import { Kallfi, KallfiApiError, KallfiNetworkError, KallfiTimeoutError } from '../dist/client.js';
const workspace='00000000-0000-4000-8000-000000000001';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
test('detailed transport returns bounded metadata while existing request and resources remain body-only',async()=>{
 let headers:Record<string,string>|undefined;let url='';
 const client=new Kallfi({apiKey:'private-fixture',workspaceId:workspace,fetch:async(input,init)=>{if(String(input).endsWith('/v1/capabilities'))return json({protocolVersion:1,workspaceSelection:'account-principal-v1',selectorHeader:'X-Kallfi-Workspace-ID',omittedWorkspace:'personal',explicitWorkspaceScopes:['organization-runtime'],accountOperationWorkspace:'personal-only'});url=String(input);headers=init!.headers as Record<string,string>;assert.equal(init!.redirect,'manual');return json({value:1},202,{'x-request-id':'req_1','retry-after':'3','location':'/v1/operations/op_1'});}});
 const result=await client.requestDetailed<{value:number}>('GET','/v1/operations/op_1');
 assert.equal(url,'https://acr.kallfi.com/v1/operations/op_1');assert.equal(result.status,202);assert.equal(result.data.value,1);
 assert.equal(result.requestId,'req_1');assert.equal(result.retryAfter,'3');assert.equal(result.location,'https://acr.kallfi.com/v1/operations/op_1');assert.equal(result.contentType,'application/json');
 assert.equal(headers!['X-Kallfi-Workspace-ID'],workspace);assert.equal(Object.keys(headers!).filter(k=>k.toLowerCase()==='x-kallfi-workspace-id').length,1);
 assert.deepEqual(await client.request('GET','/v1/operations/op_1'),{value:1});
});
test('surface host contract admits four registered origins and rejects mismatch or credential forwarding',()=>{
 for(const baseUrl of ['https://acr.kallfi.com','https://acr.kallfi.red','https://api.kallfi.com','https://api.kallfi.red'])assert.doesNotThrow(()=>new Kallfi({apiKey:'private-fixture',baseUrl}));
 for(const baseUrl of ['https://evil.test','http://acr.kallfi.com','https://user:pass@acr.kallfi.com','https://acr.kallfi.com/path','https://acr.kallfi.com?x=y','https://acr.kallfi.com:444'])assert.throws(()=>new Kallfi({apiKey:'private-fixture',baseUrl}),TypeError);
 assert.throws(()=>new Kallfi({apiKey:'private-fixture',surface:'nsfw-disabled',baseUrl:'https://acr.kallfi.red'}),TypeError);
 assert.throws(()=>new Kallfi({apiKey:'private-fixture',workspaceId:'invalid'}),TypeError);
});
test('omitted selector is absent and cannot be overridden per request',async()=>{
 const client=new Kallfi({apiKey:'private-fixture',fetch:async(_input,init)=>{const headers=init!.headers as Record<string,string>;assert.equal(Object.keys(headers).some(k=>k.toLowerCase()==='x-kallfi-workspace-id'),false);return json({});}});
 await client.requestDetailed('GET','/v1/operations/op_1',{headers:{'X-Kallfi-Workspace-ID':workspace}} as unknown as DetailedRequestOptions);
});
test('manual redirects and login HTML fail closed with no leaked body or redirect metadata',async()=>{
 for(const response of [new Response(null,{status:302,headers:{location:'https://login.evil.test/?token=private'}}),new Response('<html>private login token</html>',{headers:{'content-type':'text/html'}})]){
  let calls=0;const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>{calls++;return response;}});
  await assert.rejects(()=>client.request('GET','/v1/operations/op_1'),(error:unknown)=>error instanceof KallfiApiError&&!error.message.includes('private'));assert.equal(calls,1);
 }
});
test('bounded stream rejects oversized and invalid JSON responses without raw diagnostics',async()=>{
 let canceled=false;const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(9));},cancel(){canceled=true;}});
 const client=new Kallfi({apiKey:'private-fixture',maxResponseBytes:8,fetch:async()=>new Response(body,{headers:{'content-type':'application/json'}})});
 await assert.rejects(()=>client.request('GET','/v1/operations/op_1'),(e:unknown)=>e instanceof KallfiApiError&&e.code==='response_too_large');assert.equal(canceled,true);
 const malformed=new Kallfi({apiKey:'private-fixture',fetch:async()=>new Response('private-invalid-json',{headers:{'content-type':'application/json'}})});
 await assert.rejects(()=>malformed.request('GET','/v1/operations/op_1'),(e:unknown)=>e instanceof KallfiApiError&&e.code==='invalid_json_response'&&!e.message.includes('private'));
});
test('request timeout bounds a stalled body and a fetch implementation ignoring AbortSignal',async()=>{
 for(const fetcher of [async()=>new Promise<Response>(()=>{}),async()=>new Response(new ReadableStream<Uint8Array>({start(){}}),{headers:{'content-type':'application/json'}})]){
  const started=Date.now();const client=new Kallfi({apiKey:'private-fixture',timeoutMs:15,fetch:fetcher});
  await assert.rejects(()=>client.request('GET','/v1/operations/op_1'),KallfiTimeoutError);assert.ok(Date.now()-started<500);
 }
});
test('explicit abort is distinct from timeout, forwards no secret reason and removes listeners',async()=>{
 const controller=new AbortController();let added=0,removed=0;
 const add=controller.signal.addEventListener.bind(controller.signal);const remove=controller.signal.removeEventListener.bind(controller.signal);
 controller.signal.addEventListener=((...args:Parameters<AbortSignal['addEventListener']>)=>{added++;return add(...args);}) as AbortSignal['addEventListener'];
 controller.signal.removeEventListener=((...args:Parameters<AbortSignal['removeEventListener']>)=>{removed++;return remove(...args);}) as AbortSignal['removeEventListener'];
 const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>new Promise<Response>(()=>{})});
 const pending=client.requestDetailed('GET','/v1/operations/op_1',{signal:controller.signal});controller.abort('private-secret-reason');
 await assert.rejects(()=>pending,(e:unknown)=>e instanceof KallfiNetworkError&&!(e instanceof KallfiTimeoutError)&&!e.message.includes('private')&&e.cause===undefined);
 assert.equal(added,removed);
});
test('all mutation requests require stable idempotency and never automatically retry',async()=>{
 let calls=0;const client=new Kallfi({apiKey:'private-fixture',fetch:async(_url,init)=>{calls++;assert.equal((init!.headers as Record<string,string>)['Idempotency-Key'],'fixed-intent');return json({error:{code:'rate_limited',message:'private server detail'}},429);}});
 await assert.rejects(()=>client.requestDetailed('POST','/v1/product-actions',{body:{action:'read'}}),TypeError);assert.equal(calls,0);
 await assert.rejects(()=>client.requestDetailed('POST','/v1/product-actions',{body:{action:'read'},idempotencyKey:'fixed-intent'}),(e:unknown)=>e instanceof KallfiApiError&&e.code==='rate_limited'&&!e.message.includes('private'));assert.equal(calls,1);
});
test('operation wait deadline includes in-flight request/body and removes successful sleep abort listeners',async()=>{
 const client=new Kallfi({apiKey:'private-fixture',fetch:async()=>new Promise<Response>(()=>{})});const start=Date.now();
 await assert.rejects(()=>client.operations.wait('op_1',{timeoutMs:20,intervalMs:100}),KallfiTimeoutError);assert.ok(Date.now()-start<500);
 const controller=new AbortController();let active=0;
 const add=controller.signal.addEventListener.bind(controller.signal);const remove=controller.signal.removeEventListener.bind(controller.signal);
 controller.signal.addEventListener=((...args:Parameters<AbortSignal['addEventListener']>)=>{active++;return add(...args);}) as AbortSignal['addEventListener'];
 controller.signal.removeEventListener=((...args:Parameters<AbortSignal['removeEventListener']>)=>{active--;return remove(...args);}) as AbortSignal['removeEventListener'];
 let calls=0;const done=new Kallfi({apiKey:'private-fixture',fetch:async()=>json({status:++calls===1?'running':'succeeded'})});
 await done.operations.wait('op_1',{timeoutMs:1000,intervalMs:100,signal:controller.signal});assert.equal(calls,2);assert.equal(active,0);
});
