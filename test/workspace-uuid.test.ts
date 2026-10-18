import assert from 'node:assert/strict';
import test from 'node:test';
import { Kallfi } from '../dist/client.js';
const cases = [
  {
    "name": "version-0",
    "value": "018f47a2-7b3c-0123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-1",
    "value": "018f47a2-7b3c-1123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-2",
    "value": "018f47a2-7b3c-2123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-3",
    "value": "018f47a2-7b3c-3123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-4",
    "value": "018f47a2-7b3c-4123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-5",
    "value": "018f47a2-7b3c-5123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-6",
    "value": "018f47a2-7b3c-6123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-7",
    "value": "018f47a2-7b3c-7123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-8",
    "value": "018f47a2-7b3c-8123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "version-9",
    "value": "018f47a2-7b3c-9123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-a",
    "value": "018f47a2-7b3c-a123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-b",
    "value": "018f47a2-7b3c-b123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-c",
    "value": "018f47a2-7b3c-c123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-d",
    "value": "018f47a2-7b3c-d123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-e",
    "value": "018f47a2-7b3c-e123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "version-f",
    "value": "018f47a2-7b3c-f123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-0",
    "value": "018f47a2-7b3c-7123-0123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-1",
    "value": "018f47a2-7b3c-7123-1123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-2",
    "value": "018f47a2-7b3c-7123-2123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-3",
    "value": "018f47a2-7b3c-7123-3123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-4",
    "value": "018f47a2-7b3c-7123-4123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-5",
    "value": "018f47a2-7b3c-7123-5123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-6",
    "value": "018f47a2-7b3c-7123-6123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-7",
    "value": "018f47a2-7b3c-7123-7123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-8",
    "value": "018f47a2-7b3c-7123-8123-123456789abc",
    "accepted": true
  },
  {
    "name": "variant-9",
    "value": "018f47a2-7b3c-7123-9123-123456789abc",
    "accepted": true
  },
  {
    "name": "variant-a",
    "value": "018f47a2-7b3c-7123-a123-123456789abc",
    "accepted": true
  },
  {
    "name": "variant-b",
    "value": "018f47a2-7b3c-7123-b123-123456789abc",
    "accepted": true
  },
  {
    "name": "variant-c",
    "value": "018f47a2-7b3c-7123-c123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-d",
    "value": "018f47a2-7b3c-7123-d123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-e",
    "value": "018f47a2-7b3c-7123-e123-123456789abc",
    "accepted": false
  },
  {
    "name": "variant-f",
    "value": "018f47a2-7b3c-7123-f123-123456789abc",
    "accepted": false
  },
  {
    "name": "uppercase",
    "value": "018F47A2-7B3C-7123-A123-123456789ABC",
    "accepted": true
  },
  {
    "name": "compact",
    "value": "018f47a27b3c71238123123456789abc",
    "accepted": false
  },
  {
    "name": "braced",
    "value": "{018f47a2-7b3c-7123-8123-123456789abc}",
    "accepted": false
  },
  {
    "name": "urn",
    "value": "urn:uuid:018f47a2-7b3c-7123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "nil",
    "value": "00000000-0000-0000-0000-000000000000",
    "accepted": false
  },
  {
    "name": "max",
    "value": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "accepted": false
  },
  {
    "name": "leading-space",
    "value": " 018f47a2-7b3c-7123-8123-123456789abc",
    "accepted": false
  },
  {
    "name": "invalid-character",
    "value": "018f47a2-7b3c-7123-8123-123456789abz",
    "accepted": false
  },
  {
    "name": "empty",
    "value": "",
    "accepted": false
  }
];
test('workspace constructor follows shared cross-language canonical UUID vectors without dispatch', () => {
 let calls=0;
 for(const item of cases) {
  const construct=()=>new Kallfi({apiKey:'fixture-only',workspaceId:item.value,fetch:async()=>{calls++;throw new Error('unexpected dispatch');}});
  if(item.accepted) assert.doesNotThrow(construct,item.name); else assert.throws(construct,TypeError,item.name);
 }
 assert.equal(calls,0);
});
