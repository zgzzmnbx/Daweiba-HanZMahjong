import {GameIcon} from './GameIcon';
import {useRoomMusic} from './audio/use-room-music';
import {MusicControls} from './audio/MusicControls';
import {TurnHud} from './table-ui/TurnHud';
import {phaseClock,spectatorHint} from './table-ui/turn-hud';
import {useGameSfx} from './audio/use-game-sfx';
import {SoundControls} from './audio/SoundControls';
import {SpectatorDoodle} from './SpectatorDoodle';
import {useGameSpeech} from './speech-client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {SpectatorSnapshot} from '../../../packages/contracts/spectator';
import {api} from './game-client';
import {adminApi} from './admin-client';
import {MainView,type Label} from './table3d/main-view';
import {spectatorTableView} from './table3d/spectator-view';
import {SeatBadges} from './table-ui/SeatBadges';
import './spectator.css';
const phaseNames:Record<string,string>={LOBBY:'等待开局',TURN_ACTION:'排字出牌',DISCARD_RESPONSE:'弃牌响应',HU_COMPOSE:'借字排句',HU_VOTE:'共同评审',ROUND_FINISHED:'本局结束',ROOM_CLOSED:'房间已关闭'};
const voteNames={PENDING:'考虑中',APPROVE:'赞成',REJECT:'不赞成',ABSTAIN:'未投票'};
export function SpectatorTable({roomId,administrator=false,onLeave,onAdmin}:{roomId:string;administrator?:boolean;onLeave:()=>void;onAdmin?:()=>void}){
 const [snapshot,setSnapshot]=useState<SpectatorSnapshot|null>(null),[error,setError]=useState(''),[fallback,setFallback]=useState(false),[labels,setLabels]=useState<Label[]>([]),[clock,setClock]=useState(Date.now());
 const host=useRef<HTMLDivElement>(null),renderer=useRef<MainView>(),received=useRef(Date.now());
 useEffect(()=>{let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,request:AbortController|undefined;
  setSnapshot(null);setError('');setFallback(false);
  const load=async()=>{if(timer)clearTimeout(timer);request?.abort();const current=new AbortController();request=current;try{const result:SpectatorSnapshot=administrator?await adminApi(`/rooms/${roomId}/spectate`,undefined,current.signal):await api(`/api/rooms/${roomId}/spectate`,undefined,current.signal);if(stopped||current.signal.aborted)return;if(result.public.roomId!==roomId||result.public.visibility!=='PUBLIC'||Object.hasOwn(result,'private'))throw Error('观战数据未通过检查。');received.current=Date.now();setSnapshot(result);setError('');}catch(e){if(!stopped&&!current.signal.aborted){setSnapshot(null);setError((e as Error).message);}}finally{if(!stopped&&!current.signal.aborted)timer=setTimeout(()=>void load(),document.hidden?5000:1000);}};
  const focus=()=>{if(!document.hidden)void load();};void load();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{stopped=true;if(timer)clearTimeout(timer);request?.abort();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[roomId,administrator]);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(t);},[]);
 useLayoutEffect(()=>{if(!host.current||!snapshot||fallback)return;let disposed=false;try{renderer.current=new MainView(host.current,(_hits,next)=>{if(!disposed)setLabels(next);},()=>setFallback(true));}catch{setFallback(true);}return()=>{disposed=true;renderer.current?.dispose();renderer.current=undefined;};},[roomId,!!snapshot,fallback]);
 const view=snapshot?spectatorTableView(snapshot.public):null;
 useLayoutEffect(()=>{if(view)renderer.current?.replace(view,false,null);},[snapshot,!!view,fallback]);
 const p=snapshot?.public,now=snapshot?snapshot.serverNow+Math.max(0,clock-received.current):0;
 const speech=useGameSpeech(p??null,[roomId,p?.roundId,administrator].join('|'),!!p&&p.suspension.kind==='RUNNING'&&p.phase.kind!=='ROOM_CLOSED',snapshot?.serverNow??0,administrator);
 const sfx=useGameSfx(p??null,[roomId,administrator].join('|'),!!p&&!error,snapshot?.serverNow??0,speech.playing);
 const music=useRoomMusic(roomId,roomId+'|'+administrator,!!p&&!error&&p.phase.kind!=='ROOM_CLOSED',sfx,speech.playing,undefined,administrator);
 const proposal=p?.phase.kind==='HU_VOTE'?p.phase.proposal:p?.history.at(-1),last=p?.discards.at(-1);
 return <section className="spectator-shell" aria-label={administrator?'管理员观战':'观战牌桌'}><header className="topbar game-hud"><button onClick={onLeave} className="hud-tool" aria-label="返回大厅"><GameIcon kind="back"/><small>大厅</small></button><div className="wordmark">字间</div><strong>{administrator?'管理员观战':'观战'}</strong><span className="room-code">{roomId}</span>{onAdmin&&<button onClick={onAdmin} className="hud-tool" aria-label="管理员入口"><GameIcon kind="admin"/><small>管理</small></button>}</header>
  <details className="spectator-audio"><summary><GameIcon kind="sound"/> 声音</summary><MusicControls music={music} readOnly/><SoundControls sfx={sfx}/><button onClick={speech.toggle}>{speech.enabled?'关闭语音':'开启语音'}</button>{speech.message&&<small role="status">{speech.message}</small>}</details>
  {error?<div className="notice" role="alert">{error}</div>:!p?<div className="notice" role="status">正在进入观战…</div>:<>
   <div className="spectator-status"><strong>{phaseNames[p.phase.kind]}</strong><span>余 {p.wallRemaining} 张</span></div>
   <div className="table-stage spectator-stage"><div className="viewport"><div ref={host} className="canvas-host" aria-hidden="true"/>{!fallback&&<SpectatorDoodle renderer={renderer} board={snapshot?.doodle}/>}{view&&<SeatBadges waiting={p.phase.kind==='LOBBY'||p.phase.kind==='ROUND_FINISHED'} seats={view.seats} labels={labels} fallback={fallback} now={now} anchors={()=>renderer.current?.motionAnchors()??{}}/>}{fallback&&<div className="spectator-fallback">{p.players.map(player=><span key={player.playerId}>{player.nickname} · {player.handCount} 张</span>)}</div>}{last&&<div className="spectator-discard"><small>最近弃牌</small><b>{last.tile.char}</b></div>}</div></div>
   <div className="turn-hud-row"><TurnHud clock={phaseClock(p,now)} hint={spectatorHint(p)}/></div>
   {proposal&&<section className="spectator-sentence" aria-label="已公开的胡牌句子"><div className="hu-speech-controls"><button disabled={!speech.enabled} onClick={()=>speech.replayHu(proposal.proposalId)}>朗读胡牌句子</button></div><div className="spectator-glyphs">{proposal.snapshot.sentence.orderedTileIds.map(id=><span key={id}>{proposal.snapshot.tiles.find(t=>t.tileId===id)?.char}{proposal.snapshot.sentence.commaAfterTileIds.includes(id as never)&&<small>，</small>}</span>)}</div>{proposal.reviewers&&<div className="spectator-votes">{proposal.reviewers.map(r=><span key={r.playerId}>{r.nickname} · {voteNames[r.choice]}</span>)}</div>}</section>}
   <footer className="spectator-footer">{p.players.map(player=><span key={player.playerId}>{player.seat+1} · {player.nickname}{player.isBotSeat?' · AI':player.autoPlay?' · 托管':''}</span>)}</footer>
  </>}
 </section>;
}
