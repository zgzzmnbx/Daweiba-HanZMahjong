import {RoomChatStore} from './room-chat';
import {RoundRecords} from './round-records';
import {HuBook} from './hu-book';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,chmodSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { decodeGame,encodeGame,rules,type Game } from '../../packages/engine/index';
import { initialDeck,classicDeckSetId } from '../../packages/engine/deck';
import type { DeckSnapshot } from '../../packages/contracts/deck';
import { DeckSets } from './deck-sets';
import type { TableNumber } from '../../packages/contracts/lobby';
export type Session={tokenHash:string;sessionId:string;roomId:string;playerId:string;expiresAt:number;revoked:number};
export class LobbyError extends Error {
 constructor(public code:'INVALID_TABLE_NUMBER'|'TABLE_OCCUPIED',public status:number){super(code);}
}
export function tableNumber(value:unknown):TableNumber {
 if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>6)throw new LobbyError('INVALID_TABLE_NUMBER',400);
 return value as TableNumber;
}
export class Store {
 readonly chat:RoomChatStore;
 readonly roundRecords:RoundRecords;
 readonly huBook:HuBook;
 db:DatabaseSync; deckSets:DeckSets; failNextCommit=false;
 constructor(public path:string){
  if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(path);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  this.db.exec(`
   CREATE TABLE IF NOT EXISTS schema_info(version INTEGER NOT NULL);
   INSERT INTO schema_info SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM schema_info);
   CREATE TABLE IF NOT EXISTS room_snapshots(room_id TEXT PRIMARY KEY,state_version INTEGER NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS room_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,kind TEXT NOT NULL,action_id TEXT,at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,session_id TEXT UNIQUE NOT NULL,room_id TEXT NOT NULL,player_id TEXT NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
   CREATE INDEX IF NOT EXISTS session_player ON sessions(room_id,player_id);
   CREATE TABLE IF NOT EXISTS round_results(room_id TEXT NOT NULL,round_id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(room_id,round_id));
   CREATE TABLE IF NOT EXISTS lobby_tables(
    table_number INTEGER PRIMARY KEY CHECK(table_number BETWEEN 1 AND 6),
    room_id TEXT UNIQUE REFERENCES room_snapshots(room_id),
    idle_release_at INTEGER,
    CHECK(room_id IS NOT NULL OR idle_release_at IS NULL)
   );
   INSERT OR IGNORE INTO lobby_tables(table_number) VALUES(1),(2),(3),(4),(5),(6);
   CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,config_hash TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS deck_revisions(revision INTEGER PRIMARY KEY,data TEXT NOT NULL,at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS deck_current(singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL REFERENCES deck_revisions(revision));
   CREATE TABLE IF NOT EXISTS admin_audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,actor TEXT NOT NULL,at INTEGER NOT NULL,data TEXT NOT NULL);

  `);
  this.db.prepare('INSERT OR IGNORE INTO deck_revisions VALUES(0,?,0)').run(JSON.stringify(initialDeck));this.db.prepare('INSERT OR IGNORE INTO deck_current VALUES(1,0)').run();
  try{this.deckSets=new DeckSets(this.db,()=>{if(this.failNextCommit){this.failNextCommit=false;throw new Error('INJECTED_TRANSACTION_FAILURE');}});}catch(error){this.db.close();throw error;}
  try{this.roundRecords=new RoundRecords(this.db);}catch(error){this.db.close();throw error;}
  try{this.huBook=new HuBook(this.db);}catch(error){this.db.close();throw error;}
  this.chat=new RoomChatStore(this.db);
  if(path!==':memory:')chmodSync(path,0o600);
 }
 load(){return(this.db.prepare('SELECT data FROM room_snapshots').all() as {data:string}[]).map(r=>decodeGame(JSON.parse(r.data)));}
 session(hash:string){return this.db.prepare('SELECT token_hash AS tokenHash, session_id AS sessionId, room_id AS roomId,player_id AS playerId,expires_at AS expiresAt,revoked FROM sessions WHERE token_hash=?').get(hash) as Session|undefined;}
 lobbyBindings(){return this.db.prepare('SELECT table_number AS tableNumber,room_id AS roomId FROM lobby_tables ORDER BY table_number').all() as {tableNumber:TableNumber;roomId:string|null}[];}
 lobbyReleaseAt(roomId:string){const row=this.db.prepare('SELECT idle_release_at AS at FROM lobby_tables WHERE room_id=?').get(roomId) as {at:number|null}|undefined;return row?.at??null;}
 lobbyReleaseDue(roomId:string,now:number){const at=this.lobbyReleaseAt(roomId);return at!==null&&now>=at;}
 /** Only CREATE binds a table. A detached original room can still restore privately but never rebinds. */
 private updateLobby(g:Game,now:number,selectedTable?:TableNumber){
  if(selectedTable!==undefined){
   const result=this.db.prepare('UPDATE lobby_tables SET room_id=?,idle_release_at=NULL WHERE table_number=? AND room_id IS NULL').run(g.public.roomId,selectedTable);
   if(result.changes!==1)throw new LobbyError('TABLE_OCCUPIED',409);
  }
  const at=this.lobbyReleaseAt(g.public.roomId);
  // The persisted lease wins even if a restore arrives after its deadline before the timer callback.
  if(g.public.phase.kind==='ROOM_CLOSED'||(at!==null&&now>=at)){
   this.db.prepare('UPDATE lobby_tables SET room_id=NULL,idle_release_at=NULL WHERE room_id=?').run(g.public.roomId);return;
  }
  const idle=['LOBBY','ROUND_FINISHED'].includes(g.public.phase.kind);
  const onlineHuman=g.public.players.some(p=>!p.isBotSeat&&p.connected&&p.presence==='HUMAN');
  if(idle&&!onlineHuman)this.db.prepare('UPDATE lobby_tables SET idle_release_at=COALESCE(idle_release_at,?) WHERE room_id=?').run(now+rules.disconnectGraceMs,g.public.roomId);
  else this.db.prepare('UPDATE lobby_tables SET idle_release_at=NULL WHERE room_id=?').run(g.public.roomId);
 }
 commit(g:Game,kind:string,now:number,session?:Session,revokePlayer?:string,actionId?:string,selectedTable?:TableNumber,adminActor?:string){
  if(selectedTable!==undefined)tableNumber(selectedTable);
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const setId=g.public.deckSetId??this.deckSets.roomBinding(g.public.roomId)??classicDeckSetId;const set=this.deckSets.get(setId);g.public.deckSetId=setId;g.public.deckSetName??=set.name;
   this.db.prepare('INSERT INTO room_snapshots VALUES(?,?,?,?) ON CONFLICT(room_id) DO UPDATE SET state_version=excluded.state_version,data=excluded.data,updated_at=excluded.updated_at').run(g.public.roomId,g.public.stateVersion,JSON.stringify(encodeGame(g)),now);
   this.deckSets.bind(g.public.roomId,setId);
   this.updateLobby(g,now,selectedTable);
   if(this.failNextCommit){this.failNextCommit=false;throw new Error('INJECTED_TRANSACTION_FAILURE');}
   this.db.prepare('INSERT INTO room_events(room_id,kind,action_id,at) VALUES(?,?,?,?)').run(g.public.roomId,kind,actionId??null,now);
   if(adminActor)this.audit(kind,adminActor,now,{roomId:g.public.roomId,stateVersion:g.public.stateVersion});
   if(revokePlayer)this.db.prepare('UPDATE sessions SET revoked=1 WHERE room_id=? AND player_id=?').run(g.public.roomId,revokePlayer);
   if(session)this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,revoked=excluded.revoked').run(session.tokenHash,session.sessionId,session.roomId,session.playerId,session.expiresAt,session.revoked);
   for(const result of [...g.archive,g.public]){
    this.roundRecords.capture(result,kind,now,result.roundId===g.public.roundId);
    this.huBook.capture(result.roomId,result.roundId);
    if(!result.roundId)continue;
    const terminal=result.history.some(h=>h.outcome==='APPROVED')||result.phase.kind==='ROUND_FINISHED';
    if(terminal)this.db.prepare('INSERT OR IGNORE INTO round_results VALUES(?,?,?)').run(g.public.roomId,result.roundId,JSON.stringify({phase:result.phase,history:result.history,rulesVersion:result.rulesVersion,deckVersion:result.deckVersion,deckSetId:result.deckSetId,deckSetName:result.deckSetName,practiceMode:result.practiceMode??false}));
   }
   const chatMessages=this.chat.captureReviews(g,now);
   this.db.exec('COMMIT');return chatMessages;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 adminSession(hash:string){return this.db.prepare('SELECT expires_at AS expiresAt,config_hash AS configHash FROM admin_sessions WHERE token_hash=?').get(hash) as {expiresAt:number;configHash:string}|undefined;}
 createAdminSession(hash:string,expiresAt:number,configHash:string,now:number){this.db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').run(now);this.db.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(hash,expiresAt,configHash);}
 removeAdminSession(hash:string){this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(hash);}
 deck():DeckSnapshot{return this.deckSets.legacyDeck();}
 roomDeck(g:Game){return this.deckSets.get(this.deckSets.roomBinding(g.public.roomId)??g.public.deckSetId??classicDeckSetId);}
 private audit(kind:string,actor:string,now:number,data:unknown){this.db.prepare('INSERT INTO admin_audit(kind,actor,at,data) VALUES(?,?,?,?)').run(kind,actor,now,JSON.stringify(data));}
 saveDeck(expectedRevision:unknown,entries:unknown,now:number,actor:string):DeckSnapshot{return this.deckSets.legacySave(expectedRevision,entries,now,actor);}
 healthy(){return this.db.prepare('PRAGMA quick_check').get();}
 close(){this.db.close();}
}
