import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './tile-hint.css';

/** Follow the visible tile (DOM or projected 3D), without changing layout or hit testing. */
export function TileHint({anchor,text,kind}:{anchor:()=>HTMLElement|null;text:string;kind:'eat'|'period'|'borrow'}){
 const bubble=useRef<HTMLDivElement>(null),latest=useRef(anchor);latest.current=anchor;
 useLayoutEffect(()=>{
  let frame=0;
  const place=()=>{
   const el=bubble.current,tile=latest.current(),r=tile?.getBoundingClientRect();
   if(el){
    const hidden=!r||!r.width||!r.height||!!tile?.closest('[data-motion-hidden="true"]')||document.hidden||!!document.querySelector('dialog[open]');
    el.hidden=hidden;
    if(!hidden&&r){
     const viewport=window.visualViewport,leftEdge=viewport?.offsetLeft??0,topEdge=viewport?.offsetTop??0,rightEdge=leftEdge+(viewport?.width??innerWidth),bottomEdge=topEdge+(viewport?.height??innerHeight);
     const b=el.getBoundingClientRect(),left=Math.max(leftEdge+8,Math.min(rightEdge-b.width-8,r.left+r.width/2-b.width/2)),below=r.top-b.height-9<topEdge+8;
     el.style.left=`${left}px`;el.style.top=`${Math.max(topEdge+8,Math.min(bottomEdge-b.height-8,below?r.bottom+9:r.top-b.height-9))}px`;
     el.style.setProperty('--tile-hint-arrow',`${Math.max(10,Math.min(b.width-10,r.left+r.width/2-left))}px`);el.dataset.below=String(below);
    }
   }
   frame=requestAnimationFrame(place);
  };
  place();return()=>cancelAnimationFrame(frame);
 },[]);
 return createPortal(<div ref={bubble} className={`tile-micro-hint ${kind}-micro-hint`} role="status">{text}</div>,document.body);
}

/** One three-second lesson per round and browser tab; reconnects never extend it. */
export function RoundMilestoneHint({identity,eligible,active,anchor,text,kind}:{identity:string;eligible:boolean;active:boolean;anchor:()=>HTMLElement|null;text:string;kind:'period'|'borrow'}){
 const [visible,setVisible]=useState<string|null>(null),seen=useRef('');
 useEffect(()=>{
  if(!eligible||!active||document.hidden||seen.current===identity||document.querySelector('dialog[open]'))return;
  const key=`hanz-${kind}-hint:${identity}`;
  try{if(sessionStorage.getItem(key)){seen.current=identity;return;}}catch{/* Storage is optional. */}
  const tile=anchor()?.getBoundingClientRect();if(!tile?.width||!tile.height)return;
  seen.current=identity;try{sessionStorage.setItem(key,'seen');}catch{/* Keep the in-memory guard. */}
  setVisible(identity);
 },[identity,eligible,active,anchor,kind]);
 useEffect(()=>{if(!visible)return;const timer=setTimeout(()=>setVisible(null),3000);return()=>clearTimeout(timer);},[visible]);
 return visible===identity&&active&&eligible?<TileHint anchor={anchor} text={text} kind={kind}/>:null;
}

export function ThirdCircuitHint({identity,circuit,active,anchor}:{identity:string;circuit:number;active:boolean;anchor:()=>HTMLElement|null}){
 return <RoundMilestoneHint identity={identity} eligible={circuit===3} active={active} anchor={anchor} text="拖动出逗号" kind="period"/>;
}
