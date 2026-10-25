import {GameIcon} from './GameIcon';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {AVATARS,AVATAR_CATEGORIES,LITERARY_NICKNAMES} from '../../../packages/contracts/avatars';
import {PlayerAvatar} from './PlayerAvatar';
export function PlayerProfilePicker({nickname,onName,avatarId,onAvatar,disabled=false}:{nickname:string;onName:(name:string)=>void;avatarId:string;onAvatar:(id:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[category,setCategory]=useState<typeof AVATAR_CATEGORIES[number]>('男'),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const selected=AVATARS.find(a=>a.id===avatarId);
 useEffect(()=>{if(open)dialog.current?.showModal();else if(dialog.current?.open){dialog.current.close();trigger.current?.focus();}},[open]);
 const choose=(id:string)=>{onAvatar(id);setOpen(false);};
 return <div className="player-profile-field">
  <button ref={trigger} className="profile-avatar-trigger" aria-label="选择头像" disabled={disabled} onClick={()=>{if(selected)setCategory(selected.category);setOpen(true);}}>{selected?<PlayerAvatar avatarId={selected.id} name={selected.name}/>:<span className="profile-random-icon" aria-hidden="true"><GameIcon kind="shuffle"/></span>}<small>{selected?'换头像':'随机头像'}</small></button>
  <label className="profile-name">你的称呼<span className="profile-name-input"><input aria-label="你的称呼" autoComplete="nickname" value={nickname} disabled={disabled} onChange={e=>onName(e.target.value)} maxLength={20} placeholder="留空，随机文豪名"/><button type="button" aria-label="随机取个文豪名" title="随机取个文豪名" disabled={disabled} onClick={()=>onName(LITERARY_NICKNAMES[Math.floor(Math.random()*LITERARY_NICKNAMES.length)])}><GameIcon kind="refresh"/></button></span></label>
  {createPortal(<dialog ref={dialog} className="avatar-picker" aria-labelledby="avatar-picker-title" onCancel={e=>{e.preventDefault();setOpen(false);}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}}}>
   <header><div><small>文墨入席</small><h2 id="avatar-picker-title">选一张面孔</h2></div><button aria-label="关闭头像选择" onClick={()=>setOpen(false)}><GameIcon kind="close"/></button></header>
   <div className="avatar-category" role="group" aria-label="头像分类">{AVATAR_CATEGORIES.map(c=><button key={c} aria-pressed={c===category} onClick={()=>setCategory(c)}>{c==='男'?'文人':c==='女'?'才女':'灵兽'}<small>10</small></button>)}</div>
   <div className="avatar-options">{AVATARS.filter(a=>a.category===category).map(a=><button key={a.id} aria-label={`选择${a.name}头像`} aria-pressed={a.id===avatarId} onClick={()=>choose(a.id)}><PlayerAvatar avatarId={a.id} name={a.name}/><span>{a.name}</span></button>)}</div>
   <footer><button className="avatar-random-choice" onClick={()=>choose('')}>交给缘分 · 随机头像</button><small>不选也能入座，系统会为你分配。</small></footer>
  </dialog>,document.body)}
 </div>;
}
