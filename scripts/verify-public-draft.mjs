/** Real HTTP/WSS draft persistence; private test room only, no occupied public table. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile,readFile} from 'node:fs/promises';
import {io} from 'socket.io-client';
const base=process.env.PUBLIC_ORIGIN??'https://118.196.107.182:1240';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const checks=[],sockets=[];let cookie,room,snapshot;
async function request(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));cookie=r.headers.get('set-cookie')?.split(';')[0]??cookie;return data;}
async function connect(){const socket=io(base,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:base,Cookie:cookie}});sockets.push(socket);socket.on('message',e=>{if(e.type==='RESYNC')snapshot=e.payload;});await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});return socket;}
async function command(socket,fields){snapshot=await request(`/api/rooms/${room}/snapshot`);const e=snapshot;const ack=await socket.timeout(10000).emitWithAck('message',{type:'COMMAND',command:{...fields,actionId:randomUUID(),roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,controlEpoch:e.private.controlEpoch,expectedStateVersion:e.public.stateVersion}});assert.equal(ack.ok,true,JSON.stringify(ack));snapshot=await request(`/api/rooms/${room}/snapshot`);}
try{
 const created=await request('/api/rooms',{actionId:randomUUID(),capacity:2,nickname:'交互版本验收'});room=created.snapshot.public.roomId;let socket=await connect();
 await command(socket,{kind:'ASSIGN_BOT',seat:1});await command(socket,{kind:'READY',ready:true});await command(socket,{kind:'START_ROUND'});assert.equal(snapshot.public.practiceMode,true);
 const order=[...snapshot.private.draft.orderedTileIds].reverse();assert.ok(order.length===13||order.length===14);const draft={orderedTileIds:order,commaAfterTileIds:[order[0],order[6],order[9]]};
 await command(socket,{kind:'SAVE_DRAFT',draft,expectedDraftVersion:snapshot.private.draftVersion});assert.deepEqual(snapshot.private.draft,draft);checks.push(`${order.length} physical tiles reordered with three distinct comma anchors and persisted over real WSS`);
 const oldPlayer=snapshot.private.playerId,oldEpoch=snapshot.private.controlEpoch;socket.disconnect();
 const restored=await request(`/api/rooms/${room}/restore`,{actionId:randomUUID(),roomId:room,proof:{kind:'SESSION'}});snapshot=restored.snapshot;assert.equal(snapshot.private.playerId,oldPlayer);assert.ok(snapshot.private.controlEpoch>oldEpoch);assert.deepEqual(snapshot.private.draft,draft);socket=await connect();checks.push('same-session identity restore preserves exact tile order and comma anchors, advances control epoch');
 await command(socket,{kind:'END_UNSCORED'});await command(socket,{kind:'CLOSE_ROOM'});assert.equal(snapshot.public.phase.kind,'ROOM_CLOSED');checks.push('private AI practice test ended without scoring and closed normally');
 const report={at:new Date().toISOString(),origin:base,applicationVersion:version,status:'PASS',scope:'Real HTTP/WSS and SQLite draft persistence, not browser animation evidence',checks};await writeFile(process.env.REPORT_PATH??`docs/evidence/public-draft-${version}-results.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 if(room&&snapshot?.public.phase.kind!=='ROOM_CLOSED'){
  try{const cleanupSocket=await connect();snapshot=await request(`/api/rooms/${room}/snapshot`);if(snapshot.legalActions.includes('END_UNSCORED'))await command(cleanupSocket,{kind:'END_UNSCORED'});if(snapshot.legalActions.includes('CLOSE_ROOM'))await command(cleanupSocket,{kind:'CLOSE_ROOM'});}catch{console.error('Private verification room cleanup could not complete; inspect the test room before repeating.');}
 }
 for(const socket of sockets)socket.disconnect();
}

