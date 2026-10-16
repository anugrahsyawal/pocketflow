import { transactionQuery,parseTransactionPage,type TransactionQuery,type TransactionPage } from './transactionRead';
import { parseTransactionAttempt,type TransactionAttempt } from './transactionAttempt';
import { snapshotEditRequest,validateEditAcknowledgement,type TransactionEditRequest } from './transactionEdit';

export interface ServerUser { id: string; email: string; displayName: string }
export interface TransactionLifecycleRequest {
  ownerId:string;
  transactionId:string;
  clientMutationId:string;
  expectedRevision:number;
  operation:'archive'|'restore';
}
export interface TransactionDeleteRequest {
  ownerId:string;transactionId:string;clientMutationId:string;expectedRevision:number;
  confirmPermanentDelete:true;
}
export interface TransactionDeleteAcknowledgement {
  success:true;deletedTransactionId:string;deletedAt:string;
}
export interface SetupRequest {
  clientMutationId: string;
  selectedPocketKeys: string[];
  cashOpeningBalance?: number;
  nfcOpeningBalance?: number;
}
export interface BudgetOwnerRequest {
  clientMutationId: string;
  expectedRevision: number;
  budgetOwnerPocketId: string | null;
}
export type PocketGroup = 'daily'|'bills'|'savings';
export const POCKET_GROUP_LABELS:Record<PocketGroup,string>={daily:'Harian',bills:'Tagihan',savings:'Tabungan & Masa Depan'};
export interface PocketClassificationRequest {
  clientMutationId:string;expectedRevision:number;groupId:PocketGroup;isSpendable:boolean;
}
export interface CategoryEditRequest {
  clientMutationId: string;
  expectedRevision: number;
  name: string;
  emoji: string;
}
export interface CategoryCreateRequest {
  clientMutationId: string;
  pocketId: string;
  name: string;
  emoji: string;
}
export interface CreatedCategory {
  id: string;
  pocketId: string;
  name: string;
  emoji: string;
  revision: number;
}
export interface CategoryArchiveRequest {
  clientMutationId: string;
  expectedRevision: number;
  isArchived: boolean;
}
export interface PocketArchiveRequest extends CategoryArchiveRequest {
  /** Restore-only explicit replacement; omitted preserves mapping, null uses self. */
  budgetOwnerPocketId?: string | null;
}

export function categoryEditFields(name: string, emoji: string): {name:string;emoji:string} {
  const fields={name:name.trim(),emoji:emoji.trim()};
  if (!fields.name || [...fields.name].length>100 || !fields.emoji || [...fields.emoji].length>32) {
    throw new ApiError(400,'INVALID_INPUT');
  }
  return fields;
}

const isUuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

export function sessionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Terjadi kesalahan. Silakan coba lagi.';
  if (error.code === 'INVALID_CREDENTIALS') return 'Email atau password salah.';
  if (error.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
  if (error.status === 403) return 'Sesi keamanan berubah. Silakan coba lagi.';
  if (error.status === 0) return 'Backend belum dapat dijangkau. Pastikan server aktif, lalu coba lagi.';
  return 'Server belum dapat memproses permintaan. Silakan coba lagi.';
}

function parseUser(data: unknown): ServerUser {
  const user = (data as {user?: ServerUser} | null)?.user;
  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string') {
    throw new ApiError(502, 'INVALID_RESPONSE');
  }
  return user;
}

/** Isolated server transport; credentials and CSRF are never persisted. */
export class SessionClient {
  private csrf: string | null = null;
  private refreshing: Promise<string> | null = null;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args), private readonly timeoutMs = 12000) {}

  clear(): void { this.csrf = null; }

  private async request(path: string, method = 'GET', body?: unknown, token?: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`/v1${path}`, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: {Accept: 'application/json', ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
          ...(token ? {'X-CSRF-Token': token} : {})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
      let data: unknown;
      try { data = await response.json(); } catch { throw new ApiError(response.ok ? 502 : response.status, 'INVALID_RESPONSE'); }
      if (!response.ok) {
        if (response.status === 401) this.clear();
        const code = (data as {error?: {code?: unknown}} | null)?.error?.code;
        throw new ApiError(response.status, typeof code === 'string' ? code : 'HTTP_ERROR');
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, 'NETWORK_ERROR');
    } finally { clearTimeout(timeout); }
  }

  async me(): Promise<ServerUser> { return parseUser(await this.request('/me')); }

  async listTransactions(query:TransactionQuery={}):Promise<TransactionPage> {
    const request=transactionQuery(query);
    return parseTransactionPage(await this.request(request.path),request.query);
  }

  /** Transport only. UI must durably retain this immutable request before dispatch. */
  async setTransactionArchived(input:TransactionLifecycleRequest):Promise<TransactionPage['transactions'][number]> {
    const {ownerId,transactionId,clientMutationId,expectedRevision,operation}=this.snapshotLifecycleRequest(input);
    const body={clientMutationId,expectedRevision};
    const result=await this.transactionMutationRequest(ownerId,`/transactions/${transactionId}/${operation}`,body);
    return this.validateLifecycleAcknowledgement({ownerId,transactionId,clientMutationId,expectedRevision,operation},result);
  }

  private snapshotLifecycleRequest(input:TransactionLifecycleRequest):TransactionLifecycleRequest {
    if(!input||Object.keys(input).some(key=>!['ownerId','transactionId','clientMutationId','expectedRevision','operation'].includes(key))||
      !isUuid(input.ownerId)||!isUuid(input.transactionId)||!isUuid(input.clientMutationId)||
      !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||
      !['archive','restore'].includes(input.operation))throw new ApiError(400,'INVALID_INPUT');
    const {ownerId,transactionId,clientMutationId,expectedRevision,operation}=input;
    return {ownerId,transactionId,clientMutationId,expectedRevision,operation};
  }

  /** Transport only; caller must durably retain the confirmed request before dispatch. */
  async editTransaction(input:TransactionEditRequest):Promise<TransactionPage['transactions'][number]> {
    const safe=snapshotEditRequest(input);
    const result=await this.transactionMutationRequest(safe.ownerId,`/transactions/${safe.transactionId}`,
      {clientMutationId:safe.clientMutationId,expectedRevision:safe.expectedRevision,...safe.changes},'PATCH');
    return validateEditAcknowledgement(safe,result);
  }

  async resolveTransactionEdit(input:TransactionEditRequest):Promise<'cancelled'|'committed'> {
    const safe=snapshotEditRequest(input);
    const result=await this.transactionMutationRequest(safe.ownerId,`/transactions/${safe.transactionId}/resolve-attempt`,
      {operation:'edit',clientMutationId:safe.clientMutationId,expectedRevision:safe.expectedRevision,changes:safe.changes});
    if(!result||typeof result!=='object'||Array.isArray(result)||
      Object.keys(result).some(key=>!['status','clientMutationId','acknowledgement'].includes(key)))throw new ApiError(502,'INVALID_RESPONSE');
    const resolution=result as Record<string,unknown>;
    if(resolution.clientMutationId!==safe.clientMutationId)throw new ApiError(502,'INVALID_RESPONSE');
    if(resolution.status==='committed'){validateEditAcknowledgement(safe,resolution.acknowledgement);return 'committed';}
    if(resolution.status!=='cancelled'||'acknowledgement' in resolution)throw new ApiError(502,'INVALID_RESPONSE');
    return 'cancelled';
  }

  private async transactionMutationRequest(ownerId:string,path:string,body:unknown,method:'POST'|'DELETE'|'PATCH'='POST'):Promise<unknown> {
    if((await this.me()).id!==ownerId)throw new ApiError(401,'OWNER_CHANGED');
    let result:unknown;
    try{result=await this.request(path,method,body,this.csrf??await this.refreshToken());}
    catch(error){
      if(!(error instanceof ApiError)||error.status!==403||error.code!=='INVALID_CSRF_TOKEN')throw error;
      if((await this.me()).id!==ownerId)throw new ApiError(401,'OWNER_CHANGED');
      result=await this.request(path,method,body,await this.refreshToken());
    }
    return result;
  }

  private snapshotDeleteRequest(input:TransactionDeleteRequest):TransactionDeleteRequest {
    if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!['ownerId','transactionId','clientMutationId','expectedRevision','confirmPermanentDelete'].includes(key))||
      !isUuid(input.ownerId)||!isUuid(input.transactionId)||!isUuid(input.clientMutationId)||
      !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||input.confirmPermanentDelete!==true)throw new ApiError(400,'INVALID_INPUT');
    // Copy primitives before the first await, including the explicit confirmation.
    const {ownerId,transactionId,clientMutationId,expectedRevision,confirmPermanentDelete}=input;
    return {ownerId,transactionId,clientMutationId,expectedRevision,confirmPermanentDelete};
  }

  /** Caller retains a durably confirmed attempt before dispatch. */
  async deleteTransaction(input:TransactionDeleteRequest):Promise<TransactionDeleteAcknowledgement> {
    const {ownerId,transactionId,clientMutationId,expectedRevision,confirmPermanentDelete}=this.snapshotDeleteRequest(input);
    const result=await this.transactionMutationRequest(ownerId,`/transactions/${transactionId}`,
      {clientMutationId,expectedRevision,confirmPermanentDelete},'DELETE');
    return this.validateDeleteAcknowledgement(transactionId,result);
  }

  async resolveTransactionDelete(input:TransactionDeleteRequest):Promise<'cancelled'|'committed'> {
    const {ownerId,transactionId,clientMutationId,expectedRevision,confirmPermanentDelete}=this.snapshotDeleteRequest(input);
    const result=await this.transactionMutationRequest(ownerId,`/transactions/${transactionId}/resolve-attempt`,
      {operation:'delete',clientMutationId,expectedRevision,confirmPermanentDelete});
    if(!result||typeof result!=='object'||Array.isArray(result)||
      Object.keys(result).some(key=>!['status','clientMutationId','acknowledgement'].includes(key)))throw new ApiError(502,'INVALID_RESPONSE');
    const resolution=result as Record<string,unknown>;
    if(resolution.clientMutationId!==clientMutationId)throw new ApiError(502,'INVALID_RESPONSE');
    if(resolution.status==='committed'){this.validateDeleteAcknowledgement(transactionId,resolution.acknowledgement);return 'committed';}
    if(resolution.status!=='cancelled'||'acknowledgement' in resolution)throw new ApiError(502,'INVALID_RESPONSE');
    return 'cancelled';
  }

  private validateDeleteAcknowledgement(transactionId:string,result:unknown):TransactionDeleteAcknowledgement {
    if(!result||typeof result!=='object'||Array.isArray(result)||
      Object.keys(result).some(key=>!['success','deletedTransactionId','deletedAt'].includes(key)))throw new ApiError(502,'INVALID_RESPONSE');
    const ack=result as Record<string,unknown>;
    if(ack.success!==true||ack.deletedTransactionId!==transactionId||typeof ack.deletedAt!=='string'||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ack.deletedAt)||
      !Number.isFinite(Date.parse(ack.deletedAt))||new Date(ack.deletedAt).toISOString()!==ack.deletedAt)throw new ApiError(502,'INVALID_RESPONSE');
    return {success:true,deletedTransactionId:transactionId,deletedAt:ack.deletedAt};
  }

  /** Explicit terminal resolution; no journal cleanup or financial compensation here. */
  async resolveTransactionLifecycle(input:TransactionLifecycleRequest):Promise<'cancelled'|'committed'> {
    const safe=this.snapshotLifecycleRequest(input);
    const result=await this.transactionMutationRequest(safe.ownerId,`/transactions/${safe.transactionId}/resolve-attempt`,
      {operation:safe.operation,clientMutationId:safe.clientMutationId,expectedRevision:safe.expectedRevision});
    const resolution=result as {status?:unknown;clientMutationId?:unknown;acknowledgement?:unknown}|null;
    if(!resolution||resolution.clientMutationId!==safe.clientMutationId)throw new ApiError(502,'INVALID_RESPONSE');
    if(resolution.status==='committed'){
      this.validateLifecycleAcknowledgement(safe,resolution.acknowledgement);return 'committed';
    }
    if(resolution.status!=='cancelled'||resolution.acknowledgement!==undefined)throw new ApiError(502,'INVALID_RESPONSE');
    return 'cancelled';
  }

  private validateLifecycleAcknowledgement({transactionId,expectedRevision,operation}:TransactionLifecycleRequest,result:unknown):TransactionPage['transactions'][number] {
    const raw=(result as {transaction?:unknown}|null)?.transaction;
    const transaction=parseTransactionPage({transactions:[raw],pagination:{page:1,limit:1,total:1,totalPages:1,hasMore:false}},transactionQuery({limit:1,includeArchived:true}).query).transactions[0];
    if(!transaction||transaction.id!==transactionId||transaction.isArchived!==(operation==='archive')||
      (transaction.revision!==expectedRevision&&transaction.revision!==expectedRevision+1))throw new ApiError(502,'INVALID_RESPONSE');
    // Replay is the original acknowledgement, not current financial state. Caller refetches.
    return transaction;
  }

  /** Requires a durably prepared attempt. Never creates/replaces its mutation ID. */
  async createTransaction(attempt:TransactionAttempt):Promise<TransactionPage['transactions'][number]> {
    let safe:TransactionAttempt;
    try{safe=parseTransactionAttempt(attempt,attempt.ownerId);}catch{throw new ApiError(400,'INVALID_INPUT');}
    const {body}=safe;
    if((await this.me()).id!==safe.ownerId)throw new ApiError(401,'OWNER_CHANGED');
    const token=this.csrf??await this.refreshToken();let result:unknown;
    try{result=await this.request('/transactions','POST',body,token);}catch(error){
      if(!(error instanceof ApiError)||error.status!==403||error.code!=='INVALID_CSRF_TOKEN')throw error;
      // Recheck ownership before the only allowed automatic retry.
      if((await this.me()).id!==safe.ownerId)throw new ApiError(401,'OWNER_CHANGED');
      result=await this.request('/transactions','POST',body,await this.refreshToken());
    }
    return this.validateCreateAcknowledgement(safe,result);
  }

  /** Explicit terminal resolution only; caller retains journal until validated acknowledgement. */
  async resolveTransactionAttempt(attempt:TransactionAttempt):Promise<'cancelled'|'committed'> {
    let safe:TransactionAttempt;
    try{safe=parseTransactionAttempt(attempt,attempt.ownerId);}catch{throw new ApiError(400,'INVALID_INPUT');}
    if((await this.me()).id!==safe.ownerId)throw new ApiError(401,'OWNER_CHANGED');
    let result:unknown;
    try{result=await this.request('/transactions/resolve-attempt','POST',safe.body,this.csrf??await this.refreshToken());}
    catch(error){
      if(!(error instanceof ApiError)||error.status!==403||error.code!=='INVALID_CSRF_TOKEN')throw error;
      if((await this.me()).id!==safe.ownerId)throw new ApiError(401,'OWNER_CHANGED');
      result=await this.request('/transactions/resolve-attempt','POST',safe.body,await this.refreshToken());
    }
    const resolution=result as {status?:unknown;clientMutationId?:unknown;acknowledgement?:unknown}|null;
    if(!resolution||resolution.clientMutationId!==safe.body.clientMutationId)throw new ApiError(502,'INVALID_RESPONSE');
    if(resolution.status==='committed'){
      this.validateCreateAcknowledgement(safe,resolution.acknowledgement);
      return 'committed';
    }
    if(resolution.status!=='cancelled'||resolution.acknowledgement!==undefined)throw new ApiError(502,'INVALID_RESPONSE');
    return 'cancelled';
  }

  private validateCreateAcknowledgement(safe:TransactionAttempt,result:unknown):TransactionPage['transactions'][number] {
    const {body}=safe;
    const raw=(result as {transaction?:unknown}|null)?.transaction;
    const transaction=parseTransactionPage({transactions:[raw],pagination:{page:1,limit:1,total:1,totalPages:1,hasMore:false}},transactionQuery({limit:1}).query).transactions[0];
    const time=(v:string)=>v.length===5?`${v}:00`:v;
    if(!transaction||transaction.type!==body.type||transaction.amount!==body.amount||transaction.occurredOn!==body.occurredOn||
      time(transaction.occurredAtLocalTime)!==time(body.occurredAtLocalTime)||transaction.note!==(body.note??null)||
      transaction.revision!==1||transaction.isArchived||transaction.archivedAt!==null)throw new ApiError(502,'INVALID_RESPONSE');
    if(body.type==='transfer'){
      if(transaction.fromPocketId!==body.fromPocketId||transaction.toPocketId!==body.toPocketId||transaction.transferType!==body.transferType||
        transaction.categoryId!==null||transaction.budgetPocketId!==null||transaction.incomeSource!==null)throw new ApiError(502,'INVALID_RESPONSE');
    }else{
      if(transaction.pocketId!==body.pocketId||transaction.transferType!==null)throw new ApiError(502,'INVALID_RESPONSE');
      if(body.type==='expense'?(transaction.categoryId!==(body.categoryId??null)||transaction.budgetPocketId===null||transaction.incomeSource!==null):
        (transaction.categoryId!==null||transaction.budgetPocketId!==null||transaction.incomeSource!==(body.incomeSource??null)))throw new ApiError(502,'INVALID_RESPONSE');
    }
    // Original replay acknowledgement is not current ledger state. Refetch after cleanup.
    return transaction;
  }

  /** Explicit read allowlist; no arbitrary endpoint transport. */
  async read(path: '/setup' | '/pockets' | '/pockets?includeArchived=true' | '/categories' | '/categories?includeArchived=true' | '/reports/current-period'): Promise<unknown> {
    return this.request(path);
  }

  async setup(payload: SetupRequest): Promise<void> {
    // Snapshot before awaiting: retries must use exactly the same mutation.
    const body = {...payload, selectedPocketKeys: [...payload.selectedPocketKeys]};
    const token = this.csrf ?? await this.refreshToken();
    let result: unknown;
    try { result = await this.request('/setup', 'PUT', body, token); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 403 || error.code !== 'INVALID_CSRF_TOKEN') throw error;
      result = await this.request('/setup', 'PUT', body, await this.refreshToken());
    }
    if ((result as {isSetupCompleted?: unknown} | null)?.isSetupCompleted !== true) {
      throw new ApiError(502, 'INVALID_RESPONSE');
    }
  }

  /** Transport foundation only: UI must reconcile unresolved outcomes before reuse. */
  async updateBudgetOwner(pocketId: string, payload: BudgetOwnerRequest): Promise<{id:string;revision:number;budgetOwnerPocketId:string|null}> {
    if (!isUuid(pocketId) || !isUuid(payload.clientMutationId) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 1 ||
      (payload.budgetOwnerPocketId !== null && !isUuid(payload.budgetOwnerPocketId))) {
      throw new ApiError(400,'INVALID_INPUT');
    }
    // Allowlist fields and snapshot scalars before awaiting CSRF. Caller changes
    // cannot mutate a pending request, including its one permitted CSRF retry.
    const body = {clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,
      budgetOwnerPocketId:payload.budgetOwnerPocketId};
    const route = `/pockets/${pocketId}`;
    const token = this.csrf ?? await this.refreshToken();
    let result: unknown;
    try { result = await this.request(route,'PATCH',body,token); }
    catch(error) {
      if (!(error instanceof ApiError) || error.status !== 403 || error.code !== 'INVALID_CSRF_TOKEN') throw error;
      result = await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const pocket = (result as {pocket?:{id?:unknown;revision?:unknown;budgetOwnerPocketId?:unknown}} | null)?.pocket;
    if (!pocket || pocket.id !== pocketId || !Number.isSafeInteger(pocket.revision) ||
      ((pocket.revision as number) !== body.expectedRevision && (pocket.revision as number) !== body.expectedRevision+1) ||
      pocket.budgetOwnerPocketId !== body.budgetOwnerPocketId) {
      throw new ApiError(502,'INVALID_RESPONSE');
    }
    return {id:pocketId,revision:pocket.revision as number,budgetOwnerPocketId:body.budgetOwnerPocketId};
  }

  async login(email: string, password: string): Promise<ServerUser> {
    this.clear();
    const data = await this.request('/auth/login', 'POST', {email: email.trim(), password});
    const user = parseUser(data);
    this.csrf = this.parseToken(data);
    return user;
  }

  /** No automatic network retry. Caller must retain the same attempt across reload. */
  async createCategory(payload: CategoryCreateRequest): Promise<CreatedCategory> {
    if (!isUuid(payload.clientMutationId) || !isUuid(payload.pocketId) ||
      typeof payload.name!=='string' || typeof payload.emoji!=='string') throw new ApiError(400,'INVALID_INPUT');
    const body={clientMutationId:payload.clientMutationId,pocketId:payload.pocketId,
      ...categoryEditFields(payload.name,payload.emoji)};
    const token=this.csrf??await this.refreshToken();
    let result:unknown;
    try {result=await this.request('/categories','POST',body,token);}
    catch(error) {
      if (!(error instanceof ApiError) || error.status!==403 || error.code!=='INVALID_CSRF_TOKEN') throw error;
      result=await this.request('/categories','POST',body,await this.refreshToken());
    }
    const category=(result as {category?:{id?:unknown;pocketId?:unknown;name?:unknown;emoji?:unknown;revision?:unknown;
      isDefault?:unknown;isActive?:unknown;isArchived?:unknown}}|null)?.category;
    if (!category || !isUuid(category.id) || category.pocketId!==body.pocketId || category.name!==body.name ||
      category.emoji!==body.emoji || category.revision!==1 || category.isDefault!==false ||
      category.isActive!==true || category.isArchived!==false) throw new ApiError(502,'INVALID_RESPONSE');
    // Replay may return the original creation acknowledgement even after later
    // edits/archive. This is not current state: caller must refetch master data.
    return {id:category.id,pocketId:body.pocketId,name:body.name,emoji:body.emoji,revision:1};
  }

  async editCategory(categoryId: string, payload: CategoryEditRequest): Promise<void> {
    if (!isUuid(categoryId) || !isUuid(payload.clientMutationId) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision<1 ||
      typeof payload.name!=='string' || typeof payload.emoji!=='string') throw new ApiError(400,'INVALID_INPUT');
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,
      ...categoryEditFields(payload.name,payload.emoji)};
    const route=`/categories/${categoryId}`;
    const token=this.csrf??await this.refreshToken();
    let result:unknown;
    try {result=await this.request(route,'PATCH',body,token);}
    catch(error) {
      if (!(error instanceof ApiError) || error.status!==403 || error.code!=='INVALID_CSRF_TOKEN') throw error;
      result=await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const category=(result as {category?:{id?:unknown;name?:unknown;emoji?:unknown;revision?:unknown}}|null)?.category;
    if (!category || category.id!==categoryId || category.name!==body.name || category.emoji!==body.emoji ||
      !Number.isSafeInteger(category.revision) ||
      (category.revision!==body.expectedRevision && category.revision!==body.expectedRevision+1)) {
      throw new ApiError(502,'INVALID_RESPONSE');
    }
  }

  async editPocketLabel(pocketId: string, payload: CategoryEditRequest): Promise<void> {
    if (!isUuid(pocketId) || !isUuid(payload.clientMutationId) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision<1 ||
      typeof payload.name!=='string' || typeof payload.emoji!=='string') throw new ApiError(400,'INVALID_INPUT');
    // Deliberately omit balances, allocation, roles and lifecycle properties.
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,
      ...categoryEditFields(payload.name,payload.emoji)};
    const route=`/pockets/${pocketId}`;
    const token=this.csrf??await this.refreshToken();
    let result:unknown;
    try {result=await this.request(route,'PATCH',body,token);}
    catch(error) {
      if (!(error instanceof ApiError) || error.status!==403 || error.code!=='INVALID_CSRF_TOKEN') throw error;
      result=await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const pocket=(result as {pocket?:{id?:unknown;name?:unknown;emoji?:unknown;revision?:unknown}}|null)?.pocket;
    if (!pocket || pocket.id!==pocketId || pocket.name!==body.name || pocket.emoji!==body.emoji ||
      !Number.isSafeInteger(pocket.revision) ||
      (pocket.revision!==body.expectedRevision && pocket.revision!==body.expectedRevision+1)) {
      throw new ApiError(502,'INVALID_RESPONSE');
    }
  }

  async setCategoryArchived(categoryId: string, payload: CategoryArchiveRequest): Promise<void> {
    if (!isUuid(categoryId) || !isUuid(payload.clientMutationId) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision<1 ||
      typeof payload.isArchived!=='boolean') throw new ApiError(400,'INVALID_INPUT');
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,isArchived:payload.isArchived};
    const route=`/categories/${categoryId}`;
    const token=this.csrf??await this.refreshToken();
    let result:unknown;
    try {result=await this.request(route,'PATCH',body,token);}
    catch(error) {
      if (!(error instanceof ApiError) || error.status!==403 || error.code!=='INVALID_CSRF_TOKEN') throw error;
      result=await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const category=(result as {category?:{id?:unknown;isArchived?:unknown;isActive?:unknown;revision?:unknown}}|null)?.category;
    if (!category || category.id!==categoryId || category.isArchived!==body.isArchived || category.isActive!==!body.isArchived ||
      !Number.isSafeInteger(category.revision) ||
      (category.revision!==body.expectedRevision && category.revision!==body.expectedRevision+1)) {
      throw new ApiError(502,'INVALID_RESPONSE');
    }
  }

  /** Lifecycle transport only; UI must retain immutable attempts and reconcile outcomes. */
  async setPocketArchived(pocketId: string, payload: PocketArchiveRequest): Promise<void> {
    if (!isUuid(pocketId) || !isUuid(payload.clientMutationId) ||
      !Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision<1 ||
      typeof payload.isArchived!=='boolean' ||
      (payload.budgetOwnerPocketId!==undefined &&
        (payload.isArchived || (payload.budgetOwnerPocketId!==null && !isUuid(payload.budgetOwnerPocketId))))) {
      throw new ApiError(400,'INVALID_INPUT');
    }
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,isArchived:payload.isArchived,
      ...(payload.budgetOwnerPocketId===undefined?{}:{budgetOwnerPocketId:payload.budgetOwnerPocketId})};
    const token=this.csrf??await this.refreshToken();
    const route=`/pockets/${pocketId}`;
    let result:unknown;
    try {result=await this.request(route,'PATCH',body,token);}
    catch(error) {
      if (!(error instanceof ApiError) || error.status!==403 || error.code!=='INVALID_CSRF_TOKEN') throw error;
      result=await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const pocket=(result as {pocket?:{id?:unknown;isArchived?:unknown;isActive?:unknown;revision?:unknown;budgetOwnerPocketId?:unknown}}|null)?.pocket;
    if (!pocket || pocket.id!==pocketId || pocket.isArchived!==body.isArchived || pocket.isActive!==!body.isArchived ||
      !Number.isSafeInteger(pocket.revision) || (pocket.revision!==body.expectedRevision && pocket.revision!==body.expectedRevision+1) ||
      (body.budgetOwnerPocketId!==undefined && pocket.budgetOwnerPocketId!==body.budgetOwnerPocketId)) {
      throw new ApiError(502,'INVALID_RESPONSE');
    }
  }

  async updatePocketClassification(pocketId:string,payload:PocketClassificationRequest):Promise<void> {
    if(!isUuid(pocketId)||!isUuid(payload.clientMutationId)||!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<1||
      !['daily','bills','savings'].includes(payload.groupId)||typeof payload.isSpendable!=='boolean')throw new ApiError(400,'INVALID_INPUT');
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,groupId:payload.groupId,isSpendable:payload.isSpendable};
    const token=this.csrf??await this.refreshToken();const route=`/pockets/${pocketId}`;let result:unknown;
    try{result=await this.request(route,'PATCH',body,token);}catch(error){
      if(!(error instanceof ApiError)||error.status!==403||error.code!=='INVALID_CSRF_TOKEN')throw error;
      result=await this.request(route,'PATCH',body,await this.refreshToken());
    }
    const pocket=(result as {pocket?:{id?:unknown;groupId?:unknown;isSpendable?:unknown;revision?:unknown}}|null)?.pocket;
    if(!pocket||pocket.id!==pocketId||pocket.groupId!==body.groupId||pocket.isSpendable!==body.isSpendable||
      !Number.isSafeInteger(pocket.revision)||(pocket.revision!==body.expectedRevision&&pocket.revision!==body.expectedRevision+1))throw new ApiError(502,'INVALID_RESPONSE');
  }

  async correctOpeningBalance(pocketId:string,payload:{clientMutationId:string;expectedRevision:number;openingBalance:number}):Promise<void> {
    if(!isUuid(pocketId)||!isUuid(payload.clientMutationId)||!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<1||
      !Number.isSafeInteger(payload.openingBalance)||payload.openingBalance<0)throw new ApiError(400,'INVALID_INPUT');
    const body={clientMutationId:payload.clientMutationId,expectedRevision:payload.expectedRevision,openingBalance:payload.openingBalance};
    const token=this.csrf??await this.refreshToken();let result:unknown;
    try{result=await this.request(`/pockets/${pocketId}`,'PATCH',body,token);}catch(error){
      if(!(error instanceof ApiError)||error.status!==403||error.code!=='INVALID_CSRF_TOKEN')throw error;
      result=await this.request(`/pockets/${pocketId}`,'PATCH',body,await this.refreshToken());
    }
    const pocket=(result as {pocket?:{id?:unknown;openingBalance?:unknown;revision?:unknown}}|null)?.pocket;
    if(!pocket||pocket.id!==pocketId||pocket.openingBalance!==body.openingBalance||
      !Number.isSafeInteger(pocket.revision)||(pocket.revision!==body.expectedRevision&&pocket.revision!==body.expectedRevision+1))throw new ApiError(502,'INVALID_RESPONSE');
  }

  private parseToken(data: unknown): string {
    const token = (data as {csrfToken?: unknown} | null)?.csrfToken;
    if (typeof token !== 'string' || !token) throw new ApiError(502, 'INVALID_RESPONSE');
    return token;
  }

  private refreshToken(): Promise<string> {
    if (!this.refreshing) {
      this.refreshing = this.request('/auth/csrf').then(data => {
        this.csrf = this.parseToken(data);
        return this.csrf;
      }).finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async logout(): Promise<void> {
    // Only retry an explicit CSRF rejection, never an uncertain network result.
    try {
      const token = this.csrf ?? await this.refreshToken();
      try { await this.request('/auth/logout', 'POST', undefined, token); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 403 || error.code !== 'INVALID_CSRF_TOKEN') throw error;
        await this.request('/auth/logout', 'POST', undefined, await this.refreshToken());
      }
      this.clear();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { this.clear(); return; }
      throw error;
    }
  }
}
