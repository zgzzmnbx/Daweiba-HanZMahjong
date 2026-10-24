import type {DatabaseSync} from 'node:sqlite';
import type {PublicHistoryEntry} from '../../packages/contracts/types';
import type {HuBookEntry,HuBookPage} from '../../packages/contracts/hu-book';
import {AdminError} from './admin-auth';

type RecordSource={roomId:string;roundId:string;members:{playerId:string;nickname:string}[];history:PublicHistoryEntry[];finishedAt:number|null;practiceMode:boolean;deckSetName:string|null};
type Row={id:number;data:string;likes:number};
const DAY=86400000,OFFSET=8*3600000;
export function bookDay(now:number){return new Date(now+OFFSET).toISOString().slice(0,10);}
function integer(value:unknown,fallback?:number){if(value===undefined&&fallback!==undefined)return fallback;if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1)throw new AdminError('INVALID_BOOK_QUERY',400);return Number(value);}
/** Only approved, already-public sentences enter the gallery. Tombstones survive every backfill. */
export class HuBook{
 constructor(private db:DatabaseSync){
  db.exec(`CREATE TABLE IF NOT EXISTS hu_book(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,round_id TEXT NOT NULL,proposal_id TEXT NOT NULL,data TEXT NOT NULL,likes INTEGER NOT NULL DEFAULT 0,deleted_at INTEGER,UNIQUE(room_id,round_id,proposal_id));
   CREATE TABLE IF NOT EXISTS hu_book_readers(token_hash TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS hu_book_likes(reader_hash TEXT NOT NULL REFERENCES hu_book_readers(token_hash),day TEXT NOT NULL,entry_id INTEGER NOT NULL REFERENCES hu_book(id),at INTEGER NOT NULL,PRIMARY KEY(reader_hash,day));`);
  db.exec('BEGIN IMMEDIATE');try{for(const row of db.prepare('SELECT data FROM admin_round_records ORDER BY id').all() as {data:string}[])this.captureSource(JSON.parse(row.data));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 capture(roomId:string,roundId:string|null){if(!roundId)return;const row=this.db.prepare('SELECT data FROM admin_round_records WHERE room_id=? AND round_id=?').get(roomId,roundId) as {data:string}|undefined;if(row)this.captureSource(JSON.parse(row.data));}
 private captureSource(source:RecordSource){
  for(const h of source.history){if(h.outcome!=='APPROVED')continue;
   const data:Omit<HuBookEntry,'id'|'likes'>={nickname:source.members.find(p=>p.playerId===h.applicantId)?.nickname??'往日牌友',tiles:h.snapshot.sentence.orderedTileIds.map(id=>({char:h.snapshot.tiles.find(t=>t.tileId===id)!.char,comma:h.snapshot.sentence.commaAfterTileIds.includes(id as never)})),finishedAt:source.finishedAt,practiceMode:source.practiceMode,deckSetName:source.deckSetName};
   this.db.prepare('INSERT OR IGNORE INTO hu_book(room_id,round_id,proposal_id,data) VALUES(?,?,?,?)').run(source.roomId,source.roundId,h.proposalId,JSON.stringify(data));
  }
 }
 hasReader(hash:string){return !!this.db.prepare('SELECT 1 FROM hu_book_readers WHERE token_hash=?').get(hash);}
 addReader(hash:string,now:number){this.db.prepare('INSERT INTO hu_book_readers VALUES(?,?)').run(hash,now);}
 daily(hash:string,now:number){const day=bookDay(now),row=this.db.prepare('SELECT entry_id FROM hu_book_likes WHERE reader_hash=? AND day=?').get(hash,day) as {entry_id:number}|undefined;return{serverNow:now,day,likedId:row?.entry_id??null,resetsAt:(Math.floor((now+OFFSET)/DAY)+1)*DAY-OFFSET};}
 list(hash:string,now:number,beforeValue?:unknown):HuBookPage{
  const before=integer(beforeValue,Number.MAX_SAFE_INTEGER),rows=this.db.prepare('SELECT id,data,likes FROM hu_book WHERE deleted_at IS NULL AND id<? ORDER BY id DESC LIMIT 13').all(before) as Row[];
  return{entries:rows.slice(0,12).map(({id,data,likes})=>({...JSON.parse(data),id,likes})),nextCursor:rows.length>12?rows[11].id:null,total:Number((this.db.prepare('SELECT count(*) AS n FROM hu_book WHERE deleted_at IS NULL').get() as {n:number}).n),...this.daily(hash,now)};
 }
 like(hash:string,idValue:unknown,now:number){
  const id=integer(idValue);this.db.exec('BEGIN IMMEDIATE');try{
   if(!this.hasReader(hash))throw new AdminError('BOOK_IDENTITY_REQUIRED',401);
   if(!this.db.prepare('SELECT 1 FROM hu_book WHERE id=? AND deleted_at IS NULL').get(id))throw new AdminError('BOOK_ENTRY_REMOVED',404);
   const today=this.daily(hash,now);if(today.likedId!==null&&today.likedId!==id)throw new AdminError('BOOK_DAILY_LIMIT',409);
   if(today.likedId===null){this.db.prepare('INSERT INTO hu_book_likes VALUES(?,?,?,?)').run(hash,today.day,id,now);this.db.prepare('UPDATE hu_book SET likes=likes+1 WHERE id=?').run(id);}
   const likes=(this.db.prepare('SELECT likes FROM hu_book WHERE id=?').get(id) as {likes:number}).likes;this.db.exec('COMMIT');return{...this.daily(hash,now),id,likes};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 remove(idValue:unknown,actor:string,now:number){const id=integer(idValue);this.db.exec('BEGIN IMMEDIATE');try{
  const result=this.db.prepare('UPDATE hu_book SET deleted_at=? WHERE id=? AND deleted_at IS NULL').run(now,id);
  if(result.changes)this.db.prepare('INSERT INTO admin_audit(kind,actor,at,data) VALUES(?,?,?,?)').run('HU_BOOK_DELETE',actor,now,JSON.stringify({entryId:id}));
  this.db.exec('COMMIT');return{ok:true};
 }catch(e){this.db.exec('ROLLBACK');throw e;}}
}
