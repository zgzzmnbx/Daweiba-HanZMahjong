import type {PlayerId,PublicRoomSnapshot,RulesVersion} from './types';

export const supportsListening=(version:RulesVersion)=>version==='1.5.0';
/** Shared display/authority eligibility; declaring HU still goes through the server command. */
export function canBorrowDiscard(room:PublicRoomSnapshot,playerId:PlayerId,discarderId:PlayerId){
 const player=room.players.find(p=>p.playerId===playerId),discarder=room.players.find(p=>p.playerId===discarderId);
 if(!player||!discarder||playerId===discarderId)return false;
 return !supportsListening(room.rulesVersion)||player.listening===true||player.seat===(discarder.seat+1)%room.capacity;
}
