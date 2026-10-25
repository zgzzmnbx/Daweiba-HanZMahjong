import {stableAvatarId} from '../../packages/contracts/avatars';
import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Express} from 'express';
import type {Server} from 'socket.io';
import type {Game} from '../../packages/engine/index';
import {CHAT_HISTORY_LIMIT,CHAT_MAX_LENGTH,type RoomChatMessage,type RoomChatRequest} from '../../packages/contracts/chat';
import type {Session} from './store';
class ChatError extends Error{constructor(readonly code:string){super(code);}}
export class RoomChatStore{
 constructor(private db:DatabaseSync){db.exec(`CREATE TABLE IF NOT EXISTS room_chat(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,room_id TEXT NOT NULL,player_id TEXT NOT NULL,client_id TEXT NOT NULL,seat INTEGER NOT NULL,nickname TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL,UNIQUE(room_id,player_id,client_id));CREATE INDEX IF NOT EXISTS room_chat_history ON room_chat(room_id,seq);CREATE INDEX IF NOT EXISTS room_chat_rate ON room_chat(room_id,player_id,at);`);if(!(db.prepare('PRAGMA table_info(room_chat)').all() as {name:string}[]).some(c=>c.name==='avatar_id'))db.exec('ALTER TABLE room_chat ADD COLUMN avatar_id TEXT');}
 private project(row:any):RoomChatMessage{return{id:row.id,roomId:row.room_id,seat:row.seat,...(row.avatar_id?{avatarId:row.avatar_id}:{}),nickname:row.player_id==='system:ai-review'&&/deep\s*seek|深度求索/i.test(row.nickname)?'AI 评审':row.nickname,text:row.player_id==='system:ai-review'?row.text.replace(/deep\s*seek|深度求索/gi,'我'):row.text,at:row.at,...(row.player_id==='system:ai-review'?{kind:'AI_REVIEW' as const}:row.player_id==='system:hu-review'?{kind:'HU_REVIEW' as const}:{})};}
 /** Called inside the game transaction: vote and chat cannot diverge. */
 captureReviews(g:Game,now:number){
  const messages:RoomChatMessage[]=[];
  const proposals=[...g.public.history,...(g.public.phase.kind==='HU_VOTE'?[g.public.phase.proposal]:[])];
  for(const p of proposals){
   for(const v of p.reviewers??[]){if((v.isBotSeat&&!p.aiJudgments)||!v.comment||!['APPROVE','REJECT'].includes(v.choice))continue;
    const kind=v.isBotSeat?'AI_REVIEW':'HU_REVIEW',author=v.isBotSeat?'system:ai-review':'system:hu-review';
    const id=`vote:${p.proposalId}:${v.playerId}`,text=(v.choice==='APPROVE'?'赞成 · ':'不赞成 · ')+v.comment,seat=g.public.players.find(x=>x.playerId===v.playerId)?.seat??-1,at=now;
    const result=this.db.prepare('INSERT OR IGNORE INTO room_chat(id,room_id,player_id,client_id,seat,nickname,text,at,avatar_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,g.public.roomId,author,id,seat,v.nickname,text,at,v.avatarId??stableAvatarId(v.playerId));
    if(result.changes)messages.push({id,roomId:g.public.roomId,seat,nickname:v.nickname,avatarId:v.avatarId??stableAvatarId(v.playerId),text,at,kind});
   }
   const ai=p.aiJudgment;if(p.aiJudgments||ai?.status!=='DONE')continue;
   const text=(ai.source==='DEEPSEEK'?(ai.pass?'通过 · ':'不通过 · '):'兜底 · ')+ai.roast;
   const speaker=p.reviewers?.find(v=>v.isBotSeat),seat=speaker?g.public.players.find(v=>v.playerId===speaker.playerId)?.seat??-1:-1;
   const id=`ai:${p.proposalId}`,nickname=speaker?.nickname??(ai.source==='DEEPSEEK'?'AI 评审':'系统 · AI兜底');
   const result=this.db.prepare('INSERT OR IGNORE INTO room_chat(id,room_id,player_id,client_id,seat,nickname,text,at,avatar_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,g.public.roomId,'system:ai-review',p.proposalId,seat,nickname,text,ai.at,speaker?(speaker.avatarId??stableAvatarId(speaker.playerId)):null);
   if(result.changes)messages.push({id,roomId:g.public.roomId,seat,nickname,...(speaker?{avatarId:speaker.avatarId??stableAvatarId(speaker.playerId)}:{}),text,at:ai.at,kind:'AI_REVIEW'});
  }
  return messages;
 }
 history(room:string){return this.db.prepare('SELECT * FROM room_chat WHERE room_id=? ORDER BY seq DESC LIMIT ?').all(room,CHAT_HISTORY_LIMIT).reverse().map(r=>this.project(r));}
 send(room:string,player:string,seat:number,nickname:string,request:unknown,now:number,avatarId?:string){
  const body=request as Partial<RoomChatRequest>|null;
  if(!body||body.roomId!==room||typeof body.clientId!=='string'||!/^[-A-Za-z0-9_]{16,80}$/.test(body.clientId)||typeof body.text!=='string'||body.text.length>CHAT_MAX_LENGTH*4)throw new ChatError('CHAT_INVALID');
  const text=body.text.normalize('NFC').replace(/[\r\n\t]+/g,' ').trim();
  if(!text||Array.from(text).length>CHAT_MAX_LENGTH||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(text))throw new ChatError('CHAT_INVALID');
  // Check receipts before throttling: a lost acknowledgement may be retried unchanged.
  const old=this.db.prepare('SELECT * FROM room_chat WHERE room_id=? AND player_id=? AND client_id=?').get(room,player,body.clientId) as any;
  if(old){if(old.text!==text)throw new ChatError('CHAT_ID_REUSED');return{message:this.project(old),fresh:false};}
  const counts=this.db.prepare('SELECT COUNT(*) AS minute,SUM(CASE WHEN at>? THEN 1 ELSE 0 END) AS burst FROM room_chat WHERE room_id=? AND player_id=? AND at>?').get(now-5000,room,player,now-60000) as {minute:number;burst:number};
  if(counts.burst>=3||counts.minute>=12)throw new ChatError('CHAT_RATE_LIMITED');
  const id=randomUUID();this.db.prepare('INSERT INTO room_chat(id,room_id,player_id,client_id,seat,nickname,text,at,avatar_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id,room,player,body.clientId,seat,nickname,text,now,avatarId??null);
  return{message:{id,roomId:room,seat,nickname,...(avatarId?{avatarId}:{}),text,at:now} satisfies RoomChatMessage,fresh:true};
 }
}
export function installRoomChat(app:Express,io:Server,db:DatabaseSync,options:{authenticate:(header:string|undefined,room?:string)=>Session;room:(id:string)=>Game;now:()=>number}){
 const store=new RoomChatStore(db);
 const member=(header:string|undefined,room?:string)=>{const session=options.authenticate(header,room),game=options.room(session.roomId),player=game.public.players.find(p=>p.playerId===session.playerId&&!p.isBotSeat);if(!player)throw new ChatError('CHAT_NOT_MEMBER');return{session,game,player};};
 const broadcast=(messages:RoomChatMessage[])=>{for(const message of messages)for(const other of io.sockets.sockets.values()){try{member(other.request.headers.cookie,message.roomId);other.emit('chat:message',message);}catch{}}};
 const code=(e:unknown)=>e instanceof ChatError?e.code:(e as {code?:string})?.code==='UNAUTHENTICATED'||(e as {code?:string})?.code==='STALE_CONTROL_EPOCH'?'CHAT_NOT_MEMBER':'CHAT_UNAVAILABLE';
 app.get('/api/rooms/:roomId/chat',(q,r)=>{try{const {session}=member(q.headers.cookie,String(q.params.roomId));r.json({messages:store.history(session.roomId)});}catch(e){const error=code(e);r.status(error==='CHAT_UNAVAILABLE'?503:403).json({error});}});
 io.on('connection',socket=>{
  socket.on('chat:send',(body:unknown,ack?: (reply:unknown)=>void)=>{
   try{const {session,game,player}=member(socket.request.headers.cookie);if((body as Partial<RoomChatRequest>|null)?.roomId!==session.roomId)throw new ChatError('CHAT_NOT_MEMBER');if(!player.connected||player.presence!=='HUMAN'||game.public.phase.kind==='ROOM_CLOSED')throw new ChatError('CHAT_CLOSED');
    const result=store.send(session.roomId,session.playerId,player.seat,player.nickname,body,options.now(),player.avatarId??stableAvatarId(player.playerId));
    if(result.fresh)broadcast([result.message]);
    if(typeof ack==='function')ack({ok:true,message:result.message});
   }catch(e){if(typeof ack==='function')ack({ok:false,error:code(e)});}
  });
 });
 return{broadcast};
}
