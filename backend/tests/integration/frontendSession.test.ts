import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { SessionClient, ApiError } from '../../../frontend/src/lib/api/sessionClient.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb } from '../helpers/testDb.js';
import { users, authSessions } from '../../src/db/schema.js';

describe('Frontend session client against PostgreSQL-backed HTTP',()=>{
  let db:Awaited<ReturnType<typeof getTestDb>>, app:Awaited<ReturnType<typeof createTestApp>>;
  let address:string, cookie='', client:SessionClient;
  const password='Disposable-session-test-123!';
  const transport:typeof fetch=async (path,init)=>{
    const response=await fetch(address+String(path),{...init,headers:{...init?.headers,...(cookie?{cookie}:{})}});
    const next=response.headers.get('set-cookie');
    if(next) cookie=next.split(';')[0]!;
    return response;
  };
  before(async()=>{ db=await getTestDb();app=await createTestApp();address=await app.listen({port:0,host:'127.0.0.1'}); });
  after(async()=>{await app?.close();await closeTestDb();});
  beforeEach(async()=>{
    await resetTestDatabase(db);const owner=await createTestOwner(db,'session@example.com');
    await db.update(users).set({passwordHash:await argon2.hash(password)}).where(eq(users.id,owner.userId));
    cookie='';client=new SessionClient(transport);
  });
  it('rejects anonymous and wrong-password requests',async()=>{
    await assert.rejects(client.me(),{status:401});
    await assert.rejects(client.login('session@example.com','wrong'),{code:'INVALID_CREDENTIALS'});
  });
  it('logs in, bootstraps after reload and logs out with renewed CSRF',async()=>{
    assert.equal((await client.login('session@example.com',password)).displayName,'Test Owner');
    client=new SessionClient(transport);
    assert.equal((await client.me()).email,'session@example.com');
    await client.logout();await assert.rejects(client.me(),{status:401});
  });
  it('recovers from another tab rotating CSRF with a bounded retry',async()=>{
    await client.login('session@example.com',password);
    await transport('/v1/auth/csrf');
    await client.logout();await assert.rejects(client.me(),{status:401});
  });
  it('handles server-expired sessions without trusting local state',async()=>{
    await client.login('session@example.com',password);
    await db.update(authSessions).set({expiresAt:new Date(0)});
    await assert.rejects(client.me(),{status:401});await client.logout();
  });
});

describe('Frontend transport failure boundaries',()=>{
  it('does not bind native fetch to the SessionClient instance',async()=>{
    const original=globalThis.fetch;
    globalThis.fetch=async function(this:unknown) {
      assert.ok(!(this instanceof SessionClient));
      return Response.json({user:{id:'test',email:'test@example.com',displayName:'Test'}});
    };
    try { assert.equal((await new SessionClient().me()).displayName,'Test'); }
    finally {globalThis.fetch=original;}
  });
  it('does not retry uncertain network failures',async()=>{
    let calls=0;
    const client=new SessionClient(async()=>{calls++;throw new TypeError('offline');});
    await assert.rejects(client.login('test@example.com','test'),{status:0});assert.equal(calls,1);
  });
  it('keeps credentialed no-store requests and sanitizes server responses',async()=>{
    const client=new SessionClient(async(_url,init)=>{
      assert.equal(init?.credentials,'include');assert.equal(init?.cache,'no-store');
      return new Response('private database failure',{status:500});
    });
    await assert.rejects(client.me(),(e:unknown)=>e instanceof ApiError&&e.status===500&&!e.message.includes('database'));
  });
  it('rejects malformed success payloads',async()=>{
    const client=new SessionClient(async()=>Response.json({user:{id:'x'}}));
    await assert.rejects(client.me(),{code:'INVALID_RESPONSE'});
  });
  it('limits repeated CSRF rejection to one retry',async()=>{
    let posts=0;
    const client=new SessionClient(async(path)=>{
      if(String(path).endsWith('/csrf')) return Response.json({csrfToken:'test'});
      posts++;return Response.json({error:{code:'INVALID_CSRF_TOKEN'}},{status:403});
    });
    await assert.rejects(client.logout(),{status:403});assert.equal(posts,2);
  });
});
