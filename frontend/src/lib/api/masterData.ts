import { ApiError, SessionClient, type PocketGroup } from './sessionClient';
import {parseCurrentBudget} from './reportRead';

export interface ServerCategory { id: string; pocketId: string; name: string; emoji: string; revision: number }
export type ServerBudgetStatus='aman'|'waspada'|'bahaya'|'overbudget'|'tanpa-alokasi';
export interface ServerPocket {
  id: string; templateKey: string | null; name: string; emoji: string;
  budgetOwnerPocketId: string | null; revision: number;
  groupId:PocketGroup;isSpendable:boolean;
  openingBalance: number; currentBalance: number | null; allocation: number | null;
  budgetStatus?:ServerBudgetStatus|null;
  budget?:ReturnType<typeof parseCurrentBudget>;
  categories: ServerCategory[];
  archivedCategories: ServerCategory[];
}
export interface MasterData {
  budget?:ReturnType<typeof parseCurrentBudget>;
  isSetupCompleted: boolean;
  period: {startDate: string; endDate: string} | null;
  pockets: ServerPocket[];
  archivedPockets: ServerPocket[];
}
type ObjectValue = Record<string, unknown>;
const invalid = (): never => { throw new ApiError(502, 'INVALID_RESPONSE'); };
const object = (value: unknown): ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : invalid();
const string = (value: unknown): string => typeof value === 'string' && value.trim().length > 0 ? value : invalid();
const uuid = (value: unknown): string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : invalid();
const boolean = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const amount = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) ? value : invalid();
const revision = (value: unknown): number => amount(value) >= 1 ? value as number : invalid();
const list = (value: unknown): ObjectValue[] => Array.isArray(value) ? value.map(object) : invalid();
const nullableId = (value: unknown): string | null => value === null ? null : uuid(value);
const date = (value: unknown): string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value ? value : invalid();

function unique(rows: ObjectValue[]): void {
  const ids = rows.map(row => uuid(row.id));
  if (new Set(ids).size !== ids.length) invalid();
}

/** Validate all consumed fields before publishing one complete UI state. */
export function mapMasterData(pocketPayload: unknown, categoryPayload: unknown, reportPayload: unknown): MasterData {
  const pockets = list(object(pocketPayload).pockets);
  const categories = list(object(categoryPayload).categories);
  const report = object(reportPayload), period = object(report.period);
  if (report.schemaVersion !== 1 || period.isCurrent !== true) invalid();
  const startDate = date(period.startDate), endDate = date(period.endDate);
  const rows = list(report.pocketBudgetActuals);
  unique(pockets); unique(categories); unique(rows);
  const reportRows = new Map(rows.map(row => [uuid(row.id), row]));
  const parsedCategories = categories.map(c => ({
    isActive:boolean(c.isActive),isArchived:boolean(c.isArchived),
    id:uuid(c.id), pocketId:uuid(c.pocketId), name:string(c.name), emoji:string(c.emoji), revision:revision(c.revision),
  }));
  const parsedPockets=pockets.map(p => {
    const openingBalance=amount(p.openingBalance);
    if(openingBalance<0)invalid();
    if(!['daily','bills','savings'].includes(p.groupId as string))invalid();
    const id = uuid(p.id), row = reportRows.get(id);
    const budget = row ? object(row.budget) : null;
    let allocation: number | null = null;
    let budgetStatus:ServerBudgetStatus|null=null;
    if (budget) {
      if(budget.status!==null&&!['aman','waspada','bahaya','overbudget','tanpa-alokasi'].includes(budget.status as string))invalid();
      budgetStatus=budget.status as ServerBudgetStatus|null;
      if (budget.availability === 'available') {
        allocation = amount(budget.revisedAllocation);
        if (allocation < 0) invalid();
      } else if (budget.availability !== 'missing-allocation') invalid();
      if(budget.availability==='missing-allocation'&&budgetStatus!==null)invalid();
    }
    return {id, isActive:boolean(p.isActive),isArchived:boolean(p.isArchived),templateKey:p.templateKey === null ? null : string(p.templateKey),name:string(p.name),emoji:string(p.emoji),
      budgetOwnerPocketId:nullableId(p.budgetOwnerPocketId),revision:revision(p.revision),groupId:p.groupId as PocketGroup,isSpendable:boolean(p.isSpendable),
      openingBalance,currentBalance:!row || row.currentBalance === null ? null : amount(row.currentBalance),
      allocation,budgetStatus,budget:budget?parseCurrentBudget(budget):undefined,categories:parsedCategories.filter(c => c.pocketId === id && c.isActive && !c.isArchived),
      archivedCategories:parsedCategories.filter(c => c.pocketId === id && c.isArchived)};
  });
  return {isSetupCompleted:true,period:{startDate,endDate},budget:parseCurrentBudget(report.budget),
    pockets:parsedPockets.filter(p=>p.isActive && !p.isArchived),
    archivedPockets:parsedPockets.filter(p=>p.isArchived)};
}

export async function loadMasterData(client: SessionClient): Promise<MasterData> {
  const status = object(await client.read('/setup'));
  if (!boolean(status.isSetupCompleted)) return {isSetupCompleted:false,period:null,pockets:[],archivedPockets:[]};
  const [pockets, categories, report] = await Promise.all([
    client.read('/pockets?includeArchived=true'),client.read('/categories?includeArchived=true'),client.read('/reports/current-period'),
  ]);
  return mapMasterData(pockets,categories,report);
}
