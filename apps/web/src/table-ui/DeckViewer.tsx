import {useEffect,useState} from 'react';
import type {RoomDeckView} from '../../../../packages/contracts/deck';
import './deck-viewer.css';
import {prepareDeckFont} from './deck-font';
const DISPLAY_COPIES=3;

/** Counts describe the original set, never hidden hands or future draw order. */
export function DeckViewer({roomId,roundId}:{roomId:string;roundId:string|null}){
 const [fontReady,setFontReady]=useState(false);
 const [data,setData]=useState<RoomDeckView|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();let active=true;setData(null);setError(false);
  void fetch(`/api/rooms/${encodeURIComponent(roomId)}/deck`,{credentials:'same-origin',cache:'no-store',signal:abort.signal}).then(async r=>{
   if(!r.ok)throw new Error('DECK_UNAVAILABLE');const next:RoomDeckView=await r.json();
   if(next.roomId!==roomId||next.roundId!==roundId)throw new Error('DECK_CHANGED');
   const ready=await prepareDeckFont(next.entries.map(e=>e.char).join(''),abort.signal);
   if(active){setFontReady(ready);setData(next);}
  }).catch(()=>{if(active&&!abort.signal.aborted)setError(true);});
  return()=>{active=false;abort.abort();};
 },[roomId,roundId,retry]);
 if(error)return <div className="deck-view-status" role="status"><p>牌组暂时没取到，再试一次吧。</p><button onClick={()=>setRetry(v=>v+1)}>重新加载牌组</button></div>;
 if(!data)return <div className="deck-view-status" role="status">正在铺开牌组…</div>;
 const visible=data.entries.reduce((sum,e)=>sum+Math.min(DISPLAY_COPIES,e.count),0);
 return <section className="deck-view" data-font={fontReady?'wenkai':'fallback'} aria-label="麻将牌组">
  <div className="deck-view-summary"><div><strong>{data.name}</strong><span>{data.frozen?'本局牌组':'开局预览'} · {data.capacity}人桌</span></div><p>{data.total} 张 <i>·</i> {data.entries.length} 种字 <i>·</i> 展示 {visible} 张</p></div>
  <p className="deck-view-note">同字最多展示3张，角标为实际张数。{data.frozen?'这是本局完整配比，不是剩余牌。':'以开局时的最新配比为准。'}</p>
  {!fontReady&&<p className="deck-font-notice" role="status">字形加载较慢，暂用备用字体。<button onClick={()=>setRetry(v=>v+1)}>重试字形</button></p>}
  <div className="deck-view-grid" role="region" aria-label="牌组全部字牌" tabIndex={0}>
   {data.entries.flatMap(entry=>Array.from({length:Math.min(DISPLAY_COPIES,entry.count)},(_,i)=><div className="deck-view-tile" data-deck-char={entry.char} key={`${entry.char}-${i}`} role="img" aria-label={`${entry.char}，共${entry.count}张，展示第${i+1}张`} title={`${entry.char} · 共${entry.count}张`}><b>{entry.char}</b>{i===Math.min(DISPLAY_COPIES,entry.count)-1&&<small className={entry.count>DISPLAY_COPIES?'is-capped':undefined}>×{entry.count}</small>}</div>))}
  </div>
 </section>;
}
