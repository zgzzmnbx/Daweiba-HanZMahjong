import {useEffect,useRef,useState} from 'react';
import type {PublicRoomSnapshot} from '../../../packages/contracts/types';
export type SpeechManifest={profile:string;voice:string;tileDurationMs:number;enabled:boolean;ready:string[];pending?:string[];failed?:string[]};
export const tileSpeechUrl=(profile:string,char:string)=>`/api/speech/tiles/${encodeURIComponent(profile)}/${encodeURIComponent(char)}`;
export function useGameSpeech(room:PublicRoomSnapshot|null,session:string,active:boolean,serverNow:number,administrator=false){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem('hanz-speech')!=='off'),[manifest,setManifest]=useState<SpeechManifest|null>(null),[message,setMessage]=useState(''),[playing,setPlaying]=useState(false);
 const context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),request=useRef<AbortController|null>(null),generation=useRef(0),seen=useRef<{session:string;id?:string}|null>(null),latest=useRef({enabled,active});latest.current={enabled,active};
 const stop=()=>{generation.current++;request.current?.abort();request.current=null;try{source.current?.stop();}catch{}source.current=null;setPlaying(false);};
 const unlock=()=>{try{context.current??=new AudioContext();if(context.current.state==='suspended')void context.current.resume().catch(()=>{});}catch{setMessage('当前浏览器暂时无法播放语音。');}return context.current;};
 useEffect(()=>{const controller=new AbortController();void fetch('/api/speech/tiles',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(v=>{if(!controller.signal.aborted)setManifest(v);}).catch(()=>{});return()=>controller.abort();},[room?.roomId]);
 useEffect(()=>{const gesture=()=>{if(latest.current.enabled)unlock();};window.addEventListener('pointerdown',gesture);window.addEventListener('keydown',gesture);return()=>{window.removeEventListener('pointerdown',gesture);window.removeEventListener('keydown',gesture);stop();void context.current?.close().catch(()=>{});context.current=null;};},[]);
 useEffect(()=>{stop();setMessage('');},[session,active,room?.suspension.kind]);
 const play=async(url:string,post=false)=>{if(!latest.current.enabled||!latest.current.active)return;const ctx=unlock();if(!ctx||ctx.state!=='running'){setMessage('点击“朗读胡牌句子”即可播放。');return;}stop();const sequence=generation.current,controller=new AbortController();request.current=controller;setMessage('');try{
  const r=await fetch(url,{method:post?'POST':'GET',credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('unavailable');const buffer=await ctx.decodeAudioData(await r.arrayBuffer());if(controller.signal.aborted||sequence!==generation.current||!latest.current.enabled||!latest.current.active)return;
  const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);node.onended=()=>{if(source.current===node){source.current=null;setPlaying(false);}};source.current=node;node.start();setPlaying(true);
 }catch{if(!controller.signal.aborted&&sequence===generation.current)setMessage('语音暂未就绪，可稍后再试。');}finally{if(request.current===controller)request.current=null;}};
 const playTile=(char:string)=>{if(manifest?.ready.includes(char))void play(tileSpeechUrl(manifest.profile,char));};
 const replayHu=(id:string)=>{if(!room)return;void play(`/api/${administrator?'admin/':''}rooms/${encodeURIComponent(room.roomId)}/speech/hu/${encodeURIComponent(id)}`,true);};
 const proposal=room?.phase.kind==='HU_VOTE'?room.phase.proposal:room?.history.at(-1);
 useEffect(()=>{const prior=seen.current,same=prior?.session===session;seen.current={session,id:proposal?.proposalId};if(same&&proposal&&proposal.proposalId!==prior.id&&active&&room?.suspension.kind==='RUNNING'&&proposal.revealedAt!==undefined&&serverNow-proposal.revealedAt<15000)replayHu(proposal.proposalId);},[session,proposal?.proposalId,active,room?.suspension.kind]);
 return{enabled,playing,message,playTile,replayHu,stop,toggle:()=>{stop();setEnabled(v=>{localStorage.setItem('hanz-speech',v?'off':'on');return !v;});setMessage('');}};
}
