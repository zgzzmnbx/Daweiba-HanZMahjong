import {spawn} from 'node:child_process';
export const SAMPLE_RATE=24000,TILE_SECONDS=1.1;
export class SpeechError extends Error{constructor(public code:string,public status=503){super(code);}}
/** Qwen sometimes sends streaming placeholders as RIFF/data sizes. Bound every read by actual bytes. */
export function decodeWav(wav:Buffer):Int16Array{
 if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw new SpeechError('SPEECH_INVALID_AUDIO');
 let valid=false;
 for(let at=12;at+8<=wav.length;){const kind=wav.toString('ascii',at,at+4),size=wav.readUInt32LE(at+4),start=at+8;
  if(kind==='fmt '){if(size<16||start+16>wav.length)break;valid=wav.readUInt16LE(start)===1&&wav.readUInt16LE(start+2)===1&&wav.readUInt32LE(start+4)===SAMPLE_RATE&&wav.readUInt16LE(start+14)===16;}
  if(kind==='data'){if(!valid)break;const count=Math.floor(Math.min(size,wav.length-start)/2),samples=new Int16Array(count);for(let i=0;i<count;i++)samples[i]=wav.readInt16LE(start+i*2);return samples;}
  at=start+size+(size%2);
 }throw new SpeechError('SPEECH_INVALID_AUDIO');
}
export function encodeWav(samples:Int16Array):Buffer{const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(SAMPLE_RATE,24);wav.writeUInt32LE(SAMPLE_RATE*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);for(let i=0;i<samples.length;i++)wav.writeInt16LE(samples[i],44+i*2);return wav;}
async function compress(samples:Int16Array,tempo:number,binary:string){return new Promise<Int16Array>((resolve,reject)=>{
 const child=spawn(binary,['-hide_banner','-loglevel','error','-f','wav','-i','pipe:0','-af',`atempo=${tempo.toFixed(5)}`,'-ar',String(SAMPLE_RATE),'-ac','1','-f','s16le','pipe:1'],{stdio:['pipe','pipe','ignore']});let size=0;const chunks:Buffer[]=[];const timer=setTimeout(()=>child.kill('SIGKILL'),8000);timer.unref();
 const fail=()=>reject(new SpeechError('SPEECH_AUDIO_TOOL_UNAVAILABLE'));child.on('error',fail);child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>240000)child.kill('SIGKILL');else chunks.push(chunk);});child.stdin.on('error',()=>{});child.on('close',code=>{clearTimeout(timer);if(code!==0)return fail();const data=Buffer.concat(chunks),out=new Int16Array(data.length/2);for(let i=0;i<out.length;i++)out[i]=data.readInt16LE(i*2);resolve(out);});child.stdin.end(encodeWav(samples));
 });}
export async function normalizeSpeech(wav:Buffer,single:boolean,binary='ffmpeg'){
 let samples=decodeWav(wav);const rawMs=samples.length/SAMPLE_RATE*1000;if(samples.length<1200||rawMs>(single?10000:30000))throw new SpeechError('SPEECH_INVALID_AUDIO');
 let peak=0;for(const n of samples)peak=Math.max(peak,Math.abs(n));if(peak<80)throw new SpeechError('SPEECH_SILENT_AUDIO');
 // Trim only outside voiced samples; leave internal pauses and all tones intact.
 const threshold=Math.max(100,peak*.018);let first=0,last=samples.length-1;while(first<last&&Math.abs(samples[first])<threshold)first++;while(last>first&&Math.abs(samples[last])<threshold)last--;
 first=Math.max(0,first-480);last=Math.min(samples.length,last+481);samples=samples.slice(first,last);
 const naturalMs=samples.length/SAMPLE_RATE*1000;let tempo=1;
 if(single&&naturalMs>850){tempo=naturalMs/750; // atempo preserves pitch; chain for unusually long pronunciations.
  if(tempo>2.5)throw new SpeechError('SPEECH_CHARACTER_TOO_LONG');samples=await compress(samples,tempo,binary);
 }
 let energy=0;peak=0;for(const n of samples){energy+=n*n;peak=Math.max(peak,Math.abs(n));}const gain=Math.min(10**(-20/20)*32768/Math.sqrt(energy/samples.length),10**(-3/20)*32768/peak);
 const lead=Math.round(.05*SAMPLE_RATE),length=single?Math.round(TILE_SECONDS*SAMPLE_RATE):samples.length+lead+Math.round(.1*SAMPLE_RATE);
 if(samples.length+lead>length)throw new SpeechError('SPEECH_CHARACTER_TOO_LONG');const out=new Int16Array(length),fade=120;
 for(let i=0;i<samples.length;i++){const edge=Math.min(1,i/fade,(samples.length-1-i)/fade);out[i+lead]=Math.round(samples[i]*gain*Math.max(0,edge));}
 return{wav:encodeWav(out),rawMs,naturalMs,tempo,durationMs:out.length/SAMPLE_RATE*1000};
}
