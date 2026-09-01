import { eq, and, isNotNull, lte, inArray } from 'drizzle-orm';
import { getDb, AppDatabase } from '../db/client.js';
import { transactions, transactionPurgeLogs } from '../db/schema.js';

export interface PurgeOptions {
  /**
   * Number of days to retain soft-deleted tombstones before purging.
   * Default: 30 days (per DEC-027, DEC-030).
   */
  retentionDays?: number;

  /**
   * Explicit cutoff timestamp override (useful for testing and deterministic batch workers).
   * Transactions with `deletedAt <= cutoffDate` will be purged.
   * If omitted, calculated as `now - retentionDays (days)`.
   */
  cutoffDate?: Date;

  /**
   * Reference timestamp representing the current execution time.
   * Defaults to `new Date()`.
   */
  now?: Date;

  /**
   * Optional user ID filter to scope purge to a specific user/owner.
   */
  userId?: string;

  /**
   * Optional maximum number of tombstones to purge in a single execution batch.
   */
  batchLimit?: number;

  /**
   * Optional database client or transaction instance.
   * Defaults to `getDb()`.
   */
  db?: AppDatabase;
}

export interface PurgeResult {
  purgedCount: number;
  purgedTransactionIds: string[];
}

/**
 * Automatically purges soft-deleted transaction tombstones older than 30 days
 * (or configured retention window) and writes immutable audit records to `transaction_purge_logs`.
 *
 * Implements DEC-027 and DEC-030.2. No public or administrative HTTP endpoint is exposed.
 */
export async function purgeDeletedTransactions(options: PurgeOptions = {}): Promise<PurgeResult> {
  const retentionDays = options.retentionDays ?? 30;
  const now = options.now ?? new Date();
  const cutoffDate =
    options.cutoffDate ?? new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const db = options.db ?? getDb();

  const conditions = [
    isNotNull(transactions.deletedAt),
    lte(transactions.deletedAt, cutoffDate),
  ];

  if (options.userId) {
    conditions.push(eq(transactions.userId, options.userId));
  }

  let query = db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      amount: transactions.amount,
      pocketId: transactions.pocketId,
      fromPocketId: transactions.fromPocketId,
      toPocketId: transactions.toPocketId,
      categoryId: transactions.categoryId,
      budgetPocketId: transactions.budgetPocketId,
      transferType: transactions.transferType,
      incomeSource: transactions.incomeSource,
      occurredOn: transactions.occurredOn,
      occurredAtLocalTime: transactions.occurredAtLocalTime,
      note: transactions.note,
      archivedAt: transactions.archivedAt,
      deletedAt: transactions.deletedAt,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      revision: transactions.revision,
    })
    .from(transactions)
    .where(and(...conditions));

  if (options.batchLimit && options.batchLimit > 0) {
    query = query.limit(options.batchLimit) as typeof query;
  }

  const candidateRows = await query;

  if (candidateRows.length === 0) {
    return {
      purgedCount: 0,
      purgedTransactionIds: [],
    };
  }

  const idsToPurge = candidateRows.map((r) => r.id);

  // Execute audit log insertion and physical purge atomically within a transaction
  await db.transaction(async (tx) => {
    const purgeLogRecords = candidateRows.map((r) => ({
      userId: r.userId,
      purgedTransactionId: r.id,
      deletedAt: r.deletedAt!,
      purgedAt: now,
      metadata: JSON.stringify({
        type: r.type,
        amount: r.amount,
        pocketId: r.pocketId,
        fromPocketId: r.fromPocketId,
        toPocketId: r.toPocketId,
        categoryId: r.categoryId,
        budgetPocketId: r.budgetPocketId,
        transferType: r.transferType,
        incomeSource: r.incomeSource,
        occurredOn: r.occurredOn,
        occurredAtLocalTime: r.occurredAtLocalTime,
        note: r.note,
        archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
        revision: r.revision,
      }),
    }));

    await tx.insert(transactionPurgeLogs).values(purgeLogRecords);
    await tx.delete(transactions).where(inArray(transactions.id, idsToPurge));
  });

  return {
    purgedCount: idsToPurge.length,
    purgedTransactionIds: idsToPurge,
  };
}

export const purgeTransactions = purgeDeletedTransactions;

export interface PurgeSchedulerOptions {
  /**
   * Interval in milliseconds between purge runs.
   * Default: 24 hours (86,400,000 ms).
   */
  intervalMs?: number;

  /**
   * Number of days to retain soft-deleted tombstones before purging.
   * Default: 30 days (per DEC-027, DEC-030).
   */
  retentionDays?: number;

  /**
   * Whether to execute an immediate purge upon scheduler start.
   * Default: false.
   */
  runOnStart?: boolean;

  /**
   * Whether to unreference the Node.js timer so it does not keep the process alive.
   * Default: true.
   */
  unref?: boolean;

  /**
   * Optional custom database client. Defaults to getDb().
   */
  db?: AppDatabase;

  /**
   * Optional logger interface for background execution logging.
   */
  logger?: {
    info?: (msg: string) => void;
    error?: (msg: string, err?: unknown) => void;
  };
}

let activePurgeTimer: NodeJS.Timeout | null = null;
let isPurgingActive = false;

/**
 * Starts the background purge scheduler.
 * Enforces a single active timer singleton; cancels any existing active timer before starting.
 * Timer is unreferenced by default to prevent hanging test or CLI processes.
 */
export function startPurgeScheduler(options: PurgeSchedulerOptions = {}): NodeJS.Timeout {
  stopPurgeScheduler();

  const intervalMs = options.intervalMs ?? 24 * 60 * 60 * 1000;
  const retentionDays = options.retentionDays ?? 30;
  const shouldUnref = options.unref ?? true;
  const logger = options.logger;

  const runPurgeTask = async () => {
    if (isPurgingActive) return;
    isPurgingActive = true;
    try {
      const result = await purgeDeletedTransactions({
        retentionDays,
        db: options.db,
      });
      if (result.purgedCount > 0 && logger?.info) {
        logger.info(`[PurgeScheduler] Purged ${result.purgedCount} expired transaction tombstones.`);
      }
    } catch (err) {
      if (logger?.error) {
        logger.error('[PurgeScheduler] Error during automatic transaction purge:', err);
      }
    } finally {
      isPurgingActive = false;
    }
  };

  if (options.runOnStart) {
    runPurgeTask().catch(() => {});
  }

  const timer = setInterval(() => {
    runPurgeTask().catch(() => {});
  }, intervalMs);

  if (shouldUnref && typeof timer.unref === 'function') {
    timer.unref();
  }

  activePurgeTimer = timer;
  return timer;
}

/**
 * Stops and clears the background purge scheduler timer if active.
 */
export function stopPurgeScheduler(): void {
  if (activePurgeTimer !== null) {
    clearInterval(activePurgeTimer);
    activePurgeTimer = null;
  }
  isPurgingActive = false;
}

/**
 * Returns whether the purge scheduler timer is currently active.
 */
export function isPurgeSchedulerRunning(): boolean {
  return activePurgeTimer !== null;
}
