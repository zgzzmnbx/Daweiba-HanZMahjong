import {musicFocus} from './audio/music-level';
import {useEffect,useRef,useState} from 'react';
import type {PublicRoomSnapshot} from '../../../packages/contracts/types';
import {discardSpeechEvents,type SpeechFrame} from './discard-speech';
export type SpeechManifest={profile:string;voice:string;tileDurationMs:number|null;words?:Record<string,string>;unmapped?:string[];enabled:boolean;ready:string[];pending?:string[];failed?:string[]};
export const tileSpeechUrl=(profile:string,char:string)=>`/api/speech/tiles/${encodeURIComponent(profile)}/${encodeURIComponent(char)}`;
type SpeechJob={char:string}|{url:string;post:true};
export function useGameSpeech(room:PublicRoomSnapshot|null,session:string,active:boolean,serverNow:number,administrator=false){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem('hanz-speech')!=='off'),[message,setMessage]=useState(''),[playing,setPlaying]=useState(false);
 const context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),request=useRef<AbortController|null>(null),generation=useRef(0),seen=useRef<{session:string;id?:string}|null>(null),previous=useRef<SpeechFrame|null>(null),manifest=useRef<Promise<SpeechManifest|null>>(Promise.resolve(null));
 const musicRelease=useRef<(()=>void)|null>(null);
 const queue=useRef<SpeechJob[]>([]),busy=useRef(false),latest=useRef({enabled,active,room,session});latest.current={enabled,active,room,session};
 const stop=()=>{musicRelease.current?.();musicRelease.current=null;generation.current++;queue.current=[];busy.current=false;request.current?.abort();request.current=null;const node=source.current;source.current=null;try{node?.stop();}catch{}setPlaying(false);};
 const unlock=()=>{try{context.current??=new AudioContext();if(context.current.state==='suspended')void context.current.resume().catch(()=>{});}catch{setMessage('当前浏览器暂时无法播放语音。');}return context.current;};
 const canPlay=()=>latest.current.enabled&&latest.current.active&&!document.hidden&&context.current?.state==='running';
 const pump=async()=>{
  if(busy.current||!queue.current.length)return;
  if(!canPlay()){stop();return;}
  const job=queue.current.shift()!,sequence=generation.current,ctx=context.current!,controller=new AbortController();busy.current=true;request.current=controller;
  const finished=()=>{if(sequence!==generation.current)return;musicRelease.current?.();musicRelease.current=null;source.current=null;busy.current=false;setPlaying(false);void pump();};
  try{
   let url:string,post=false;
   if('char' in job){const catalog=await manifest.current;if(sequence!==generation.current)return;if(!catalog?.ready.includes(job.char))throw Error('unavailable');url=tileSpeechUrl(catalog.profile,job.char);}else{url=job.url;post=true;}
   if(!canPlay()||sequence!==generation.current){if(sequence===generation.current)stop();return;}
   const r=await fetch(url,{method:post?'POST':'GET',credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('unavailable');const buffer=await ctx.decodeAudioData(await r.arrayBuffer());
   if(controller.signal.aborted||sequence!==generation.current)return;if(!canPlay()){stop();return;}
   const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);node.onended=()=>{if(source.current===node)finished();};source.current=node;musicRelease.current=musicFocus.hold(buffer.duration*1000+80);node.start();setPlaying(true);setMessage('');
  }catch{if(!controller.signal.aborted&&sequence===generation.current){setMessage('语音暂未就绪，可稍后再试。');finished();}}
  finally{if(request.current===controller)request.current=null;}
 };
 const enqueue=(jobs:SpeechJob[])=>{if(!jobs.length||!latest.current.enabled||!latest.current.active||document.hidden)return;const ctx=unlock();if(ctx?.state!=='running'){setMessage('点一下牌桌即可开启语音。');return;}queue.current.push(...jobs);void pump();};
 useEffect(()=>{const controller=new AbortController();manifest.current=fetch('/api/speech/tiles',{signal:controller.signal}).then(r=>r.ok?r.json():null).catch(()=>null);return()=>controller.abort();},[room?.roomId]);
 useEffect(()=>{
  const gesture=()=>{if(latest.current.enabled&&!document.hidden)unlock();};
  const visibility=()=>{stop();const current=latest.current;previous.current=current.room?{room:current.room,session:current.session,active:current.active&&!document.hidden}:null;};
  const hide=()=>{stop();previous.current=null;};
  window.addEventListener('pointerdown',gesture);window.addEventListener('keydown',gesture);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);
  return()=>{window.removeEventListener('pointerdown',gesture);window.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);stop();void context.current?.close().catch(()=>{});context.current=null;};
 },[]);
 useEffect(()=>{stop();setMessage('');},[session,active,room?.suspension.kind]);
 useEffect(()=>{if(!room){previous.current=null;return;}const next={room,session,active:active&&!document.hidden},old=previous.current;if(old?.active&&next.active&&old.session===session&&old.room.roomId===room.roomId&&old.room.roundId===room.roundId&&room.stateVersion<old.room.stateVersion)return;previous.current=next;enqueue(discardSpeechEvents(old,next).map(d=>({char:d.tile.char})));},[room,session,active]);
 const replayHu=(id:string)=>{if(!room)return;stop();enqueue([{url:`/api/${administrator?'admin/':''}rooms/${encodeURIComponent(room.roomId)}/speech/hu/${encodeURIComponent(id)}`,post:true}]);};
 const proposal=room?.phase.kind==='HU_VOTE'?room.phase.proposal:room?.history.at(-1);
 useEffect(()=>{const prior=seen.current,same=prior?.session===session;seen.current={session,id:proposal?.proposalId};if(same&&proposal&&proposal.proposalId!==prior.id&&active&&room?.suspension.kind==='RUNNING'&&proposal.revealedAt!==undefined&&serverNow-proposal.revealedAt<15000)replayHu(proposal.proposalId);},[session,proposal?.proposalId,active,room?.suspension.kind]);
 return{enabled,playing,message,replayHu,stop,toggle:()=>{stop();const next=!latest.current.enabled;latest.current={...latest.current,enabled:next};localStorage.setItem('hanz-speech',next?'on':'off');setEnabled(next);if(next)unlock();setMessage('');}};
}
