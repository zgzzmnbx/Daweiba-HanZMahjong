import type {ResyncEnvelope} from '../../../../packages/contracts/types';
import {publicReveal,tableMotions,type MotionAnchors} from './table-motion';
export const HU_INTRO_MS=180, HU_STEP_MS=125, HU_FLIGHT_MS=430, HU_SHOW_MS=3700;
export type HuPresentation={proposal:NonNullable<ReturnType<typeof publicReveal>>;nickname:string;age:number;origins:MotionAnchors;sourceKeys:string[]};
/** Only a new authoritative public proposal can reveal faces. Initial/resumed snapshots are not events. */
export function huPresentation(previous:ResyncEnvelope|null,next:ResyncEnvelope,origins:MotionAnchors):HuPresentation|null{
 const events=tableMotions(previous,next).filter(e=>e.kind==='HU'),proposal=publicReveal(next);
 if(!proposal||events.length!==14||events.some(e=>e.proposalId!==proposal.proposalId))return null;
 const age=Math.max(0,next.serverNow-(proposal.revealedAt??next.serverNow));
 if(age>=HU_SHOW_MS)return null;
 return {proposal,nickname:next.public.players.find(p=>p.playerId===proposal.applicantId)?.nickname??'同桌',age,origins,sourceKeys:events.map(e=>e.from)};
}
