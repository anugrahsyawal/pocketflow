import { FastifyInstance } from 'fastify';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { pockets, categories, transactions, budgetPeriods, pocketBudgetAllocations } from '../db/schema.js';
import { authenticateRequest } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import { calculateReport, currentStart, periodEnd, validateReportRequest } from '../lib/reports.js';
import { reportResponseSchema } from '../lib/reportSchema.js';

export async function reportRoutes(app:FastifyInstance, options:{clock?:()=>Date}) {
  for (const url of ['/v1/reports/current-period','/v1/reports/periods/:startDate']) {
    app.get(url, {
      onRequest: async (_req,reply) => { reply.header('Cache-Control','private, no-store'); },
      preHandler:authenticateRequest,
      schema:{response:{200:reportResponseSchema}}
    }, async (req) => {
      const now = (options.clock ?? (()=>new Date()))();
      const startDate = (req.params as {startDate?:string}).startDate ?? currentStart(now);
      const excluded = validateReportRequest(startDate,req.query as Record<string,unknown>,now);
      const owner = req.user!.id;
      try {
        return await getDb().transaction(async tx => {
          // Fetch exact integer strings: do not round BIGINT via a JS number decoder.
          const ownerPockets = await tx.select({id:pockets.id,name:pockets.name,emoji:pockets.emoji,
            isActive:pockets.isActive,isArchived:pockets.isArchived,isSpendable:pockets.isSpendable,
            openingBalance:sql<string>`${pockets.openingBalance}::text`}).from(pockets).where(eq(pockets.userId,owner));
          const ownerCategories = await tx.select({id:categories.id,name:categories.name,emoji:categories.emoji,
            isActive:categories.isActive,isArchived:categories.isArchived}).from(categories).where(eq(categories.userId,owner));
          const ledger = await tx.select({type:transactions.type,amount:sql<string>`${transactions.amount}::text`,
            pocketId:transactions.pocketId,budgetPocketId:transactions.budgetPocketId,categoryId:transactions.categoryId,
            fromPocketId:transactions.fromPocketId,toPocketId:transactions.toPocketId,transferType:transactions.transferType,
            occurredOn:transactions.occurredOn}).from(transactions).where(and(eq(transactions.userId,owner),isNull(transactions.archivedAt),isNull(transactions.deletedAt)));
          const allocations = await tx.select({pocketId:pocketBudgetAllocations.pocketId,
            allocatedAmount:sql<string>`${pocketBudgetAllocations.allocatedAmount}::text`})
            .from(pocketBudgetAllocations).innerJoin(budgetPeriods,eq(budgetPeriods.id,pocketBudgetAllocations.budgetPeriodId))
            .innerJoin(pockets,eq(pockets.id,pocketBudgetAllocations.pocketId))
            .where(and(eq(budgetPeriods.userId,owner),eq(pockets.userId,owner),eq(budgetPeriods.startDate,startDate),eq(budgetPeriods.endDate,periodEnd(startDate))));
          return calculateReport({now,startDate,pockets:ownerPockets,categories:ownerCategories,transactions:ledger,allocations,excluded});
        }, {isolationLevel:'repeatable read',accessMode:'read only'});
      } catch (error) {
        if(error instanceof AppError) throw error;
        throw new AppError('An internal server error occurred',500,'INTERNAL_SERVER_ERROR');
      }
    });
  }
}
