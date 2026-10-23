import {flightPoint,type MotionAnchors,type MotionEvent,type MotionRect} from './table-motion';
type Flight={event:MotionEvent;node:HTMLDivElement;from:MotionRect;to:MotionRect;start:number;duration:number};
/** DOM decoration only. No callbacks into game transport or clocks. */
export class FlightLayer{
 private flights:Flight[]=[];private raf=0;private disposed=false;private root:HTMLDivElement;private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private scope:HTMLElement,private hidden:(keys:Set<string>)=>void){this.root=document.createElement('div');this.root.className='table-flight-layer';this.root.setAttribute('aria-hidden','true');document.body.append(this.root);this.reduced.addEventListener('change',this.onMotion);}
 private onMotion=()=>{if(this.reduced.matches)this.clear();};
 start(events:MotionEvent[],before:MotionAnchors,after:MotionAnchors){if(this.disposed||this.reduced.matches)return;const now=performance.now();
  // Keep an in-flight arrival only if its destination still exists or a new flight consumes it.
  const obsolete=this.flights.filter(f=>!after[f.event.to]&&!events.some(e=>e.from===f.event.to));for(const f of obsolete)f.node.remove();this.flights=this.flights.filter(f=>!obsolete.includes(f));
  for(const f of this.flights){const target=after[f.event.to];if(target&&JSON.stringify(target)!==JSON.stringify(f.to)){if(now>=f.start){const end=f.start+f.duration;f.from=flightPoint(f.from,f.to,Math.min(1,(now-f.start)/f.duration));f.start=now;f.duration=Math.max(80,end-now);}f.to=target;f.node.dataset.motionTo=JSON.stringify(target);}}
  for(const event of events){if(this.flights.some(f=>f.event.key===event.key))continue;
   const previous=[...this.flights].reverse().find(f=>f.event.to===event.from),draw=event.kind==='DISCARD'?[...this.flights].reverse().find(f=>f.event.kind==='DRAW'&&f.event.playerId===event.playerId):undefined;
   const from=previous?.to??before[event.from]??after[event.from]??draw?.to,to=after[event.to];if(!from||!to)continue;
   const node=document.createElement('div');node.className='flying-table-tile'+(event.char===null?' tile-back':'');node.textContent=event.char??'';node.dataset.motionKind=event.kind;node.dataset.motionSource=event.from;node.dataset.motionTarget=event.to;node.dataset.motionKey=event.key;node.dataset.motionFrom=JSON.stringify(from);node.dataset.motionTo=JSON.stringify(to);this.root.append(node);
   const chainedDraw=event.kind==='DRAW'&&events.some(e=>e.kind==='DISCARD'&&e.playerId===event.playerId),duration=event.kind==='HU'?620:chainedDraw?350:450,delay=event.kind==='HU'?(event.index??0)*22:0;
   const start=Math.max(now+delay,previous?previous.start+previous.duration:0,draw?draw.start+draw.duration+20:0);const f={event,node,from,to,start,duration};this.flights.push(f);this.paint(f,0);node.style.opacity=start>now?'0':'1';
  }this.refreshHidden();if(this.flights.length)this.tick();}
 refreshHidden(){const keys=new Set(this.flights.flatMap(f=>[f.event.to,...(['BORROW','EAT','HU'].includes(f.event.kind)?[f.event.from]:[])]));this.hidden(keys);for(const el of this.scope.querySelectorAll<HTMLElement>('[data-motion-anchor]')){if(keys.has(el.dataset.motionAnchor!))el.dataset.motionHidden='true';else delete el.dataset.motionHidden;}}
 private paint(f:Flight,t:number){const p=flightPoint(f.from,f.to,t);f.node.style.width=`${p.width}px`;f.node.style.height=`${p.height}px`;f.node.style.transform=`translate3d(${p.x-p.width/2}px,${p.y-p.height/2}px,0) rotate(${Math.sin(Math.PI*t)*(f.event.kind==='HU'?5:-9)}deg)`;}
 private tick=()=>{cancelAnimationFrame(this.raf);if(this.disposed)return;const now=performance.now();for(const f of this.flights){f.node.style.opacity=now<f.start?'0':'1';this.paint(f,Math.max(0,Math.min(1,(now-f.start)/f.duration)));}const done=this.flights.filter(f=>now>=f.start+f.duration);for(const f of done)f.node.remove();this.flights=this.flights.filter(f=>!done.includes(f));if(done.length)this.refreshHidden();if(this.flights.length)this.raf=requestAnimationFrame(this.tick);};
 clear(){cancelAnimationFrame(this.raf);for(const f of this.flights)f.node.remove();this.flights=[];this.refreshHidden();}
 dispose(){this.clear();this.disposed=true;this.reduced.removeEventListener('change',this.onMotion);this.root.remove();}
}
