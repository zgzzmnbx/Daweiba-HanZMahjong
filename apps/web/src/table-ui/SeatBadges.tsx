import {AvatarSticker} from '../ChatStickers';
import {PlayerAvatar} from '../PlayerAvatar';
import {ReadyBadge} from './ReadyBadge';
import {playerDisplayName} from '../../../../packages/contracts/browser-return';
import {useLayoutEffect,useRef,useState} from 'react';
import type {SeatView} from '../../../../packages/contracts/table-view';
import type {Label} from '../table3d/main-view';
import './seat-badges.css';

type Placement={x:number;y:number;width:number;height:number;seat:number;small:boolean;horizontal:boolean;roomy:boolean};
const relation:Record<SeatView['relation'],string>={SELF:'本人',NEXT:'下家',PREVIOUS:'上家',NEXT_AND_PREVIOUS:'对家',OTHER:'同桌'};
const seatRelation=(seat:SeatView,count:number)=>seat.relation==='OTHER'&&count%2===0&&seat.relativeSeat===count/2?'对家':relation[seat.relation];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** Seat projections own the position. Decorative badges may overlap the table and never intercept play. */
export function SeatBadges({seats,labels,fallback,now,waiting=false}:{seats:readonly SeatView[];labels:Label[];fallback:boolean;now:number;waiting?:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const [layout,setLayout]=useState<Placement[]>([]),[measure,setMeasure]=useState(0);
 useLayoutEffect(()=>{const el=root.current,stage=el?.closest('.table-stage'),viewport=el?.closest('.viewport');if(!stage||!viewport)return;const observer=new ResizeObserver(()=>setMeasure(n=>n+1));observer.observe(stage);observer.observe(viewport);return()=>observer.disconnect();},[]);
 useLayoutEffect(()=>{
  const el=root.current,stage=el?.closest('.table-stage')?.getBoundingClientRect(),vp=el?.closest('.viewport')?.getBoundingClientRect();if(!el||!stage||!vp)return;
  const left=stage.left-vp.left,top=stage.top-vp.top,right=stage.right-vp.left,bottom=stage.bottom-vp.top;
  const compact=stage.width<700||stage.height<350;
  const horizontal=stage.height<210;
  const width=compact?(horizontal?Math.min(100,(stage.width-28)/3):88):126,height=compact?(horizontal?40:stage.height>=260?80:72):124;
  const next:Placement[]=[],groups=[-1,0,1].map(side=>seats.filter(s=>s.relation!=='SELF'&&(Math.abs(s.placement.labelAnchor.x)<.35?0:Math.sign(s.placement.labelAnchor.x))===side));
  groups.forEach((group,index)=>{
   const side=index-1;
   const projected=group.map(seat=>{
    const l=fallback?undefined:labels.find(l=>l.seat===seat.logicalSeat),a=seat.placement.labelAnchor;
    const x=l?.x??vp.width*(.5+a.x*.38),y=l?.y??vp.height*(.5-a.y*.35);
    // Side portraits straddle their own rail; the opposite portrait sits just above its hand.
    return {seat:seat.logicalSeat,x:horizontal&&side?(side<0?left+8:right-width-8):clamp(x-width/2+side*width*.32,left+3,right-width-3),y:clamp(y-(side?height*.5:height-10),top+3,bottom-height-3),width,height,small:compact,horizontal,roomy:compact&&!horizontal&&stage.height>=260};
   }).sort((a,b)=>a.y-b.y);
   // Preserve the order of two same-side opponents on five/six-player tables.
   for(let i=1;i<projected.length;i++)projected[i].y=Math.max(projected[i].y,projected[i-1].y+height+4);
   if(projected.length){const overflow=Math.max(0,projected.at(-1)!.y+height-(bottom-3));for(const item of projected)item.y-=overflow;}
   next.push(...projected);
  });
  setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
 },[seats,labels,measure,fallback]);
 return <div ref={root} className="seat-layer player-badges" aria-label="同桌玩家">{seats.filter(s=>s.relation!=='SELF').map(s=>{const pos=layout.find(p=>p.seat===s.logicalSeat),p=s.player,status=!p?'空位':p.isBotSeat?'AI':p.presence==='BOT'||('autoPlay' in p&&p.autoPlay===true)?'托管':p.presence==='DISCONNECTED_GRACE'?'离线':waiting&&p.ready?'已准备':'在线';return <div key={s.logicalSeat} className={'player-badge '+(pos?.small?'compact ':'')+(pos?.horizontal?'horizontal ':'')+(pos?.roomy?'roomy ':'')+(!p?'empty':'')} data-seat={s.logicalSeat} style={pos?{left:pos.x,top:pos.y,width:pos.width,height:pos.height,visibility:'visible'}:{visibility:'hidden'}} aria-label={`${p?playerDisplayName(p):'等待好友'}，${seatRelation(s,seats.length)}，${p?.handCount??0}张，${status}`}>
   <span className={'player-portrait '+(p?.isBotSeat?'ai':'')} aria-hidden="true">{p?<PlayerAvatar avatarId={p.avatarId} name={p.nickname} seed={p.playerId}/>: '空'}{p&&<AvatarSticker playerId={p.playerId}/>}<i className={'presence-dot '+(p?.isBotSeat?'ai':p?.connected?'online':'offline')}/></span>
   <span className="player-nameplate"><strong>{p?playerDisplayName(p):'等待好友'}</strong><span> · {seatRelation(s,seats.length)}</span></span>
   <small className="player-presence">{waiting&&p?.ready?<ReadyBadge/>:<><span className="player-rail-relation">{seatRelation(s,seats.length)} · </span>{p?.handCount??0}张 · {status}{p?.presence==='DISCONNECTED_GRACE'?` ${Math.max(0,Math.ceil(((p.graceEndsAt??0)-now)/1000))}秒`:''}</>}</small>
  </div>;})}{fallback&&seats.filter(s=>s.relation!=='SELF'&&s.player).map(s=><div key={s.logicalSeat} className="badge-fallback-hand fallback-hand" style={{left:`${50+s.placement.labelAnchor.x*38}%`,top:`${50-s.placement.labelAnchor.y*35}%`}} aria-hidden="true">{Array.from({length:s.concealed.count},(_,i)=><i key={i} data-motion-anchor={`hand:${s.player!.playerId}:${i}`} data-flight-rect="true"/>)}</div>)}</div>;
}
