const items=[
  {id:'server-home',label:'Beranda',path:'m3 10 9-7 9 7v11h-6v-7H9v7H3Z'},
  {id:'server-pocket-list',label:'Pocket',path:'M3 5h17v16H3ZM3 5V3h14v2M15 11h6v5h-6Z'},
  {id:'server-entry',label:'Tambah transaksi',path:'M12 4v16M4 12h16'},
  {id:'server-history',label:'Riwayat',path:'M5 3h14v18l-3-2-4 2-4-2-3 2ZM8 8h8M8 12h8'},
  {id:'server-reports',label:'Laporan',path:'M3 3h18v18H3ZM7 17v-5M12 17V7M17 17v-8'},
];

/** Section navigation only: never mounts a local router or replaces recovery owners. */
export function ConnectedNavigation({blocked}:{blocked:boolean}){
  return <nav aria-label="Navigasi server" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-surface/95 backdrop-blur-xl shadow-nav border-t border-border/60 z-50 pb-safe rounded-t-[24px]">
    <div className="flex items-center justify-around h-[72px] px-2">
      {items.map(item=><button key={item.id} type="button" aria-label={item.label} disabled={blocked}
        className={item.id==='server-entry'?'flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-on-primary ring-[5px] ring-background disabled:opacity-50':'flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] text-primary disabled:opacity-50'}
        onClick={()=>{const target=document.getElementById(item.id);if(!target)return;target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width={item.id==='server-entry'?28:24} height={item.id==='server-entry'?28:24} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.path}/></svg>
        {item.id!=='server-entry'&&<span className="text-[11px] leading-4 font-semibold">{item.label}</span>}
      </button>)}
    </div>
  </nav>;
}
