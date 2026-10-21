import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sinkingPreferenceKey,parseSinkingExclusions,changeSinkingExclusion} from '../../../frontend/src/lib/api/sinkingPreferences.js';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
test('preferences isolate owners and normalize validated local UUIDs',()=>{
 assert.notEqual(sinkingPreferenceKey(a),sinkingPreferenceKey(b));
 assert.deepEqual(parseSinkingExclusions(null),[]);
 assert.deepEqual(parseSinkingExclusions(JSON.stringify([b,a,a])),[a,b]);
 assert.deepEqual(changeSinkingExclusion([a],b,false),[a,b]);
 assert.deepEqual(changeSinkingExclusion([a,b],a,true),[b]);
});
test('corrupt, legacy IDs and over-limit preferences are rejected',()=>{
 for(const raw of ['{','null','{}','["cash"]',JSON.stringify(Array(101).fill(a))]){
  assert.throws(()=>parseSinkingExclusions(raw));
 }
 assert.throws(()=>sinkingPreferenceKey('demo-owner'));
});
