import {useEffect,useState} from 'react';
import {changeSinkingExclusion,parseSinkingExclusions,sinkingPreferenceKey} from '@/lib/api/sinkingPreferences';

/** Connected account-local preferences; never reuse demo pocket IDs or write the API. */
export function useSinkingPreferences(ownerId:string) {
  const key=sinkingPreferenceKey(ownerId);
  const read=()=>{
    try{return {ids:parseSinkingExclusions(localStorage.getItem(key)),error:''};}
    catch{return {ids:[] as string[],error:'Pilihan pengecualian lokal tidak dapat dibaca. Untuk sementara semua pocket disertakan.'};}
  };
  const [state,setState]=useState(read);
  useEffect(()=>{
    const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null)setState(read());};
    window.addEventListener('storage',sync);
    return()=>window.removeEventListener('storage',sync);
  },[key]);
  const setIncluded=(id:string,included:boolean)=>{
    try{
      const ids=changeSinkingExclusion(state.ids,id,included);
      localStorage.setItem(key,JSON.stringify(ids));
      setState({ids,error:''});
    }catch{setState(previous=>({...previous,error:'Pilihan tidak disimpan. Periksa penyimpanan browser atau batas 100 pengecualian; pilihan sebelumnya tetap digunakan.'}));}
  };
  return {ids:state.ids,error:state.error,setIncluded};
}
