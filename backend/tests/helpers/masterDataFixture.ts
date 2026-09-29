import { eq } from 'drizzle-orm';
import { users,pockets,categories,transactions,budgetPeriods,pocketBudgetAllocations } from '../../src/db/schema.js';
import { currentStart,periodEnd } from '../../src/lib/reports.js';
import type { TestDatabase } from './testDb.js';

/** Disposable data shared by HTTP and manual browser checks. */
export async function seedMasterData(db:TestDatabase,userId:string) {
  const startDate=currentStart(new Date());
  const [transport,nfc,food,cash]=await db.insert(pockets).values([
    {userId,templateKey:'transportation',name:'Transportation',emoji:'🚆',groupId:'daily',openingBalance:200000},
    {userId,templateKey:'nfc-card',name:'NFC Card',emoji:'💳',groupId:'daily',openingBalance:0},
    {userId,templateKey:'food-groceries',name:'Food & Groceries',emoji:'🍜',groupId:'daily',openingBalance:1300000},
    {userId,templateKey:'cash',name:'Cash',emoji:'💵',groupId:'daily',openingBalance:50000},
  ]).returning();
  await db.update(pockets).set({budgetOwnerPocketId:transport.id}).where(eq(pockets.id,nfc.id));
  await db.update(pockets).set({budgetOwnerPocketId:food.id}).where(eq(pockets.id,cash.id));
  await db.update(users).set({setupCompletedAt:new Date()}).where(eq(users.id,userId));
  const [period]=await db.insert(budgetPeriods).values({userId,startDate,endDate:periodEnd(startDate)}).returning();
  await db.insert(pocketBudgetAllocations).values([
    {budgetPeriodId:period.id,pocketId:transport.id,allocatedAmount:200000},
    {budgetPeriodId:period.id,pocketId:nfc.id,allocatedAmount:0},
    {budgetPeriodId:period.id,pocketId:food.id,allocatedAmount:1300000},
  ]);
  const [category]=await db.insert(categories).values({userId,pocketId:nfc.id,name:'MRT',emoji:'🚇'}).returning();
  await db.insert(transactions).values([
    {userId,type:'transfer',amount:100000,fromPocketId:transport.id,toPocketId:nfc.id,transferType:'top-up-nfc',occurredOn:startDate,occurredAtLocalTime:'09:00:00'},
    {userId,type:'expense',amount:18000,pocketId:nfc.id,budgetPocketId:transport.id,categoryId:category.id,occurredOn:startDate,occurredAtLocalTime:'10:00:00'},
  ]);
  return {transport,nfc,food,cash};
}
