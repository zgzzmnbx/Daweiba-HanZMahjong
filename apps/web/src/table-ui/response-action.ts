import {usesDeepSeekRules} from '../../../../packages/contracts/response-policy';
import type {PublicRoomSnapshot,ResyncEnvelope} from '../../../../packages/contracts/types';
/** PASS is a response from any eligible opponent; only the next seat will draw if no claim wins. */
export function isNextDrawer(e:ResyncEnvelope):boolean{
 if(e.public.phase.kind!=='DISCARD_RESPONSE'||e.private.seat===null)return false;
 const discarderId=e.public.phase.discarderId,discarder=e.public.players.find(p=>p.playerId===discarderId);
 return !!discarder&&(discarder.seat+1)%e.public.capacity===e.private.seat;
}

export {BORROW_HU_CIRCUITS,borrowedHuVisible} from '../../../../packages/contracts/response-policy';

/** Shared eligibility for the EAT button and dragging the same public discard. */
export function canEatDiscard(e:ResyncEnvelope):boolean{
 const self=e.public.players.find(p=>p.playerId===e.private.playerId);
 return isNextDrawer(e)&&e.legalActions.includes('RESPOND')&&e.public.suspension.kind==='RUNNING'&&!!self&&!self.autoPlay&&(usesDeepSeekRules(e.public.rulesVersion)||self.eatCount<3);
}
