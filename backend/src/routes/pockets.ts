import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { authenticateRequest, validateCsrfToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import {
  validateUuidV4,
  trimAndValidateString,
  getCurrentAsiaJakartaPeriodDates,
} from '../lib/validation.js';
import {
  computeCanonicalRequestHash,
  findIdempotencyRecord,
  parseReplayEnvelope,
} from '../lib/idempotency.js';
import { getDb } from '../db/client.js';
import {
  pockets,
  budgetPeriods,
  pocketBudgetAllocations,
  idempotencyRecords,
} from '../db/schema.js';

export async function pocketRoutes(app: FastifyInstance): Promise<void> {
  // GET /v1/pockets
  app.get('/v1/pockets', { preHandler: [authenticateRequest] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const query = req.query as any;

    // Validate query parameters
    const allowedQueryParams = new Set(['includeArchived']);
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

    const db = getDb();

    // Query pockets ordered by created_at ASC, name ASC
    const pocketRows = await db
      .select()
      .from(pockets)
      .where(
        includeArchived
          ? eq(pockets.userId, user.id)
          : and(eq(pockets.userId, user.id), eq(pockets.isArchived, false))
      )
      .orderBy(asc(pockets.createdAt), asc(pockets.name));

    // Get current period allocations
    const periodDates = getCurrentAsiaJakartaPeriodDates();
    const periodRows = await db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.userId, user.id),
          eq(budgetPeriods.startDate, periodDates.startDate),
          eq(budgetPeriods.endDate, periodDates.endDate)
        )
      )
      .limit(1);

    const currentPeriod = periodRows.length > 0 ? periodRows[0] : null;
    const allocationMap = new Map<string, { allocatedAmount: number; revision: number }>();

    if (currentPeriod) {
      const allocRows = await db
        .select()
        .from(pocketBudgetAllocations)
        .where(eq(pocketBudgetAllocations.budgetPeriodId, currentPeriod.id));

      for (const a of allocRows) {
        allocationMap.set(a.pocketId, { allocatedAmount: a.allocatedAmount, revision: a.revision });
      }
    }

    const formattedPockets = pocketRows.map((row) => {
      const alloc = allocationMap.get(row.id);
      return {
        id: row.id,
        templateKey: row.templateKey,
        name: row.name,
        emoji: row.emoji,
        groupId: row.groupId,
        isSpendable: row.isSpendable,
        budgetOwnerPocketId: row.budgetOwnerPocketId,
        isActive: row.isActive,
        isArchived: row.isArchived,
        openingBalance: row.openingBalance,
        currentPeriodAllocation: currentPeriod && alloc ? {
          periodId: currentPeriod.id,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          allocatedAmount: alloc.allocatedAmount,
          revision: alloc.revision,
        } : null,
        revision: row.revision,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      };
    });

    return reply.status(200).send({ pockets: formattedPockets });
  });

  // GET /v1/pockets/:id
  app.get('/v1/pockets/:id', { preHandler: [authenticateRequest] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const params = req.params as any;

    const pocketId = validateUuidV4(params.id, 'Pocket ID');
    const db = getDb();

    const rows = await db
      .select()
      .from(pockets)
      .where(and(eq(pockets.id, pocketId), eq(pockets.userId, user.id)))
      .limit(1);

    if (rows.length === 0) {
      throw new AppError('Pocket not found', 404, 'NOT_FOUND');
    }

    const row = rows[0];

    // Get current period allocation
    const periodDates = getCurrentAsiaJakartaPeriodDates();
    const periodRows = await db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.userId, user.id),
          eq(budgetPeriods.startDate, periodDates.startDate),
          eq(budgetPeriods.endDate, periodDates.endDate)
        )
      )
      .limit(1);

    let currentPeriodAllocation = null;
    if (periodRows.length > 0) {
      const currentPeriod = periodRows[0];
      const allocRows = await db
        .select()
        .from(pocketBudgetAllocations)
        .where(
          and(
            eq(pocketBudgetAllocations.budgetPeriodId, currentPeriod.id),
            eq(pocketBudgetAllocations.pocketId, row.id)
          )
        )
        .limit(1);

      if (allocRows.length > 0) {
        currentPeriodAllocation = {
          periodId: currentPeriod.id,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          allocatedAmount: allocRows[0].allocatedAmount,
          revision: allocRows[0].revision,
        };
      }
    }

    return reply.status(200).send({
      pocket: {
        id: row.id,
        templateKey: row.templateKey,
        name: row.name,
        emoji: row.emoji,
        groupId: row.groupId,
        isSpendable: row.isSpendable,
        budgetOwnerPocketId: row.budgetOwnerPocketId,
        isActive: row.isActive,
        isArchived: row.isArchived,
        openingBalance: row.openingBalance,
        currentPeriodAllocation,
        revision: row.revision,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      },
    });
  });

  // PATCH /v1/pockets/:id
  app.patch('/v1/pockets/:id', { preHandler: [authenticateRequest, validateCsrfToken] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const params = req.params as any;
    const body = req.body as any;

    const pocketId = validateUuidV4(params.id, 'Pocket ID');

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
    }

    // Check for read-only or forbidden properties
    const forbiddenKeys = ['id', 'templateKey', 'isActive', 'currentPeriodAllocation', 'revision', 'createdAt', 'updatedAt'];
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
      'groupId',
      'isSpendable',
      'budgetOwnerPocketId',
      'isArchived',
      'openingBalance',
    ]);

    for (const key of Object.keys(body)) {
      if (!allowedPatchKeys.has(key)) {
        throw new AppError(`Unknown property '${key}' in PATCH pocket request body`, 400, 'INVALID_INPUT');
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

    const mutableKeys = ['name', 'emoji', 'groupId', 'isSpendable', 'budgetOwnerPocketId', 'isArchived', 'openingBalance'];
    const suppliedMutableKeys = mutableKeys.filter((k) => k in body);
    if (suppliedMutableKeys.length === 0) {
      throw new AppError('At least one mutable field must be provided in PATCH request', 400, 'INVALID_INPUT');
    }

    // Validate mutable field values if provided
    let trimmedName: string | undefined;
    if (body.name !== undefined) {
      trimmedName = trimAndValidateString(body.name, 'name', 100);
    }

    let trimmedEmoji: string | undefined;
    if (body.emoji !== undefined) {
      trimmedEmoji = trimAndValidateString(body.emoji, 'emoji', 32);
    }

    if (body.groupId !== undefined) {
      if (!['daily', 'bills', 'savings'].includes(body.groupId)) {
        throw new AppError("groupId must be one of 'daily', 'bills', or 'savings'", 400, 'INVALID_INPUT');
      }
    }

    if (body.isSpendable !== undefined) {
      if (typeof body.isSpendable !== 'boolean') {
        throw new AppError('isSpendable must be a boolean', 400, 'INVALID_INPUT');
      }
    }

    if (body.isArchived !== undefined) {
      if (typeof body.isArchived !== 'boolean') {
        throw new AppError('isArchived must be a boolean', 400, 'INVALID_INPUT');
      }
    }

    if (body.openingBalance !== undefined) {
      if (
        typeof body.openingBalance !== 'number' ||
        !Number.isInteger(body.openingBalance) ||
        body.openingBalance < 0 ||
        body.openingBalance > 9007199254740991
      ) {
        throw new AppError('openingBalance must be a non-negative integer', 400, 'INVALID_INPUT');
      }
    }

    if (body.budgetOwnerPocketId !== undefined && body.budgetOwnerPocketId !== null) {
      validateUuidV4(body.budgetOwnerPocketId, 'budgetOwnerPocketId');
    }

    const canonicalHash = computeCanonicalRequestHash('PATCH', `/v1/pockets/${pocketId}`, body);

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
        // Lock target pocket row FOR UPDATE
        const lockedRows = await tx
          .select()
          .from(pockets)
          .where(and(eq(pockets.id, pocketId), eq(pockets.userId, user.id)))
          .for('update')
          .limit(1);

        if (lockedRows.length === 0) {
          throw new AppError('Pocket not found', 404, 'NOT_FOUND');
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

        // Domain Business Rule: budgetOwnerPocketId is mutable ONLY on Cash or NFC Card pockets
        if (body.budgetOwnerPocketId !== undefined) {
          if (storedRow.templateKey !== 'cash' && storedRow.templateKey !== 'nfc-card') {
            throw new AppError(
              'Budget owner mapping is permitted only for Cash and NFC Card pockets',
              422,
              'INVALID_REFERENCE'
            );
          }
        }

        // Target budget owner pocket validation if budgetOwnerPocketId is non-null
        if (body.budgetOwnerPocketId !== undefined && body.budgetOwnerPocketId !== null) {
          if (body.budgetOwnerPocketId === pocketId) {
            throw new AppError('Target budget owner pocket cannot be self', 422, 'INVALID_REFERENCE');
          }

          // Query target pocket - MUST be active AND not archived
          const targetRows = await tx
            .select()
            .from(pockets)
            .where(and(eq(pockets.id, body.budgetOwnerPocketId), eq(pockets.userId, user.id)))
            .limit(1);

          if (
            targetRows.length === 0 ||
            targetRows[0].isArchived ||
            !targetRows[0].isActive
          ) {
            throw new AppError('Target budget owner pocket is invalid, inactive, or archived', 422, 'INVALID_REFERENCE');
          }
        }

        // Rule for Archiving Pocket: cannot archive while active, non-archived Cash or NFC Card source pockets reference it
        if (body.isArchived === true && storedRow.isArchived === false) {
          const dependentRows = await tx
            .select()
            .from(pockets)
            .where(
              and(
                eq(pockets.userId, user.id),
                eq(pockets.budgetOwnerPocketId, pocketId),
                eq(pockets.isArchived, false),
                eq(pockets.isActive, true),
                inArray(pockets.templateKey, ['cash', 'nfc-card'])
              )
            );

          if (dependentRows.length > 0) {
            throw new AppError(
              'Cannot archive pocket while it is configured as budget owner for active Cash or NFC Card pocket(s). Remap or archive dependent pocket(s) first.',
              422,
              'INVALID_REFERENCE'
            );
          }
        }

        // Rule for Restoring Pocket (Cash / NFC): check target budget owner if non-null
        if (body.isArchived === false && storedRow.isArchived === true) {
          if (storedRow.templateKey === 'cash' || storedRow.templateKey === 'nfc-card') {
            const effectiveOwnerId =
              body.budgetOwnerPocketId !== undefined ? body.budgetOwnerPocketId : storedRow.budgetOwnerPocketId;

            if (effectiveOwnerId !== null) {
              const targetRows = await tx
                .select()
                .from(pockets)
                .where(and(eq(pockets.id, effectiveOwnerId), eq(pockets.userId, user.id)))
                .limit(1);

              if (
                targetRows.length === 0 ||
                targetRows[0].isArchived ||
                !targetRows[0].isActive
              ) {
                throw new AppError(
                  'Cannot restore pocket because retained budget owner pocket is inactive or archived',
                  422,
                  'INVALID_REFERENCE'
                );
              }
            }
          }
        }

        // Determine if state actually changed (No-Op check)
        let isChanged = false;
        if (trimmedName !== undefined && trimmedName !== storedRow.name) isChanged = true;
        if (trimmedEmoji !== undefined && trimmedEmoji !== storedRow.emoji) isChanged = true;
        if (body.groupId !== undefined && body.groupId !== storedRow.groupId) isChanged = true;
        if (body.isSpendable !== undefined && body.isSpendable !== storedRow.isSpendable) isChanged = true;
        if (body.openingBalance !== undefined && body.openingBalance !== storedRow.openingBalance) isChanged = true;
        if (body.budgetOwnerPocketId !== undefined && body.budgetOwnerPocketId !== storedRow.budgetOwnerPocketId) isChanged = true;
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
          if (body.groupId !== undefined) updateData.groupId = body.groupId;
          if (body.isSpendable !== undefined) updateData.isSpendable = body.isSpendable;
          if (body.openingBalance !== undefined) updateData.openingBalance = body.openingBalance;
          if (body.budgetOwnerPocketId !== undefined) updateData.budgetOwnerPocketId = body.budgetOwnerPocketId;
          if (body.isArchived !== undefined) {
            updateData.isArchived = newIsArchived;
            updateData.isActive = newIsActive;
          }

          const updatedRows = await tx
            .update(pockets)
            .set(updateData)
            .where(eq(pockets.id, pocketId))
            .returning();

          finalRow = updatedRows[0];
        }

        // Get current period allocation for response
        const periodDates = getCurrentAsiaJakartaPeriodDates();
        const periodRows = await tx
          .select()
          .from(budgetPeriods)
          .where(
            and(
              eq(budgetPeriods.userId, user.id),
              eq(budgetPeriods.startDate, periodDates.startDate),
              eq(budgetPeriods.endDate, periodDates.endDate)
            )
          )
          .limit(1);

        let currentPeriodAllocation = null;
        if (periodRows.length > 0) {
          const currentPeriod = periodRows[0];
          const allocRows = await tx
            .select()
            .from(pocketBudgetAllocations)
            .where(
              and(
                eq(pocketBudgetAllocations.budgetPeriodId, currentPeriod.id),
                eq(pocketBudgetAllocations.pocketId, pocketId)
              )
            )
            .limit(1);

          if (allocRows.length > 0) {
            currentPeriodAllocation = {
              periodId: currentPeriod.id,
              startDate: currentPeriod.startDate,
              endDate: currentPeriod.endDate,
              allocatedAmount: allocRows[0].allocatedAmount,
              revision: allocRows[0].revision,
            };
          }
        }

        const responsePayload = {
          pocket: {
            id: finalRow.id,
            templateKey: finalRow.templateKey,
            name: finalRow.name,
            emoji: finalRow.emoji,
            groupId: finalRow.groupId,
            isSpendable: finalRow.isSpendable,
            budgetOwnerPocketId: finalRow.budgetOwnerPocketId,
            isActive: finalRow.isActive,
            isArchived: finalRow.isArchived,
            openingBalance: finalRow.openingBalance,
            currentPeriodAllocation,
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
