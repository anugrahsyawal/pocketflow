const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function sinkingPreferenceKey(ownerId:string) {
  if(!uuid.test(ownerId))throw new Error('Invalid owner');
  return `pocketflow-connected-sinking-exclusions-v1:${ownerId.toLowerCase()}`;
}
export function parseSinkingExclusions(raw:string|null):string[] {
  if(raw===null)return [];
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value)||value.length>100||value.some(id=>typeof id!=='string'||!uuid.test(id)))throw new Error('Invalid exclusions');
  return [...new Set((value as string[]).map(id=>id.toLowerCase()))].sort();
}
export function changeSinkingExclusion(ids:readonly string[],id:string,included:boolean):string[] {
  return parseSinkingExclusions(JSON.stringify(included?ids.filter(value=>value!==id):[...new Set([...ids,id])]));
}
