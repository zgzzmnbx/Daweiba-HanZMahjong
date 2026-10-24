import type {DatabaseSync} from 'node:sqlite';
import type {Express} from 'express';
import type {Server} from 'socket.io';
import type {Game} from '../../packages/engine/index';
import type {Session} from './store';
import {DOODLE_COLORS,DOODLE_MAX_POINTS,DOODLE_MAX_STROKES,type DoodleAction,type DoodleBoard,type DoodleEvent,type DoodleStroke} from '../../packages/contracts/doodle';
class DoodleError extends Error{}
type Row={id:string;owner:string;data:string;active:number};
export class RoomDoodleStore{
 constructor(private db:DatabaseSync){db.exec(`CREATE TABLE IF NOT EXISTS doodle_boards(room TEXT PRIMARY KEY,revision INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS doodle_strokes(room TEXT NOT NULL,id TEXT NOT NULL,owner TEXT NOT NULL,data TEXT NOT NULL,active INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(room,id));CREATE TABLE IF NOT EXISTS doodle_receipts(room TEXT NOT NULL,owner TEXT NOT NULL,id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(room,owner,id));`);}
 history(room:string):DoodleBoard{return{revision:(this.db.prepare('SELECT revision FROM doodle_boards WHERE room=?').get(room) as any)?.revision??0,strokes:this.db.prepare('SELECT data FROM doodle_strokes WHERE room=? AND active=1 ORDER BY created,id').all(room).map(r=>JSON.parse(r.data as string))};}
 apply(room:string,owner:string,seat:number,nickname:string,body:unknown):DoodleEvent{
  const a=body as DoodleAction;if(!a||typeof a.id!=='string'||!/^[-a-zA-Z0-9_]{16,80}$/.test(a.id)||!['draw','undo','clear'].includes(a.kind))throw new DoodleError('DOODLE_INVALID');
  const old=this.db.prepare('SELECT * FROM doodle_strokes WHERE room=? AND id=?').get(room,a.id) as Row|undefined;
  let stroke:DoodleStroke|undefined;let removed:string[]=[];
  if(a.kind==='draw'){
   if(!Number.isInteger(a.seq)||a.seq<1||a.seq>DOODLE_MAX_POINTS+1||!DOODLE_COLORS.includes(a.color as any)||![1,2,4].includes(a.width)||typeof a.done!=='boolean'||!Array.isArray(a.points)||!a.points.length||a.points.length>DOODLE_MAX_POINTS||!a.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)))throw new DoodleError('DOODLE_INVALID');
   if(old){if(old.owner!==owner||!old.active)throw new DoodleError('DOODLE_NOT_OWNER');const before=JSON.parse(old.data) as DoodleStroke;
    if(a.seq<=before.seq){if(a.seq===before.seq&&JSON.stringify([a.points,a.color,a.width,a.done])!==JSON.stringify([before.points,before.color,before.width,before.done]))throw new DoodleError('DOODLE_INVALID');return{roomId:room,revision:this.history(room).revision,removed:[],stroke:before};}
    if(before.done||a.color!==before.color||a.width!==before.width||a.points.length<before.points.length||!before.points.every((p,i)=>p[0]===a.points[i][0]&&p[1]===a.points[i][1]))throw new DoodleError('DOODLE_INVALID');
   }
   stroke={id:a.id,seat,nickname,color:a.color,width:a.width,points:a.points,seq:a.seq,done:a.done};
  }else{const receipt=this.db.prepare('SELECT result FROM doodle_receipts WHERE room=? AND owner=? AND id=?').get(room,owner,a.id);if(receipt)return JSON.parse(receipt.result as string);removed=(this.db.prepare(`SELECT id FROM doodle_strokes WHERE room=? AND owner=? AND active=1 ORDER BY created DESC,id DESC ${a.kind==='undo'?'LIMIT 1':''}`).all(room,owner) as {id:string}[]).map(r=>r.id);}
  this.db.exec('SAVEPOINT doodle');try{
   this.db.prepare('INSERT INTO doodle_boards VALUES(?,1) ON CONFLICT(room) DO UPDATE SET revision=revision+1').run(room);const revision=(this.db.prepare('SELECT revision FROM doodle_boards WHERE room=?').get(room) as any).revision;
   if(stroke)this.db.prepare('INSERT INTO doodle_strokes VALUES(?,?,?,?,1,?) ON CONFLICT(room,id) DO UPDATE SET data=excluded.data').run(room,a.id,owner,JSON.stringify(stroke),revision);
   removed.push(...(this.db.prepare('SELECT id FROM doodle_strokes WHERE room=? AND active=1 ORDER BY created DESC,id DESC LIMIT -1 OFFSET ?').all(room,DOODLE_MAX_STROKES) as {id:string}[]).map(r=>r.id));
   for(const id of removed)this.db.prepare('UPDATE doodle_strokes SET active=0 WHERE room=? AND id=?').run(room,id);
   const event={roomId:room,revision,...(stroke?{stroke}:{}),removed};
   if(a.kind!=='draw')this.db.prepare('INSERT INTO doodle_receipts VALUES(?,?,?,?)').run(room,owner,a.id,JSON.stringify(event));
   this.db.prepare('DELETE FROM doodle_strokes WHERE room=? AND active=0 AND id IN (SELECT id FROM doodle_strokes WHERE room=? AND active=0 ORDER BY created DESC LIMIT -1 OFFSET 256)').run(room,room);
   this.db.prepare('DELETE FROM doodle_receipts WHERE room=? AND rowid NOT IN (SELECT rowid FROM doodle_receipts WHERE room=? ORDER BY rowid DESC LIMIT 256)').run(room,room);
   this.db.exec('RELEASE doodle');return event;
  }catch(e){this.db.exec('ROLLBACK TO doodle; RELEASE doodle');throw e;}
 }
}
export function installRoomDoodle(app:Express,io:Server,db:DatabaseSync,options:{authenticate:(header:string|undefined,room?:string)=>Session;room:(id:string)=>Game;now:()=>number}){
 const store=new RoomDoodleStore(db),rates=new Map<string,{at:number;count:number}>();
 const member=(header:string|undefined,room?:string)=>{const session=options.authenticate(header,room),game=options.room(session.roomId),player=game.public.players.find(p=>p.playerId===session.playerId&&!p.isBotSeat);if(!player)throw new DoodleError('DOODLE_NOT_MEMBER');return{session,game,player};};
 const code=(e:unknown)=>e instanceof DoodleError?e.message:('code' in Object(e)?'DOODLE_NOT_MEMBER':'DOODLE_UNAVAILABLE');
 app.get('/api/rooms/:roomId/doodle',(q,r)=>{try{const {session}=member(q.headers.cookie,String(q.params.roomId));r.json(store.history(session.roomId));}catch(e){r.status(403).json({error:code(e)});}});
 io.on('connection',socket=>{socket.on('doodle:draw',(body:any,ack?:Function)=>{try{
  const {session,game,player}=member(socket.request.headers.cookie);if(body?.roomId!==session.roomId)throw new DoodleError('DOODLE_NOT_MEMBER');if(!player.connected||player.presence!=='HUMAN'||game.public.phase.kind==='ROOM_CLOSED')throw new DoodleError('DOODLE_CLOSED');
  const key=session.roomId+':'+session.playerId,now=options.now();let rate=rates.get(key);if(!rate||now-rate.at>=1000){rate={at:now,count:0};rates.set(key,rate);}if(++rate.count>20)throw new DoodleError('DOODLE_RATE_LIMITED');if(rates.size>1000)for(const [k,v]of rates)if(now-v.at>60000)rates.delete(k);
  const event=store.apply(session.roomId,session.playerId,player.seat,player.nickname,body.action);
  for(const other of io.sockets.sockets.values()){try{member(other.request.headers.cookie,session.roomId);other.emit('doodle:event',event);}catch{}}
  if(typeof ack==='function')ack({ok:true,event});
 }catch(e){if(typeof ack==='function')ack({ok:false,error:code(e)});}});});
 return store;
}
