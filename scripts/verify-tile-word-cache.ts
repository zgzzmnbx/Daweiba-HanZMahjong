/** Audit every saved tile word through the public read-only API against the durable cache. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {Speech,SPEECH_PROFILE} from '../apps/server/speech';
import {tileWord} from '../apps/server/tile-words';
import {decodeWav} from '../apps/server/speech-audio';
import {createGameServer} from '../apps/server/server';
const directory=process.env.SPEECH_CACHE_DIR;if(!directory)throw Error('SPEECH_CACHE_DIR required');
const local=process.argv.includes('--local')||!process.env.PUBLIC_ORIGIN,base=local?'http://127.0.0.1:3157':process.env.PUBLIC_ORIGIN!,dir=await mkdtemp(resolve('Codex-Temp/word-cache-'));
if(local){delete process.env.DASHSCOPE_API_KEY;delete process.env.DASHSCOPE_API_KEY_FILE;}
const speech=new Speech({directory}),server=local?createGameServer({dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web'),automaticTimers:false,speech:{directory}}):null;
const generated=JSON.parse(await readFile(process.env.SPEECH_REPORT??'docs/evidence/tile-words-generation-20261024.json','utf8'));
const checks:{char:string;word:string;durationMs:number;sha256:string}[]=[];
try{assert.equal(generated.status,'PASS');assert.equal(generated.ready.length,generated.total);assert(generated.total>0);if(server)await server.listen(3157);const manifest=await(await fetch(base+'/api/speech/tiles')).json();assert.equal(manifest.profile,SPEECH_PROFILE);assert.deepEqual(manifest.unmapped,[]);if(local)assert.equal(manifest.enabled,false);
 for(const row of generated.ready){const word=tileWord(row.char)!;assert.equal(row.word,word);assert.equal([...word].length,2);assert.equal([...word][0],row.char);if(!local){assert(manifest.ready.includes(row.char));assert.equal(manifest.words[row.char],word);}
  const file=await readFile(speech.path(row.char,true)),response=await fetch(`${base}/api/speech/tiles/${SPEECH_PROFILE}/${encodeURIComponent(row.char)}`);assert.equal(response.status,200);assert(response.headers.get('cache-control')?.includes('immutable'));const body=Buffer.from(await response.arrayBuffer());assert.deepEqual(body,file);const samples=decodeWav(body),durationMs=samples.length/24;assert(durationMs>300&&durationMs<5000);checks.push({char:row.char,word,durationMs,sha256:createHash('sha256').update(body).digest('hex')});
 }
 assert.equal((await fetch(`${base}/api/speech/tiles/${SPEECH_PROFILE}/龘`)).status,404);
 await writeFile(`docs/evidence/${process.env.EVIDENCE_PREFIX??((local?'local':'public')+'-tile-word-cache-1.20.0')}.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:local?`${generated.total} real Qwen word WAV files served with provider credentials removed`:`${generated.total} actual HTTPS word files byte-equal to durable Qwen cache, all manifest mappings ready`,profile:SPEECH_PROFILE,total:checks.length,checks},null,2)+'\n');console.log(`PASS all ${generated.total} fixed two-character word WAVs, immutable cache, exact bytes, missing returns 404`);
}finally{await speech.close();await server?.close();await rm(dir,{recursive:true,force:true});}
