/** Room-only chat, independent of game commands and state versions. */
export type RoomChatMessage=Readonly<{id:string;roomId:string;seat:number;nickname:string;text:string;at:number;kind?:'AI_REVIEW'|'HU_REVIEW'}>;
export type RoomChatRequest=Readonly<{roomId:string;clientId:string;text:string}>;
export type RoomChatAck={ok:true;message:RoomChatMessage}|{ok:false;error:string};
export interface RoomChatTransport{
 subscribe(listener:(message:RoomChatMessage)=>void):()=>void;
 history(signal:AbortSignal):Promise<RoomChatMessage[]>;
 send(text:string,clientId:string):Promise<RoomChatMessage>;
}
export const CHAT_MAX_LENGTH=120;
export const CHAT_HISTORY_LIMIT=60;
