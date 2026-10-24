import {HU_INTRO_MS,HU_STEP_MS,HU_FLIGHT_MS} from '../table-ui/hu-presentation';
import type {SoundKind} from './sound-events';
export type Voice={stop:()=>void;end:number};
/** Original procedural foley: no downloaded samples, music loops or network dependencies. */
export function synth(ctx:BaseAudioContext,output:AudioNode,kind:SoundKind,start=ctx.currentTime,age=0):Voice{
 const bus=ctx.createGain();bus.connect(output);const sources:AudioScheduledSourceNode[]=[],nodes:AudioNode[]=[bus];let end=start+.1,stopped=false,seed=713;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296*2-1;};
 function envelope(node:AudioNode,at:number,length:number,level:number,attack=.003){const gain=ctx.createGain();gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+length);gain.gain.setValueAtTime(0,at+length+.005);node.connect(gain);gain.connect(bus);nodes.push(gain);end=Math.max(end,at+length+.03);}
 function tone(hz:number,to:number,at:number,length:number,level:number,type:OscillatorType='sine'){const n=ctx.createOscillator();n.type=type;n.frequency.setValueAtTime(hz,at);n.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);envelope(n,at,length,level);n.start(at);n.stop(at+length+.02);sources.push(n);nodes.push(n);}
 function noise(at:number,length:number,level:number,hz:number,q=.7){const n=ctx.createBufferSource(),buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=random();n.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=hz;filter.Q.value=q;n.connect(filter);envelope(filter,at,length,level,.008);n.start(at);sources.push(n);nodes.push(n,filter);}
 function wood(at:number,level=1,pitch=1){noise(at,.055,.34*level,2100*pitch,1.3);tone(910*pitch,540*pitch,at,.065,.18*level);tone(1830*pitch,1450*pitch,at+.004,.045,.09*level);tone(130,65,at,.1,.12*level);}
 function drum(at:number,level=1){tone(145,43,at,.36,.48*level);noise(at,.07,.19*level,570);}
 function bell(at:number,hz:number,length=.7,level=.12){[1,2.01,2.76,4.03].forEach((ratio,i)=>tone(hz*ratio,hz*ratio*.995,at,length/(1+i*.35),level/(1+i*2)));}
 switch(kind){
  case 'start':noise(start,.35,.22,900);drum(start+.08,.8);[220,293.66,440].forEach((h,i)=>bell(start+.12+i*.12,h,.65,.1));break;
  case 'draw':noise(start,.12,.16,1300);wood(start+.09,.35,1.15);break;
  case 'discard':noise(start,.07,.17,950);wood(start+.075,1);wood(start+.115,.25,.85);break;
  case 'eat':wood(start,.65);wood(start+.11,.8,1.2);bell(start+.12,587.33,.28,.06);break;
  case 'hu':{
   if(age<180){noise(start,.4,.23,740);drum(start+.06,1);bell(start+.12,110,1.4,.16);}
   for(let i=0;i<14;i++){const delay=(HU_INTRO_MS+i*HU_STEP_MS+HU_FLIGHT_MS*.72-age)/1000;if(delay<0)continue;wood(start+delay,.65+i*.025,.85+i*.018);if(i%4===0)drum(start+delay,.3);}
   break;
  }
  case 'approve':wood(start,.25,1.4);bell(start+.035,880,.22,.05);break;
  case 'reject':tone(480,130,start,.19,.09,'triangle');noise(start+.03,.18,.12,850);noise(start+.48,.16,.34,580);tone(200,55,start+.48,.13,.24);tone(430,100,start+.5,.09,.12);break;
  case 'win':drum(start,.8);[261.63,329.63,392,523.25,659.25].forEach((h,i)=>bell(start+i*.12,h,1.1,.14));noise(start+.25,.7,.12,4500);break;
  case 'lose':drum(start,.4);[293.66,246.94,196].forEach((h,i)=>tone(h,h*.96,start+i*.15,.35,.14,'triangle'));noise(start+.1,.24,.13,700);break;
 }
 const stop=()=>{if(stopped)return;stopped=true;try{bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.setTargetAtTime(0,ctx.currentTime,.008);}catch{}for(const s of sources)try{s.stop(ctx.currentTime+.03);}catch{};};
 // Source completion owns cleanup; no wall-clock audio queue can replay after a suspended tab resumes.
 let remaining=sources.length;for(const s of sources)s.onended=()=>{if(--remaining===0)for(const n of nodes)n.disconnect();};
 if(!remaining)bus.disconnect();return{stop,end};
}
