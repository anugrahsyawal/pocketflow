import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gte, lte, isNull, desc, ilike, count, sql, inArray } from 'drizzle-orm';
import { authenticateRequest, validateCsrfToken } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import {
  validateUuidV4,
  validateDateString,
  validateTimeString,
  getBudgetPeriodForDate,
} from '../lib/validation.js';
import {
  computeCanonicalRequestHash,
  findIdempotencyRecord,
  parseReplayEnvelope,
  runIdempotentMutation,
  resolveCreateAttempt,
  resolveLifecycleAttempt,
  resolveDeleteAttempt,
  resolveEditAttempt,
} from '../lib/idempotency.js';
import { getDb } from '../db/client.js';
import {
  transactions,
  pockets,
  categories,
  budgetPeriods,
  pocketBudgetAllocations,
  idempotencyRecords,
} from '../db/schema.js';

export interface TransactionResponse {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  pocketId: string | null;
  fromPocketId: string | null;
  toPocketId: string | null;
  categoryId: string | null;
  budgetPocketId: string | null;
  transferType: string | null;
  incomeSource: string | null;
  occurredOn: string;
  occurredAtLocalTime: string;
  note: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

function mapTransactionRow(row: typeof transactions.$inferSelect): TransactionResponse {
  return {
    id: row.id,
    type: row.type as 'expense' | 'income' | 'transfer',
    amount: Number(row.amount),
    pocketId: row.pocketId,
    fromPocketId: row.fromPocketId,
    toPocketId: row.toPocketId,
    categoryId: row.categoryId,
    budgetPocketId: row.budgetPocketId,
    transferType: row.transferType,
    incomeSource: row.incomeSource,
    occurredOn: row.occurredOn,
    occurredAtLocalTime: row.occurredAtLocalTime,
    note: row.note,
    isArchived: row.archivedAt !== null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getDerivedPocketBalance(
  tx: any,
  userId: string,
  pocketId: string
): Promise<number> {
  const [pocket] = await tx
    .select({ openingBalance: pockets.openingBalance })
    .from(pockets)
    .where(and(eq(pockets.id, pocketId), eq(pockets.userId, userId)));

  if (!pocket) {
    throw new AppError('Pocket not found', 422, 'INVALID_REFERENCE');
  }

  const openingBalance = Number(pocket.openingBalance);

  const [incomeSum] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.pocketId, pocketId),
        eq(transactions.type, 'income'),
        isNull(transactions.deletedAt),
        isNull(transactions.archivedAt)
      )
    );

  const [expenseSum] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.pocketId, pocketId),
        eq(transactions.type, 'expense'),
        isNull(transactions.deletedAt),
        isNull(transactions.archivedAt)
      )
    );

  const [trfFromSum] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.fromPocketId, pocketId),
        eq(transactions.type, 'transfer'),
        isNull(transactions.deletedAt),
        isNull(transactions.archivedAt)
      )
    );

  const [trfToSum] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.toPocketId, pocketId),
        eq(transactions.type, 'transfer'),
        isNull(transactions.deletedAt),
        isNull(transactions.archivedAt)
      )
    );

  return (
    openingBalance +
    Number(incomeSum?.total || 0) -
    Number(expenseSum?.total || 0) -
    Number(trfFromSum?.total || 0) +
    Number(trfToSum?.total || 0)
  );
}

async function getRecordedExpensesForPocketInPeriod(
  tx: any,
  userId: string,
  pocketId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.pocketId, pocketId),
        eq(transactions.type, 'expense'),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
        isNull(transactions.deletedAt),
        isNull(transactions.archivedAt)
      )
    );
  return Number(row?.total || 0);
}

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  // GET /v1/transactions
  app.get('/v1/transactions', { preHandler: [authenticateRequest] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user!;
    const query = (req.query || {}) as Record<string, unknown>;

    // Validate allowed query parameters
    const allowedQueryParams = new Set([
      'page',
      'limit',
      'type',
      'pocketId',
      'categoryId',
      'startDate',
      'endDate',
      'search',
      'includeArchived',
    ]);

    for (const q of Object.keys(query)) {
      if (!allowedQueryParams.has(q)) {
        throw new AppError(`Unknown query parameter '${q}'`, 400, 'INVALID_INPUT');
      }
    }

    let page = 1;
    if (query.page !== undefined) {
      const parsedPage = Number(query.page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        throw new AppError("Query parameter 'page' must be an integer >= 1", 400, 'INVALID_INPUT');
      }
      page = parsedPage;
    }

    let limit = 50;
    if (query.limit !== undefined) {
      const parsedLimit = Number(query.limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new AppError("Query parameter 'limit' must be an integer between 1 and 100", 400, 'INVALID_INPUT');
      }
      limit = parsedLimit;
    }

    let filterType: string | undefined;
    if (query.type !== undefined) {
      if (query.type !== 'expense' && query.type !== 'income' && query.type !== 'transfer') {
        throw new AppError("Query parameter 'type' must be 'expense', 'income', or 'transfer'", 400, 'INVALID_INPUT');
      }
      filterType = query.type;
    }

    let filterPocketId: string | undefined;
    if (query.pocketId !== undefined) {
      filterPocketId = validateUuidV4(query.pocketId, 'pocketId');
    }

    let filterCategoryId: string | undefined;
    if (query.categoryId !== undefined) {
      filterCategoryId = validateUuidV4(query.categoryId, 'categoryId');
    }

    let filterStartDate: string | undefined;
    if (query.startDate !== undefined) {
      filterStartDate = validateDateString(query.startDate, 'startDate');
    }

    let filterEndDate: string | undefined;
    if (query.endDate !== undefined) {
      filterEndDate = validateDateString(query.endDate, 'endDate');
    }

    let filterSearch: string | undefined;
    if (query.search !== undefined) {
      if (typeof query.search !== 'string') {
        throw new AppError("Query parameter 'search' must be a string", 400, 'INVALID_INPUT');
      }
      if (query.search.length > 100) {
        throw new AppError("Query parameter 'search' must not exceed 100 characters", 400, 'INVALID_INPUT');
      }
      filterSearch = query.search;
    }

    let includeArchived = false;
    if (query.includeArchived !== undefined) {
      if (query.includeArchived === 'true') {
        includeArchived = true;
      } else if (query.includeArchived === 'false') {
        includeArchived = false;
      } else {
        throw new AppError("Query parameter 'includeArchived' must be 'true' or 'false'", 400, 'INVALID_INPUT');
      }
    }

    const db = getDb();

    const conditions = [
      eq(transactions.userId, user.id),
      isNull(transactions.deletedAt),
    ];

    if (!includeArchived) {
      conditions.push(isNull(transactions.archivedAt));
    }

    if (filterType) {
      conditions.push(eq(transactions.type, filterType));
    }

    if (filterPocketId) {
      conditions.push(
        or(
          eq(transactions.pocketId, filterPocketId),
          eq(transactions.fromPocketId, filterPocketId),
          eq(transactions.toPocketId, filterPocketId)
        )!
      );
    }

    if (filterCategoryId) {
      conditions.push(eq(transactions.categoryId, filterCategoryId));
    }

    if (filterStartDate) {
      conditions.push(gte(transactions.occurredOn, filterStartDate));
    }

    if (filterEndDate) {
      conditions.push(lte(transactions.occurredOn, filterEndDate));
    }

    if (filterSearch && filterSearch.trim() !== '') {
      const escaped = filterSearch.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(transactions.note, `%${escaped}%`));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [totalRow] = await db
      .select({ count: count() })
      .from(transactions)
      .where(whereClause);

    const total = totalRow ? Number(totalRow.count) : 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasMore = page < totalPages;
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(
        desc(transactions.occurredOn),
        desc(transactions.occurredAtLocalTime),
        desc(transactions.createdAt)
      )
      .limit(limit)
      .offset(offset);

    return reply.status(200).send({
      transactions: rows.map(mapTransactionRow),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  });

  // POST /v1/transactions
  // Resolution shares create shape validation and original hash, but never runs domain writes.
  for (const resolving of [false, true]) {
  app.post(
    resolving ? '/v1/transactions/resolve-attempt' : '/v1/transactions',
    { preHandler: [authenticateRequest, validateCsrfToken] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user!;
      const body = (req.body || {}) as Record<string, any>;

      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      // Check allowed body properties
      const allowedBodyKeys = new Set([
        'clientMutationId',
        'type',
        'amount',
        'occurredOn',
        'occurredAtLocalTime',
        'note',
        'pocketId',
        'fromPocketId',
        'toPocketId',
        'categoryId',
        'transferType',
        'incomeSource',
      ]);

      for (const key of Object.keys(body)) {
        if (!allowedBodyKeys.has(key)) {
          throw new AppError(`Unknown or disallowed property '${key}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      // Required base properties
      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (!body.type || (body.type !== 'expense' && body.type !== 'income' && body.type !== 'transfer')) {
        throw new AppError("Field 'type' is required and must be 'expense', 'income', or 'transfer'", 400, 'INVALID_INPUT');
      }
      const type = body.type as 'expense' | 'income' | 'transfer';

      if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 9007199254740991) {
        throw new AppError("Field 'amount' must be a positive integer Rupiah value", 400, 'INVALID_INPUT');
      }
      const amount = body.amount;

      if (!body.occurredOn) {
        throw new AppError("Field 'occurredOn' is required", 400, 'INVALID_INPUT');
      }
      validateDateString(body.occurredOn, 'occurredOn');
      const occurredOn = body.occurredOn;

      if (!body.occurredAtLocalTime) {
        throw new AppError("Field 'occurredAtLocalTime' is required", 400, 'INVALID_INPUT');
      }
      validateTimeString(body.occurredAtLocalTime, 'occurredAtLocalTime');
      const occurredAtLocalTime = body.occurredAtLocalTime;

      let note: string | null = null;
      if (body.note !== undefined && body.note !== null) {
        if (typeof body.note !== 'string') {
          throw new AppError("Field 'note' must be a string", 400, 'INVALID_INPUT');
        }
        if (body.note.length > 500) {
          throw new AppError("Field 'note' must not exceed 500 characters", 400, 'INVALID_INPUT');
        }
        note = body.note;
      }

      // Topology validations
      let pocketId: string | null = null;
      let fromPocketId: string | null = null;
      let toPocketId: string | null = null;
      let categoryId: string | null = null;
      let transferType: string | null = null;
      let incomeSource: string | null = null;

      if (type === 'expense') {
        if (!body.pocketId) {
          throw new AppError("Field 'pocketId' is required for expense", 400, 'INVALID_INPUT');
        }
        pocketId = validateUuidV4(body.pocketId, 'pocketId');

        if (body.fromPocketId !== undefined || body.toPocketId !== undefined || body.transferType !== undefined || body.incomeSource !== undefined) {
          throw new AppError('Disallowed topology fields for expense transaction', 400, 'INVALID_INPUT');
        }

        if (body.categoryId !== undefined && body.categoryId !== null) {
          categoryId = validateUuidV4(body.categoryId, 'categoryId');
        }
      } else if (type === 'income') {
        if (!body.pocketId) {
          throw new AppError("Field 'pocketId' is required for income", 400, 'INVALID_INPUT');
        }
        pocketId = validateUuidV4(body.pocketId, 'pocketId');

        if (body.fromPocketId !== undefined || body.toPocketId !== undefined || body.categoryId !== undefined || body.transferType !== undefined) {
          throw new AppError('Disallowed topology fields for income transaction', 400, 'INVALID_INPUT');
        }

        if (body.incomeSource !== undefined && body.incomeSource !== null) {
          const allowedIncomeSources = new Set(['gaji', 'bonus', 'cashback', 'reimbursement', 'other']);
          if (!allowedIncomeSources.has(body.incomeSource)) {
            throw new AppError("Invalid incomeSource value", 400, 'INVALID_INPUT');
          }
          incomeSource = body.incomeSource;
        }
      } else if (type === 'transfer') {
        if (!body.fromPocketId || !body.toPocketId) {
          throw new AppError("Fields 'fromPocketId' and 'toPocketId' are required for transfer", 400, 'INVALID_INPUT');
        }
        fromPocketId = validateUuidV4(body.fromPocketId, 'fromPocketId');
        toPocketId = validateUuidV4(body.toPocketId, 'toPocketId');

        if (fromPocketId === toPocketId) {
          throw new AppError('fromPocketId and toPocketId must be distinct', 422, 'INVALID_REFERENCE');
        }

        if (body.pocketId !== undefined || body.categoryId !== undefined || body.incomeSource !== undefined) {
          throw new AppError('Disallowed topology fields for transfer transaction', 400, 'INVALID_INPUT');
        }

        const allowedTransferTypes = new Set([
          'normal',
          'tarik-tunai',
          'top-up-nfc',
          'reimbursement',
          'saving-allocation',
          'budget-reallocation',
        ]);
        if (!body.transferType || !allowedTransferTypes.has(body.transferType)) {
          throw new AppError("Field 'transferType' is required and must be valid for transfer", 400, 'INVALID_INPUT');
        }
        transferType = body.transferType;
      }

      const canonicalHash = computeCanonicalRequestHash('POST', '/v1/transactions', body);

      if (resolving) {
        return reply.status(200).send(await resolveCreateAttempt(user.id, clientMutationId, canonicalHash));
      }

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

      // Execute SQL Transaction
      const responsePayload = await runIdempotentMutation(db, user.id, clientMutationId, canonicalHash, async (tx) => {
        let budgetPocketId: string | null = null;

        if (type === 'expense') {
          // Lock payment pocket FOR UPDATE
          const [paymentPocket] = await tx
            .select()
            .from(pockets)
            .where(and(eq(pockets.id, pocketId!), eq(pockets.userId, user.id)))
            .for('update');

          if (!paymentPocket || paymentPocket.isArchived || !paymentPocket.isActive) {
            throw new AppError('Payment pocket not found or inactive', 422, 'INVALID_REFERENCE');
          }

          // Validate Category Scoping (DEC-030.4)
          if (categoryId) {
            const [catRow] = await tx
              .select()
              .from(categories)
              .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)));

            if (!catRow || catRow.isArchived || !catRow.isActive || catRow.pocketId !== pocketId) {
              throw new AppError(
                'Referenced category not found, inactive, or not belonging to payment pocket',
                422,
                'INVALID_REFERENCE'
              );
            }
          }

          // Derive budgetPocketId Snapshot (DEC-024 / DEC-030)
          if (paymentPocket.templateKey === 'cash' || paymentPocket.templateKey === 'nfc-card') {
            budgetPocketId = paymentPocket.budgetOwnerPocketId ?? paymentPocket.id;
          } else {
            budgetPocketId = paymentPocket.id;
          }

          // Negative balance rejection (DEC-030.3)
          const currentBalance = await getDerivedPocketBalance(tx, user.id, pocketId!);
          if (currentBalance < amount) {
            throw new AppError(
              'Insufficient funds in pocket. Expense would result in a negative balance.',
              422,
              'INSUFFICIENT_FUNDS'
            );
          }
        } else if (type === 'income') {
          // Lock destination pocket FOR UPDATE
          const [destPocket] = await tx
            .select()
            .from(pockets)
            .where(and(eq(pockets.id, pocketId!), eq(pockets.userId, user.id)))
            .for('update');

          if (!destPocket || destPocket.isArchived || !destPocket.isActive) {
            throw new AppError('Destination pocket not found or inactive', 422, 'INVALID_REFERENCE');
          }

          budgetPocketId = null;
        } else if (type === 'transfer') {
          // Lock source and destination pockets FOR UPDATE
          const lockedPockets = await tx
            .select()
            .from(pockets)
            .where(and(inArray(pockets.id, [fromPocketId!, toPocketId!]), eq(pockets.userId, user.id)))
            .for('update');

          if (lockedPockets.length < 2) {
            throw new AppError('Source or destination pocket not found', 422, 'INVALID_REFERENCE');
          }

          const fromP = lockedPockets.find((p) => p.id === fromPocketId);
          const toP = lockedPockets.find((p) => p.id === toPocketId);

          if (!fromP || fromP.isArchived || !fromP.isActive || !toP || toP.isArchived || !toP.isActive) {
            throw new AppError('Source or destination pocket is archived or inactive', 422, 'INVALID_REFERENCE');
          }

          // Negative balance rejection on source pocket (DEC-030.3)
          const fromBalance = await getDerivedPocketBalance(tx, user.id, fromPocketId!);
          if (fromBalance < amount) {
            throw new AppError(
              'Insufficient funds in source pocket. Transfer would result in a negative balance.',
              422,
              'INSUFFICIENT_FUNDS'
            );
          }

          // Budget Reallocation logic (DEC-023 / DEC-030.5 / DEC-030.9 / DEC-030.11)
          if (transferType === 'budget-reallocation') {
            const { startDate, endDate } = getBudgetPeriodForDate(occurredOn);

            // Find or Auto-Create Budget Period (DEC-030.11)
            let periodRow = (
              await tx
                .select()
                .from(budgetPeriods)
                .where(
                  and(
                    eq(budgetPeriods.userId, user.id),
                    eq(budgetPeriods.startDate, startDate),
                    eq(budgetPeriods.endDate, endDate)
                  )
                )
                .limit(1)
            )[0];

            if (!periodRow) {
              const [newPeriod] = await tx
                .insert(budgetPeriods)
                .values({
                  userId: user.id,
                  startDate,
                  endDate,
                })
                .returning();
              periodRow = newPeriod;
            }

            const targetPeriodId = periodRow.id;

            // Find or Auto-Create Allocation for fromPocketId (DEC-030.9)
            let [fromAllocRow] = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, targetPeriodId),
                  eq(pocketBudgetAllocations.pocketId, fromPocketId!)
                )
              )
              .for('update');

            if (!fromAllocRow) {
              const [inserted] = await tx
                .insert(pocketBudgetAllocations)
                .values({
                  budgetPeriodId: targetPeriodId,
                  pocketId: fromPocketId!,
                  allocatedAmount: 0,
                })
                .returning();
              fromAllocRow = inserted;
            }

            // Find or Auto-Create Allocation for toPocketId (DEC-030.9)
            let [toAllocRow] = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, targetPeriodId),
                  eq(pocketBudgetAllocations.pocketId, toPocketId!)
                )
              )
              .for('update');

            if (!toAllocRow) {
              const [inserted] = await tx
                .insert(pocketBudgetAllocations)
                .values({
                  budgetPeriodId: targetPeriodId,
                  pocketId: toPocketId!,
                  allocatedAmount: 0,
                })
                .returning();
              toAllocRow = inserted;
            }

            const fromAllocAmount = Number(fromAllocRow.allocatedAmount);
            const toAllocAmount = Number(toAllocRow.allocatedAmount);

            // Check floor against recorded expenses (DEC-030.5)
            const recordedExpenses = await getRecordedExpensesForPocketInPeriod(
              tx,
              user.id,
              fromPocketId!,
              startDate,
              endDate
            );

            const revisedFromAlloc = fromAllocAmount - amount;
            if (fromAllocAmount < amount || revisedFromAlloc < recordedExpenses) {
              throw new AppError(
                'Reallocated budget allocation cannot be less than expenses already incurred in this period',
                422,
                'INSUFFICIENT_ALLOCATION'
              );
            }

            // Apply allocation updates
            await tx
              .update(pocketBudgetAllocations)
              .set({
                allocatedAmount: revisedFromAlloc,
                revision: fromAllocRow.revision + 1,
                updatedAt: new Date(),
              })
              .where(eq(pocketBudgetAllocations.id, fromAllocRow.id));

            await tx
              .update(pocketBudgetAllocations)
              .set({
                allocatedAmount: toAllocAmount + amount,
                revision: toAllocRow.revision + 1,
                updatedAt: new Date(),
              })
              .where(eq(pocketBudgetAllocations.id, toAllocRow.id));
          }

          budgetPocketId = null;
        }

        // Insert Transaction Record
        const [createdTxn] = await tx
          .insert(transactions)
          .values({
            userId: user.id,
            type,
            amount,
            pocketId,
            fromPocketId,
            toPocketId,
            categoryId,
            budgetPocketId,
            transferType,
            incomeSource,
            occurredOn,
            occurredAtLocalTime,
            note,
          })
          .returning();

        const payload = { transaction: mapTransactionRow(createdTxn) };

        // Save Idempotency Record
        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 201,
            body: payload,
          }),
        });

        return payload;
      });

      return reply.status(201).send(responsePayload);
    }
  );

  }

  // POST /v1/transactions/batch
  app.post(
    '/v1/transactions/batch',
    { preHandler: [authenticateRequest, validateCsrfToken] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user!;
      const body = (req.body || {}) as Record<string, any>;

      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      const allowedRootKeys = new Set(['clientMutationId', 'items']);
      for (const key of Object.keys(body)) {
        if (!allowedRootKeys.has(key)) {
          throw new AppError(`Unknown or disallowed property '${key}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const rootClientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
        throw new AppError("Field 'items' must be an array with 1 to 50 items", 400, 'INVALID_INPUT');
      }

      const allowedItemKeys = new Set([
        'clientMutationId',
        'type',
        'amount',
        'pocketId',
        'categoryId',
        'occurredOn',
        'occurredAtLocalTime',
        'note',
      ]);

      const seenItemMutationIds = new Set<string>();

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          throw new AppError(`Item at index ${i} must be a JSON object`, 400, 'INVALID_INPUT');
        }

        for (const k of Object.keys(item)) {
          if (!allowedItemKeys.has(k)) {
            throw new AppError(`Unknown or disallowed property '${k}' in item at index ${i}`, 400, 'INVALID_INPUT');
          }
        }

        if (!item.clientMutationId) {
          throw new AppError(`Field 'clientMutationId' is required in item at index ${i}`, 400, 'INVALID_INPUT');
        }
        const itemMutationId = validateUuidV4(item.clientMutationId, `items[${i}].clientMutationId`);
        if (itemMutationId.toLowerCase() === rootClientMutationId.toLowerCase() || seenItemMutationIds.has(itemMutationId.toLowerCase())) {
          throw new AppError(`Duplicate clientMutationId '${itemMutationId}' within batch items`, 400, 'INVALID_INPUT');
        }
        seenItemMutationIds.add(itemMutationId.toLowerCase());

        if (item.type !== 'expense') {
          throw new AppError(`Field 'type' in item at index ${i} must be 'expense'`, 400, 'INVALID_INPUT');
        }

        if (typeof item.amount !== 'number' || !Number.isInteger(item.amount) || item.amount < 1 || item.amount > 9007199254740991) {
          throw new AppError(`Field 'amount' in item at index ${i} must be a positive integer Rupiah value`, 400, 'INVALID_INPUT');
        }

        if (!item.pocketId) {
          throw new AppError(`Field 'pocketId' is required in item at index ${i}`, 400, 'INVALID_INPUT');
        }
        validateUuidV4(item.pocketId, `items[${i}].pocketId`);

        if (item.categoryId !== undefined && item.categoryId !== null) {
          validateUuidV4(item.categoryId, `items[${i}].categoryId`);
        }

        if (!item.occurredOn) {
          throw new AppError(`Field 'occurredOn' is required in item at index ${i}`, 400, 'INVALID_INPUT');
        }
        validateDateString(item.occurredOn, `items[${i}].occurredOn`);

        if (!item.occurredAtLocalTime) {
          throw new AppError(`Field 'occurredAtLocalTime' is required in item at index ${i}`, 400, 'INVALID_INPUT');
        }
        validateTimeString(item.occurredAtLocalTime, `items[${i}].occurredAtLocalTime`);

        if (item.note !== undefined && item.note !== null) {
          if (typeof item.note !== 'string') {
            throw new AppError(`Field 'note' in item at index ${i} must be a string`, 400, 'INVALID_INPUT');
          }
          if (item.note.length > 500) {
            throw new AppError(`Field 'note' in item at index ${i} must not exceed 500 characters`, 400, 'INVALID_INPUT');
          }
        }
      }

      const rootCanonicalHash = computeCanonicalRequestHash('POST', '/v1/transactions/batch', body);

      // Pre-lock Root Idempotency Check
      const existingRootRecord = await findIdempotencyRecord(user.id, rootClientMutationId);
      if (existingRootRecord) {
        if (existingRootRecord.requestHash === rootCanonicalHash && existingRootRecord.responseReference) {
          const env = parseReplayEnvelope(existingRootRecord.responseReference);
          return reply.status(env.statusCode).send(env.body);
        }
        throw new AppError(
          'clientMutationId reused with a different request payload, HTTP method, or route path.',
          409,
          'IDEMPOTENCY_CONFLICT'
        );
      }

      // Pre-lock Item Idempotency Checks
      for (const item of body.items) {
        const itemCanonicalHash = computeCanonicalRequestHash('POST', '/v1/transactions', {
          clientMutationId: item.clientMutationId,
          type: item.type,
          amount: item.amount,
          pocketId: item.pocketId,
          ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
          occurredOn: item.occurredOn,
          occurredAtLocalTime: item.occurredAtLocalTime,
          ...(item.note !== undefined ? { note: item.note } : {}),
        });

        const existingItemRecord = await findIdempotencyRecord(user.id, item.clientMutationId);
        if (existingItemRecord && existingItemRecord.requestHash !== itemCanonicalHash) {
          throw new AppError(
            `Item clientMutationId '${item.clientMutationId}' reused with a different request payload, HTTP method, or route path.`,
            409,
            'IDEMPOTENCY_CONFLICT'
          );
        }
      }

      const db = getDb();

      // Execute SQL Transaction
      const responsePayload = await runIdempotentMutation(db, user.id, rootClientMutationId, rootCanonicalHash, async (tx) => {
        const replays = new Map<string, TransactionResponse>();
        for (const item of body.items) {
          const record = await findIdempotencyRecord(user.id, item.clientMutationId, tx);
          if (record) {
            const hash = computeCanonicalRequestHash('POST', '/v1/transactions', item);
            if (record.requestHash !== hash || !record.responseReference) {
              throw new AppError('Batch item mutation ID has a different payload.', 409, 'IDEMPOTENCY_CONFLICT');
            }
            const envelope = parseReplayEnvelope(record.responseReference);
            replays.set(item.clientMutationId, (envelope.body as { transaction: TransactionResponse }).transaction);
          }
        }
        const pendingItems = body.items.filter((item: any) => !replays.has(item.clientMutationId));
        const uniquePocketIds: string[] = Array.from(new Set<string>(pendingItems.map((i: any) => i.pocketId as string)));

        // Lock all referenced pockets FOR UPDATE
        const lockedPockets = await tx
          .select()
          .from(pockets)
          .where(and(inArray(pockets.id, uniquePocketIds), eq(pockets.userId, user.id)))
          .for('update');

        if (lockedPockets.length < uniquePocketIds.length) {
          throw new AppError('Payment pocket not found', 422, 'INVALID_REFERENCE');
        }

        for (const p of lockedPockets) {
          if (p.isArchived || !p.isActive) {
            throw new AppError('Payment pocket is archived or inactive', 422, 'INVALID_REFERENCE');
          }
        }

        // Validate categories
        for (let i = 0; i < pendingItems.length; i++) {
          const item = pendingItems[i];
          if (item.categoryId) {
            const [catRow] = await tx
              .select()
              .from(categories)
              .where(and(eq(categories.id, item.categoryId), eq(categories.userId, user.id)));

            if (!catRow || catRow.isArchived || !catRow.isActive || catRow.pocketId !== item.pocketId) {
              throw new AppError(
                `Referenced category in item at index ${i} not found, inactive, or not belonging to payment pocket`,
                422,
                'INVALID_REFERENCE'
              );
            }
          }
        }

        // Combined Balance Checks (DEC-030.3)
        for (const pocket of lockedPockets) {
          const currentBalance = await getDerivedPocketBalance(tx, user.id, pocket.id);
          const totalDeduction = pendingItems
            .filter((i: any) => i.pocketId === pocket.id)
            .reduce((sum: number, i: any) => sum + i.amount, 0);

          if (currentBalance < totalDeduction) {
            throw new AppError(
              'Insufficient funds in pocket. Expense would result in a negative balance.',
              422,
              'INSUFFICIENT_FUNDS'
            );
          }
        }

        // Insert transaction records
        const createdTransactions: TransactionResponse[] = [];

        for (const item of body.items) {
          const replay = replays.get(item.clientMutationId);
          if (replay) {
            createdTransactions.push(replay);
            continue;
          }
          const pocket = lockedPockets.find((p) => p.id === item.pocketId)!;
          let budgetPocketId: string;
          if (pocket.templateKey === 'cash' || pocket.templateKey === 'nfc-card') {
            budgetPocketId = pocket.budgetOwnerPocketId ?? pocket.id;
          } else {
            budgetPocketId = pocket.id;
          }

          const [createdTxn] = await tx
            .insert(transactions)
            .values({
              userId: user.id,
              type: 'expense',
              amount: item.amount,
              pocketId: item.pocketId,
              categoryId: item.categoryId ?? null,
              budgetPocketId,
              occurredOn: item.occurredOn,
              occurredAtLocalTime: item.occurredAtLocalTime,
              note: item.note ? item.note.trim() || null : null,
            })
            .returning();

          const mapped = mapTransactionRow(createdTxn);
          createdTransactions.push(mapped);

          // Save Item Idempotency Record
          const itemCanonicalHash = computeCanonicalRequestHash('POST', '/v1/transactions', {
            clientMutationId: item.clientMutationId,
            type: item.type,
            amount: item.amount,
            pocketId: item.pocketId,
            ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
            occurredOn: item.occurredOn,
            occurredAtLocalTime: item.occurredAtLocalTime,
            ...(item.note !== undefined ? { note: item.note } : {}),
          });

          await tx
            .insert(idempotencyRecords)
            .values({
              userId: user.id,
              clientMutationId: item.clientMutationId,
              requestHash: itemCanonicalHash,
              responseReference: JSON.stringify({
                version: 1,
                statusCode: 201,
                body: { transaction: mapped },
              }),
            });
        }

        const batchPayload = { transactions: createdTransactions };

        // Save Root Batch Idempotency Record
        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId: rootClientMutationId,
          requestHash: rootCanonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 201,
            body: batchPayload,
          }),
        });

        return batchPayload;
      }, body.items.map((item: any) => item.clientMutationId));

      return reply.status(201).send(responsePayload);
    }
  );

  // PATCH and edit resolution share shape validation and original request hashing.
  const handleEdit = async (req: FastifyRequest, reply: FastifyReply, resolving = false) => {
      const user = req.user!;
      const params = (req.params || {}) as Record<string, string>;
      const transactionId = validateUuidV4(params.id, 'id');

      const wrapper = (req.body || {}) as Record<string, any>;
      if(resolving && (!wrapper || typeof wrapper!=='object' || Array.isArray(wrapper) ||
        Object.keys(wrapper).some(key=>!['operation','clientMutationId','expectedRevision','changes'].includes(key)) ||
        wrapper.operation!=='edit' || !wrapper.changes || typeof wrapper.changes!=='object' || Array.isArray(wrapper.changes) ||
        Object.keys(wrapper.changes).some(key=>['clientMutationId','expectedRevision'].includes(key)))) {
        throw new AppError('Invalid edit resolution request',400,'INVALID_INPUT');
      }
      const body = resolving ? {...wrapper.changes,clientMutationId:wrapper.clientMutationId,expectedRevision:wrapper.expectedRevision} : wrapper;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      const allowedBodyKeys = new Set([
        'clientMutationId',
        'expectedRevision',
        'amount',
        'pocketId',
        'fromPocketId',
        'toPocketId',
        'categoryId',
        'transferType',
        'incomeSource',
        'occurredOn',
        'occurredAtLocalTime',
        'note',
      ]);

      for (const k of Object.keys(body)) {
        if (!allowedBodyKeys.has(k)) {
          throw new AppError(`Unknown or disallowed property '${k}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (
        typeof body.expectedRevision !== 'number' ||
        !Number.isSafeInteger(body.expectedRevision) ||
        body.expectedRevision < 1
      ) {
        throw new AppError("Field 'expectedRevision' must be a positive integer", 400, 'INVALID_INPUT');
      }
      const expectedRevision = body.expectedRevision;

      const mutableKeys = [
        'amount',
        'pocketId',
        'fromPocketId',
        'toPocketId',
        'categoryId',
        'transferType',
        'incomeSource',
        'occurredOn',
        'occurredAtLocalTime',
        'note',
      ];

      const suppliedMutableKeys = mutableKeys.filter((k) => k in body);
      if (suppliedMutableKeys.length === 0) {
        throw new AppError('At least one mutable field must be provided in PATCH request', 400, 'INVALID_INPUT');
      }

      // Pre-validate field values if supplied
      if (body.amount !== undefined) {
        if (typeof body.amount !== 'number' || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 9007199254740991) {
          throw new AppError("Field 'amount' must be a positive integer Rupiah value", 400, 'INVALID_INPUT');
        }
      }

      if (body.pocketId !== undefined) {
        validateUuidV4(body.pocketId, 'pocketId');
      }

      if (body.fromPocketId !== undefined) {
        validateUuidV4(body.fromPocketId, 'fromPocketId');
      }

      if (body.toPocketId !== undefined) {
        validateUuidV4(body.toPocketId, 'toPocketId');
      }

      if (body.categoryId !== undefined && body.categoryId !== null) {
        validateUuidV4(body.categoryId, 'categoryId');
      }

      if (body.transferType !== undefined) {
        const allowedTransferTypes = new Set([
          'normal',
          'tarik-tunai',
          'top-up-nfc',
          'reimbursement',
          'saving-allocation',
          'budget-reallocation',
        ]);
        if (!allowedTransferTypes.has(body.transferType)) {
          throw new AppError("Invalid 'transferType' value", 400, 'INVALID_INPUT');
        }
      }

      if (body.incomeSource !== undefined && body.incomeSource !== null) {
        const allowedIncomeSources = new Set(['gaji', 'bonus', 'cashback', 'reimbursement', 'other']);
        if (!allowedIncomeSources.has(body.incomeSource)) {
          throw new AppError("Invalid 'incomeSource' value", 400, 'INVALID_INPUT');
        }
      }

      if (body.occurredOn !== undefined) {
        validateDateString(body.occurredOn, 'occurredOn');
      }

      if (body.occurredAtLocalTime !== undefined) {
        validateTimeString(body.occurredAtLocalTime, 'occurredAtLocalTime');
      }

      if (body.note !== undefined && body.note !== null) {
        if (typeof body.note !== 'string') {
          throw new AppError("Field 'note' must be a string", 400, 'INVALID_INPUT');
        }
        if (body.note.length > 500) {
          throw new AppError("Field 'note' must not exceed 500 characters", 400, 'INVALID_INPUT');
        }
      }

      const canonicalHash = computeCanonicalRequestHash('PATCH', `/v1/transactions/${transactionId}`, body);

      if(resolving){
        return reply.status(200).send(await resolveEditAttempt(user.id,clientMutationId,canonicalHash,transactionId,expectedRevision));
      }

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

      // Execute SQL Transaction
      const responsePayload = await runIdempotentMutation(db, user.id, clientMutationId, canonicalHash, async (tx) => {
        // Lock target transaction row FOR UPDATE
        const [existingTxn] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
          .for('update');

        if (!existingTxn || existingTxn.deletedAt !== null) {
          throw new AppError('Transaction not found', 404, 'NOT_FOUND');
        }

        if (existingTxn.revision !== expectedRevision) {
          throw new AppError('Revision conflict. The transaction was modified by another request.', 409, 'REVISION_CONFLICT');
        }

        // Validate topology-specific field permissions
        if (existingTxn.type === 'expense') {
          if (
            body.fromPocketId !== undefined ||
            body.toPocketId !== undefined ||
            body.transferType !== undefined ||
            body.incomeSource !== undefined
          ) {
            throw new AppError('Disallowed topology fields for expense transaction update', 400, 'INVALID_INPUT');
          }
        } else if (existingTxn.type === 'income') {
          if (
            body.fromPocketId !== undefined ||
            body.toPocketId !== undefined ||
            body.categoryId !== undefined ||
            body.transferType !== undefined
          ) {
            throw new AppError('Disallowed topology fields for income transaction update', 400, 'INVALID_INPUT');
          }
        } else if (existingTxn.type === 'transfer') {
          if (body.pocketId !== undefined || body.categoryId !== undefined || body.incomeSource !== undefined) {
            throw new AppError('Disallowed topology fields for transfer transaction update', 400, 'INVALID_INPUT');
          }
        }

        // Compute proposed new values
        const newAmount = body.amount !== undefined ? body.amount : Number(existingTxn.amount);
        const newPocketId = body.pocketId !== undefined ? body.pocketId : existingTxn.pocketId;
        const newFromPocketId = body.fromPocketId !== undefined ? body.fromPocketId : existingTxn.fromPocketId;
        const newToPocketId = body.toPocketId !== undefined ? body.toPocketId : existingTxn.toPocketId;
        const newCategoryId =
          body.categoryId !== undefined ? (body.categoryId ?? null) : existingTxn.categoryId;
        const newTransferType =
          body.transferType !== undefined ? (body.transferType ?? null) : existingTxn.transferType;
        const newIncomeSource =
          body.incomeSource !== undefined ? (body.incomeSource ?? null) : existingTxn.incomeSource;
        const newOccurredOn = body.occurredOn !== undefined ? body.occurredOn : existingTxn.occurredOn;
        const newOccurredAtLocalTime =
          body.occurredAtLocalTime !== undefined ? body.occurredAtLocalTime : existingTxn.occurredAtLocalTime;
        const newNote =
          body.note !== undefined ? (body.note ? body.note.trim() || null : null) : existingTxn.note;

        if (existingTxn.type === 'transfer' && newFromPocketId === newToPocketId) {
          throw new AppError('fromPocketId and toPocketId must be distinct', 422, 'INVALID_REFERENCE');
        }

        // Check No-Op (DEC-030.10)
        const isNoOp =
          newAmount === Number(existingTxn.amount) &&
          newPocketId === existingTxn.pocketId &&
          newFromPocketId === existingTxn.fromPocketId &&
          newToPocketId === existingTxn.toPocketId &&
          newCategoryId === existingTxn.categoryId &&
          newTransferType === existingTxn.transferType &&
          newIncomeSource === existingTxn.incomeSource &&
          newOccurredOn === existingTxn.occurredOn &&
          newOccurredAtLocalTime === existingTxn.occurredAtLocalTime &&
          newNote === existingTxn.note;

        if (isNoOp) {
          const payload = { transaction: mapTransactionRow(existingTxn) };
          await tx
            .insert(idempotencyRecords)
            .values({
              userId: user.id,
              clientMutationId,
              requestHash: canonicalHash,
              responseReference: JSON.stringify({
                version: 1,
                statusCode: 200,
                body: payload,
              }),
            })
            .onConflictDoNothing();
          return payload;
        }

        // Validate newly referenced pockets & categories
        const affectedPocketIds = Array.from(
          new Set(
            [
              existingTxn.pocketId,
              existingTxn.fromPocketId,
              existingTxn.toPocketId,
              newPocketId,
              newFromPocketId,
              newToPocketId,
            ].filter((id): id is string => typeof id === 'string')
          )
        );

        const lockedPockets = await tx
          .select()
          .from(pockets)
          .where(and(inArray(pockets.id, affectedPocketIds), eq(pockets.userId, user.id)))
          .for('update');

        if (lockedPockets.length < affectedPocketIds.length) {
          throw new AppError('Referenced pocket not found', 422, 'INVALID_REFERENCE');
        }

        // Check target pockets active status
        const targetPockets = lockedPockets.filter((p) => {
          if (existingTxn.type === 'expense' || existingTxn.type === 'income') {
            return p.id === newPocketId;
          } else {
            return p.id === newFromPocketId || p.id === newToPocketId;
          }
        });

        for (const p of targetPockets) {
          if (p.isArchived || !p.isActive) {
            throw new AppError('Target pocket is archived or inactive', 422, 'INVALID_REFERENCE');
          }
        }

        // Validate category if expense
        if (existingTxn.type === 'expense' && newCategoryId) {
          const [catRow] = await tx
            .select()
            .from(categories)
            .where(and(eq(categories.id, newCategoryId), eq(categories.userId, user.id)));

          if (!catRow || catRow.isArchived || !catRow.isActive || catRow.pocketId !== newPocketId) {
            throw new AppError(
              'Referenced category not found, inactive, or not belonging to payment pocket',
              422,
              'INVALID_REFERENCE'
            );
          }
        }

        // Derive Budget Snapshot (DEC-024)
        let newBudgetPocketId: string | null = null;
        if (existingTxn.type === 'expense') {
          const paymentPocket = lockedPockets.find((p) => p.id === newPocketId)!;
          if (newPocketId !== existingTxn.pocketId) {
            // Payment pocket changed -> derive new snapshot
            if (paymentPocket.templateKey === 'cash' || paymentPocket.templateKey === 'nfc-card') {
              newBudgetPocketId = paymentPocket.budgetOwnerPocketId ?? paymentPocket.id;
            } else {
              newBudgetPocketId = paymentPocket.id;
            }
          } else {
            // Preserve existing snapshot
            newBudgetPocketId = existingTxn.budgetPocketId ?? paymentPocket.id;
          }
        }

        // Budget Reallocation updates (DEC-023 / DEC-030.5 / DEC-030.11)
        if (existingTxn.transferType === 'budget-reallocation' || newTransferType === 'budget-reallocation') {
          // 1. Reverse prior allocation if existing was budget-reallocation
          if (existingTxn.transferType === 'budget-reallocation') {
            const oldPeriodDates = getBudgetPeriodForDate(existingTxn.occurredOn);
            const [oldPeriod] = await tx
              .select()
              .from(budgetPeriods)
              .where(
                and(
                  eq(budgetPeriods.userId, user.id),
                  eq(budgetPeriods.startDate, oldPeriodDates.startDate),
                  eq(budgetPeriods.endDate, oldPeriodDates.endDate)
                )
              );

            if (oldPeriod) {
              const oldAllocs = await tx
                .select()
                .from(pocketBudgetAllocations)
                .where(
                  and(
                    eq(pocketBudgetAllocations.budgetPeriodId, oldPeriod.id),
                    inArray(pocketBudgetAllocations.pocketId, [
                      existingTxn.fromPocketId!,
                      existingTxn.toPocketId!,
                    ])
                  )
                )
                .for('update');

              const oldFromAlloc = oldAllocs.find((a) => a.pocketId === existingTxn.fromPocketId);
              const oldToAlloc = oldAllocs.find((a) => a.pocketId === existingTxn.toPocketId);

              if (oldFromAlloc) {
                await tx
                  .update(pocketBudgetAllocations)
                  .set({
                    allocatedAmount: Number(oldFromAlloc.allocatedAmount) + Number(existingTxn.amount),
                    revision: oldFromAlloc.revision + 1,
                    updatedAt: new Date(),
                  })
                  .where(eq(pocketBudgetAllocations.id, oldFromAlloc.id));
              }

              if (oldToAlloc) {
                await tx
                  .update(pocketBudgetAllocations)
                  .set({
                    allocatedAmount: Number(oldToAlloc.allocatedAmount) - Number(existingTxn.amount),
                    revision: oldToAlloc.revision + 1,
                    updatedAt: new Date(),
                  })
                  .where(eq(pocketBudgetAllocations.id, oldToAlloc.id));
              }
            }
          }

          // 2. Apply new allocation if new is budget-reallocation
          if (newTransferType === 'budget-reallocation') {
            const newPeriodDates = getBudgetPeriodForDate(newOccurredOn);
            let [newPeriod] = await tx
              .select()
              .from(budgetPeriods)
              .where(
                and(
                  eq(budgetPeriods.userId, user.id),
                  eq(budgetPeriods.startDate, newPeriodDates.startDate),
                  eq(budgetPeriods.endDate, newPeriodDates.endDate)
                )
              );

            if (!newPeriod) {
              const [inserted] = await tx
                .insert(budgetPeriods)
                .values({
                  userId: user.id,
                  startDate: newPeriodDates.startDate,
                  endDate: newPeriodDates.endDate,
                })
                .returning();
              newPeriod = inserted;
            }

            // Get or create allocations
            let [fromAllocRow] = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, newPeriod.id),
                  eq(pocketBudgetAllocations.pocketId, newFromPocketId!)
                )
              )
              .for('update');

            if (!fromAllocRow) {
              const [inserted] = await tx
                .insert(pocketBudgetAllocations)
                .values({
                  budgetPeriodId: newPeriod.id,
                  pocketId: newFromPocketId!,
                  allocatedAmount: 0,
                })
                .returning();
              fromAllocRow = inserted;
            }

            let [toAllocRow] = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, newPeriod.id),
                  eq(pocketBudgetAllocations.pocketId, newToPocketId!)
                )
              )
              .for('update');

            if (!toAllocRow) {
              const [inserted] = await tx
                .insert(pocketBudgetAllocations)
                .values({
                  budgetPeriodId: newPeriod.id,
                  pocketId: newToPocketId!,
                  allocatedAmount: 0,
                })
                .returning();
              toAllocRow = inserted;
            }

            const fromAllocAmount = Number(fromAllocRow.allocatedAmount);
            const toAllocAmount = Number(toAllocRow.allocatedAmount);

            // Check floor against recorded expenses in target period
            const recordedExpenses = await getRecordedExpensesForPocketInPeriod(
              tx,
              user.id,
              newFromPocketId!,
              newPeriodDates.startDate,
              newPeriodDates.endDate
            );

            const revisedFromAlloc = fromAllocAmount - newAmount;
            if (fromAllocAmount < newAmount || revisedFromAlloc < recordedExpenses) {
              throw new AppError(
                'Reallocated budget allocation cannot be less than expenses already incurred in this period',
                422,
                'INSUFFICIENT_ALLOCATION'
              );
            }

            // Apply new allocation updates
            await tx
              .update(pocketBudgetAllocations)
              .set({
                allocatedAmount: revisedFromAlloc,
                revision: fromAllocRow.revision + 1,
                updatedAt: new Date(),
              })
              .where(eq(pocketBudgetAllocations.id, fromAllocRow.id));

            await tx
              .update(pocketBudgetAllocations)
              .set({
                allocatedAmount: toAllocAmount + newAmount,
                revision: toAllocRow.revision + 1,
                updatedAt: new Date(),
              })
              .where(eq(pocketBudgetAllocations.id, toAllocRow.id));
          }
        }

        // Derived Balance Overdraft Check (DEC-030.3)
        // Verify resulting balances of all affected pockets
        if (existingTxn.archivedAt === null) {
          for (const pocket of lockedPockets) {
            const currentBal = await getDerivedPocketBalance(tx, user.id, pocket.id);
            let netChange = 0;

            // Reverse existing effect
            if (existingTxn.type === 'expense' && existingTxn.pocketId === pocket.id) {
              netChange += Number(existingTxn.amount);
            } else if (existingTxn.type === 'income' && existingTxn.pocketId === pocket.id) {
              netChange -= Number(existingTxn.amount);
            } else if (existingTxn.type === 'transfer') {
              if (existingTxn.fromPocketId === pocket.id) {
                netChange += Number(existingTxn.amount);
              }
              if (existingTxn.toPocketId === pocket.id) {
                netChange -= Number(existingTxn.amount);
              }
            }

            // Apply new effect
            if (existingTxn.type === 'expense' && newPocketId === pocket.id) {
              netChange -= newAmount;
            } else if (existingTxn.type === 'income' && newPocketId === pocket.id) {
              netChange += newAmount;
            } else if (existingTxn.type === 'transfer') {
              if (newFromPocketId === pocket.id) {
                netChange -= newAmount;
              }
              if (newToPocketId === pocket.id) {
                netChange += newAmount;
              }
            }

            if (currentBal + netChange < 0) {
              throw new AppError(
                'Insufficient funds in pocket. Update would result in a negative balance.',
                422,
                'INSUFFICIENT_FUNDS'
              );
            }
          }
        }

        // Execute Transaction Row Update
        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            amount: newAmount,
            pocketId: existingTxn.type === 'transfer' ? null : newPocketId,
            fromPocketId: existingTxn.type === 'transfer' ? newFromPocketId : null,
            toPocketId: existingTxn.type === 'transfer' ? newToPocketId : null,
            categoryId: existingTxn.type === 'expense' ? newCategoryId : null,
            budgetPocketId: newBudgetPocketId,
            transferType: existingTxn.type === 'transfer' ? newTransferType : null,
            incomeSource: existingTxn.type === 'income' ? newIncomeSource : null,
            occurredOn: newOccurredOn,
            occurredAtLocalTime: newOccurredAtLocalTime,
            note: newNote,
            revision: existingTxn.revision + 1,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, existingTxn.id))
          .returning();

        const payload = { transaction: mapTransactionRow(updatedTxn) };

        // Save Idempotency Record
        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 200,
            body: payload,
          }),
        });

        return payload;
      });

      return reply.status(200).send(responsePayload);
    };
  app.patch('/v1/transactions/:id', {preHandler:[authenticateRequest,validateCsrfToken]},
    (req,reply)=>handleEdit(req,reply));

  // Resolve confirmed lifecycle/delete/edit attempts using their original request identity.
  app.post('/v1/transactions/:id/resolve-attempt',
    {preHandler: [authenticateRequest, validateCsrfToken]}, async (req, reply) => {
      const transactionId = validateUuidV4((req.params as {id:string}).id, 'id');
      const body = req.body as Record<string, unknown>;
      if(body && typeof body==='object' && !Array.isArray(body) && body.operation==='edit')return handleEdit(req,reply,true);
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key => !(body.operation==='delete'?['operation','clientMutationId','expectedRevision','confirmPermanentDelete']:['operation','clientMutationId','expectedRevision']).includes(key)) ||
        (body.operation !== 'archive' && body.operation !== 'restore' && body.operation !== 'delete') ||
        (body.operation==='delete'&&body.confirmPermanentDelete!==true) ||
        typeof body.expectedRevision !== 'number' || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1) {
        throw new AppError('Invalid lifecycle resolution request', 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');
      if(body.operation==='delete'){
        const hash=computeCanonicalRequestHash('DELETE', `/v1/transactions/${transactionId}`,
          {clientMutationId,expectedRevision:body.expectedRevision,confirmPermanentDelete:body.confirmPermanentDelete});
        return reply.status(200).send(await resolveDeleteAttempt(req.user!.id,clientMutationId,hash,transactionId));
      }
      const originalBody = {clientMutationId, expectedRevision: body.expectedRevision};
      const hash = computeCanonicalRequestHash('POST', `/v1/transactions/${transactionId}/${body.operation}`, originalBody);
      return reply.status(200).send(await resolveLifecycleAttempt(req.user!.id, clientMutationId, hash));
    });

  // POST /v1/transactions/:id/archive
  app.post(
    '/v1/transactions/:id/archive',
    { preHandler: [authenticateRequest, validateCsrfToken] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user!;
      const params = (req.params || {}) as Record<string, string>;
      const transactionId = validateUuidV4(params.id, 'id');

      const body = (req.body || {}) as Record<string, any>;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      const allowedBodyKeys = new Set(['clientMutationId', 'expectedRevision']);
      for (const k of Object.keys(body)) {
        if (!allowedBodyKeys.has(k)) {
          throw new AppError(`Unknown or disallowed property '${k}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (
        typeof body.expectedRevision !== 'number' ||
        !Number.isInteger(body.expectedRevision) ||
        body.expectedRevision < 1
      ) {
        throw new AppError("Field 'expectedRevision' must be a positive integer", 400, 'INVALID_INPUT');
      }
      const expectedRevision = body.expectedRevision;

      const canonicalHash = computeCanonicalRequestHash(
        'POST',
        `/v1/transactions/${transactionId}/archive`,
        body
      );

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

      const responsePayload = await runIdempotentMutation(db, user.id, clientMutationId, canonicalHash, async (tx) => {
        // Lock target transaction row FOR UPDATE
        const [existingTxn] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
          .for('update');

        if (!existingTxn || existingTxn.deletedAt !== null) {
          throw new AppError('Transaction not found', 404, 'NOT_FOUND');
        }

        if (existingTxn.revision !== expectedRevision) {
          throw new AppError(
            'Revision conflict. The transaction was modified by another request.',
            409,
            'REVISION_CONFLICT'
          );
        }

        // Idempotent No-Op Check (already archived)
        if (existingTxn.archivedAt !== null) {
          const payload = { transaction: mapTransactionRow(existingTxn) };
          await tx
            .insert(idempotencyRecords)
            .values({
              userId: user.id,
              clientMutationId,
              requestHash: canonicalHash,
              responseReference: JSON.stringify({
                version: 1,
                statusCode: 200,
                body: payload,
              }),
            })
            .onConflictDoNothing();
          return payload;
        }

        // Handle Budget Reallocation Reversal (DEC-023 / DEC-030.5 / DEC-030.11)
        if (existingTxn.transferType === 'budget-reallocation') {
          const periodDates = getBudgetPeriodForDate(existingTxn.occurredOn);
          const [targetPeriod] = await tx
            .select()
            .from(budgetPeriods)
            .where(
              and(
                eq(budgetPeriods.userId, user.id),
                eq(budgetPeriods.startDate, periodDates.startDate),
                eq(budgetPeriods.endDate, periodDates.endDate)
              )
            );

          if (targetPeriod) {
            const allocs = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, targetPeriod.id),
                  inArray(pocketBudgetAllocations.pocketId, [
                    existingTxn.fromPocketId!,
                    existingTxn.toPocketId!,
                  ])
                )
              )
              .for('update');

            const fromAlloc = allocs.find((a) => a.pocketId === existingTxn.fromPocketId);
            const toAlloc = allocs.find((a) => a.pocketId === existingTxn.toPocketId);

            const toAllocAmount = Number(toAlloc?.allocatedAmount || 0);
            const recordedExpensesTo = await getRecordedExpensesForPocketInPeriod(
              tx,
              user.id,
              existingTxn.toPocketId!,
              periodDates.startDate,
              periodDates.endDate
            );

            const revisedToAlloc = toAllocAmount - Number(existingTxn.amount);
            if (toAllocAmount < Number(existingTxn.amount) || revisedToAlloc < recordedExpensesTo) {
              throw new AppError(
                'Reallocated budget allocation cannot be less than expenses already incurred in this period',
                422,
                'INSUFFICIENT_ALLOCATION'
              );
            }

            if (fromAlloc) {
              await tx
                .update(pocketBudgetAllocations)
                .set({
                  allocatedAmount: Number(fromAlloc.allocatedAmount) + Number(existingTxn.amount),
                  revision: fromAlloc.revision + 1,
                  updatedAt: new Date(),
                })
                .where(eq(pocketBudgetAllocations.id, fromAlloc.id));
            }

            if (toAlloc) {
              await tx
                .update(pocketBudgetAllocations)
                .set({
                  allocatedAmount: revisedToAlloc,
                  revision: toAlloc.revision + 1,
                  updatedAt: new Date(),
                })
                .where(eq(pocketBudgetAllocations.id, toAlloc.id));
            }
          }
        }

        const now = new Date();
        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            archivedAt: now,
            revision: existingTxn.revision + 1,
            updatedAt: now,
          })
          .where(eq(transactions.id, existingTxn.id))
          .returning();

        const payload = { transaction: mapTransactionRow(updatedTxn) };

        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 200,
            body: payload,
          }),
        });

        return payload;
      });

      return reply.status(200).send(responsePayload);
    }
  );

  // POST /v1/transactions/:id/restore
  app.post(
    '/v1/transactions/:id/restore',
    { preHandler: [authenticateRequest, validateCsrfToken] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user!;
      const params = (req.params || {}) as Record<string, string>;
      const transactionId = validateUuidV4(params.id, 'id');

      const body = (req.body || {}) as Record<string, any>;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      const allowedBodyKeys = new Set(['clientMutationId', 'expectedRevision']);
      for (const k of Object.keys(body)) {
        if (!allowedBodyKeys.has(k)) {
          throw new AppError(`Unknown or disallowed property '${k}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (
        typeof body.expectedRevision !== 'number' ||
        !Number.isInteger(body.expectedRevision) ||
        body.expectedRevision < 1
      ) {
        throw new AppError("Field 'expectedRevision' must be a positive integer", 400, 'INVALID_INPUT');
      }
      const expectedRevision = body.expectedRevision;

      const canonicalHash = computeCanonicalRequestHash(
        'POST',
        `/v1/transactions/${transactionId}/restore`,
        body
      );

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

      const responsePayload = await runIdempotentMutation(db, user.id, clientMutationId, canonicalHash, async (tx) => {
        // Lock target transaction row FOR UPDATE
        const [existingTxn] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
          .for('update');

        if (!existingTxn || existingTxn.deletedAt !== null) {
          throw new AppError('Transaction not found', 404, 'NOT_FOUND');
        }

        if (existingTxn.revision !== expectedRevision) {
          throw new AppError(
            'Revision conflict. The transaction was modified by another request.',
            409,
            'REVISION_CONFLICT'
          );
        }

        // Idempotent No-Op Check (already active)
        if (existingTxn.archivedAt === null) {
          const payload = { transaction: mapTransactionRow(existingTxn) };
          await tx
            .insert(idempotencyRecords)
            .values({
              userId: user.id,
              clientMutationId,
              requestHash: canonicalHash,
              responseReference: JSON.stringify({
                version: 1,
                statusCode: 200,
                body: payload,
              }),
            })
            .onConflictDoNothing();
          return payload;
        }

        // Revalidate referenced pockets
        const referencedPocketIds = Array.from(
          new Set(
            [existingTxn.pocketId, existingTxn.fromPocketId, existingTxn.toPocketId].filter(
              (id): id is string => typeof id === 'string'
            )
          )
        );

        const lockedPockets = await tx
          .select()
          .from(pockets)
          .where(and(inArray(pockets.id, referencedPocketIds), eq(pockets.userId, user.id)))
          .for('update');

        if (lockedPockets.length < referencedPocketIds.length) {
          throw new AppError('Referenced pocket not found', 422, 'INVALID_REFERENCE');
        }

        for (const p of lockedPockets) {
          if (p.isArchived || !p.isActive) {
            throw new AppError('Referenced pocket is archived or inactive', 422, 'INVALID_REFERENCE');
          }
        }

        // Revalidate category if expense
        if (existingTxn.type === 'expense' && existingTxn.categoryId) {
          const [catRow] = await tx
            .select()
            .from(categories)
            .where(and(eq(categories.id, existingTxn.categoryId), eq(categories.userId, user.id)));

          if (
            !catRow ||
            catRow.isArchived ||
            !catRow.isActive ||
            catRow.pocketId !== existingTxn.pocketId
          ) {
            throw new AppError(
              'Referenced category not found, inactive, or not belonging to payment pocket',
              422,
              'INVALID_REFERENCE'
            );
          }
        }

        // Revalidate Derived Balance (DEC-030.3)
        const txnAmount = Number(existingTxn.amount);
        if (existingTxn.type === 'expense') {
          const bal = await getDerivedPocketBalance(tx, user.id, existingTxn.pocketId!);
          if (bal < txnAmount) {
            throw new AppError(
              'Insufficient funds in pocket. Restoring transaction would result in a negative balance.',
              422,
              'INSUFFICIENT_FUNDS'
            );
          }
        } else if (existingTxn.type === 'transfer') {
          const bal = await getDerivedPocketBalance(tx, user.id, existingTxn.fromPocketId!);
          if (bal < txnAmount) {
            throw new AppError(
              'Insufficient funds in pocket. Restoring transaction would result in a negative balance.',
              422,
              'INSUFFICIENT_FUNDS'
            );
          }
        }

        // Revalidate & Reapply Budget Reallocation (DEC-023 / DEC-030.5 / DEC-030.11)
        if (existingTxn.transferType === 'budget-reallocation') {
          const periodDates = getBudgetPeriodForDate(existingTxn.occurredOn);
          let [targetPeriod] = await tx
            .select()
            .from(budgetPeriods)
            .where(
              and(
                eq(budgetPeriods.userId, user.id),
                eq(budgetPeriods.startDate, periodDates.startDate),
                eq(budgetPeriods.endDate, periodDates.endDate)
              )
            );

          if (!targetPeriod) {
            const [inserted] = await tx
              .insert(budgetPeriods)
              .values({
                userId: user.id,
                startDate: periodDates.startDate,
                endDate: periodDates.endDate,
              })
              .returning();
            targetPeriod = inserted;
          }

          let [fromAllocRow] = await tx
            .select()
            .from(pocketBudgetAllocations)
            .where(
              and(
                eq(pocketBudgetAllocations.budgetPeriodId, targetPeriod.id),
                eq(pocketBudgetAllocations.pocketId, existingTxn.fromPocketId!)
              )
            )
            .for('update');

          if (!fromAllocRow) {
            const [inserted] = await tx
              .insert(pocketBudgetAllocations)
              .values({
                budgetPeriodId: targetPeriod.id,
                pocketId: existingTxn.fromPocketId!,
                allocatedAmount: 0,
              })
              .returning();
            fromAllocRow = inserted;
          }

          let [toAllocRow] = await tx
            .select()
            .from(pocketBudgetAllocations)
            .where(
              and(
                eq(pocketBudgetAllocations.budgetPeriodId, targetPeriod.id),
                eq(pocketBudgetAllocations.pocketId, existingTxn.toPocketId!)
              )
            )
            .for('update');

          if (!toAllocRow) {
            const [inserted] = await tx
              .insert(pocketBudgetAllocations)
              .values({
                budgetPeriodId: targetPeriod.id,
                pocketId: existingTxn.toPocketId!,
                allocatedAmount: 0,
              })
              .returning();
            toAllocRow = inserted;
          }

          const fromAllocAmount = Number(fromAllocRow.allocatedAmount);
          const toAllocAmount = Number(toAllocRow.allocatedAmount);

          const recordedExpensesFrom = await getRecordedExpensesForPocketInPeriod(
            tx,
            user.id,
            existingTxn.fromPocketId!,
            periodDates.startDate,
            periodDates.endDate
          );

          const revisedFromAlloc = fromAllocAmount - txnAmount;
          if (fromAllocAmount < txnAmount || revisedFromAlloc < recordedExpensesFrom) {
            throw new AppError(
              'Reallocated budget allocation cannot be less than expenses already incurred in this period',
              422,
              'INSUFFICIENT_ALLOCATION'
            );
          }

          await tx
            .update(pocketBudgetAllocations)
            .set({
              allocatedAmount: revisedFromAlloc,
              revision: fromAllocRow.revision + 1,
              updatedAt: new Date(),
            })
            .where(eq(pocketBudgetAllocations.id, fromAllocRow.id));

          await tx
            .update(pocketBudgetAllocations)
            .set({
              allocatedAmount: toAllocAmount + txnAmount,
              revision: toAllocRow.revision + 1,
              updatedAt: new Date(),
            })
            .where(eq(pocketBudgetAllocations.id, toAllocRow.id));
        }

        const now = new Date();
        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            archivedAt: null,
            revision: existingTxn.revision + 1,
            updatedAt: now,
          })
          .where(eq(transactions.id, existingTxn.id))
          .returning();

        const payload = { transaction: mapTransactionRow(updatedTxn) };

        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 200,
            body: payload,
          }),
        });

        return payload;
      });

      return reply.status(200).send(responsePayload);
    }
  );

  // DELETE /v1/transactions/:id
  app.delete(
    '/v1/transactions/:id',
    { preHandler: [authenticateRequest, validateCsrfToken] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const user = req.user!;
      const params = (req.params || {}) as Record<string, string>;
      const transactionId = validateUuidV4(params.id, 'id');

      const body = (req.body || {}) as Record<string, any>;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Request body must be a JSON object', 400, 'INVALID_INPUT');
      }

      const allowedBodyKeys = new Set(['clientMutationId', 'expectedRevision', 'confirmPermanentDelete']);
      for (const k of Object.keys(body)) {
        if (!allowedBodyKeys.has(k)) {
          throw new AppError(`Unknown or disallowed property '${k}' in request body`, 400, 'INVALID_INPUT');
        }
      }

      if (!body.clientMutationId) {
        throw new AppError("Field 'clientMutationId' is required", 400, 'INVALID_INPUT');
      }
      const clientMutationId = validateUuidV4(body.clientMutationId, 'clientMutationId');

      if (
        typeof body.expectedRevision !== 'number' ||
        !Number.isInteger(body.expectedRevision) ||
        body.expectedRevision < 1
      ) {
        throw new AppError("Field 'expectedRevision' must be a positive integer", 400, 'INVALID_INPUT');
      }
      const expectedRevision = body.expectedRevision;

      if (body.confirmPermanentDelete !== true) {
        throw new AppError(
          "Field 'confirmPermanentDelete' must be true to permanently delete a transaction",
          400,
          'INVALID_INPUT'
        );
      }

      const canonicalHash = computeCanonicalRequestHash(
        'DELETE',
        `/v1/transactions/${transactionId}`,
        body
      );

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

      const responsePayload = await runIdempotentMutation(db, user.id, clientMutationId, canonicalHash, async (tx) => {
        // Lock target transaction row FOR UPDATE
        const [existingTxn] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
          .for('update');

        if (!existingTxn || existingTxn.deletedAt !== null) {
          throw new AppError('Transaction not found', 404, 'NOT_FOUND');
        }

        if (existingTxn.revision !== expectedRevision) {
          throw new AppError(
            'Revision conflict. The transaction was modified by another request.',
            409,
            'REVISION_CONFLICT'
          );
        }

        // If transaction is active (not already archived), reverse budget-reallocation allocation effect
        if (existingTxn.archivedAt === null && existingTxn.transferType === 'budget-reallocation') {
          const periodDates = getBudgetPeriodForDate(existingTxn.occurredOn);
          const [targetPeriod] = await tx
            .select()
            .from(budgetPeriods)
            .where(
              and(
                eq(budgetPeriods.userId, user.id),
                eq(budgetPeriods.startDate, periodDates.startDate),
                eq(budgetPeriods.endDate, periodDates.endDate)
              )
            );

          if (targetPeriod) {
            const allocs = await tx
              .select()
              .from(pocketBudgetAllocations)
              .where(
                and(
                  eq(pocketBudgetAllocations.budgetPeriodId, targetPeriod.id),
                  inArray(pocketBudgetAllocations.pocketId, [
                    existingTxn.fromPocketId!,
                    existingTxn.toPocketId!,
                  ])
                )
              )
              .for('update');

            const fromAlloc = allocs.find((a) => a.pocketId === existingTxn.fromPocketId);
            const toAlloc = allocs.find((a) => a.pocketId === existingTxn.toPocketId);

            const toAllocAmount = Number(toAlloc?.allocatedAmount || 0);
            const recordedExpensesTo = await getRecordedExpensesForPocketInPeriod(
              tx,
              user.id,
              existingTxn.toPocketId!,
              periodDates.startDate,
              periodDates.endDate
            );

            const revisedToAlloc = toAllocAmount - Number(existingTxn.amount);
            if (toAllocAmount < Number(existingTxn.amount) || revisedToAlloc < recordedExpensesTo) {
              throw new AppError(
                'Reallocated budget allocation cannot be less than expenses already incurred in this period',
                422,
                'INSUFFICIENT_ALLOCATION'
              );
            }

            if (fromAlloc) {
              await tx
                .update(pocketBudgetAllocations)
                .set({
                  allocatedAmount: Number(fromAlloc.allocatedAmount) + Number(existingTxn.amount),
                  revision: fromAlloc.revision + 1,
                  updatedAt: new Date(),
                })
                .where(eq(pocketBudgetAllocations.id, fromAlloc.id));
            }

            if (toAlloc) {
              await tx
                .update(pocketBudgetAllocations)
                .set({
                  allocatedAmount: revisedToAlloc,
                  revision: toAlloc.revision + 1,
                  updatedAt: new Date(),
                })
                .where(eq(pocketBudgetAllocations.id, toAlloc.id));
            }
          }
        }

        const now = new Date();
        const [updatedTxn] = await tx
          .update(transactions)
          .set({
            deletedAt: now,
            revision: existingTxn.revision + 1,
            updatedAt: now,
          })
          .where(eq(transactions.id, existingTxn.id))
          .returning();

        const payload = {
          success: true,
          deletedTransactionId: updatedTxn.id,
          deletedAt: updatedTxn.deletedAt!.toISOString(),
        };

        await tx.insert(idempotencyRecords).values({
          userId: user.id,
          clientMutationId,
          requestHash: canonicalHash,
          responseReference: JSON.stringify({
            version: 1,
            statusCode: 200,
            body: payload,
          }),
        });

        return payload;
      });

      return reply.status(200).send(responsePayload);
    }
  );
}
