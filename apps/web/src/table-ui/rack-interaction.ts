import type {PublicPhase,ResyncEnvelope} from '../../../../packages/contracts/types';
/** Normal table turns do not change the ownership or meaning of a held hand tile. */
export const rackPhaseKey=(phase:PublicPhase)=>phase.kind==='TURN_ACTION'||phase.kind==='DISCARD_RESPONSE'?'PLAY':phase.phaseId;
export function rackInteractionStamp(e:ResyncEnvelope){
 return JSON.stringify([e.public.roomId,e.public.roundId,e.private.playerId,e.private.controlEpoch,rackPhaseKey(e.public.phase),e.public.suspension.kind,e.public.players.find(p=>p.playerId===e.private.playerId)?.autoPlay===true,e.private.draftVersion,e.private.candidateDraft?.candidateDraftVersion,e.private.candidateDraft?.source.borrowedTileId,e.private.hand.map(t=>t.tileId).sort()]);
}
