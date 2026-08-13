import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateRequest, validateCsrfToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import {
  validateUuidV4,
  getCurrentAsiaJakartaPeriodDates,
} from '../lib/validation.js';
import {
  computeCanonicalRequestHash,
  findIdempotencyRecord,
  parseReplayEnvelope,
} from '../lib/idempotency.js';
import { getDb } from '../db/client.js';
import {
  users,
  pockets,
  categories,
  budgetPeriods,
  pocketBudgetAllocations,
  idempotencyRecords,
} from '../db/schema.js';
import { SETUP_TEMPLATES } from '../data/setupTemplates.js';

const VALID_TEMPLATE_KEYS = Object.keys(SETUP_TEMPLATES);

export async function setupRoutes(app: FastifyInstance): Promise<void> {
  // GET /v1/setup
  app.get('/v1/setup', { preHandler: [authenticateRequest] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const db = getDb();

    const userRows = await db
      .select({ setupCompletedAt: users.setupCompletedAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (userRows.length === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const completedAt = userRows[0].setupCompletedAt;

    return reply.status(200).send({
      isSetupCompleted: Boolean(completedAt),
      completedAt: completedAt ? completedAt.toISOString() : null,
    });
  });

  // PUT /v1/setup
  app.put('/v1/setup', { preHandler: [authenticateRequest, validateCsrfToken] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const body = req.body as any;

    if (!body || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
    }

    // Check for rejected legacy budgetPeriodStartDay
    if ('budgetPeriodStartDay' in body) {
      throw new AppError(
        'budgetPeriodStartDay is not supported. Budget period is fixed from 26th through 25th.',
        400,
        'INVALID_INPUT'
      );
    }

    // Check for unknown properties (additionalProperties: false)
    const allowedKeys = new Set(['clientMutationId', 'selectedPocketKeys', 'cashOpeningBalance', 'nfcOpeningBalance']);
    for (const k of Object.keys(body)) {
      if (!allowedKeys.has(k)) {
        throw new AppError(`Unknown property '${k}' in setup request body`, 400, 'INVALID_INPUT');
      }
    }

    // Validate clientMutationId
    const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

    // Validate selectedPocketKeys
    if (!Array.isArray(body.selectedPocketKeys) || body.selectedPocketKeys.length === 0 || body.selectedPocketKeys.length > 12) {
      throw new AppError('selectedPocketKeys must be an array of 1 to 12 items', 400, 'INVALID_INPUT');
    }

    const selectedKeys = body.selectedPocketKeys as string[];
    const uniqueKeys = new Set(selectedKeys);
    if (uniqueKeys.size !== selectedKeys.length) {
      throw new AppError('selectedPocketKeys contains duplicate items', 400, 'INVALID_INPUT');
    }

    for (const key of selectedKeys) {
      if (!VALID_TEMPLATE_KEYS.includes(key)) {
        throw new AppError(`Invalid pocket key '${key}' in selectedPocketKeys`, 400, 'INVALID_INPUT');
      }
    }

    const selectedSet = new Set(selectedKeys);

    // Companion pocket dependency rules
    if (selectedSet.has('cash') && !selectedSet.has('food-groceries')) {
      throw new AppError(
        "Selected pocket 'cash' requires companion pocket 'food-groceries' to be selected",
        422,
        'INVALID_REFERENCE'
      );
    }

    if (selectedSet.has('nfc-card') && !selectedSet.has('transportation')) {
      throw new AppError(
        "Selected pocket 'nfc-card' requires companion pocket 'transportation' to be selected",
        422,
        'INVALID_REFERENCE'
      );
    }

    // Opening balances validation
    if (selectedSet.has('cash')) {
      if (body.cashOpeningBalance === undefined || body.cashOpeningBalance === null) {
        throw new AppError('cashOpeningBalance is required when cash pocket is selected', 400, 'INVALID_INPUT');
      }
      if (
        typeof body.cashOpeningBalance !== 'number' ||
        !Number.isInteger(body.cashOpeningBalance) ||
        body.cashOpeningBalance < 0 ||
        body.cashOpeningBalance > 9007199254740991
      ) {
        throw new AppError('cashOpeningBalance must be a non-negative integer', 400, 'INVALID_INPUT');
      }
    } else {
      if (body.cashOpeningBalance !== undefined) {
        throw new AppError('cashOpeningBalance must not be provided when cash pocket is not selected', 400, 'INVALID_INPUT');
      }
    }

    if (selectedSet.has('nfc-card')) {
      if (body.nfcOpeningBalance === undefined || body.nfcOpeningBalance === null) {
        throw new AppError('nfcOpeningBalance is required when nfc-card pocket is selected', 400, 'INVALID_INPUT');
      }
      if (
        typeof body.nfcOpeningBalance !== 'number' ||
        !Number.isInteger(body.nfcOpeningBalance) ||
        body.nfcOpeningBalance < 0 ||
        body.nfcOpeningBalance > 9007199254740991
      ) {
        throw new AppError('nfcOpeningBalance must be a non-negative integer', 400, 'INVALID_INPUT');
      }
    } else {
      if (body.nfcOpeningBalance !== undefined) {
        throw new AppError('nfcOpeningBalance must not be provided when nfc-card pocket is not selected', 400, 'INVALID_INPUT');
      }
    }

    const canonicalHash = computeCanonicalRequestHash('PUT', '/v1/setup', body);

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
        // Step 3: Lock Owner User Row FOR UPDATE
        const lockedUserRows = await tx.execute(
          sql`SELECT id, setup_completed_at FROM users WHERE id = ${user.id} FOR UPDATE`
        );

        if (!lockedUserRows || lockedUserRows.length === 0) {
          throw new AppError('User not found', 404, 'NOT_FOUND');
        }

        // Post-Lock Precedence Step A: Idempotency Re-check
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

        // Post-Lock Precedence Step B: Setup Completion Check
        const setupCompletedAt = (lockedUserRows[0] as any).setup_completed_at;
        if (setupCompletedAt !== null && setupCompletedAt !== undefined) {
          throw new AppError('Setup has already been completed for this account.', 409, 'SETUP_ALREADY_COMPLETED');
        }

        // Create Budget Period for Asia/Jakarta dates
        const periodDates = getCurrentAsiaJakartaPeriodDates();
        const periodRows = await tx
          .insert(budgetPeriods)
          .values({
            userId: user.id,
            startDate: periodDates.startDate,
            endDate: periodDates.endDate,
          })
          .returning({ id: budgetPeriods.id, startDate: budgetPeriods.startDate, endDate: budgetPeriods.endDate });

        const budgetPeriod = periodRows[0];

        // Generate IDs for selected pockets first
        const templateKeyToIdMap: Record<string, string> = {};
        for (const key of selectedKeys) {
          const generatedId = crypto.randomUUID();
          templateKeyToIdMap[key] = generatedId;
        }

        let pocketsCreatedCount = 0;
        let categoriesCreatedCount = 0;
        let totalAllocatedAmount = 0;

        // Insert selected pockets
        for (const key of selectedKeys) {
          const spec = SETUP_TEMPLATES[key];
          const pocketId = templateKeyToIdMap[key];

          let openingBalance = 0;
          if (key === 'cash') {
            openingBalance = body.cashOpeningBalance;
          } else if (key === 'nfc-card') {
            openingBalance = body.nfcOpeningBalance;
          } else {
            openingBalance = spec.monthlyAllocation ?? 0;
          }

          let budgetOwnerPocketId: string | null = null;
          if (key === 'cash') {
            budgetOwnerPocketId = templateKeyToIdMap['food-groceries'];
          } else if (key === 'nfc-card') {
            budgetOwnerPocketId = templateKeyToIdMap['transportation'];
          }

          await tx.insert(pockets).values({
            id: pocketId,
            userId: user.id,
            templateKey: key,
            name: spec.name,
            emoji: spec.emoji,
            groupId: spec.groupId,
            isSpendable: spec.isSpendable,
            budgetOwnerPocketId,
            isActive: true,
            isArchived: false,
            openingBalance,
            revision: 1,
          });

          pocketsCreatedCount++;

          // Insert allocation if monthlyAllocation is non-null
          if (spec.monthlyAllocation !== null && spec.monthlyAllocation > 0) {
            await tx.insert(pocketBudgetAllocations).values({
              budgetPeriodId: budgetPeriod.id,
              pocketId,
              allocatedAmount: spec.monthlyAllocation,
              revision: 1,
            });
            totalAllocatedAmount += spec.monthlyAllocation;
          }

          // Insert default categories
          for (const catSpec of spec.categories) {
            await tx.insert(categories).values({
              userId: user.id,
              pocketId,
              name: catSpec.name,
              emoji: catSpec.emoji,
              isDefault: true,
              isActive: true,
              isArchived: false,
              revision: 1,
            });
            categoriesCreatedCount++;
          }
        }

        // Update user setup_completed_at marker
        const updatedUser = await tx
          .update(users)
          .set({
            setupCompletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning({ setupCompletedAt: users.setupCompletedAt });

        const completedAt = updatedUser[0].setupCompletedAt!;
        const completedAtIso = completedAt.toISOString();

        const responsePayload = {
          isSetupCompleted: true,
          completedAt: completedAtIso,
          summary: {
            pocketsCreated: pocketsCreatedCount,
            categoriesCreated: categoriesCreatedCount,
            totalAllocatedAmount,
            budgetPeriod: {
              id: budgetPeriod.id,
              startDate: budgetPeriod.startDate,
              endDate: budgetPeriod.endDate,
            },
            templateKeyToIdMap,
          },
        };

        // Insert Idempotency Record with expires_at = null
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
      // Handle Postgres 23505 unique constraint on idempotency record
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
