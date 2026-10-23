import assert from 'node:assert/strict';
import type * as C from '../../packages/contracts/types';
import {createGame,joinGame,applyCommand,type Game} from '../../packages/engine/index';
export const pid=(i:number)=>`p${i}` as C.PlayerId;
let serial=0;
export function room(n=4,start=true){const g=createGame(`test${++serial}`,n,pid(0),'人0','s0','a'.repeat(64),0,123456,'1.0.0');for(let i=1;i<n;i++)joinGame(g,pid(i),`人${i}`,i,`s${i}`,'b'.repeat(64),0);if(start){for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});}return g;}
export function command(g:Game,i:number,payload:any):C.ClientCommand{return{roomId:g.public.roomId,roundId:g.public.roundId,phaseId:g.public.phase.phaseId,expectedStateVersion:g.public.stateVersion,controlEpoch:g.players.get(pid(i))!.epoch,actionId:`a${++serial}`,...payload} as C.ClientCommand;}
export function send(g:Game,i:number,payload:any,now=0){const c=payload.actionId?payload:command(g,i,payload);return applyCommand(g,pid(i),g.players.get(pid(i))!.sessionId!,c,JSON.stringify(c),now);}
export function ok(g:Game,i:number,payload:any,now=0){const result=send(g,i,payload,now);assert.equal(result.ok,true,JSON.stringify(result));return result;}
export function error(g:Game,i:number,payload:any,code:string,now=0){const result=send(g,i,payload,now);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.code,code);return result;}
export function actor(g:Game){assert.equal(g.public.phase.kind,'TURN_ACTION');return Number((g.public.phase as any).actorId.slice(1));}
export function discard(g:Game,now=0){const i=actor(g),tile=g.players.get(pid(i))!.hand.find(t=>t!==g.players.get(pid(i))!.protected)!;ok(g,i,{kind:'DISCARD',tileId:tile},now);return i;}
export function respond(g:Game,intents:Record<number,string>={},now=0){assert.equal(g.public.phase.kind,'DISCARD_RESPONSE');const r=g.response!;for(const player of r.eligible){const i=Number(player.slice(1));ok(g,i,{kind:'RESPOND',responseWindowId:r.windowId,response:intents[i]??'PASS'},now);}}
export function sentence(g:Game,i:number){return{orderedTileIds:[...g.players.get(pid(i))!.hand],commaAfterTileIds:[]};}
export function selfVote(g:Game){const i=actor(g);ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});return i;}
export function vote(g:Game,i:number,choice='APPROVE',ranges:any[]=[]){assert.equal(g.public.phase.kind,'HU_VOTE');ok(g,i,{kind:'VOTE',proposalId:(g.public.phase as any).proposal.proposalId,ballot:choice==='APPROVE'?{choice}:{choice,objectionRanges:ranges}});}
export function forceActor(g:Game,i:number){const old=actor(g);if(old===i)return;for(const k of ['hand','draft','draftVersion'] as const){const a=g.players.get(pid(old))! as any,b=g.players.get(pid(i))! as any;[a[k],b[k]]=[b[k],a[k]];}g.public.players.find(p=>p.playerId===pid(old))!.handCount=13;g.public.players.find(p=>p.playerId===pid(i))!.handCount=14;(g.public.phase as any).actorId=pid(i);}
