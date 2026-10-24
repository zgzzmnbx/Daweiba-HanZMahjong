import type {PublicRoomSnapshot} from '../../../../packages/contracts/types';
export type SoundKind='start'|'draw'|'discard'|'eat'|'hu'|'approve'|'reject'|'win'|'lose';
export type SoundCue={kind:SoundKind;delay?:number;age?:number};
export type SoundFrame={room:PublicRoomSnapshot;identity:string;active:boolean;serverNow:number};
const proposals=(p:PublicRoomSnapshot)=>[...p.history,...(p.phase.kind==='HU_VOTE'?[p.phase.proposal]:[])];
/** Public facts only. Initial snapshots and resumed sessions are baselines, never events. */
export function soundEvents(a:SoundFrame|null,b:SoundFrame):SoundCue[]{
 if(!a||!a.active||!b.active||a.identity!==b.identity||a.room.roomId!==b.room.roomId||a.room.suspension.kind!=='RUNNING'||b.room.suspension.kind!=='RUNNING'||b.room.phase.kind==='ROOM_CLOSED'||b.room.stateVersion<=a.room.stateVersion)return[];
 const x=a.room,y=b.room;
 if(x.roundId!==y.roundId)return y.roundId&&['LOBBY','ROUND_FINISHED'].includes(x.phase.kind)&&y.phase.kind==='TURN_ACTION'?[{kind:'start'}]:[];
 const cues:SoundCue[]=[],before=new Map(proposals(x).map(p=>[p.proposalId,p]));
 for(const p of proposals(y)){
  const old=before.get(p.proposalId),age=Math.max(0,b.serverNow-(p.revealedAt??0)),fresh=!old&&p.revealedAt!==undefined&&age<3700;
  if(fresh)cues.push({kind:'hu',age});
  if(!old&&!fresh)continue;
  const votes=p.reviewers?.filter(v=>['APPROVE','REJECT'].includes(v.choice)&&!(old?.reviewers??[]).some(o=>o.playerId===v.playerId&&o.choice===v.choice))??[];
  // A chorus stays bounded even when six ballots arrive together.
  votes.filter(v=>v.choice==='REJECT').slice(0,3).forEach((_,i)=>cues.push({kind:'reject',delay:i*.09}));
  if(votes.some(v=>v.choice==='APPROVE'))cues.push({kind:'approve'});
  if('outcome' in p&&(!old||!('outcome' in old))&&p.outcome!=='WITHDRAWN')cues.push({kind:p.outcome==='APPROVED'?'win':'lose',delay:fresh?Math.max(0,2.35-age/1000):votes.some(v=>v.choice==='REJECT') ? .65 : 0});
 }
 if(cues.some(c=>c.kind==='hu'||c.kind==='win'||c.kind==='lose'))return cues;
 const discards=y.discards.filter(d=>!x.discards.some(o=>o.discardId===d.discardId));
 if(y.players.some(p=>p.eatCount>(x.players.find(o=>o.playerId===p.playerId)?.eatCount??p.eatCount)))cues.unshift({kind:'eat'});
 else if(x.wallRemaining-y.wallRemaining===1)cues.unshift({kind:'draw'});
 if(discards.length)cues.push({kind:'discard',delay:cues.some(c=>c.kind==='draw')?.16:0});
 return cues;
}
