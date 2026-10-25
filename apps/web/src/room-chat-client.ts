import type {Socket} from 'socket.io-client';
import type {RoomChatMessage,RoomChatAck,RoomChatTransport} from '../../../packages/contracts/chat';
export const chatError=(code:string)=>({CHAT_INVALID_STICKER:'这张表情暂不可用，请重新选择。',CHAT_INVALID:'请输入 1–120 个字。',CHAT_RATE_LIMITED:'说慢一点，稍后再发。',CHAT_NOT_MEMBER:'座位身份已变化，请重新进入房间。',CHAT_CLOSED:'房间已关闭或暂未连接。',CHAT_ID_REUSED:'这条消息已提交，请重新发送。',CHAT_UNAVAILABLE:'暂时未发出，文字已保留，可重试。',CHAT_OFFLINE:'连接恢复后再发，文字会保留。'}[code]??'发送结果未确认，点击重试。');
export class RoomChatClient implements RoomChatTransport{
 private listeners=new Set<(m:RoomChatMessage)=>void>();
 constructor(private current:()=>{socket:Socket;roomId:string}|null){}
 listen(socket:Socket,isCurrent:()=>boolean){socket.on('chat:message',(message:RoomChatMessage)=>{if(isCurrent()&&message.roomId===this.current()?.roomId)for(const fn of this.listeners)fn(message);});}
 subscribe(fn:(m:RoomChatMessage)=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
 async history(signal:AbortSignal){const current=this.current();if(!current)throw new Error('CHAT_OFFLINE');const r=await fetch(`/api/rooms/${current.roomId}/chat`,{credentials:'same-origin',cache:'no-store',signal}),body=await r.json();if(this.current()?.socket!==current.socket)throw new Error('CHAT_OFFLINE');if(!r.ok)throw new Error(body.error??'CHAT_UNAVAILABLE');return body.messages as RoomChatMessage[];}
 async send(text:string,clientId:string){return this.publish({text,clientId});}
 async sendSticker(stickerId:string,clientId:string){return this.publish({stickerId,clientId});}
 private async publish(payload:{text?:string;stickerId?:string;clientId:string}){const current=this.current();if(!current)throw new Error('CHAT_OFFLINE');const result:RoomChatAck=await current.socket.timeout(5000).emitWithAck('chat:send',{roomId:current.roomId,...payload});if(this.current()?.socket!==current.socket)throw new Error('CHAT_OFFLINE');if(!result.ok)throw new Error(result.error);return result.message;}
}
