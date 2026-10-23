import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import type {DeckSetSnapshot,DeckSetCatalog,DeckSnapshot} from '../../packages/contracts/deck';
import {classicDeckSetId,validateDeckEntries} from '../../packages/engine/deck';
import {AdminError} from './admin-auth';

export function deckSetId(value:unknown):string{
 if(typeof value!=='string'||(value!==classicDeckSetId&&!/^set-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)))throw new AdminError('INVALID_DECK_SET_ID',400);return value;
}
function setName(value:unknown){if(typeof value!=='string')throw new AdminError('INVALID_DECK_SET_NAME',400);const name=value.trim().normalize('NFC');if([...name].length<1||[...name].length>30||/[\u0000-\u001f\u007f]/.test(name))throw new AdminError('INVALID_DECK_SET_NAME',400);return name;}
function catalogRevision(value:unknown){if(!Number.isSafeInteger(value)||Number(value)<0)throw new AdminError('INVALID_CATALOG_REVISION',400);return value;}
function checkedEntries(value:unknown){try{return validateDeckEntries(value);}catch{throw new AdminError('INVALID_DECK',400);}}
/** Each set owns its complete revision history; the old tables remain the classic-set compatibility mirror. */
export class DeckSets{
 constructor(private db:DatabaseSync,private fail:()=>void){
  db.exec(`
   CREATE TABLE IF NOT EXISTS deck_sets(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,revision INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS deck_set_revisions(set_id TEXT NOT NULL REFERENCES deck_sets(id),revision INTEGER NOT NULL,data TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(set_id,revision));
   CREATE TABLE IF NOT EXISTS deck_catalog(singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL,default_set_id TEXT NOT NULL REFERENCES deck_sets(id));
   CREATE TABLE IF NOT EXISTS deck_set_receipts(action_id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,response TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS room_deck_sets(room_id TEXT PRIMARY KEY REFERENCES room_snapshots(room_id),set_id TEXT NOT NULL REFERENCES deck_sets(id));
  `);
  this.transaction(()=>{
   if(!db.prepare('SELECT 1 FROM deck_catalog').get()){
    const current=db.prepare('SELECT revision FROM deck_current WHERE singleton=1').get() as {revision:number};
    db.prepare('INSERT INTO deck_sets VALUES(?,?,?)').run(classicDeckSetId,'经典字库',current.revision);
    const old=db.prepare('SELECT revision,data,at FROM deck_revisions ORDER BY revision').all() as {revision:number;data:string;at:number}[];
    for(const row of old)db.prepare('INSERT INTO deck_set_revisions VALUES(?,?,?,?)').run(classicDeckSetId,row.revision,JSON.stringify({...JSON.parse(row.data),id:classicDeckSetId,name:'经典字库'}),row.at);
    db.prepare('INSERT INTO deck_catalog VALUES(1,0,?)').run(classicDeckSetId);
   }
   // Existing rooms bind the pre-catalog classic set, never whatever default is selected later.
   db.prepare('INSERT OR IGNORE INTO room_deck_sets SELECT room_id,? FROM room_snapshots').run(classicDeckSetId);
   db.exec(`UPDATE room_snapshots SET data=json_set(data,'$.public.deckSetId',(SELECT set_id FROM room_deck_sets WHERE room_id=room_snapshots.room_id),'$.public.deckSetName',(SELECT name FROM deck_sets WHERE id=(SELECT set_id FROM room_deck_sets WHERE room_id=room_snapshots.room_id))) WHERE json_extract(data,'$.public.deckSetId') IS NULL;`);
  });
 }
 private transaction<T>(work:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const value=work();this.db.exec('COMMIT');return value;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 private audit(kind:string,actor:string,now:number,value:unknown){this.db.prepare('INSERT INTO admin_audit(kind,actor,at,data) VALUES(?,?,?,?)').run(kind,actor,now,JSON.stringify(value));}
 private assertCatalog(expected:unknown){catalogRevision(expected);if(this.catalog().revision!==expected)throw new AdminError('STALE_CATALOG_REVISION',409);}
 private uniqueName(name:string,except?:string){const row=this.db.prepare('SELECT id FROM deck_sets WHERE name=?').get(name) as {id:string}|undefined;if(row&&row.id!==except)throw new AdminError('DECK_SET_NAME_EXISTS',409);}
 private advanceCatalog(){this.db.prepare('UPDATE deck_catalog SET revision=revision+1 WHERE singleton=1').run();}
 catalog():DeckSetCatalog{
  const header=this.db.prepare('SELECT revision,default_set_id AS defaultSetId FROM deck_catalog WHERE singleton=1').get() as {revision:number;defaultSetId:string};
  const sets=(this.db.prepare('SELECT id FROM deck_sets ORDER BY rowid').all() as {id:string}[]).map(({id})=>{const s=this.get(id);return{id:s.id,name:s.name,revision:s.revision,version:s.version,totals:s.totals,charCount:s.entries.length};});return{...header,sets};
 }
 get(value:unknown):DeckSetSnapshot{const id=deckSetId(value),row=this.db.prepare('SELECT r.data FROM deck_set_revisions r JOIN deck_sets s ON s.id=r.set_id AND s.revision=r.revision WHERE s.id=?').get(id) as {data:string}|undefined;if(!row)throw new AdminError('DECK_SET_NOT_FOUND',404);return JSON.parse(row.data);}
 roomBinding(roomId:string){return(this.db.prepare('SELECT set_id AS id FROM room_deck_sets WHERE room_id=?').get(roomId) as {id:string}|undefined)?.id;}
 bind(roomId:string,id:string){const prior=this.roomBinding(roomId);if(prior&&prior!==id)throw new Error('IMMUTABLE_DECK_SET_BINDING');this.get(id);this.db.prepare('INSERT OR IGNORE INTO room_deck_sets VALUES(?,?)').run(roomId,id);}
 defaultDeck(){return this.get(this.catalog().defaultSetId);}
 create(request:{actionId:unknown;name:unknown;sourceSetId:unknown;expectedCatalogRevision:unknown},hash:string,now:number,actor:string):DeckSetSnapshot{
  if(typeof request.actionId!=='string'||request.actionId.length<1||request.actionId.length>160||!/^[-A-Za-z0-9_:]+$/.test(request.actionId))throw new AdminError('ACTION_ID_REUSED',400);
  return this.transaction(()=>{
   const receipt=this.db.prepare('SELECT payload_hash AS hash,response FROM deck_set_receipts WHERE action_id=?').get(request.actionId as string) as {hash:string;response:string}|undefined;
   if(receipt){if(receipt.hash!==hash)throw new AdminError('ACTION_ID_REUSED',409);return JSON.parse(receipt.response);}
   this.assertCatalog(request.expectedCatalogRevision);const name=setName(request.name),source=this.get(request.sourceSetId);this.uniqueName(name);
   if((this.db.prepare('SELECT count(*) AS n FROM deck_sets').get() as {n:number}).n>=50)throw new AdminError('DECK_SET_LIMIT',409);
   const id=`set-${randomUUID()}`,next:DeckSetSnapshot={id,name,revision:0,version:`${id}-r0`,entries:source.entries,totals:source.totals};
   this.db.prepare('INSERT INTO deck_sets VALUES(?,?,0)').run(id,name);this.db.prepare('INSERT INTO deck_set_revisions VALUES(?,0,?,?)').run(id,JSON.stringify(next),now);this.advanceCatalog();this.fail();
   this.audit('DECK_SET_CREATE',actor,now,{id,name,sourceSetId:source.id,sourceRevision:source.revision});this.db.prepare('INSERT INTO deck_set_receipts VALUES(?,?,?)').run(request.actionId as string,hash,JSON.stringify(next));return next;
  });
 }
 save(idValue:unknown,expectedRevision:unknown,nameValue:unknown,entries:unknown,now:number,actor:string):DeckSetSnapshot{
  const id=deckSetId(idValue),name=setName(nameValue),checked=checkedEntries(entries);if(!Number.isSafeInteger(expectedRevision)||Number(expectedRevision)<0)throw new AdminError('INVALID_DECK',400);
  return this.transaction(()=>{
   const previous=this.get(id);if(previous.revision!==expectedRevision)throw new AdminError('STALE_DECK_REVISION',409);this.uniqueName(name,id);
   const revision=previous.revision+1,next:DeckSetSnapshot={id,name,revision,version:id===classicDeckSetId?`managed-r${revision}`:`${id}-r${revision}`,...checked};
   this.db.prepare('INSERT INTO deck_set_revisions VALUES(?,?,?,?)').run(id,revision,JSON.stringify(next),now);this.db.prepare('UPDATE deck_sets SET name=?,revision=? WHERE id=?').run(name,revision,id);this.advanceCatalog();
   if(id===classicDeckSetId){const {id:_id,name:_name,...legacy}=next;this.db.prepare('INSERT INTO deck_revisions VALUES(?,?,?)').run(revision,JSON.stringify(legacy),now);this.db.prepare('UPDATE deck_current SET revision=? WHERE singleton=1').run(revision);}
   this.fail();this.audit('DECK_UPDATE',actor,now,{setId:id,revision,previousRevision:previous.revision,name,entryCount:next.entries.length,totals:next.totals});return next;
  });
 }
 setDefault(expected:unknown,idValue:unknown,now:number,actor:string):DeckSetCatalog{
  const id=deckSetId(idValue);return this.transaction(()=>{this.assertCatalog(expected);this.get(id);const previous=this.catalog().defaultSetId;if(previous!==id){this.db.prepare('UPDATE deck_catalog SET default_set_id=?,revision=revision+1 WHERE singleton=1').run(id);this.fail();this.audit('DECK_SET_DEFAULT',actor,now,{setId:id,previousSetId:previous});}return this.catalog();});
 }
 /** Legacy transport deliberately retains its original four-field response. */
 legacyDeck():DeckSnapshot{const {id:_id,name:_name,...deck}=this.defaultDeck();return deck;}
 legacySave(expectedRevision:unknown,entries:unknown,now:number,actor:string):DeckSnapshot{const current=this.defaultDeck(),{id:_id,name:_name,...deck}=this.save(current.id,expectedRevision,current.name,entries,now,actor);return deck;}
}
