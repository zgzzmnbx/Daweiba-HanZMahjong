import {spawn} from 'node:child_process';
import {dirname,join} from 'node:path';
import {stat,rm} from 'node:fs/promises';
export class MusicError extends Error{constructor(public code:string,public status=400){super(code);}}
async function run(binary:string,args:string[],timeout=120000){return new Promise<string>((resolve,reject)=>{let text='',failed=false;const p=spawn(binary,args,{stdio:['ignore','pipe','ignore']}),timer=setTimeout(()=>{failed=true;p.kill('SIGKILL');},timeout);timer.unref();p.stdout.on('data',b=>{if(text.length<65536)text+=b.toString();});p.once('error',()=>{clearTimeout(timer);reject(new MusicError('MUSIC_AUDIO_UNAVAILABLE',503));});p.once('close',code=>{clearTimeout(timer);code===0&&!failed?resolve(text):reject(new MusicError('MUSIC_INVALID_AUDIO'));});});}
/** Decode untrusted local bytes only. Normalize loudness, strip tags/artwork, bound duration and encoding. */
export async function normalizeMusic(input:string,output:string,ffmpeg='ffmpeg'){
 try{await run(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-format_whitelist','mp3,wav,mov,flac,ogg,aac','-i',input,'-map','0:a:0','-vn','-sn','-dn','-map_metadata','-1','-t','601','-af','loudnorm=I=-24:TP=-6:LRA=9','-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','128k','-y',output]);
 const probe=ffmpeg.includes('/')?join(dirname(ffmpeg),'ffprobe'):'ffprobe',durationMs=Math.round(Number((await run(probe,['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',output],10000)).trim())*1000),bytes=(await stat(output)).size;
 if(!Number.isFinite(durationMs)||durationMs<1000||durationMs>600000||bytes>11*1024*1024)throw new MusicError('MUSIC_DURATION');return{durationMs,bytes};
 }catch(e){await rm(output,{force:true});throw e;}
}
