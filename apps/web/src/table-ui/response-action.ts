import type {PublicRoomSnapshot,ResyncEnvelope} from '../../../../packages/contracts/types';
/** PASS is a response from any eligible opponent; only the next seat will draw if no claim wins. */
export function isNextDrawer(e:ResyncEnvelope):boolean{
 if(e.public.phase.kind!=='DISCARD_RESPONSE'||e.private.seat===null)return false;
 const discarderId=e.public.phase.discarderId,discarder=e.public.players.find(p=>p.playerId===discarderId);
 return !!discarder&&(discarder.seat+1)%e.public.capacity===e.private.seat;
}

/** Progressive disclosure only; use the full public ledger, never the rendered discard slice.
 * One circuit is capacity discards, including claimed/eaten tiles. START resets this ledger. */
export const BORROW_HU_CIRCUITS=10;
export function borrowedHuVisible(p:PublicRoomSnapshot):boolean{
 return p.discards.length>=p.capacity*BORROW_HU_CIRCUITS;
}
