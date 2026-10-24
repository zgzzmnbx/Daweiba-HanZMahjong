import type * as C from '../../../../packages/contracts/types';
import type {TableView,RelativeSeat} from '../../../../packages/contracts/table-view';
import {seatTemplate} from './adapter';
/** A separate public-only projection, never a fabricated authenticated player's private snapshot. */
export function spectatorTableView(p:C.PublicRoomSnapshot):TableView{
 const proposal=p.phase.kind==='HU_VOTE'?p.phase.proposal:p.history.at(-1);
 return {stamp:{roomId:p.roomId,roundId:p.roundId,phaseId:p.phase.phaseId,publicRevision:p.stateVersion,controlEpoch:0 as C.ControlEpoch,draftVersion:0 as C.DraftVersion,candidateDraftVersion:null,renderRevision:p.stateVersion},viewerId:null,phase:p.phase,suspension:p.suspension,rack:null,
  seats:Array.from({length:p.capacity},(_,seat)=>{const player=p.players.find(p=>p.seat===seat)??null;return{player,logicalSeat:seat as C.SeatIndex,relativeSeat:seat as RelativeSeat,relation:'OTHER',placement:seatTemplate(p.capacity,seat as RelativeSeat,{width:1440,height:900}),concealed:{kind:'COUNT_AND_GENERIC_BACKS',count:player?.handCount??0}};}),
  wall:{kind:'COUNT_ONLY',count:p.wallRemaining,decoration:'GENERIC_BACKS'},discards:p.discards,
  publicSentence:proposal?{proposalId:proposal.proposalId,snapshot:proposal.snapshot,objectionRanges:'result'in proposal?proposal.result?.mergedObjectionRanges??[]:[]}:null};
}
