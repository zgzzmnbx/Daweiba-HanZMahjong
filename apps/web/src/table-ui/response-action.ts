import type {ResyncEnvelope} from '../../../../packages/contracts/types';
/** PASS is a response from any eligible opponent; only the next seat will draw if no claim wins. */
export function isNextDrawer(e:ResyncEnvelope):boolean{
 if(e.public.phase.kind!=='DISCARD_RESPONSE'||e.private.seat===null)return false;
 const discarderId=e.public.phase.discarderId,discarder=e.public.players.find(p=>p.playerId===discarderId);
 return !!discarder&&(discarder.seat+1)%e.public.capacity===e.private.seat;
}
