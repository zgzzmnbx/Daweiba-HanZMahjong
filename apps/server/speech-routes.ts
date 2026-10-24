import type {Express,Request,Response,RequestHandler} from 'express';
import type {Game} from '../../packages/engine/index';
import type {Store} from './store';
import {Speech,SpeechError} from './speech';
import type {PublicSentence} from '../../packages/contracts/types';
export function sentenceText(value:PublicSentence){const tiles=new Map(value.tiles.map(t=>[t.tileId,t.char])),commas=new Set(value.sentence.commaAfterTileIds);return value.sentence.orderedTileIds.map(id=>(tiles.get(id)??'')+(commas.has(id)?'，':'')).join('');}
export function speechRoutes(app:Express,deps:{speech:Speech;store:Store;games:Map<string,Game>;handle:(work:(q:Request,r:Response)=>any)=>RequestHandler;adminAuth:(header:string|undefined)=>unknown;authenticate:(header:string|undefined,room:string)=>unknown;limit:(key:string,max:number)=>void}){
 const{speech,store,games,handle,adminAuth,authenticate,limit}=deps;
 const chars=()=>[...new Set(store.deckSets.catalog().sets.flatMap(set=>store.deckSets.get(set.id).entries.map(e=>e.char)))];
 app.get('/api/speech/tiles',handle(async(_q,r)=>r.json(await speech.manifest(chars()))));
 app.get('/api/admin/speech/tiles',handle(async(q,r)=>{adminAuth(q.headers.cookie);r.json(await speech.manifest(chars(),true));}));
 app.post('/api/admin/speech/tiles',handle(async(q,r)=>{adminAuth(q.headers.cookie);limit(`speech-batch:${q.ip}`,10);const entries=q.body?.characters,known=new Set(chars());if(!Array.isArray(entries)||!entries.length||entries.length>500||entries.some(c=>typeof c!=='string'||!known.has(c)))throw new SpeechError('SPEECH_INVALID_TEXT',400);speech.generateTiles([...new Set(entries)]);r.status(202).json(await speech.manifest(chars(),true));}));
 app.get('/api/speech/tiles/:profile/:char',handle(async(q,r)=>{const char=String(q.params.char);if(q.params.profile!==(await speech.manifest([])).profile||!/^\p{Unified_Ideograph}$/u.test(char)||!await speech.existing(char,true))throw new SpeechError('SPEECH_NOT_READY',404);r.type('audio/wav').set('Cache-Control','public, max-age=31536000, immutable').sendFile(speech.path(char,true));}));
 const hu=(admin:boolean)=>handle(async(q,r)=>{const room=String(q.params.roomId),game=games.get(room);if(admin)adminAuth(q.headers.cookie);else{let member=false;try{authenticate(q.headers.cookie,room);member=true;}catch{}if(!member&&game?.public.allowSpectators!==true)throw new SpeechError('SPEECH_FORBIDDEN',403);}if(!game)throw new SpeechError('SPEECH_NOT_READY',404);
  limit(`speech-hu:${q.ip}`,60);const id=q.params.proposalId,phase=game.public.phase,proposal=phase.kind==='HU_VOTE'&&phase.proposal.proposalId===id?phase.proposal:game.public.history.find(p=>p.proposalId===id);if(!proposal)throw new SpeechError('SPEECH_NOT_READY',404);
  const text=sentenceText(proposal.snapshot);if(!text)throw new SpeechError('SPEECH_INVALID_TEXT',400);r.type('audio/wav').send(await speech.read(text,false));
 });
 app.post('/api/rooms/:roomId/speech/hu/:proposalId',hu(false));app.post('/api/admin/rooms/:roomId/speech/hu/:proposalId',hu(true));
}
