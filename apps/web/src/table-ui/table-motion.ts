import type {ResyncEnvelope} from '../../../../packages/contracts/types';
export type MotionKind='DRAW'|'DISCARD'|'EAT'|'BORROW'|'HU';
export type MotionEvent={key:string;kind:MotionKind;playerId:string;tileId:string|null;char:string|null;from:string;to:string;index?:number;proposalId?:string};
export type MotionRect={x:number;y:number;width:number;height:number};
export type MotionAnchors=Record<string,MotionRect>;
export const handAnchor=(id:string,index:number)=>`hand:${id}:${index}`;
export function sameMotionSession(a:ResyncEnvelope,b:ResyncEnvelope){return a.public.roomId===b.public.roomId&&a.public.roundId===b.public.roundId&&a.private.playerId===b.private.playerId&&a.private.controlEpoch===b.private.controlEpoch&&a.private.seat===b.private.seat;}
export function publicReveal(e:ResyncEnvelope){const p=e.public.phase;return p.kind==='HU_VOTE'?p.proposal:e.public.history.at(-1)??null;}
/** Only authenticated own tiles and already-public faces can enter a flight. */
export function tableMotions(a:ResyncEnvelope|null,b:ResyncEnvelope):MotionEvent[]{
 if(!a||!sameMotionSession(a,b)||!b.public.roundId||b.public.stateVersion<=a.public.stateVersion||a.public.suspension.kind!=='RUNNING'||b.public.suspension.kind!=='RUNNING'||a.public.phase.kind==='LOBBY'||b.public.phase.kind==='ROOM_CLOSED')return[];
 const events:MotionEvent[]=[],oldDiscards=new Map(a.public.discards.map(d=>[d.discardId,d])),added=b.public.discards.filter(d=>!oldDiscards.has(d.discardId));
 const player=(id:string)=>a.public.players.find(p=>p.playerId===id);
 const ownFrom=(id:string,tile:string,index:number)=>id===b.private.playerId?`tile:${tile}`:handAnchor(id,index);
 for(const d of added){const n=player(d.playerId)?.handCount??0;if(!n)continue;events.push({key:`discard:${d.discardId}`,kind:'DISCARD',playerId:d.playerId,tileId:d.tile.tileId,char:d.tile.char,from:ownFrom(d.playerId,d.tile.tileId,n-1),to:`discard:${d.discardId}`});}
 const claimed=b.public.discards.filter(d=>d.status==='CLAIMED'&&oldDiscards.get(d.discardId)?.status!=='CLAIMED');
 for(const d of claimed){const recipient=b.public.players.find(p=>p.eatCount>(player(p.playerId)?.eatCount??p.eatCount));if(!recipient)continue;events.push({key:`eat:${d.discardId}`,kind:'EAT',playerId:recipient.playerId,tileId:d.tile.tileId,char:d.tile.char,from:`discard:${d.discardId}`,to:ownFrom(recipient.playerId,d.tile.tileId,recipient.handCount-1)});}
 if(a.public.wallRemaining-b.public.wallRemaining===1){
  const recipient=b.public.players.find(p=>p.handCount-(player(p.playerId)?.handCount??p.handCount)+added.filter(d=>d.playerId===p.playerId).length-claimed.filter(d=>events.some(e=>e.kind==='EAT'&&e.tileId===d.tile.tileId&&e.playerId===p.playerId)).length===1);
  if(recipient){const tile=recipient.playerId===b.private.playerId?b.private.hand.find(t=>!a.private.hand.some(o=>o.tileId===t.tileId))??added.find(d=>d.playerId===recipient.playerId&&!a.private.hand.some(o=>o.tileId===d.tile.tileId))?.tile:null;events.unshift({key:`draw:${b.public.stateVersion}:${recipient.playerId}`,kind:'DRAW',playerId:recipient.playerId,tileId:tile?.tileId??null,char:tile?.char??null,from:'wall:tail',to:tile&&b.private.hand.some(t=>t.tileId===tile.tileId)?`tile:${tile.tileId}`:handAnchor(recipient.playerId,Math.max(player(recipient.playerId)?.handCount??0,recipient.handCount-1))});}
 }
 const phase=b.public.phase;
 if(phase.kind==='HU_COMPOSE'&&phase.source.kind==='DISCARD'&&(a.public.phase.kind!=='HU_COMPOSE'||a.public.phase.applicantId!==phase.applicantId||a.public.phase.phaseId!==phase.phaseId)){
  const d=b.public.discards.find(d=>phase.source.kind==='DISCARD'&&d.discardId===phase.source.discardId);if(d)events.push({key:`borrow:${phase.phaseId}`,kind:'BORROW',playerId:phase.applicantId,tileId:d.tile.tileId,char:d.tile.char,from:`discard:${d.discardId}`,to:ownFrom(phase.applicantId,d.tile.tileId,b.public.players.find(p=>p.playerId===phase.applicantId)?.handCount??13)});
 }
 const seen=new Set(a.public.history.map(h=>h.proposalId));if(a.public.phase.kind==='HU_VOTE')seen.add(a.public.phase.proposal.proposalId);
 const revealed=[...b.public.history,...(phase.kind==='HU_VOTE'?[phase.proposal]:[])].filter((p,i,all)=>!seen.has(p.proposalId)&&all.findIndex(q=>q.proposalId===p.proposalId)===i);
 for(const p of revealed)p.snapshot.sentence.orderedTileIds.forEach((id,index)=>{const t=p.snapshot.tiles.find(t=>t.tileId===id);if(!t)return;const borrowed=p.source.kind==='DISCARD'&&p.source.borrowedTileId===id;
  events.push({key:`hu:${p.proposalId}:${id}`,kind:'HU',playerId:p.applicantId,tileId:id,char:t.char,proposalId:p.proposalId,index,from:borrowed&&a.public.phase.kind!=='HU_COMPOSE'?`discard:${p.source.kind==='DISCARD'?p.source.discardId:''}`:ownFrom(p.applicantId,id,borrowed?(player(p.applicantId)?.handCount??13):Math.min(index,(player(p.applicantId)?.handCount??14)-1)),to:`reveal:${p.proposalId}:${id}`});
 });
 return events;
}
/** Constant-time arc: presentation timestamps cannot advance game state. */
export function flightPoint(from:MotionRect,to:MotionRect,t:number){const p=Math.max(0,Math.min(1,t)),ease=1-Math.pow(1-p,3);return{x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease-Math.sin(Math.PI*p)*Math.min(75,Math.hypot(to.x-from.x,to.y-from.y)*.18),width:from.width+(to.width-from.width)*ease,height:from.height+(to.height-from.height)*ease};}
