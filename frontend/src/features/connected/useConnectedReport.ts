import {useEffect,useRef,useState} from 'react';
import {ApiError,SessionClient,sessionErrorMessage} from '@/lib/api/sessionClient';
import {LatestReportRequest,type ServerReport} from '@/lib/api/reportRead';

export function useConnectedReport(client:SessionClient,startDate:string,onExpired:()=>void) {
  const gate=useRef(new LatestReportRequest());
  const [retry,setRetry]=useState(0);
  const [state,setState]=useState<{key:string;report:ServerReport|null;error:string}|null>(null);
  const key=`${startDate}:${retry}`;
  useEffect(()=>{
    const requests=gate.current;
    void requests.run(()=>client.readReport({startDate})).then(result=>{
      if(result.kind==='stale')return;
      if(result.kind==='error'){
        if(result.error instanceof ApiError&&result.error.status===401){onExpired();return;}
        setState({key,report:null,error:sessionErrorMessage(result.error)});
      }else setState({key,report:result.value,error:''});
    });
    return()=>requests.invalidate();
  },[client,startDate,key,onExpired]);
  // Key mismatch hides old data during render, before the effect starts its GET.
  const current=state?.key===key?state:null;
  return {report:current?.report??null,error:current?.error??'',loading:current===null,
    reload:()=>{gate.current.invalidate();setRetry(n=>n+1);}};
}
