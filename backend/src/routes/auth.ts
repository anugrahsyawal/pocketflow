import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import argon2 from 'argon2';
import { eq, and, isNull } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import { getDb } from '../db/client.js';
import { users, authSessions } from '../db/schema.js';
import {
  authenticateRequest,
  validateCsrfToken,
  generateSecureTokens,
  hashToken,
} from '../lib/auth.js';
import { loadAndValidateEnv } from '../config/env.js';

export async function authRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const config = loadAndValidateEnv();

  // GET /v1/auth/csrf
  fastify.get(
    '/v1/auth/csrf',
    {
      preHandler: [authenticateRequest],
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['csrfToken'],
            properties: {
              csrfToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const db = getDb();
      const newCsrfToken = generateSecureTokens().csrfToken;
      const newCsrfTokenHash = hashToken(newCsrfToken);

      await db
        .update(authSessions)
        .set({ csrfTokenHash: newCsrfTokenHash })
        .where(eq(authSessions.id, request.session!.id));

      return reply.status(200).send({ csrfToken: newCsrfToken });
    }
  );

  // POST /v1/auth/login
  fastify.post(
    '/v1/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['user', 'csrfToken'],
            properties: {
              user: {
                type: 'object',
                required: ['id', 'email', 'displayName'],
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  displayName: { type: 'string' },
                },
              },
              csrfToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };
      const normalizedEmail = email.toLowerCase().trim();

      const db = getDb();
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (userRows.length === 0) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const user = userRows[0];

      const isPasswordValid = await argon2.verify(user.passwordHash, password);

      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Session rotation: revoke any active session of this user
      const now = new Date();
      await db
        .update(authSessions)
        .set({ revokedAt: now })
        .where(and(eq(authSessions.userId, user.id), isNull(authSessions.revokedAt)));

      // Generate new secure tokens (30 days expiry)
      const { sessionToken, csrfToken, tokenHash, csrfTokenHash } = generateSecureTokens();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(authSessions).values({
        userId: user.id,
        tokenHash,
        csrfTokenHash,
        expiresAt,
      });

      // Set secure HttpOnly cookie
      reply.setCookie('sid', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: config.nodeEnv === 'production',
        expires: expiresAt,
      });

      return reply.status(200).send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        csrfToken,
      });
    }
  );

  // POST /v1/auth/logout
  fastify.post(
    '/v1/auth/logout',
    {
      preHandler: [authenticateRequest, validateCsrfToken],
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['message'],
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const db = getDb();

      if (request.session) {
        await db
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.id, request.session.id));
      }

      reply.clearCookie('sid', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: config.nodeEnv === 'production',
      });

      return reply.status(200).send({ message: 'Logged out successfully' });
    }
  );

  // GET /v1/me
  fastify.get(
    '/v1/me',
    {
      preHandler: [authenticateRequest],
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['user'],
            properties: {
              user: {
                type: 'object',
                required: ['id', 'email', 'displayName'],
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  displayName: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(200).send({
        user: request.user!,
      });
    }
  );
}
