import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseTransactionRecoveryRecord,editAttemptRequest,type TransactionEditAttempt} from '../../../frontend/src/lib/api/transactionAttempt.js';

describe('Edit recovery record',()=>{
 const ownerId=randomUUID();
 const record=():TransactionEditAttempt=>({version:1,ownerId,operation:'edit',transactionId:randomUUID(),transactionType:'expense',body:{clientMutationId:randomUUID(),expectedRevision:2,note:'  original  ',categoryId:null}});
 it('preserves exact PATCH identity, nulls, omissions and detached copy',()=>{
  const r=record(),copy=parseTransactionRecoveryRecord(r,ownerId) as TransactionEditAttempt;
  assert.deepEqual(copy,r);r.body.note='changed';assert.equal(copy.body.note,'  original  ');
  assert.equal('amount' in copy.body,false);assert.equal(copy.body.categoryId,null);
  const request=editAttemptRequest(copy);assert.equal(request.changes.note,'  original  ');assert.equal(request.expectedRevision,2);
  assert.deepEqual(parseTransactionRecoveryRecord(copy,ownerId),copy);
 });
 it('supports income clearing and transfer edits while keeping type immutable',()=>{
  for(const [transactionType,changes] of [['income',{incomeSource:null}],['transfer',{amount:30000,transferType:'budget-reallocation'}]] as const){
   const r=record();assert.equal(parseTransactionRecoveryRecord({...r,transactionType,body:{clientMutationId:r.body.clientMutationId,expectedRevision:2,...changes}},ownerId).operation,'edit');
  }
 });
 it('rejects malformed and foreign records without guessing defaults',()=>{
  const r=record();
  for(const patch of [{version:2},{ownerId:randomUUID()},{transactionType:'other'},{transactionId:'bad'},{extra:true},{body:{clientMutationId:r.body.clientMutationId,expectedRevision:2}},{body:{...r.body,expectedRevision:0}},{body:{...r.body,budgetPocketId:randomUUID()}},{body:{...r.body,type:'income'}},{body:{...r.body,amount:undefined}},{body:{...r.body,incomeSource:null}}])assert.throws(()=>parseTransactionRecoveryRecord({...r,...patch},ownerId));
 });
 it('preserves legacy records and rejects edit fields smuggled into old variants',()=>{
  const r=record();
  for(const operation of ['archive','restore','delete'] as const){
   const old={version:1,ownerId,operation,transactionId:r.transactionId,body:{clientMutationId:r.body.clientMutationId,expectedRevision:2,...(operation==='delete'?{confirmPermanentDelete:true}:{})}};
   assert.deepEqual(parseTransactionRecoveryRecord(old,ownerId),old);
   assert.throws(()=>parseTransactionRecoveryRecord({...old,transactionType:'expense'},ownerId));
   assert.throws(()=>parseTransactionRecoveryRecord({...old,body:{...old.body,note:'edit'}},ownerId));
  }
 });
});
