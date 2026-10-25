/** Reuse unchanged v1 words under the v2 profile. Never overwrite or delete the old cache. */
import {readFile,copyFile,writeFile,mkdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {Speech,SPEECH_PROFILE} from '../apps/server/speech';
import {tileWord} from '../apps/server/tile-words';
import {decodeWav} from '../apps/server/speech-audio';
const directory=process.env.SPEECH_CACHE_DIR;if(!directory)throw Error('SPEECH_CACHE_DIR required');
const prior=JSON.parse(await readFile('docs/evidence/tile-words-generation-20261024.json','utf8'));
if(prior.status!=='PASS'||prior.profile!=='qwen3-flash-Cherry-zh-tile-word-v1')throw Error('Unexpected prior audited profile');
const speech=new Speech({directory}),reused:string[]=[],skipped:string[]=[];await mkdir(directory,{recursive:true,mode:0o700});
try{for(const row of prior.ready){if(tileWord(row.char)!==row.word){skipped.push(row.char);continue;}const key=createHash('sha256').update(JSON.stringify([prior.profile,true,row.word])).digest('hex'),source=join(directory,key+'.wav'),target=speech.path(row.char,true);let bytes:Buffer;try{bytes=await readFile(source);}catch{skipped.push(row.char);continue;}const samples=decodeWav(bytes);if(samples.length<7200||samples.length>120000||!samples.some(n=>Math.abs(n)>.01))throw Error('Invalid old audio '+row.char);try{await copyFile(source,target,constants.COPYFILE_EXCL);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(!bytes.equals(await readFile(target)))throw Error('Conflicting existing cache '+row.char);}reused.push(row.char);}
 await writeFile(process.env.SPEECH_MIGRATION_REPORT??'Codex-Temp/tile-word-migration.json',JSON.stringify({at:new Date().toISOString(),from:prior.profile,to:SPEECH_PROFILE,reused,skipped},null,2)+'\n');console.log(`Validated and reused ${reused.length} unchanged words; skipped ${skipped.length}`);
}finally{await speech.close();}
