import type {PublicPhase,PlayerCount,SeatIndex} from './types';
import type {TableNumber} from './lobby';
export type AdminSession = Readonly<{authenticated:boolean;expiresAt:number|null}>;
export type AdminRoom = Readonly<{
 roomId:string;capacity:PlayerCount;phase:PublicPhase['kind'];stateVersion:number;
 tableNumber:TableNumber|null;
 players:readonly Readonly<{seat:SeatIndex;nickname:string;isBotSeat:boolean;connected:boolean}>[];
 autoCloseAt:number|null;
}>;
export type AdminRooms = Readonly<{rooms:readonly AdminRoom[]}>;
export type DissolveRoomRequest = Readonly<{expectedStateVersion:number}>;
export type KickRoomRequest = DissolveRoomRequest & Readonly<{seat:SeatIndex}>;
export type DissolveRoomResult = Readonly<{ok:true;room:AdminRoom}>;
export type AdminRoundRecord=Readonly<{
 id:number;roomId:string;roundId:string;startedAt:number|null;finishedAt:number|null;
 legacy:boolean;members:readonly Readonly<{seat:SeatIndex;nickname:string;isBotSeat:boolean}>[];
 reason:'WIN'|'DRAW'|'EXPIRED'|'TERMINATED'|null;practiceMode:boolean;deckSetName:string|null;
 winnerNickname:string|null;winningText:string|null;
 sentences:readonly Readonly<{nickname:string|null;text:string;outcome:'APPROVED'|'REJECTED'|'WITHDRAWN';revealedAt:number|null}>[];
}>;
export type AdminRoundRecords=Readonly<{records:readonly AdminRoundRecord[];nextCursor:number|null}>;
