import {
  pgTable,
  uuid,
  text,
  boolean,
  bigint,
  integer,
  date,
  time,
  timestamp,
  check,
  unique,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Auth Sessions
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    csrfTokenHash: text('csrf_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('auth_sessions_token_hash_unique').on(table.tokenHash),
  ]
);

// 3. Pockets
export const pockets = pgTable(
  'pockets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    emoji: text('emoji').notNull(),
    groupId: text('group_id').notNull(),
    isSpendable: boolean('is_spendable').notNull().default(true),
    budgetOwnerPocketId: uuid('budget_owner_pocket_id').references((): AnyPgColumn => pockets.id),
    isActive: boolean('is_active').notNull().default(true),
    isArchived: boolean('is_archived').notNull().default(false),
    openingBalance: bigint('opening_balance', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    revision: integer('revision').notNull().default(1),
  },
  (table) => [
    check('pockets_opening_balance_gte_zero', sql`${table.openingBalance} >= 0`),
  ]
);

// 4. Categories
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  pocketId: uuid('pocket_id')
    .notNull()
    .references(() => pockets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  revision: integer('revision').notNull().default(1),
});

// 5. Budget Periods
export const budgetPeriods = pgTable(
  'budget_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'budget_periods_fixed_26_25_period',
      sql`EXTRACT(DAY FROM ${table.startDate}) = 26 AND EXTRACT(DAY FROM ${table.endDate}) = 25 AND ${table.endDate} = (${table.startDate} + INTERVAL '1 month' - INTERVAL '1 day')::date`
    ),
  ]
);

// 6. Pocket Budget Allocations
export const pocketBudgetAllocations = pgTable(
  'pocket_budget_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetPeriodId: uuid('budget_period_id')
      .notNull()
      .references(() => budgetPeriods.id, { onDelete: 'cascade' }),
    pocketId: uuid('pocket_id')
      .notNull()
      .references(() => pockets.id, { onDelete: 'cascade' }),
    allocatedAmount: bigint('allocated_amount', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    revision: integer('revision').notNull().default(1),
  },
  (table) => [
    unique('pocket_budget_allocations_period_pocket_unique').on(table.budgetPeriodId, table.pocketId),
    check('pocket_budget_allocations_allocated_amount_gte_zero', sql`${table.allocatedAmount} >= 0`),
  ]
);

// 7. Transactions
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'expense' | 'income' | 'transfer'
    amount: bigint('amount', { mode: 'number' }).notNull(),
    pocketId: uuid('pocket_id').references(() => pockets.id),
    fromPocketId: uuid('from_pocket_id').references(() => pockets.id),
    toPocketId: uuid('to_pocket_id').references(() => pockets.id),
    categoryId: uuid('category_id').references(() => categories.id),
    budgetPocketId: uuid('budget_pocket_id').references(() => pockets.id),
    transferType: text('transfer_type'),
    incomeSource: text('income_source'),
    occurredOn: date('occurred_on').notNull(),
    occurredAtLocalTime: time('occurred_at_local_time').notNull(),
    note: text('note'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    revision: integer('revision').notNull().default(1),
  },
  (table) => [
    check('transactions_amount_gt_zero', sql`${table.amount} > 0`),
    check(
      'transactions_exclusive_topology',
      sql`(${table.type} IN ('expense', 'income') AND ${table.pocketId} IS NOT NULL AND ${table.fromPocketId} IS NULL AND ${table.toPocketId} IS NULL) OR (${table.type} = 'transfer' AND ${table.fromPocketId} IS NOT NULL AND ${table.toPocketId} IS NOT NULL AND ${table.fromPocketId} <> ${table.toPocketId} AND ${table.pocketId} IS NULL)`
    ),
  ]
);

// 8. Idempotency Records
export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientMutationId: text('client_mutation_id').notNull(),
    requestHash: text('request_hash').notNull(),
    responseReference: text('response_reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    unique('idempotency_records_user_mutation_unique').on(table.userId, table.clientMutationId),
  ]
);
