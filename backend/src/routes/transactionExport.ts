import type { FastifyInstance } from 'fastify';
import { and,eq,gte,lte,isNull,desc,sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb } from '../db/client.js';
import { transactions,pockets,categories } from '../db/schema.js';
import { authenticateRequest } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import { validateDateString,getBudgetPeriodForDate } from '../lib/validation.js';
import { EXPORT_MAX_ROWS,transactionCsv } from '../lib/transactionCsv.js';

export async function transactionExportRoutes(app:FastifyInstance) {
  app.get('/v1/transactions/export',{
    onRequest:async(_req,reply)=>{reply.header('Cache-Control','private, no-store');},
    preHandler:authenticateRequest,
  },async(req,reply)=>{
    const query=req.query as Record<string,unknown>;
    if(Object.keys(query).some(k=>!['startDate','endDate'].includes(k)))
      throw new AppError('Unsupported export query parameter',400,'INVALID_INPUT');
    const start=validateDateString(query.startDate,'startDate');
    const end=validateDateString(query.endDate,'endDate');
    const period=getBudgetPeriodForDate(start);
    if(start!==period.startDate||end!==period.endDate)
      throw new AppError('Export requires one complete 26–25 period',400,'INVALID_INPUT');
    const owner=req.user!.id;
    const source=alias(pockets,'export_source'),destination=alias(pockets,'export_destination');
    let csv:string;
    try {
      csv=await getDb().transaction(async tx=>{
        await tx.execute(sql`SET LOCAL statement_timeout = '30s'`);
        // One joined SELECT gives labels and ledger exactly the same MVCC snapshot.
        const rows=await tx.select({id:transactions.id,type:transactions.type,
          amount:sql<string>`${transactions.amount}::text`,occurredOn:transactions.occurredOn,
          occurredAtLocalTime:transactions.occurredAtLocalTime,pocket:pockets.name,
          source:source.name,destination:destination.name,category:categories.name,
          incomeSource:transactions.incomeSource,transferType:transactions.transferType,
          note:transactions.note,createdAt:transactions.createdAt,updatedAt:transactions.updatedAt})
          .from(transactions)
          .leftJoin(pockets,and(eq(pockets.id,transactions.pocketId),eq(pockets.userId,owner)))
          .leftJoin(source,and(eq(source.id,transactions.fromPocketId),eq(source.userId,owner)))
          .leftJoin(destination,and(eq(destination.id,transactions.toPocketId),eq(destination.userId,owner)))
          .leftJoin(categories,and(eq(categories.id,transactions.categoryId),eq(categories.userId,owner)))
          .where(and(eq(transactions.userId,owner),isNull(transactions.archivedAt),isNull(transactions.deletedAt),
            gte(transactions.occurredOn,start),lte(transactions.occurredOn,end)))
          .orderBy(desc(transactions.occurredOn),desc(transactions.occurredAtLocalTime),desc(transactions.createdAt),desc(transactions.id))
          .limit(EXPORT_MAX_ROWS+1);
        return transactionCsv(rows);
      },{isolationLevel:'repeatable read',accessMode:'read only'});
    } catch(error) {
      if(error instanceof AppError)throw error;
      if((error as {code?:string})?.code==='57014')
        throw new AppError('Export is temporarily unavailable; retry later',503,'EXPORT_UNAVAILABLE');
      throw new AppError('An internal server error occurred',500,'INTERNAL_SERVER_ERROR');
    }
    return reply.type('text/csv; charset=utf-8')
      .header('Content-Disposition',`attachment; filename="pocketflow-transactions_${start}_to_${end}.csv"`).send(csv);
  });
}
