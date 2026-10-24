/** Twice the original music range, including its default; effects and speech own audio priority. */
export function musicLevel(volume:number,sfxEnabled:boolean,sfxVolume:number,foreground:boolean){if(foreground)return 0;const cap=sfxEnabled?Math.min(.32,Math.max(0,sfxVolume)*.4):.20;return Math.max(0,Math.min(1,volume))*cap;}
let timer:ReturnType<typeof setTimeout>|undefined;const leases=new Map<symbol,number>(),listeners=new Set<()=>void>();
function notify(){clearTimeout(timer);const now=performance.now();for(const [key,end]of leases)if(end<=now)leases.delete(key);for(const fn of listeners)fn();if(leases.size)timer=setTimeout(notify,Math.max(1,Math.max(...leases.values())-now+20));}
export const musicFocus={active:()=>[...leases.values()].some(end=>end>performance.now()),subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},hold(ms:number){const key=Symbol();leases.set(key,performance.now()+Math.max(0,ms));notify();return()=>{leases.delete(key);notify();};}};
