import {GameIcon} from '../GameIcon';
import {useEffect,useRef,useState} from 'react';
import './new-player-guide.css';
const preferenceKey='hanz-new-player-guide-v1';
export function skipsNewPlayerGuide(){try{return localStorage.getItem(preferenceKey)==='skip';}catch{return false;}}
/** Gate readiness, never pause a live multiplayer clock or send a game command from this dialog. */
export function NewPlayerGuide({preparing=false,disabled=false,onConfirm,onClose}:{preparing?:boolean;disabled?:boolean;onConfirm:()=>void;onClose?:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[skip,setSkip]=useState(skipsNewPlayerGuide);
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 const confirm=()=>{if(disabled)return;try{if(skip)localStorage.setItem(preferenceKey,'skip');else localStorage.removeItem(preferenceKey);}catch{/* A blocked preference store must not prevent play. */}onConfirm();};
 return <dialog ref={dialog} className="new-player-guide" aria-labelledby="new-player-guide-title" onCancel={e=>{e.preventDefault();if(!preparing)onClose?.();}}>
  <header><span className="guide-emblem" aria-hidden="true">字</span><div><h2 id="new-player-guide-title">新手指南</h2><p>把 14 个字，排成一句完整的人话。</p></div>{!preparing&&<button className="guide-close" aria-label="关闭新手指南" onClick={onClose}><GameIcon kind="close"/></button>}</header>
  <ol className="guide-steps">
   <li><span aria-hidden="true">排</span><div><h3>先把字排顺</h3><p>拖动手牌换顺序，拼出你想说的话。</p></div></li>
   <li><span aria-hidden="true">摸</span><div><h3>换个字，试试看</h3><p>「摸」随机摸一张；「吃」拿上家的字。</p></div></li>
   <li><span aria-hidden="true">打</span><div><h3>多的那张，打出去</h3><p>选牌点「打」，或拖到桌中央松手。刚吃的牌先留着。</p></div></li>
   <li><span aria-hidden="true">胡</span><div><h3>成句了，就亮出来</h3><p>用齐 14 字点「胡」，确认后请同桌评审；过半赞成就成功。</p></div></li>
  </ol>
  <aside><p>句尾「。」可拖出逗号，最多 3 个，不占字数。</p><p>全桌打满 10 圈后，还能借别人刚出的字胡牌。</p></aside>
  <footer><label><input type="checkbox" checked={skip} onChange={e=>setSkip(e.target.checked)}/>下次不再出现<span>仅当前浏览器</span></label><button autoFocus className="guide-confirm" disabled={disabled} onClick={confirm}>{preparing?'知道了，开始玩':'知道了'}</button><small>{preparing?'确认后准备开局，看指南不消耗出牌时间。':'可在「帮助」中随时查看；对局计时照常。'}</small></footer>
 </dialog>;
}
