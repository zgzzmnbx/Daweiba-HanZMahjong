import {playerDisplayName} from '../../../../packages/contracts/browser-return';
import {useLayoutEffect,useRef,useState} from 'react';
import type {SeatView} from '../../../../packages/contracts/table-view';
import type {Label} from '../table3d/main-view';
import type {MotionAnchors} from './table-motion';
import './seat-badges.css';

type Box={x:number;y:number;width:number;height:number};
type Placement=Box&{seat:number;small:boolean;outside:boolean;rail?:boolean;horizontal?:boolean};
const relation:Record<SeatView['relation'],string>={SELF:'本人',NEXT:'下家',PREVIOUS:'上家',NEXT_AND_PREVIOUS:'对家',OTHER:'同桌'};
const seatRelation=(seat:SeatView,count:number)=>seat.relation==='OTHER'&&count%2===0&&seat.relativeSeat===count/2?'对家':relation[seat.relation];
const overlaps=(a:Box,b:Box,pad=5)=>a.x<b.x+b.width+pad&&a.x+a.width>b.x-pad&&a.y<b.y+b.height+pad&&a.y+a.height>b.y-pad;
/** Display-only placement: prefer free outer margins; a reserved rail resizes the entire canvas and its hit targets together. */
export function SeatBadges({seats,labels,fallback,now,anchors}:{seats:readonly SeatView[];labels:Label[];fallback:boolean;now:number;anchors:()=>MotionAnchors}){
 const forcedRail=useRef('');
 const root=useRef<HTMLDivElement>(null),readAnchors=useRef(anchors);readAnchors.current=anchors;
 const [layout,setLayout]=useState<Placement[]>([]),[measure,setMeasure]=useState(0);
 useLayoutEffect(()=>{const el=root.current,stage=el?.closest('.table-stage'),viewport=el?.closest('.viewport');if(!stage||!viewport)return;const observer=new ResizeObserver(()=>setMeasure(n=>n+1));observer.observe(stage);observer.observe(viewport);return()=>observer.disconnect();},[]);
 useLayoutEffect(()=>{
  const el=root.current,stage=el?.closest('.table-stage')?.getBoundingClientRect(),vp=el?.closest('.viewport')?.getBoundingClientRect();if(!el||!stage||!vp)return;
  const left=stage.left-vp.left,top=stage.top-vp.top,right=stage.right-vp.left,bottom=stage.bottom-vp.top;
  const blocks:Box[]=Object.entries(readAnchors.current()).filter(([key])=>key.startsWith('hand:')||key.startsWith('tile:')||key.startsWith('discard:')).map(([,r])=>({x:r.x-r.width/2-vp.left,y:r.y-r.height/2-vp.top,width:r.width,height:r.height}));
  for(const item of el.closest('.viewport')!.querySelectorAll<HTMLElement>('.table-comma-tray,.table-action-dock')){const r=item.getBoundingClientRect();if(r.width&&r.height)blocks.push({x:r.x-vp.left,y:r.y-vp.top,width:r.width,height:r.height});}
  const layoutKey=`${Math.round(stage.width)}:${Math.round(stage.height)}:${fallback}`,next:Placement[]=[],rail=forcedRail.current===layoutKey||window.matchMedia('(max-width:699px), (max-height:599px)').matches,horizontal=window.matchMedia('(min-width:500px) and (max-height:499px)').matches;
  el.dataset.rail=rail&&!horizontal?'true':'false';
  if(horizontal){
   const others=seats.filter(s=>s.relation!=='SELF'),leftSeats=others.filter(s=>s.placement.labelAnchor.x<=0),rightSeats=others.filter(s=>s.placement.labelAnchor.x>0),rows=Math.max(leftSeats.length,rightSeats.length),height=Math.min(40,(stage.height-12-(rows-1)*4)/rows),width=Math.min(138,(stage.width-vp.width)/2-12);
   [leftSeats,rightSeats].forEach((group,side)=>{
    let available=width;
    for(const control of el.closest('.viewport')!.querySelectorAll<HTMLElement>('.table-comma-tray,.table-action-dock')){const r=control.getBoundingClientRect();if(side===0&&r.left<vp.left+vp.width/2)available=Math.min(available,r.left-stage.left-12);if(side===1&&r.right>vp.left+vp.width/2)available=Math.min(available,stage.right-r.right-12);}
    available=Math.max(64,available);
    group.sort((a,b)=>b.placement.labelAnchor.y-a.placement.labelAnchor.y).forEach((s,i)=>next.push({seat:s.logicalSeat,x:side?right-available-5:left+5,y:top+6+i*(height+4),width:available,height,small:true,outside:true,horizontal:true}));
   });
   setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);return;
  }
  if(rail){
   const ordered=seats.filter(s=>s.relation!=='SELF').sort((a,b)=>a.placement.labelAnchor.x-b.placement.labelAnchor.x||b.placement.labelAnchor.y-a.placement.labelAnchor.y),gap=4,width=Math.min(horizontal?138:96,(stage.width-12-gap*(ordered.length-1))/ordered.length),start=left+(stage.width-width*ordered.length-gap*(ordered.length-1))/2;
   ordered.forEach((s,i)=>next.push({seat:s.logicalSeat,x:start+i*(width+gap),y:top+4,width,height:horizontal?44:68,small:true,outside:true,rail:true,horizontal}));
   setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);return;
  }
  for(const seat of seats.filter(s=>s.relation!=='SELF').sort((a,b)=>Math.abs(a.placement.labelAnchor.x)-Math.abs(b.placement.labelAnchor.x)||b.placement.labelAnchor.y-a.placement.labelAnchor.y)){
   const l=labels.find(l=>l.seat===seat.logicalSeat),sx=seat.placement.labelAnchor.x,sy=seat.placement.labelAnchor.y;
   const anchor={x:l?.x??vp.width*(.5+sx*.38),y:l?.y??vp.height*(.5-sy*.35)};
   let chosen:Placement|undefined;
   for(const small of [false,true]){
    const width=small?82:126,height=small?68:124;
    const candidates:Box[]=[];
    const push=(x:number,y:number)=>candidates.push({x,y,width,height});
    // Preserve seating order, with side seats outside the canvas whenever there is space.
    if(sx<-.4&&-left>=width+8)push(-width-8,anchor.y-height/2);
    if(sx>.4&&right-vp.width>=width+8)push(vp.width+8,anchor.y-height/2);
    if(sy>.55&&-top>=height+6)push(anchor.x-width/2,-height-6);
    if(Math.abs(sx)<.4)push(anchor.x-width/2,top+5);
    else{push(sx<0?left+5:right-width-5,anchor.y-height/2);push(sx<0?left+5:right-width-5,sy>0?top+5:bottom-height-5);}
    push(anchor.x-width/2,anchor.y-height-22);
    // Compact free-space search stays near this seat and checks every visible hand/discard.
    for(let y=top+5;y<=bottom-height-5;y+=Math.max(20,height/3)){
     push(sx<0?left+5:right-width-5,y);
     if(Math.abs(sx)<.4)push(anchor.x-width/2,y);
    }
    const valid=candidates.filter(r=>r.x>=left+2&&r.y>=top+2&&r.x+r.width<=right-2&&r.y+r.height<=bottom-2&&!blocks.some(b=>overlaps(r,b))&&!next.some(b=>overlaps(r,b,4)));
    const ideal={x:sx<-.4?left+5:sx>.4?right-width-5:anchor.x-width/2,y:Math.abs(sx)<.4?top+5:anchor.y-height/2};
    valid.sort((a,b)=>Math.hypot(a.x-ideal.x,a.y-ideal.y)-Math.hypot(b.x-ideal.x,b.y-ideal.y));
    const candidate=valid[0];if(candidate){chosen={...candidate,seat:seat.logicalSeat,small,outside:candidate.x+width<=0||candidate.x>=vp.width||candidate.y+height<=0||candidate.y>=vp.height};break;}
   }
   if(!chosen){forcedRail.current=layoutKey;el.dataset.rail='true';setMeasure(n=>n+1);return;}
   next.push(chosen);
  }
  setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
 },[seats,labels,measure,fallback]);
 return <div ref={root} className="seat-layer player-badges" aria-label="同桌玩家">{seats.filter(s=>s.relation!=='SELF').map(s=>{const pos=layout.find(p=>p.seat===s.logicalSeat),p=s.player,status=!p?'空位':p.isBotSeat?'AI':p.presence==='BOT'||('autoPlay' in p&&p.autoPlay===true)?'托管':p.presence==='DISCONNECTED_GRACE'?'离线':p.ready&&p.handCount===0?'已准备':p.listening?'听牌中':'在线';return <div key={s.logicalSeat} className={'player-badge '+(pos?.small?'compact ':'')+(pos?.horizontal?'horizontal ':'')+(!p?'empty':'')} data-seat={s.logicalSeat} data-outside={pos?.outside?'true':'false'} style={pos?{left:pos.x,top:pos.y,width:pos.width,height:pos.height,visibility:'visible'}:{visibility:'hidden'}} aria-label={`${p?playerDisplayName(p):'等待好友'}，${seatRelation(s,seats.length)}，${p?.handCount??0}张，${status}`}>
   <span className={'player-portrait '+(p?.isBotSeat?'ai':'')} aria-hidden="true">{(p?Array.from(p.nickname)[0]:null)??'空'}<i className={'presence-dot '+(p?.isBotSeat?'ai':p?.connected?'online':'offline')}/></span>
   <span className="player-nameplate"><strong>{p?playerDisplayName(p):'等待好友'}</strong><span> · {seatRelation(s,seats.length)}</span></span>
   <small className="player-presence">{p?.handCount??0}张 · {status}{p?.presence==='DISCONNECTED_GRACE'?` ${Math.max(0,Math.ceil(((p.graceEndsAt??0)-now)/1000))}秒`:''}</small>
  </div>;})}{fallback&&seats.filter(s=>s.relation!=='SELF'&&s.player).map(s=><div key={s.logicalSeat} className="badge-fallback-hand fallback-hand" style={{left:`${50+s.placement.labelAnchor.x*38}%`,top:`${50-s.placement.labelAnchor.y*35}%`}} aria-hidden="true">{Array.from({length:s.concealed.count},(_,i)=><i key={i} data-motion-anchor={`hand:${s.player!.playerId}:${i}`} data-flight-rect="true"/>)}</div>)}</div>;
}
