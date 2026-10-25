import {GameIcon} from '../GameIcon';
import {PlayerAvatar} from '../PlayerAvatar';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {PublicProposal} from '../../../../packages/contracts/types';
import {useDanmakuPreference} from '../danmaku-preference';
import './review-danmaku.css';

type Reviewer=NonNullable<PublicProposal['reviewers']>[number];
type Flight={vote:Reviewer;lane:number};

function CommentFlight({vote,lane,reduced,onReady,onDone}:{vote:Reviewer;lane:number;reduced:boolean;onReady:(delay:number)=>void;onDone:()=>void}){
 const ref=useRef<HTMLDivElement>(null),done=useRef(onDone);done.current=onDone;
 useLayoutEffect(()=>{
  const el=ref.current,stage=el?.parentElement;if(!el||!stage)return;
  if(reduced){onReady(4200);const timer=setTimeout(()=>done.current(),4200);return()=>clearTimeout(timer);}
  // Measure actual shaped text, not character count; constant speed keeps long roasts readable.
  const width=stage.clientWidth,textWidth=el.getBoundingClientRect().width;
  onReady((textWidth+36)/75*1000);
  const animation=el.animate([{transform:`translateX(${width}px)`},{transform:`translateX(${-textWidth}px)`}],{duration:(width+textWidth)/75*1000,easing:'linear',fill:'both'});
  let live=true;void animation.finished.then(()=>{if(live)done.current();}).catch(()=>{});
  return()=>{live=false;animation.cancel();};
 },[vote.playerId,reduced]);
 return <div ref={ref} className={'review-danmaku '+(reduced?'still':'')} data-reviewer={vote.playerId} data-choice={vote.choice} style={{top:lane*30}} title={`${vote.nickname}：${vote.comment}`}>
  <span className="danmaku-avatar"><PlayerAvatar avatarId={vote.avatarId} name={vote.nickname} seed={vote.playerId}/></span><b>{vote.nickname}</b><em><GameIcon kind={vote.choice==='APPROVE'?'check':'egg'}/>{vote.choice==='APPROVE'?'赞成':'反对'}</em><span className="danmaku-words">{vote.comment}</span>
 </div>;
}

/** Snapshot deltas, inside the dialog's top layer. History/resync never enqueue old votes. */
export function ReviewDanmaku({votes,liveEntry,connected}:{votes:readonly Reviewer[];liveEntry:boolean;connected:boolean}){
 const [enabled,toggle]=useDanmakuPreference(),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [flying,setFlying]=useState<Flight[]>([]),nextLaunch=useRef(0),previousReduced=useRef(reduced);
 const seen=useRef(new Set(liveEntry?[]:votes.filter(v=>v.comment).map(v=>v.playerId))),queue=useRef<Reviewer[]>([]),active=useRef<Flight[]>([]),stage=useRef<HTMLDivElement>(null);
 const allowed=useRef(false);allowed.current=enabled&&connected;
 const updateFlying=(next:Flight[])=>{active.current=next;setFlying(next);};
 // A viewport change invalidates the old entry edge. Requeue only unfinished flights,
 // otherwise a desktop animation can spend seconds travelling outside a phone's clipped lane.
 useLayoutEffect(()=>{const el=stage.current;if(!el)return;let width=el.clientWidth;const observer=new ResizeObserver(()=>{const next=el.clientWidth;if(width>0&&next>0&&Math.abs(next-width)>1){queue.current.unshift(...active.current.map(f=>f.vote));nextLaunch.current=0;updateFlying([]);}width=next;});observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  for(const vote of votes){if(!vote.comment||seen.current.has(vote.playerId))continue;seen.current.add(vote.playerId);if(allowed.current&&!document.hidden)queue.current.push(vote);}
 },[votes]);
 useEffect(()=>{if(previousReduced.current!==reduced){previousReduced.current=reduced;queue.current=[];nextLaunch.current=0;updateFlying([]);}},[reduced]);
 useEffect(()=>{if(!enabled||!connected){queue.current=[];nextLaunch.current=0;updateFlying([]);}},[enabled,connected]);
 useEffect(()=>{
  const clear=()=>{if(document.hidden){queue.current=[];nextLaunch.current=0;updateFlying([]);}};
  document.addEventListener('visibilitychange',clear);
  const timer=setInterval(()=>{
   if(!allowed.current||document.hidden)return;
   if(queue.current.length&&Date.now()>=nextLaunch.current){nextLaunch.current=Infinity;updateFlying([...active.current,{vote:queue.current.shift()!,lane:0}]);}
  },100);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',clear);};
 },[]);
 return <section className="review-danmaku-strip" aria-label="评审留言弹幕" data-enabled={enabled} data-active={flying.length>0||!enabled}>
  <div ref={stage} className="review-danmaku-stage" aria-hidden="true" style={{height:30}}>
   {!flying.length&&<span className="review-danmaku-idle">{enabled?'评审留言从这里飘过':'弹幕已关闭 · 留言仍在下方'}</span>}
   {flying.map(f=><CommentFlight key={f.vote.playerId} {...f} reduced={reduced} onReady={delay=>{nextLaunch.current=Date.now()+delay;}} onDone={()=>updateFlying(active.current.filter(x=>x.vote.playerId!==f.vote.playerId))}/>)}
  </div>
  <button type="button" className="review-danmaku-toggle" aria-label={enabled?'关闭评审弹幕':'开启评审弹幕'} aria-pressed={enabled} onClick={toggle} title={enabled?'关闭弹幕':'开启弹幕'}><GameIcon kind={enabled?"danmaku":"danmakuOff"}/></button>
 </section>;
}
