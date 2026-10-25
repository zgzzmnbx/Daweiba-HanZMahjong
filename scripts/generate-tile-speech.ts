/** Populate durable server audio cache from saved deck sets. Credentials are read only from env or a private file. */
import {readFile,writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {Speech,SPEECH_PROFILE} from '../apps/server/speech';
import {tileWord} from '../apps/server/tile-words';
import {decodeWav} from '../apps/server/speech-audio';
const dbPath=process.env.DB_PATH,cache=process.env.SPEECH_CACHE_DIR;
if(!dbPath||!cache)throw Error('DB_PATH and SPEECH_CACHE_DIR are required');
const apiKey=process.env.DASHSCOPE_API_KEY??(process.env.DASHSCOPE_API_KEY_FILE?(await readFile(process.env.DASHSCOPE_API_KEY_FILE,'utf8')).trim():undefined);
const db=new DatabaseSync(dbPath,{readOnly:true});
const rows=db.prepare('SELECT r.data FROM deck_set_revisions r JOIN deck_sets s ON s.id=r.set_id AND s.revision=r.revision').all() as {data:string}[];db.close();
const extra=process.env.SPEECH_DECK_FILE?JSON.parse(await readFile(process.env.SPEECH_DECK_FILE,'utf8')).entries as {char:string}[]:[];
const chars=[...new Set([...rows.flatMap(r=>(JSON.parse(r.data).entries as {char:string}[]).map(e=>e.char)),...extra.map(e=>e.char)])];
const speech=new Speech({directory:cache,apiKey,ffmpeg:process.env.FFMPEG_BINARY});const failed:{char:string;code:string}[]=[],ready:{char:string;word:string;durationMs:number;peak:number;rms:number}[]=[];let count=0;
try{await Promise.all(chars.map(async char=>{try{const file=await speech.ensure(char,true),samples=decodeWav(await readFile(file));let sum=0,peak=0;for(const n of samples){sum+=n*n;peak=Math.max(peak,Math.abs(n));}ready.push({char,word:tileWord(char)!,durationMs:samples.length/24,peak,rms:Math.sqrt(sum/samples.length)});}catch(e){failed.push({char,code:(e as any).code??'SPEECH_UNAVAILABLE'});}finally{count++;if(count%10===0||count===chars.length)console.log(`Processed ${count}/${chars.length}; failed ${failed.length}`);}}));
 const report={at:new Date().toISOString(),profile:SPEECH_PROFILE,scope:'real Qwen synthesis or validated durable cache for every character in every saved deck set',status:failed.length?'FAIL':'PASS',total:chars.length,ready:ready.sort((a,b)=>a.char.localeCompare(b.char)),failed};
 await writeFile(process.env.SPEECH_REPORT??'Codex-Temp/tile-speech-generation.json',JSON.stringify(report,null,2)+'\n');if(failed.length)process.exitCode=1;
}finally{await speech.close();}
