import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {RoundShowcase as Showcase,TileId} from '../../../../packages/contracts/types';
import {PlayerAvatar} from '../PlayerAvatar';
import {GameIcon} from '../GameIcon';
import './round-showcase.css';

function HandCard({hand}: {hand:Showcase['hands'][number]}){
 const root=useRef<HTMLElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{threshold:.15});if(root.current)observer.observe(root.current);return()=>observer.disconnect();},[]);
 const ids=hand.draft.orderedTileIds;
 const rows=[ids.slice(0,7),ids.slice(7)].filter(row=>row.length).map((row,r)=>row.flatMap((id,i)=>{
  const last=r*7+i===ids.length-1;
  return [{key:id,char:hand.tiles.find(t=>t.tileId===id)?.char??'',mark:false},...((hand.draft.commaAfterTileIds as readonly TileId[]).includes(id)?[{key:id+'comma',char:'，',mark:true}]:[]),...(last?[{key:id+'period',char:'。',mark:true}]:[])];
 }));
 const slots=Math.max(...rows.map(r=>r.length),8);
 return <article ref={root} className={'showcase-hand'+(hand.winner?' is-winner':'')} data-visible={visible} data-player-id={hand.playerId}>
  <header><PlayerAvatar avatarId={hand.avatarId} name={hand.nickname} seed={hand.playerId}/><div><h3>{hand.nickname}</h3><small>{hand.managed?'托管中 · ':''}{hand.tiles.length} 张</small></div><span className="showcase-badge">{hand.winner?'本局胡牌':'未胡牌'}</span></header>
  <div className="showcase-tiles" style={{'--showcase-slots':slots,'--showcase-total':rows.reduce((n,r)=>n+r.length,0)} as CSSProperties} aria-label={`${hand.nickname}的手牌`}>
   {rows.map((row,index)=><div className="showcase-row" key={index}>{row.map((tile,i)=><span key={tile.key} className={'showcase-tile'+(tile.mark?' is-mark':'')} style={{'--tile-delay':`${(index*7+i)*24}ms`} as CSSProperties}>{tile.char}</span>)}</div>)}
  </div>
  {hand.winner&&<p className="showcase-winning-line">本局成句 · 好句，大家认了。</p>}
 </article>;
}
/** Nonmodal page below the toolbar: existing music and chat stay reachable. */
export function RoundShowcase({roomId,current,onClose,onLeave,onPrepare,onDissolve}:{roomId:string;current?:Showcase;onClose:()=>void;onLeave?:()=>void;onPrepare?:()=>void;onDissolve?:()=>void}){
 const [records,setRecords]=useState<Showcase[]>(current?[current]:[]),[selected,setSelected]=useState(current?.roundId??''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const root=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const siblings=[...(root.current?.parentElement?.children??[])].filter(e=>e!==root.current&&e.tagName!=='DIALOG') as HTMLElement[];const saved=siblings.map(e=>[e,e.inert] as const);for(const [e] of saved)e.inert=true;close.current?.focus();return()=>{for(const [e,inert] of saved)e.inert=inert;if(previous?.isConnected)previous.focus();};},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void fetch(`/api/rooms/${encodeURIComponent(roomId)}/showcases`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<{showcases:Showcase[]}>;}).then(data=>{if(controller.signal.aborted)return;setRecords(data.showcases);setSelected(id=>data.showcases.some(s=>s.roundId===id)?id:data.showcases[0]?.roundId??'');}).catch(()=>{if(!controller.signal.aborted)setError('晒牌记录暂未加载，请重试。');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[roomId,current?.roundId,retry]);
 const record=records.find(r=>r.roundId===selected),isCurrent=!!record&&record.roundId===current?.roundId;
 return <section ref={root} className="round-showcase-page" aria-label="散局晒牌" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')onClose();}}>
  <header className="showcase-heading"><div><h2>散局晒牌</h2><p>差一点，就成了名句。</p></div><button ref={close} aria-label="收起晒牌" onClick={onClose}><GameIcon kind="close"/></button></header>
  {records.length>1&&<label className="showcase-round-picker">翻看往局<select aria-label="选择晒牌记录" value={selected} onChange={e=>setSelected(e.target.value)}>{records.map((r,i)=><option key={r.roundId} value={r.roundId}>{i===0?'最近一局':`往前第 ${i} 局`} · {r.hands.find(h=>h.winner)?.nickname??'本局成句'}</option>)}</select></label>}
  <div className="showcase-scroll" key={selected} tabIndex={0} aria-label="晒牌列表">
   {error&&<p role="status">{error}<button onClick={()=>setRetry(n=>n+1)}>重新加载</button></p>}
   {record?<><p className="showcase-intro">先看未成的句，再赏本局好句。<span>仅展示真人 · 保留原排列</span></p>{record.hands.map(hand=><HandCard key={hand.playerId} hand={hand}/>)}<p className="showcase-end">字有尽，意未尽。下局接着聊。</p></>:<p className="showcase-empty">{loading?'正在翻开这一页…':'胡牌通过后，真人手牌会留在这里。'}</p>}
  </div>
  <footer className="showcase-actions"><button onClick={onClose}>回到牌桌</button>{isCurrent&&onPrepare&&<button className="primary" onClick={onPrepare}>下一局设置</button>}{isCurrent&&onDissolve&&<button onClick={onDissolve}>解散房间</button>}{onLeave&&<button onClick={onLeave}>返回大厅</button>}</footer>
 </section>;
}
