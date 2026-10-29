import type {Game} from './index';
import type {PlayerId,RoundShowcase,UtcMs} from '../contracts/types';
/** Additive end-of-round display. No commands, dealing, scoring or private state changes. */
export function captureRoundShowcase(g:Game,winner:PlayerId,now:number):RoundShowcase|undefined{
 const approved=g.public.history.filter(h=>h.applicantId===winner&&h.outcome==='APPROVED').at(-1);
 if(!approved||!g.public.roundId)return;
 const hands=g.public.players.filter(p=>!p.isBotSeat).sort((a,b)=>Number(a.playerId===winner)-Number(b.playerId===winner)||a.seat-b.seat).map(p=>{
  const own=g.players.get(p.playerId)!;
  const winning=p.playerId===winner;
  const draft=winning?approved.snapshot.sentence:own.draft;
  const tiles=winning?approved.snapshot.tiles:own.hand.map(id=>g.tiles.get(id)!);
  return {playerId:p.playerId,seat:p.seat,nickname:p.nickname,...(p.avatarId?{avatarId:p.avatarId}:{}),managed:p.presence==='BOT'||p.autoPlay===true,winner:winning,draft,tiles};
 });
 return structuredClone({roundId:g.public.roundId,proposalId:approved.proposalId,finishedAt:now as UtcMs,hands});
}
