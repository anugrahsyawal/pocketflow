import { describe,it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseCategoryAttempt } from '../../../frontend/src/lib/api/categoryAttempt.js';
describe('Category recovery record validation',()=>{
  const ownerId=randomUUID();
  const record=()=>({version:1,ownerId,body:{clientMutationId:randomUUID(),pocketId:randomUUID(),name:'Bus',emoji:'🚌'}});
  it('returns a detached canonical allowlisted payload',()=>{
    const input=record(),parsed=parseCategoryAttempt({...input,password:'must not persist'},ownerId);
    input.body.name='Changed';assert.equal(parsed.body.name,'Bus');assert.equal('password' in parsed,false);
  });
  it('rejects foreign owners, versions, malformed IDs and missing records',()=>{
    assert.throws(()=>parseCategoryAttempt(record(),randomUUID()));
    assert.throws(()=>parseCategoryAttempt({...record(),version:2},ownerId));
    assert.throws(()=>parseCategoryAttempt({...record(),body:{...record().body,pocketId:'foreign/path'}},ownerId));
    assert.throws(()=>parseCategoryAttempt(null,ownerId));
  });
  it('never silently changes whitespace or invalid fields in recovered attempts',()=>{
    assert.throws(()=>parseCategoryAttempt({...record(),body:{...record().body,name:' Bus '}},ownerId));
    assert.throws(()=>parseCategoryAttempt({...record(),body:{...record().body,emoji:' '}},ownerId));
    assert.throws(()=>parseCategoryAttempt({...record(),body:{...record().body,name:'x'.repeat(101)}},ownerId));
  });
});
