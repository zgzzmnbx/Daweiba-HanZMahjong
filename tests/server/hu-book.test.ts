import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../../apps/server/store';
import {bookDay} from '../../apps/server/hu-book';
import {createGameServer,BOOK_COOKIE} from '../../apps/server/server';
import {hashAdminPassword} from '../../apps/server/admin-auth';
import {room,pid,ok,forceActor} from '../engine/helpers';

function approved(store:Store,at=1234,choice='APPROVE'){
 const g=room(2,false);store.commit(g,'CREATE',0);for(let i=0;i<2;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});store.commit(g,'START_ROUND',0);forceActor(g,0);
 const ids=g.players.get(pid(0))!.hand,comma=ids[6];ok(g,0,{kind:'DECLARE_SELF_HU',sentence:{orderedTileIds:ids,commaAfterTileIds:[comma]}},at-100);store.commit(g,'DECLARE_SELF_HU',at-100);
 const proposalId=(g.public.phase as any).proposal.proposalId;ok(g,1,{kind:'VOTE',proposalId,ballot:choice==='APPROVE'?{choice}:{choice,objectionRanges:[]}},at);
 return{g,text:ids.map(id=>g.tiles.get(id)!.char+(id===comma?'，':'')).join('')};
}
test('gallery captures only approved sentences, preserves order/commas, timestamps/authors and never exports room or private identifiers',()=>{
 const s=new Store(':memory:');try{const {g,text}=approved(s);assert.equal(s.huBook.list('',0).total,0);s.commit(g,'VOTE',1234);s.commit(g,'RETRY',9999);const entry=s.huBook.list('',0).entries[0];assert.equal(s.huBook.list('',0).total,1);assert.equal(entry.nickname,'人0');assert.equal(entry.finishedAt,1234);assert.equal(entry.tiles.map(t=>t.char+(t.comma?'，':'')).join(''),text);assert.equal(entry.likes,0);for(const key of ['roomId','roundId','proposalId','playerId','tileId','sessionId','recoveryHash'])assert(!JSON.stringify(entry).includes(`"${key}"`));const rejected=approved(s,2000,'REJECT');s.commit(rejected.g,'VOTE',2000);assert.equal(s.huBook.list('',0).total,1);}finally{s.close();}
});
test('gallery capture rolls back with the winning command and late storage errors roll back both gallery and game',()=>{
 const s=new Store(':memory:');try{const {g}=approved(s);s.failNextCommit=true;assert.throws(()=>s.commit(g,'VOTE',1234),/INJECTED/);assert.equal(s.huBook.list('',0).total,0);s.db.exec("CREATE TRIGGER fail_result BEFORE INSERT ON round_results BEGIN SELECT RAISE(ABORT,'AFTER_GALLERY'); END;");assert.throws(()=>s.commit(g,'VOTE',1234),/AFTER_GALLERY/);assert.equal(s.huBook.list('',0).total,0);assert.equal(s.load()[0].public.history.length,0);s.db.exec('DROP TRIGGER fail_result');s.commit(g,'VOTE',1234);assert.equal(s.huBook.list('',0).total,1);}finally{s.close();}
});
test('one total like per Shanghai calendar day; retries are idempotent, deletion never refunds, midnight allows one more',()=>{
 const s=new Store(':memory:');try{for(let i=0;i<2;i++){const {g}=approved(s);s.commit(g,'VOTE',1234);}const [a,b]=s.huBook.list('',0).entries,now=Date.parse('2026-10-24T15:59:59.999Z');s.huBook.addReader('reader',now);assert.equal(bookDay(now),'2026-10-24');assert.equal(s.huBook.like('reader',String(a.id),now).likes,1);assert.equal(s.huBook.like('reader',String(a.id),now).likes,1);assert.throws(()=>s.huBook.like('reader',String(b.id),now),/BOOK_DAILY_LIMIT/);s.huBook.remove(String(a.id),'admin',now);assert.throws(()=>s.huBook.like('reader',String(a.id),now),/BOOK_ENTRY_REMOVED/);assert.throws(()=>s.huBook.like('reader',String(b.id),now),/BOOK_DAILY_LIMIT/);assert.equal(s.huBook.like('reader',String(b.id),now+1).likes,1);assert.equal(s.huBook.daily('reader',now+1).day,'2026-10-25');assert.equal(s.huBook.daily('reader',now+1).resetsAt,Date.parse('2026-10-25T16:00:00Z'));assert.throws(()=>s.huBook.like('forged',String(b.id),now),/BOOK_IDENTITY_REQUIRED/);}finally{s.close();}
});
test('startup backfills historical approved records and deletion tombstones survive repeated capture/restart without changing results',()=>{
 const dir=mkdtempSync(join(tmpdir(),'book-backfill-')),file=join(dir,'game.sqlite');let s=new Store(file);try{const {g}=approved(s);s.commit(g,'VOTE',1234);s.db.exec('DROP TABLE hu_book_likes;DROP TABLE hu_book_readers;DROP TABLE hu_book');s.close();s=new Store(file);const id=s.huBook.list('',0).entries[0].id;s.huBook.addReader('reader',0);s.huBook.like('reader',String(id),0);s.huBook.remove(String(id),'admin',100);s.huBook.remove(String(id),'admin',101);assert.equal((s.db.prepare("SELECT count(*) AS n FROM admin_audit WHERE kind='HU_BOOK_DELETE'").get() as any).n,1);const result=JSON.stringify(s.roundRecords.list(undefined,undefined));s.close();s=new Store(file);s.commit(s.load()[0],'RESTART',200);assert.equal(s.huBook.list('',200).total,0);assert.equal(s.huBook.daily('reader',200).likedId,id);assert.equal(JSON.stringify(s.roundRecords.list(undefined,undefined)),result);}finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('bounded cursor pagination is stable; invalid query values rejected and legacy time is not invented',()=>{
 const s=new Store(':memory:');try{for(let i=0;i<15;i++){const {g}=approved(s);s.commit(g,'VOTE',1234);}const page=s.huBook.list('',0),next=s.huBook.list('',0,String(page.nextCursor));assert.equal(page.entries.length,12);assert.equal(next.entries.length,3);assert.equal(next.nextCursor,null);assert.equal(new Set([...page.entries,...next.entries].map(e=>e.id)).size,15);for(const v of ['0','-1','NaN','1.2',['3'],'9007199254740993'])assert.throws(()=>s.huBook.list('',0,v));s.db.exec("UPDATE admin_round_records SET data=json_set(data,'$.finishedAt',NULL);DELETE FROM hu_book;");s.huBook.capture(s.load()[0].public.roomId,s.load()[0].public.roundId);assert.equal(s.huBook.list('',0).entries[0].finishedAt,null);}finally{s.close();}
});
test('public HTTP viewing, durable HttpOnly identity, concurrent daily cap, origin and admin authorization',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'book-http-')),origin='http://book.test';let now=Date.parse('2026-10-24T10:00:00Z');const server=createGameServer({dbPath:join(dir,'db.sqlite'),publicOrigin:origin,automaticTimers:false,now:()=>now,adminPasswordHash:await hashAdminPassword('book-test-password')});await server.listen(0);const base=`http://127.0.0.1:${(server.http.address() as any).port}`;
 const req=async(path:string,cookie='',body?:unknown,from=origin)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:from,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{for(let i=0;i<2;i++){const {g}=approved(server.store);server.store.commit(g,'VOTE',1234);}const first=await req('/api/hu-book');assert.equal(first.status,200);assert.match(first.cookie!,/HttpOnly/);assert.match(first.cookie!,/SameSite=Lax/i);const cookie=first.cookie!.split(';')[0],[a,b]=first.data.entries;const again=await req('/api/hu-book',cookie);assert.equal(again.cookie,null);assert.equal(again.data.total,2);
 assert.equal((await req(`/api/hu-book/${a.id}/like`,'',{})).status,401);assert.equal((await req(`/api/hu-book/${a.id}/like`,`${BOOK_COOKIE}=${'a'.repeat(43)}`,{})).status,401);assert.equal((await req(`/api/hu-book/${a.id}/like`,cookie,{},'http://evil.test')).status,403);
 const replies=await Promise.all([a,b].map(e=>req(`/api/hu-book/${e.id}/like`,cookie,{})));assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);assert.equal((await req('/api/hu-book',cookie)).data.entries.reduce((n:number,e:any)=>n+e.likes,0),1);
 assert.equal((await req(`/api/admin/hu-book/${a.id}/delete`,cookie,{})).status,401);const admin=await req('/api/admin/login','',{password:'book-test-password'}),adminCookie=admin.cookie!.split(';')[0];assert.equal((await req(`/api/admin/hu-book/${a.id}/delete`,adminCookie,{})).status,200);assert.equal((await req('/api/hu-book',cookie)).data.total,1);
 now+=86400000;assert.equal((await req('/api/hu-book',cookie)).data.likedId,null);assert.equal((await req(`/api/hu-book/${b.id}/like`,cookie,{})).status,200);await req('/api/admin/logout',adminCookie,{});assert.equal((await req(`/api/admin/hu-book/${b.id}/delete`,adminCookie,{})).status,401);
 }finally{await server.close();rmSync(dir,{recursive:true,force:true});}
});
