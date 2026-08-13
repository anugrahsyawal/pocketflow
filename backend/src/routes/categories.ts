import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authenticateRequest, validateCsrfToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import {
  validateUuidV4,
  trimAndValidateString,
} from '../lib/validation.js';
import {
  computeCanonicalRequestHash,
  findIdempotencyRecord,
  parseReplayEnvelope,
} from '../lib/idempotency.js';
import { getDb } from '../db/client.js';
import {
  categories,
  pockets,
  idempotencyRecords,
} from '../db/schema.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  // GET /v1/categories
  app.get('/v1/categories', { preHandler: [authenticateRequest] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const query = req.query as any;

    // Validate query parameters
    const allowedQueryParams = new Set(['includeArchived', 'pocketId']);
    if (query && typeof query === 'object') {
      for (const q of Object.keys(query)) {
        if (!allowedQueryParams.has(q)) {
          throw new AppError(`Unknown query parameter '${q}'`, 400, 'INVALID_INPUT');
        }
      }
    }

    let includeArchived = false;
    if (query?.includeArchived !== undefined) {
      if (query.includeArchived === 'true') {
        includeArchived = true;
      } else if (query.includeArchived === 'false') {
        includeArchived = false;
      } else {
        throw new AppError("Query parameter 'includeArchived' must be 'true' or 'false'", 400, 'INVALID_INPUT');
      }
    }

    let filterPocketId: string | undefined;
    if (query?.pocketId !== undefined) {
      filterPocketId = validateUuidV4(query.pocketId, 'pocketId');
    }

    const db = getDb();

    // If filterPocketId supplied, check if pocket belongs to user (ISO-06, ISO-07)
    if (filterPocketId) {
      const pocketRows = await db
        .select()
        .from(pockets)
        .where(and(eq(pockets.id, filterPocketId), eq(pockets.userId, user.id)))
        .limit(1);

      if (pocketRows.length === 0) {
        // Return empty list 200 OK without exposing existence
        return reply.status(200).send({ categories: [] });
      }
    }

    // Query categories ordered by pocket_id ASC, is_default DESC, created_at ASC, name ASC
    const conditions = [eq(categories.userId, user.id)];
    if (filterPocketId) {
      conditions.push(eq(categories.pocketId, filterPocketId));
    }
    if (!includeArchived) {
      conditions.push(eq(categories.isArchived, false));
    }

    const categoryRows = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(
        asc(categories.pocketId),
        desc(categories.isDefault),
        asc(categories.createdAt),
        asc(categories.name)
      );

    const formattedCategories = categoryRows.map((row) => ({
      id: row.id,
      pocketId: row.pocketId,
      name: row.name,
      emoji: row.emoji,
      isDefault: row.isDefault,
      isActive: row.isActive,
      isArchived: row.isArchived,
      revision: row.revision,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));

    return reply.status(200).send({ categories: formattedCategories });
  });

  // POST /v1/categories
  app.post('/v1/categories', { preHandler: [authenticateRequest, validateCsrfToken] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const body = req.body as any;

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
    }

    const allowedKeys = new Set(['clientMutationId', 'pocketId', 'name', 'emoji']);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        throw new AppError(`Unknown property '${key}' in POST category request body`, 400, 'INVALID_INPUT');
      }
    }

    const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');
    const pocketId = validateUuidV4(body.pocketId, 'pocketId');
    const name = trimAndValidateString(body.name, 'name', 100);
    const emoji = trimAndValidateString(body.emoji, 'emoji', 32);

    const canonicalHash = computeCanonicalRequestHash('POST', '/v1/categories', body);

    // Pre-lock Idempotency Check
    const existingRecord = await findIdempotencyRecord(user.id, clientMutationId);
    if (existingRecord) {
      if (existingRecord.requestHash === canonicalHash && existingRecord.responseReference) {
        const env = parseReplayEnvelope(existingRecord.responseReference);
        return reply.status(env.statusCode).send(env.body);
      }
      throw new AppError(
        'clientMutationId reused with a different request payload, HTTP method, or route path.',
        409,
        'IDEMPOTENCY_CONFLICT'
      );
    }

    const db = getDb();

    try {
      const responsePayload = await db.transaction(async (tx) => {
        // Post-Lock Idempotency Re-check
        const recheckIdem = await tx
          .select({
            requestHash: idempotencyRecords.requestHash,
            responseReference: idempotencyRecords.responseReference,
          })
          .from(idempotencyRecords)
          .where(
            and(
              eq(idempotencyRecords.userId, user.id),
              eq(idempotencyRecords.clientMutationId, clientMutationId)
            )
          )
          .limit(1);

        if (recheckIdem.length > 0) {
          if (recheckIdem[0].requestHash === canonicalHash && recheckIdem[0].responseReference) {
            const env = parseReplayEnvelope(recheckIdem[0].responseReference);
            return env.body;
          }
          throw new AppError(
            'clientMutationId reused with a different request payload, HTTP method, or route path.',
            409,
            'IDEMPOTENCY_CONFLICT'
          );
        }

        // Lock parent pocket row FOR UPDATE and validate inside transaction boundary
        const parentPocketRows = await tx
          .select()
          .from(pockets)
          .where(and(eq(pockets.id, pocketId), eq(pockets.userId, user.id)))
          .for('update')
          .limit(1);

        if (
          parentPocketRows.length === 0 ||
          parentPocketRows[0].isArchived ||
          !parentPocketRows[0].isActive
        ) {
          throw new AppError('Parent pocket is invalid, inactive, or archived', 422, 'INVALID_REFERENCE');
        }

        const categoryId = crypto.randomUUID();

        const createdRows = await tx
          .insert(categories)
          .values({
            id: categoryId,
            userId: user.id,
            pocketId,
            name,
            emoji,
            isDefault: false,
            isActive: true,
            isArchived: false,
            revision: 1,
          })
          .returning();

        const createdCat = createdRows[0];

        const payload = {
          category: {
            id: createdCat.id,
            pocketId: createdCat.pocketId,
            name: createdCat.name,
            emoji: createdCat.emoji,
            isDefault: createdCat.isDefault,
            isActive: createdCat.isActive,
            isArchived: createdCat.isArchived,
            revision: createdCat.revision,
            createdAt: new Date(createdCat.createdAt).toISOString(),
            updatedAt: new Date(createdCat.updatedAt).toISOString(),
          },
        };

        // Insert Idempotency Record with 201 Created
        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 201,
            body: payload,
          }),
          expiresAt: null,
        });

        return payload;
      });

      return reply.status(201).send(responsePayload);
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err?.code === '23505' || err?.message?.includes('idempotency_records_user_mutation_unique')) {
        const winningRecord = await findIdempotencyRecord(user.id, clientMutationId);
        if (winningRecord && winningRecord.responseReference) {
          if (winningRecord.requestHash === canonicalHash) {
            const env = parseReplayEnvelope(winningRecord.responseReference);
            return reply.status(env.statusCode).send(env.body);
          }
          throw new AppError(
            'clientMutationId reused with a different request payload, HTTP method, or route path.',
            409,
            'IDEMPOTENCY_CONFLICT'
          );
        }
      }
      throw err;
    }
  });

  // PATCH /v1/categories/:id
  app.patch('/v1/categories/:id', { preHandler: [authenticateRequest, validateCsrfToken] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const params = req.params as any;
    const body = req.body as any;

    const categoryId = validateUuidV4(params.id, 'Category ID');

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
    }

    // Check for read-only or forbidden properties
    const forbiddenKeys = ['id', 'pocketId', 'isDefault', 'isActive', 'revision', 'createdAt', 'updatedAt'];
    for (const key of forbiddenKeys) {
      if (key in body) {
        throw new AppError(`Property '${key}' is read-only or forbidden in PATCH request`, 400, 'INVALID_INPUT');
      }
    }

    const allowedPatchKeys = new Set([
      'clientMutationId',
      'expectedRevision',
      'name',
      'emoji',
      'isArchived',
    ]);

    for (const key of Object.keys(body)) {
      if (!allowedPatchKeys.has(key)) {
        throw new AppError(`Unknown property '${key}' in PATCH category request body`, 400, 'INVALID_INPUT');
      }
    }

    const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

    if (body.expectedRevision === undefined || body.expectedRevision === null) {
      throw new AppError('expectedRevision is required', 400, 'INVALID_INPUT');
    }
    if (
      typeof body.expectedRevision !== 'number' ||
      !Number.isInteger(body.expectedRevision) ||
      body.expectedRevision < 1
    ) {
      throw new AppError('expectedRevision must be a positive integer', 400, 'INVALID_INPUT');
    }

    const mutableKeys = ['name', 'emoji', 'isArchived'];
    const suppliedMutableKeys = mutableKeys.filter((k) => k in body);
    if (suppliedMutableKeys.length === 0) {
      throw new AppError('At least one mutable field must be provided in PATCH request', 400, 'INVALID_INPUT');
    }

    let trimmedName: string | undefined;
    if (body.name !== undefined) {
      trimmedName = trimAndValidateString(body.name, 'name', 100);
    }

    let trimmedEmoji: string | undefined;
    if (body.emoji !== undefined) {
      trimmedEmoji = trimAndValidateString(body.emoji, 'emoji', 32);
    }

    if (body.isArchived !== undefined) {
      if (typeof body.isArchived !== 'boolean') {
        throw new AppError('isArchived must be a boolean', 400, 'INVALID_INPUT');
      }
    }

    const canonicalHash = computeCanonicalRequestHash('PATCH', `/v1/categories/${categoryId}`, body);

    // Pre-lock Idempotency Check
    const existingRecord = await findIdempotencyRecord(user.id, clientMutationId);
    if (existingRecord) {
      if (existingRecord.requestHash === canonicalHash && existingRecord.responseReference) {
        const env = parseReplayEnvelope(existingRecord.responseReference);
        return reply.status(env.statusCode).send(env.body);
      }
      throw new AppError(
        'clientMutationId reused with a different request payload, HTTP method, or route path.',
        409,
        'IDEMPOTENCY_CONFLICT'
      );
    }

    const db = getDb();

    try {
      const responsePayload = await db.transaction(async (tx) => {
        // Lock category row FOR UPDATE
        const lockedRows = await tx
          .select()
          .from(categories)
          .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
          .for('update')
          .limit(1);

        if (lockedRows.length === 0) {
          throw new AppError('Category not found', 404, 'NOT_FOUND');
        }

        const storedRow = lockedRows[0];

        // Post-Lock Idempotency Re-check
        const recheckIdem = await tx
          .select({
            requestHash: idempotencyRecords.requestHash,
            responseReference: idempotencyRecords.responseReference,
          })
          .from(idempotencyRecords)
          .where(
            and(
              eq(idempotencyRecords.userId, user.id),
              eq(idempotencyRecords.clientMutationId, clientMutationId)
            )
          )
          .limit(1);

        if (recheckIdem.length > 0) {
          if (recheckIdem[0].requestHash === canonicalHash && recheckIdem[0].responseReference) {
            const env = parseReplayEnvelope(recheckIdem[0].responseReference);
            return env.body;
          }
          throw new AppError(
            'clientMutationId reused with a different request payload, HTTP method, or route path.',
            409,
            'IDEMPOTENCY_CONFLICT'
          );
        }

        // Revision Check
        if (storedRow.revision !== body.expectedRevision) {
          throw new AppError('Entity revision mismatch', 409, 'REVISION_CONFLICT');
        }

        // Rule for Restoring Category: parent pocket MUST be active and not archived
        if (body.isArchived === false && storedRow.isArchived === true) {
          const parentRows = await tx
            .select()
            .from(pockets)
            .where(and(eq(pockets.id, storedRow.pocketId), eq(pockets.userId, user.id)))
            .limit(1);

          if (
            parentRows.length === 0 ||
            parentRows[0].isArchived ||
            !parentRows[0].isActive
          ) {
            throw new AppError('Cannot restore category under an archived or inactive pocket', 422, 'INVALID_REFERENCE');
          }
        }

        // Determine if state actually changed (No-Op check)
        let isChanged = false;
        if (trimmedName !== undefined && trimmedName !== storedRow.name) isChanged = true;
        if (trimmedEmoji !== undefined && trimmedEmoji !== storedRow.emoji) isChanged = true;
        if (body.isArchived !== undefined && body.isArchived !== storedRow.isArchived) isChanged = true;

        let finalRow = storedRow;

        if (isChanged) {
          const newRevision = storedRow.revision + 1;
          const newIsArchived = body.isArchived !== undefined ? body.isArchived : storedRow.isArchived;
          const newIsActive = !newIsArchived;

          const updateData: Record<string, any> = {
            updatedAt: new Date(),
            revision: newRevision,
          };

          if (trimmedName !== undefined) updateData.name = trimmedName;
          if (trimmedEmoji !== undefined) updateData.emoji = trimmedEmoji;
          if (body.isArchived !== undefined) {
            updateData.isArchived = newIsArchived;
            updateData.isActive = newIsActive;
          }

          const updatedRows = await tx
            .update(categories)
            .set(updateData)
            .where(eq(categories.id, categoryId))
            .returning();

          finalRow = updatedRows[0];
        }

        const responsePayload = {
          category: {
            id: finalRow.id,
            pocketId: finalRow.pocketId,
            name: finalRow.name,
            emoji: finalRow.emoji,
            isDefault: finalRow.isDefault,
            isActive: finalRow.isActive,
            isArchived: finalRow.isArchived,
            revision: finalRow.revision,
            createdAt: new Date(finalRow.createdAt).toISOString(),
            updatedAt: new Date(finalRow.updatedAt).toISOString(),
          },
        };

        // Insert Idempotency Record
        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 200,
            body: responsePayload,
          }),
          expiresAt: null,
        });

        return responsePayload;
      });

      return reply.status(200).send(responsePayload);
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err?.code === '23505' || err?.message?.includes('idempotency_records_user_mutation_unique')) {
        const winningRecord = await findIdempotencyRecord(user.id, clientMutationId);
        if (winningRecord && winningRecord.responseReference) {
          if (winningRecord.requestHash === canonicalHash) {
            const env = parseReplayEnvelope(winningRecord.responseReference);
            return reply.status(env.statusCode).send(env.body);
          }
          throw new AppError(
            'clientMutationId reused with a different request payload, HTTP method, or route path.',
            409,
            'IDEMPOTENCY_CONFLICT'
          );
        }
      }
      throw err;
    }
  });
}
