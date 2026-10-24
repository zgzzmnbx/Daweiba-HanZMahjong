import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Express} from 'express';
import type {Server} from 'socket.io';
import type {Game} from '../../packages/engine/index';
import {CHAT_HISTORY_LIMIT,CHAT_MAX_LENGTH,type RoomChatMessage,type RoomChatRequest} from '../../packages/contracts/chat';
import type {Session} from './store';
class ChatError extends Error{constructor(readonly code:string){super(code);}}
export class RoomChatStore{
 constructor(private db:DatabaseSync){db.exec(`CREATE TABLE IF NOT EXISTS room_chat(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,room_id TEXT NOT NULL,player_id TEXT NOT NULL,client_id TEXT NOT NULL,seat INTEGER NOT NULL,nickname TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL,UNIQUE(room_id,player_id,client_id));CREATE INDEX IF NOT EXISTS room_chat_history ON room_chat(room_id,seq);CREATE INDEX IF NOT EXISTS room_chat_rate ON room_chat(room_id,player_id,at);`);}
 private project(row:any):RoomChatMessage{return{id:row.id,roomId:row.room_id,seat:row.seat,nickname:row.nickname,text:row.text,at:row.at};}
 history(room:string){return this.db.prepare('SELECT * FROM room_chat WHERE room_id=? ORDER BY seq DESC LIMIT ?').all(room,CHAT_HISTORY_LIMIT).reverse().map(r=>this.project(r));}
 send(room:string,player:string,seat:number,nickname:string,request:unknown,now:number){
  const body=request as Partial<RoomChatRequest>|null;
  if(!body||body.roomId!==room||typeof body.clientId!=='string'||!/^[-A-Za-z0-9_]{16,80}$/.test(body.clientId)||typeof body.text!=='string'||body.text.length>CHAT_MAX_LENGTH*4)throw new ChatError('CHAT_INVALID');
  const text=body.text.normalize('NFC').replace(/[\r\n\t]+/g,' ').trim();
  if(!text||Array.from(text).length>CHAT_MAX_LENGTH||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(text))throw new ChatError('CHAT_INVALID');
  // Check receipts before throttling: a lost acknowledgement may be retried unchanged.
  const old=this.db.prepare('SELECT * FROM room_chat WHERE room_id=? AND player_id=? AND client_id=?').get(room,player,body.clientId) as any;
  if(old){if(old.text!==text)throw new ChatError('CHAT_ID_REUSED');return{message:this.project(old),fresh:false};}
  const counts=this.db.prepare('SELECT COUNT(*) AS minute,SUM(CASE WHEN at>? THEN 1 ELSE 0 END) AS burst FROM room_chat WHERE room_id=? AND player_id=? AND at>?').get(now-5000,room,player,now-60000) as {minute:number;burst:number};
  if(counts.burst>=3||counts.minute>=12)throw new ChatError('CHAT_RATE_LIMITED');
  const id=randomUUID();this.db.prepare('INSERT INTO room_chat(id,room_id,player_id,client_id,seat,nickname,text,at) VALUES(?,?,?,?,?,?,?,?)').run(id,room,player,body.clientId,seat,nickname,text,now);
  return{message:{id,roomId:room,seat,nickname,text,at:now} satisfies RoomChatMessage,fresh:true};
 }
}
export function installRoomChat(app:Express,io:Server,db:DatabaseSync,options:{authenticate:(header:string|undefined,room?:string)=>Session;room:(id:string)=>Game;now:()=>number}){
 const store=new RoomChatStore(db);
 const member=(header:string|undefined,room?:string)=>{const session=options.authenticate(header,room),game=options.room(session.roomId),player=game.public.players.find(p=>p.playerId===session.playerId&&!p.isBotSeat);if(!player)throw new ChatError('CHAT_NOT_MEMBER');return{session,game,player};};
 const code=(e:unknown)=>e instanceof ChatError?e.code:(e as {code?:string})?.code==='UNAUTHENTICATED'||(e as {code?:string})?.code==='STALE_CONTROL_EPOCH'?'CHAT_NOT_MEMBER':'CHAT_UNAVAILABLE';
 app.get('/api/rooms/:roomId/chat',(q,r)=>{try{const {session}=member(q.headers.cookie,String(q.params.roomId));r.json({messages:store.history(session.roomId)});}catch(e){const error=code(e);r.status(error==='CHAT_UNAVAILABLE'?503:403).json({error});}});
 io.on('connection',socket=>{
  socket.on('chat:send',(body:unknown,ack?: (reply:unknown)=>void)=>{
   try{const {session,game,player}=member(socket.request.headers.cookie);if((body as Partial<RoomChatRequest>|null)?.roomId!==session.roomId)throw new ChatError('CHAT_NOT_MEMBER');if(!player.connected||player.presence!=='HUMAN'||game.public.phase.kind==='ROOM_CLOSED')throw new ChatError('CHAT_CLOSED');
    const result=store.send(session.roomId,session.playerId,player.seat,player.nickname,body,options.now());
    if(result.fresh)for(const other of io.sockets.sockets.values()){try{member(other.request.headers.cookie,session.roomId);other.emit('chat:message',result.message);}catch{}}
    if(typeof ack==='function')ack({ok:true,message:result.message});
   }catch(e){if(typeof ack==='function')ack({ok:false,error:code(e)});}
  });
 });
}
