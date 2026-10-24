import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tileWord} from './tile-words';
import {normalizeSpeech,SpeechError} from './speech-audio';
export {SpeechError} from './speech-audio';
const HU_SPEECH_PROFILE='qwen3-flash-Cherry-zh-normalized-v1';
export const SPEECH_PROFILE='qwen3-flash-Cherry-zh-tile-word-v1';
export type SpeechOptions={directory:string;apiKey?:string;ffmpeg?:string;synthesize?:(text:string,signal:AbortSignal)=>Promise<Buffer>};
export class Speech{
 private jobs=new Map<string,Promise<string>>();private waiting:{run:()=>void;reject:(e:unknown)=>void}[]=[];private active=0;private nextStart=0;private timer:ReturnType<typeof setTimeout>|null=null;private closed=false;private aborts=new Set<AbortController>();private failures=new Set<string>();private tiles=new Set<string>();
 constructor(private options:SpeechOptions){}
 get enabled(){return !!(this.options.apiKey||this.options.synthesize);}
 private key(text:string,single:boolean){return createHash('sha256').update(JSON.stringify([single?SPEECH_PROFILE:HU_SPEECH_PROFILE,single,single?tileWord(text):text])).digest('hex');}
 path(text:string,single:boolean){return join(this.options.directory,this.key(text,single)+'.wav');}
 async existing(text:string,single:boolean){if(single&&!tileWord(text))return false;try{const info=await stat(this.path(text,single));return info.isFile()&&info.size>44;}catch{return false;}}
 async manifest(chars:readonly string[],admin=false){const ready:string[]=[];for(const char of chars)if(await this.existing(char,true))ready.push(char);return{profile:SPEECH_PROFILE,voice:'Cherry',tileDurationMs:null,words:Object.fromEntries(chars.filter(c=>tileWord(c)).map(c=>[c,tileWord(c)])),unmapped:chars.filter(c=>!tileWord(c)),enabled:this.enabled,ready,...(admin?{pending:chars.filter(c=>this.tiles.has(c)),failed:chars.filter(c=>this.failures.has(c))}:{})};}
 generateTiles(chars:string[]){if(chars.some(c=>!tileWord(c)))throw new SpeechError('SPEECH_WORD_MISSING',400);if(!this.enabled)throw new SpeechError('SPEECH_NOT_CONFIGURED');for(const c of chars){if(this.tiles.has(c))continue;this.tiles.add(c);this.failures.delete(c);void this.ensure(c,true).catch(()=>{this.failures.add(c);}).finally(()=>{this.tiles.delete(c);});}}
 private async qwen(text:string,signal:AbortSignal){
  try{const response=await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.options.apiKey}`},body:JSON.stringify({model:'qwen3-tts-flash',input:{text,voice:'Cherry',language_type:'Chinese'}})});
   if(!response.ok)throw new SpeechError(response.status===429?'SPEECH_RATE_LIMITED':`SPEECH_PROVIDER_HTTP_${response.status}`);const body=await response.json() as any,raw=body.output?.audio?.url;if(typeof raw!=='string')throw new SpeechError('SPEECH_PROVIDER_UNAVAILABLE');const url=new URL(raw);
   if(!url.hostname.endsWith('.aliyuncs.com')||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new SpeechError('SPEECH_INVALID_AUDIO');url.protocol='https:';
   const audio=await fetch(url,{signal,redirect:'error'});if(!audio.ok||Number(audio.headers.get('content-length'))>5000000)throw new SpeechError('SPEECH_INVALID_AUDIO');
   const chunks:Uint8Array[]=[];let size=0;const reader=audio.body!.getReader();try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5000000)throw new SpeechError('SPEECH_INVALID_AUDIO');chunks.push(value);}}finally{reader.releaseLock();}return Buffer.concat(chunks);
  }catch(e){if(e instanceof SpeechError)throw e;throw new SpeechError('SPEECH_PROVIDER_UNAVAILABLE');}
 }
 /** The tile key is one character; only its fixed word is sent to TTS. Full sentences keep their original key/text. */
 async ensure(text:string,single:boolean):Promise<string>{
  if(this.closed)throw new SpeechError('SPEECH_UNAVAILABLE');if(single?!/^\p{Unified_Ideograph}$/u.test(text):[...text].length>80||!text)throw new SpeechError('SPEECH_INVALID_TEXT',400);
  if(single&&!tileWord(text))throw new SpeechError('SPEECH_WORD_MISSING',400);
  const key=this.key(text,single),file=this.path(text,single);if(await this.existing(text,single))return file;const prior=this.jobs.get(key);if(prior)return prior;
  if(!this.enabled)throw new SpeechError('SPEECH_NOT_CONFIGURED');if(this.waiting.length>=500)throw new SpeechError('SPEECH_BUSY',429);
  let finish!:(v:string)=>void,fail!:(e:unknown)=>void;const work=new Promise<string>((resolve,reject)=>{finish=resolve;fail=reject;});this.jobs.set(key,work);
  const run=()=>{this.active++;void(async()=>{const controller=new AbortController();this.aborts.add(controller);const timer=setTimeout(()=>controller.abort(),45000);timer.unref();let temp='';try{
   const spoken=single?tileWord(text)!:text,raw=this.options.synthesize?await this.options.synthesize(spoken,controller.signal):await this.qwen(spoken,controller.signal);const normalized=await normalizeSpeech(raw,false,this.options.ffmpeg);
   if(this.closed)throw new SpeechError('SPEECH_UNAVAILABLE');await mkdir(this.options.directory,{recursive:true,mode:0o700});temp=join(this.options.directory,`${key}.${randomUUID()}.tmp`);await writeFile(temp,normalized.wav,{mode:0o600});await rename(temp,file);temp='';finish(file);
  }catch(e){fail(e instanceof SpeechError?e:new SpeechError('SPEECH_UNAVAILABLE'));}finally{if(temp)await unlink(temp).catch(()=>{});clearTimeout(timer);this.aborts.delete(controller);this.jobs.delete(key);this.active--;this.pump();}})();};
  const item={run,reject:fail};if(single)this.waiting.push(item);else this.waiting.unshift(item);this.pump();return work;
 }
 private pump(){if(this.closed||this.active>=2||!this.waiting.length)return;const delay=this.nextStart-Date.now();if(delay>0){if(!this.timer){this.timer=setTimeout(()=>{this.timer=null;this.pump();},delay);}return;}this.nextStart=Date.now()+(this.options.synthesize?0:1200);this.waiting.shift()!.run();this.pump();}
 async read(text:string,single:boolean){return readFile(await this.ensure(text,single));}
 async close(){this.closed=true;if(this.timer)clearTimeout(this.timer);for(const c of this.aborts)c.abort();for(const job of this.waiting)job.reject(new SpeechError('SPEECH_UNAVAILABLE'));this.waiting=[];await Promise.allSettled([...this.jobs.values()]);}
}
