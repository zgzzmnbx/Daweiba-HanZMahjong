import type {SeatIndex} from './types';
export type RoomSeatPerson=Readonly<{seat:SeatIndex;nickname:string;avatarId?:string;isBotSeat:boolean;isManaged:boolean}>;
export type RoomSeatDirectory=Readonly<{
 capacity:number;seats:number[];inProgress:boolean;closed:boolean;allowSpectators?:boolean;
 players?:readonly RoomSeatPerson[];
 /** Present only when a valid same-browser credential belongs to this room. No identity IDs or secrets. */
 returnSeat?:SeatIndex|null;returnMethod?:'BROWSER'|'SESSION'|null;
}>;
/** Keep authoritative nicknames unchanged; decorate only their current public display. */
export function playerDisplayName(p:{nickname:string;avatarId?:string;isBotSeat?:boolean;presence?:string;isManaged?:boolean;autoPlay?:boolean}){return p.nickname+(!p.isBotSeat&&(p.isManaged||p.presence==='BOT'||p.autoPlay)?'（AI托管）':'');}
