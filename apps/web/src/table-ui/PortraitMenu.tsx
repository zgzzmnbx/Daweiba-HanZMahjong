import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import './portrait-menu.css';
import packageInfo from '../../../../package.json';
export type MenuAction={label:string;icon:MenuIconKind;run:()=>void;disabled?:boolean;badge?:number;priority?:number;shortLabel?:string};
type MenuIconKind='back'|'sound'|'display'|'autoplay'|'arrange'|'music'|'chat'|'brush'|'comma'|'history'|'settings'|'help'|'admin'|'exit'|'book'|'room'|'updates';
const paths:Record<MenuIconKind,ReactNode>={
 back:<path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 6 6v4"/>,
 sound:<><path d="M4 9h4l5-5v16l-5-5H4ZM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>,display:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,autoplay:<><rect x="4" y="7" width="16" height="14" rx="3"/><path d="M12 3v4m-4 6h1m6 0h1m-8 4h8"/></>,arrange:<><rect x="3" y="5" width="7" height="15" rx="1"/><rect x="14" y="3" width="7" height="15" rx="1"/></>,
 music:<><path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
 chat:<path d="M4 4h16v12H9l-5 4V4Zm4 4h8M8 12h5"/>,brush:<path d="m14 4 6 6M6 14 17 3l4 4L10 18M6 14l4 4c0 4-5 4-7 3 3-1 0-4 3-7Z"/>,comma:<path d="M14 7c-6-2-7 6-2 7 0 3-2 5-4 6M14 7c3 4 1 10-6 13"/>,history:<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>,settings:<><path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>,help:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3l-1 1v1m0 3v.1"/></>,admin:<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3ZM9 12l2 2 4-4"/>,exit:<path d="M10 4H4v16h6m2-13 5 5-5 5m-4-5h13"/>,book:<path d="M12 6C8 3 3 4 3 4v15s5-1 9 2c4-3 9-2 9-2V4s-5-1-9 2Zm0 0v15"/>,room:<path d="M5 21V3h14v18M9 7h6m-6 4h6m-6 4h6m-4 6v-3h2v3"/>,updates:<><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8"/></>,
};
export function MenuIcon({kind}:{kind:MenuIconKind}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;}
/** Responsive action overflow; the native dialog traps focus and releases it before a selected action. */
export function PortraitMenu({label,meta,actions,resetKey,badge=0,onOpen,responsive=false,openRequest=0}:{label:string;meta?:ReactNode;actions:MenuAction[];resetKey?:string;badge?:number;onOpen?:()=>void;responsive?:boolean;openRequest?:number}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=()=>{dialog.current?.close();setOpen(false);};
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{close();},[resetKey]);
 useEffect(()=>{if(openRequest)setOpen(true);},[openRequest]);
 useEffect(()=>{const m=matchMedia('(max-width:699px) and (orientation:portrait)'),resize=()=>{close();};m.addEventListener('change',resize);return()=>m.removeEventListener('change',resize);},[]);
 return <>{responsive&&actions.filter(a=>a.priority).map(a=><button key={a.label} className={`hud-tool top-action top-priority-${a.priority}`} aria-label={a.label} disabled={a.disabled} onClick={()=>{onOpen?.();a.run();}}><MenuIcon kind={a.icon}/><small>{a.shortLabel??a.label}</small></button>)}<button ref={trigger} className={"hud-tool portrait-menu-trigger"+(responsive?" responsive-menu-trigger":"")} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{onOpen?.();setOpen(true);}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"/></svg><small>菜单</small>{badge>0&&<i className="menu-unread" aria-label={`${badge} 条新消息`}/>}</button>
 <dialog ref={dialog} className={"portrait-menu-dialog"+(responsive?" responsive-menu-dialog":"")} aria-label={label} onCancel={close} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)close();}}><section><header><div><h2>{label}</h2>{meta&&<p>{meta}</p>}<p className="menu-version" aria-label={`应用版本 ${packageInfo.version}`}>当前版本 v{packageInfo.version}</p></div><button className="menu-close" aria-label="收起菜单" onClick={close}>×</button></header><nav className="portrait-menu-grid" aria-label="收纳的功能">{actions.map(a=><button key={a.label} className={responsive&&a.priority?`overflow-priority-${a.priority}`:undefined} aria-label={a.label} disabled={a.disabled} onClick={()=>{close();a.run();}}><MenuIcon kind={a.icon}/><span>{a.label}</span>{!!a.badge&&<i className="menu-item-count">{a.badge>9?'9+':a.badge}</i>}</button>)}</nav></section></dialog></>;
}
