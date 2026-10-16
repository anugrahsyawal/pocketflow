import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseTransactionAttempt,parseTransactionRecoveryRecord} from '../../../frontend/src/lib/api/transactionAttempt.js';
describe('Transaction create recovery record validation',()=>{
  const ownerId=randomUUID(),pocketId=randomUUID();
  const record=()=>({version:1,ownerId,operation:'create',body:{clientMutationId:randomUUID(),type:'expense',pocketId,
    amount:10000,occurredOn:'2026-09-29',occurredAtLocalTime:'10:15',note:'  exact note  '}});
  it('preserves exact identity, omitted fields, time and whitespace in detached copy',()=>{
    const r=record(),copy=parseTransactionAttempt(r,ownerId);r.body.note='changed';
    assert.equal(copy.body.note,'  exact note  ');assert.equal(copy.body.occurredAtLocalTime,'10:15');
    assert.equal('categoryId' in copy.body,false);assert.equal(copy.body.clientMutationId,r.body.clientMutationId);
    assert.deepEqual(parseTransactionAttempt(copy,ownerId),copy);
  });
  it('accepts income and transfer shapes without client budget attribution',()=>{
    const r=record();const {pocketId:_,...base}=r.body;
    for(const body of [{...r.body,type:'income',incomeSource:'gaji'},
      {...base,type:'transfer',fromPocketId:pocketId,toPocketId:randomUUID(),transferType:'budget-reallocation'}]){
      assert.equal(parseTransactionAttempt({...r,body},ownerId).body.type,body.type);
    }
  });
  it('rejects unknown fields, foreign owners, versions, operations and malformed money/calendar',()=>{
    const r=record();
    for(const patch of [{amount:0},{amount:-1},{amount:0.1},{amount:Infinity},{amount:9007199254740992},
      {occurredOn:'2026-02-30'},{occurredAtLocalTime:'24:01'},{categoryId:null},{budgetPocketId:pocketId},{note:'a'.repeat(501)},
      {fromPocketId:pocketId},{clientMutationId:'bad'}])assert.throws(()=>parseTransactionAttempt({...r,body:{...r.body,...patch}},ownerId));
    for(const patch of [{version:2},{operation:'delete'},{password:'secret'},{ownerId:randomUUID()}])assert.throws(()=>parseTransactionAttempt({...r,...patch},ownerId));
    assert.throws(()=>parseTransactionAttempt(null,ownerId));assert.throws(()=>parseTransactionAttempt(r,randomUUID()));
  });
  it('rejects invalid transfer topology and income/category mixing',()=>{
    const r=record(),{pocketId:_,...base}=r.body;
    for(const body of [{...base,type:'transfer',fromPocketId:pocketId,toPocketId:pocketId,transferType:'normal'},
      {...base,type:'transfer',fromPocketId:pocketId,toPocketId:randomUUID(),transferType:'unknown'},
      {...r.body,type:'income',categoryId:randomUUID()},{...r.body,type:'income',incomeSource:'unknown'}])assert.throws(()=>parseTransactionAttempt({...r,body},ownerId));
  });
});

describe('Shared lifecycle recovery record validation',()=>{
  const ownerId=randomUUID();
  const record=()=>({version:1,ownerId,operation:'archive',transactionId:randomUUID(),body:{clientMutationId:randomUUID(),expectedRevision:2}});
  it('preserves immutable archive/restore identity and revision in detached records',()=>{
    for(const operation of ['archive','restore']){
      const original={...record(),operation},copy=parseTransactionRecoveryRecord(original,ownerId);
      assert.notEqual(copy.operation,'create');if(copy.operation==='create')throw new Error('Unexpected create record');
      original.body.expectedRevision=99;original.transactionId=randomUUID();
      assert.equal(copy.body.expectedRevision,2);assert.notEqual(copy.transactionId,original.transactionId);
      assert.deepEqual(parseTransactionRecoveryRecord(copy,ownerId),copy);
    }
  });
  it('rejects unsupported operations, foreign owner, unsafe revisions and extra fields',()=>{
    const r=record();
    for(const patch of [{operation:'delete'},{operation:'edit'},{version:2},{ownerId:randomUUID()},
      {transactionId:'invalid'},{password:'secret'}])assert.throws(()=>parseTransactionRecoveryRecord({...r,...patch},ownerId));
    for(const patch of [{expectedRevision:0},{expectedRevision:1.5},{expectedRevision:NaN},{expectedRevision:9007199254740992},
      {clientMutationId:'invalid'},{amount:100},{confirmPermanentDelete:true}])assert.throws(()=>parseTransactionRecoveryRecord({...r,body:{...r.body,...patch}},ownerId));
    assert.throws(()=>parseTransactionAttempt(r,ownerId));
    assert.throws(()=>parseTransactionRecoveryRecord(r,randomUUID()));
  });
  it('continues reading unchanged version-one create records and rejects malformed lifecycle hybrids',()=>{
    const r={version:1,ownerId,operation:'create',body:{clientMutationId:randomUUID(),type:'income',pocketId:randomUUID(),amount:1000,occurredOn:'2026-09-30',occurredAtLocalTime:'12:00'}};
    assert.deepEqual(parseTransactionRecoveryRecord(r,ownerId),parseTransactionAttempt(r,ownerId));
    assert.throws(()=>parseTransactionRecoveryRecord({...record(),body:r.body},ownerId));
    assert.throws(()=>parseTransactionRecoveryRecord({...r,transactionId:randomUUID()},ownerId));
  });
});
