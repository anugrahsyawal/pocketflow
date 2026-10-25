import {useEffect,useState} from 'react';

const prefix='#/pockets/';
const read=()=>window.location.hash.startsWith(prefix)?window.location.hash.slice(prefix.length):null;

/** Connected-only hash routes leave the session, draft and recovery owners mounted. */
export function usePocketNavigation(){
  const [pocketId,setPocketId]=useState(read);
  useEffect(()=>{
    const sync=()=>setPocketId(read());
    window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
  },[]);
  const open=(id:string)=>{
    if(read()===id)return;
    window.history.pushState({...window.history.state,pocketFlowDetail:true},'',`${prefix}${encodeURIComponent(id)}`);
    setPocketId(read());
  };
  const close=()=>{
    if(window.history.state?.pocketFlowDetail===true){window.history.back();return;}
    const url=new URL(window.location.href);url.hash='';
    window.history.replaceState(window.history.state,'',url);
    setPocketId(null);
  };
  return {pocketId,open,close};
}
