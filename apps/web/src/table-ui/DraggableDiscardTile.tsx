import {useEffect,useImperativeHandle,useLayoutEffect,useRef,useState,type PointerEvent as ReactPointerEvent,type Ref} from 'react';
import {createPortal} from 'react-dom';
import './drag-eat.css';
export type EatDragControls={cancel:()=>void};
type Area={left:number;top:number;width:number;height:number};
type Gesture={pointerId:number;key:string;startX:number;startY:number;x:number;y:number;width:number;height:number;started:boolean;over:boolean;areas:Area[]};
const inside=(r:Area,x:number,y:number)=>x>=r.left&&x<=r.left+r.width&&y>=r.top&&y<=r.top+r.height;
/** Frozen visible hand geometry; taking a public tile never edits the private draft optimistically. */
function targets(source:HTMLElement):Area[]{
 const shell=source.closest('.game-shell');if(!shell)return[];
 const rack=shell.querySelector<HTMLElement>('.sentence-rack');
 const tiles=rack?[rack]:Array.from(shell.querySelectorAll<HTMLElement>('.projected-tile'));
 const boxes=tiles.map(t=>t.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);if(!boxes.length)return[];
 const left=Math.max(0,Math.min(...boxes.map(r=>r.left))-8),right=Math.min(innerWidth,Math.max(...boxes.map(r=>r.right))+8),top=Math.max(0,Math.min(...boxes.map(r=>r.top))-8),bottom=Math.min(innerHeight,Math.max(...boxes.map(r=>r.bottom))+8);
 const areas=[{left,top,width:right-left,height:bottom-top}];
 const eat=shell.querySelector<HTMLElement>('[aria-label="吃上家的字"]')?.getBoundingClientRect();if(eat)areas.push({left:eat.left,top:eat.top,width:eat.width,height:eat.height});return areas;
}
export function DraggableDiscardTile({char,enabled,resetKey,onEat,onStart,controls}:{char:string;enabled:boolean;resetKey:string;onEat:()=>void;onStart:()=>void;controls:Ref<EatDragControls>}){
 const pointer=useRef<Gesture|null>(null),[drag,setDrag]=useState<Gesture|null>(null),valid=useRef({enabled,resetKey,onEat});valid.current={enabled,resetKey,onEat};
 const cancel=()=>{pointer.current=null;setDrag(null);};useImperativeHandle(controls,()=>({cancel}));
 useLayoutEffect(cancel,[enabled,resetKey]);
 useEffect(()=>{const stop=()=>cancel(),key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();},hidden=()=>{if(document.hidden)cancel();};window.addEventListener('resize',stop);window.addEventListener('blur',stop);window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);return()=>{pointer.current=null;window.removeEventListener('resize',stop);window.removeEventListener('blur',stop);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);};},[]);
 const begin=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(!enabled||e.button!==0||!e.isPrimary||pointer.current)return;const areas=targets(e.currentTarget);if(!areas.length)return;e.preventDefault();e.stopPropagation();onStart();const r=e.currentTarget.getBoundingClientRect();const p={pointerId:e.pointerId,key:resetKey,startX:e.clientX,startY:e.clientY,x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,started:false,over:false,areas};pointer.current=p;e.currentTarget.setPointerCapture(e.pointerId);};
 const move=(e:ReactPointerEvent<HTMLButtonElement>)=>{const p=pointer.current;if(!p||e.pointerId!==p.pointerId)return;if(!valid.current.enabled||valid.current.resetKey!==p.key){cancel();return;}if(!p.started&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<7)return;e.preventDefault();p.started=true;p.x=e.clientX;p.y=e.clientY-18;p.over=p.areas.some(r=>inside(r,e.clientX,e.clientY));setDrag({...p});};
 const end=(e:ReactPointerEvent<HTMLButtonElement>)=>{const p=pointer.current;if(!p||p.pointerId!==e.pointerId)return;move(e);const accept=pointer.current===p&&p.started&&p.over&&valid.current.enabled&&valid.current.resetKey===p.key;cancel();if(accept)valid.current.onEat();};
 return <>{enabled?<button type="button" className={'latest-tile eat-draggable '+(drag?.started?'eat-lifted':'')} aria-label={`拖动「${char}」到手牌吃牌`} title="拖到手牌，或拖到「吃」" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={cancel} onClick={e=>{if(e.detail===0&&valid.current.enabled)valid.current.onEat();}}>{char}</button>:<strong className="latest-tile">{char}</strong>}
 {drag?.started&&createPortal(<>
  <div className={'eat-drop-outline '+(drag.over?'over':'')} aria-hidden="true" style={drag.areas[0]}><span>{drag.over?'松手吃牌':'拖到手牌，吃这张'}</span></div>
  <div className="rack-drag-ghost eat-drag-ghost" aria-hidden="true" style={{width:drag.width,height:drag.height,fontSize:drag.width*.81,transform:`translate3d(${drag.x-drag.width/2}px,${drag.y-drag.height/2}px,0)`}}>{char}</div>
 </>,document.body)}</>;
}
