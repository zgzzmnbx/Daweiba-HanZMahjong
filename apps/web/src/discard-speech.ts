import type {PublicRoomSnapshot} from '../../../packages/contracts/types';
export type SpeechFrame={room:PublicRoomSnapshot;session:string;active:boolean};
/** Only new public discards are speech events. Restoration is a silent baseline. */
export function discardSpeechEvents(before:SpeechFrame|null,after:SpeechFrame){
 if(!before||!before.active||!after.active||before.session!==after.session||before.room.roomId!==after.room.roomId||before.room.roundId!==after.room.roundId||!after.room.roundId||before.room.suspension.kind!=='RUNNING'||after.room.suspension.kind!=='RUNNING'||after.room.phase.kind==='ROOM_CLOSED'||after.room.stateVersion<=before.room.stateVersion)return[];
 const seen=new Set(before.room.discards.map(d=>d.discardId));
 return after.room.discards.filter(d=>!seen.has(d.discardId));
}
