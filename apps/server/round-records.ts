import type {DatabaseSync} from 'node:sqlite';
import type {PublicRoomSnapshot,PublicHistoryEntry} from '../../packages/contracts/types';
import type {AdminRoundRecord,AdminRoundRecords} from '../../packages/contracts/admin';
import {AdminError} from './admin-auth';
type Member=AdminRoundRecord['members'][number]&{playerId:string};
type Stored=Omit<AdminRoundRecord,'id'|'legacy'|'members'|'winnerNickname'|'winningText'|'sentences'>&{members:Member[];history:PublicHistoryEntry[];winnerId:string|null};
function text(h:PublicHistoryEntry){return h.snapshot.sentence.orderedTileIds.map(id=>(h.snapshot.tiles.find(t=>t.tileId===id)?.char??'')+(h.snapshot.sentence.commaAfterTileIds.includes(id as never)?'，':'')).join('');}
/** Bounded, admin-only projection. Never reads a player's private hand or session. */
export class RoundRecords{
 constructor(private db:DatabaseSync){
  db.exec(`CREATE TABLE IF NOT EXISTS admin_round_records(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,round_id TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(room_id,round_id));`);
  db.exec('BEGIN IMMEDIATE');try{
   const rows=db.prepare("SELECT json_extract(data,'$.public') AS current,json_extract(data,'$.archive') AS archives FROM room_snapshots").all() as {current:string;archives:string}[];
   for(const row of rows)for(const view of [JSON.parse(row.current),...JSON.parse(row.archives??'[]')])this.capture(view,'LEGACY_IMPORT',null,false);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 capture(view:PublicRoomSnapshot,kind:string,now:number|null,current=true){
  if(!view.roundId)return;
  const row=this.db.prepare('SELECT data FROM admin_round_records WHERE room_id=? AND round_id=?').get(view.roomId,view.roundId) as {data:string}|undefined;
  const before:Stored|undefined=row?JSON.parse(row.data):undefined;
  const old=this.db.prepare('SELECT data FROM round_results WHERE room_id=? AND round_id=?').get(view.roomId,view.roundId) as {data:string}|undefined;
  const result=old?JSON.parse(old.data):null;
  const terminal=view.phase.kind==='ROUND_FINISHED'||view.history.some(h=>h.outcome==='APPROVED')||!!old;
  const members=[...(before?.members??[])];if(!before||before.reason===null)for(const p of view.players)if(!members.some(m=>m.playerId===p.playerId))members.push({playerId:p.playerId,seat:p.seat,nickname:p.nickname,isBotSeat:!!p.isBotSeat});
  const reason=view.phase.kind==='ROUND_FINISHED'?view.phase.reason:before?.reason??result?.phase?.reason??(view.history.some(h=>h.outcome==='APPROVED')?'WIN':null);
  const winnerId=view.phase.kind==='ROUND_FINISHED'?view.phase.winnerId:before?.winnerId??result?.phase?.winnerId??null;
  const next:Stored={roomId:view.roomId,roundId:view.roundId,startedAt:before?before.startedAt:(kind==='START_ROUND'&&current&&!old?now:null),finishedAt:before?.finishedAt??(terminal&&current&&!old&&(!before||before.reason===null)?now:null),reason,winnerId,members,practiceMode:view.practiceMode??false,deckSetName:view.deckSetName??null,history:structuredClone(view.history.length?view.history:result?.history??[])};
  const data=JSON.stringify(next);if(data===row?.data)return;
  this.db.prepare('INSERT INTO admin_round_records(room_id,round_id,data) VALUES(?,?,?) ON CONFLICT(room_id,round_id) DO UPDATE SET data=excluded.data').run(view.roomId,view.roundId,data);
 }
 list(limitValue:unknown,beforeValue:unknown):AdminRoundRecords{
  const integer=(value:unknown,fallback:number)=>{if(value===undefined)return fallback;if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1)throw new AdminError('INVALID_RECORD_QUERY',400);return Number(value);};
  const limit=integer(limitValue,20),before=integer(beforeValue,Number.MAX_SAFE_INTEGER);if(limit>50)throw new AdminError('INVALID_RECORD_QUERY',400);
  const rows=this.db.prepare('SELECT id,data FROM admin_round_records WHERE id<? ORDER BY id DESC LIMIT ?').all(before,limit+1) as {id:number;data:string}[];
  const records=rows.slice(0,limit).map(({id,data}):AdminRoundRecord=>{const r:Stored=JSON.parse(data),approved=r.history.filter(h=>h.outcome==='APPROVED').at(-1);return {id,roomId:r.roomId,roundId:r.roundId,startedAt:r.startedAt,finishedAt:r.finishedAt,legacy:r.startedAt===null,members:r.members.map(({seat,nickname,isBotSeat})=>({seat,nickname,isBotSeat})),reason:r.reason,practiceMode:r.practiceMode,deckSetName:r.deckSetName,winnerNickname:r.members.find(p=>p.playerId===r.winnerId)?.nickname??null,winningText:approved?text(approved):null,sentences:r.history.map(h=>({nickname:r.members.find(p=>p.playerId===h.applicantId)?.nickname??null,text:text(h),outcome:h.outcome,revealedAt:h.revealedAt??null}))};});
  return {records,nextCursor:rows.length>limit?records.at(-1)!.id:null};
 }
}
