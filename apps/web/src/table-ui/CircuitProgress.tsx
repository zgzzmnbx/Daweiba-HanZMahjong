import {GameIcon} from '../GameIcon';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ResyncEnvelope,TileId} from '../../../../packages/contracts/types';
import {BORROW_HU_CIRCUITS,REWRITE_CIRCUITS,completedCircuits,supportsRewrite,rewriteUnlocked} from '../../../../packages/contracts/response-policy';
import type {SentenceRackController} from './SentenceRackController';
import './circuit-progress.css';
const validChar=(value:string)=>/^\p{Unified_Ideograph}$/u.test(value);
export function CircuitProgress({envelope:e,controller:c,resetKey,onOpen}:{envelope:ResyncEnvelope;controller:SentenceRackController;resetKey:string;onOpen:()=>void}){
 const [open,setOpen]=useState(false),[editing,setEditing]=useState(false),[selected,setSelected]=useState<TileId|null>(null),[value,setValue]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const p=e.public,complete=completedCircuits(p),current=complete+1,self=p.players.find(p=>p.playerId===e.private.playerId),used=!!self?.rewriteUsed,unlocked=rewriteUnlocked(p),supported=supportsRewrite(p.rulesVersion),tile=e.private.hand.find(t=>t.tileId===selected),char=value.trim().normalize('NFC'),allowed=c.allowed('REWRITE_TILE');
 useEffect(()=>{setOpen(false);setEditing(false);setSelected(null);setValue('');},[resetKey]);
 useEffect(()=>{if(used){setEditing(false);setValue('');}if(selected&&!e.private.hand.some(t=>t.tileId===selected))setSelected(null);},[used,e.private.hand,selected]);
 useLayoutEffect(()=>{const d=dialog.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 const status=!supported?'此局沿用旧规则，下局启用':used?'本局已用，下局重新获得':!unlocked?`再完成 ${Math.max(0,REWRITE_CIRCUITS-complete)} 圈解锁`:allowed?'已获得一次改字机会':'已获得，等自己的出牌回合使用';
 return <>
  <button ref={trigger} type="button" className={'circuit-trigger '+(unlocked&&!used?'available':'')} aria-label="圈数与阶段规则" aria-haspopup="dialog" onClick={()=>{onOpen();setOpen(true);}}><span>{p.roundId?<>第 <b>{current}</b> 圈</>:'待开局'}</span><i aria-hidden="true" style={{width:`${p.roundId?Math.min(100,complete/REWRITE_CIRCUITS*100):0}%`}}/></button>
  <dialog ref={dialog} className="table-dialog circuit-dialog" aria-label="圈数与改字" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onKeyDown={event=>event.stopPropagation()}>
   <div className="circuit-heading"><div><small>牌桌进程</small><h2>{p.roundId?`第 ${current} 圈`:'等大家准备'}</h2></div><button type="button" className="circuit-close" aria-label="收起圈数说明" onClick={close}><GameIcon kind="close"/></button></div>
   <p className="circuit-count">已完成 {complete} 圈 · 全桌每 {p.capacity} 次出牌算一圈</p>
   <div className="circuit-milestones"><div data-unlocked={complete>=BORROW_HU_CIRCUITS}><b>10<small>圈后</small></b><span><strong>借字胡牌</strong><small>借任意对手刚出的字，排句申请胡牌。</small></span></div><div data-unlocked={unlocked}><b>20<small>圈后</small></b><span><strong>妙笔改字 · 每人一次</strong><small>选自己的一张手牌，改成输入的一个汉字。</small></span></div></div>
   <p className="circuit-status" role="status">{status}</p>
   {editing&&!used?<form className="rewrite-form" onSubmit={event=>{event.preventDefault();if(allowed&&tile&&validChar(char)&&tile.char!==char)void c.command({kind:'REWRITE_TILE',tileId:tile.tileId,char});}}>
    <label className="rewrite-label">选一张自己的牌</label><div className="rewrite-tiles" aria-label="选择改字手牌">{e.private.draft.orderedTileIds.map((id,index)=>{const t=e.private.hand.find(t=>t.tileId===id);return t?<button type="button" key={id} aria-label={`改写第 ${index+1} 张 ${t.char}`} aria-pressed={id===selected} disabled={!allowed} onClick={()=>setSelected(id)}>{t.char}</button>:null;})}</div>
    <div className="rewrite-input"><span className="rewrite-before">{tile?.char??'字'}</span><GameIcon kind="arrowRight"/><label><span className="sr-only">改成哪个汉字</span><input aria-label="改成哪个汉字" value={value} onChange={event=>setValue(event.target.value)} maxLength={4} placeholder="汉字" autoComplete="off" spellCheck={false} disabled={!allowed}/></label></div>
    <p className="rewrite-hint">只改牌字，不换牌、不增加时间。刚吃的牌仍不能立即打出。</p>
    {value&&!validChar(char)&&<p className="rewrite-error" role="status">请输入一个汉字，不含标点或数字。</p>}
    {tile&&tile.char===char&&<p className="rewrite-error" role="status">换一个字吧，原字不会消耗机会。</p>}
    {c.message&&<p className="rewrite-error" role="status">{c.message}</p>}
    <div className="rewrite-actions"><button type="button" onClick={()=>setEditing(false)}>先留着</button>{c.pending?<button type="button" onClick={()=>void c.retry()}>重试提交</button>:<button className="primary" type="submit" disabled={!allowed||!tile||!validChar(char)||tile.char===char}>确认改字 · 本局一次</button>}</div>
   </form>:unlocked&&!used&&<button className="primary rewrite-open" disabled={!allowed} onClick={()=>{setSelected(c.selected??e.private.draft.orderedTileIds[0]??null);setEditing(true);setValue('');}}>使用妙笔改字</button>}
  </dialog>
 </>;
}
