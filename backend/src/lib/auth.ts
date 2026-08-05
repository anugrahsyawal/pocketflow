import crypto from 'node:crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { AppError } from './errors.js';
import { getDb } from '../db/client.js';
import { authSessions, users } from '../db/schema.js';

export interface UserSessionPayload {
  id: string;
  userId: string;
  csrfTokenHash: string;
  expiresAt: Date;
}

export interface UserPayload {
  id: string;
  email: string;
  displayName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
    session?: UserSessionPayload;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureTokens(): {
  sessionToken: string;
  csrfToken: string;
  tokenHash: string;
  csrfTokenHash: string;
} {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(sessionToken);
  const csrfTokenHash = hashToken(csrfToken);

  return {
    sessionToken,
    csrfToken,
    tokenHash,
    csrfTokenHash,
  };
}

export async function authenticateRequest(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sid = request.cookies.sid;

  if (!sid || sid.trim() === '') {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const tokenHash = hashToken(sid);
  const db = getDb();
  const now = new Date();

  const results = await db
    .select({
      sessionId: authSessions.id,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      csrfTokenHash: authSessions.csrfTokenHash,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now)
      )
    )
    .limit(1);

  if (results.length === 0) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const sessionRow = results[0];

  request.user = {
    id: sessionRow.userId,
    email: sessionRow.email,
    displayName: sessionRow.displayName,
  };

  request.session = {
    id: sessionRow.sessionId,
    userId: sessionRow.userId,
    csrfTokenHash: sessionRow.csrfTokenHash,
    expiresAt: sessionRow.expiresAt,
  };

  // Update last_used_at asynchronously
  db.update(authSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(authSessions.id, sessionRow.sessionId))
    .catch(() => {
      // Non-blocking log catch
    });
}

export async function validateCsrfToken(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.session) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const rawCsrfHeader = request.headers['x-csrf-token'];
  const csrfHeader = Array.isArray(rawCsrfHeader) ? rawCsrfHeader[0] : rawCsrfHeader;

  if (!csrfHeader || typeof csrfHeader !== 'string' || csrfHeader.trim() === '') {
    throw new AppError('Invalid or missing CSRF token', 403, 'INVALID_CSRF_TOKEN');
  }

  const headerHash = hashToken(csrfHeader.trim());

  const hashBufferA = Buffer.from(headerHash, 'utf8');
  const hashBufferB = Buffer.from(request.session.csrfTokenHash, 'utf8');

  if (hashBufferA.length !== hashBufferB.length || !crypto.timingSafeEqual(hashBufferA, hashBufferB)) {
    throw new AppError('Invalid or missing CSRF token', 403, 'INVALID_CSRF_TOKEN');
  }
}
