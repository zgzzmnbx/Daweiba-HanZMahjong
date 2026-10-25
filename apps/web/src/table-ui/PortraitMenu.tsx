import {GameIcon,type GameIconKind} from '../GameIcon';
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import './portrait-menu.css';
import packageInfo from '../../../../package.json';
export type MenuAction={label:string;icon:MenuIconKind;run:()=>void;disabled?:boolean;badge?:number;priority?:number;shortLabel?:string};
type MenuIconKind=GameIconKind;
export const MenuIcon=GameIcon;
/** Responsive action overflow; the native dialog traps focus and releases it before a selected action. */
export function PortraitMenu({label,meta,actions,resetKey,badge=0,onOpen,responsive=false,openRequest=0}:{label:string;meta?:ReactNode;actions:MenuAction[];resetKey?:string;badge?:number;onOpen?:()=>void;responsive?:boolean;openRequest?:number}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=()=>{dialog.current?.close();setOpen(false);};
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{close();},[resetKey]);
 useEffect(()=>{if(openRequest)setOpen(true);},[openRequest]);
 useEffect(()=>{const m=matchMedia('(max-width:699px) and (orientation:portrait)'),resize=()=>{close();};m.addEventListener('change',resize);return()=>m.removeEventListener('change',resize);},[]);
 return <>{responsive&&actions.filter(a=>a.priority).map(a=><button key={a.label} className={`hud-tool top-action top-priority-${a.priority}`} aria-label={a.label} disabled={a.disabled} onClick={()=>{onOpen?.();a.run();}}><MenuIcon kind={a.icon}/><small>{a.shortLabel??a.label}</small></button>)}<button ref={trigger} className={"hud-tool portrait-menu-trigger"+(responsive?" responsive-menu-trigger":"")} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{onOpen?.();setOpen(true);}}><GameIcon kind="menu"/><small>菜单</small>{badge>0&&<i className="menu-unread" aria-label={`${badge} 条新消息`}/>}</button>
 <dialog ref={dialog} className={"portrait-menu-dialog"+(responsive?" responsive-menu-dialog":"")} aria-label={label} onCancel={close} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)close();}}><section><header><div><h2>{label}</h2>{meta&&<p>{meta}</p>}<p className="menu-version" aria-label={`应用版本 ${packageInfo.version}`}>当前版本 v{packageInfo.version}</p></div><button className="menu-close" aria-label="收起菜单" onClick={close}><GameIcon kind="close"/></button></header><nav className="portrait-menu-grid" aria-label="收纳的功能">{actions.map(a=><button key={a.label} className={responsive&&a.priority?`overflow-priority-${a.priority}`:undefined} aria-label={a.label} disabled={a.disabled} onClick={()=>{close();a.run();}}><MenuIcon kind={a.icon}/><span>{a.label}</span>{!!a.badge&&<i className="menu-item-count">{a.badge>9?'9+':a.badge}</i>}</button>)}</nav></section></dialog></>;
}
