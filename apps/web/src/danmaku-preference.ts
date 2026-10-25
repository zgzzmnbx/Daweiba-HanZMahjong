import {useSyncExternalStore} from 'react';

const key='hanz-chat-danmaku',event='hanz-danmaku-change';
const read=()=>{try{return localStorage.getItem(key)!=='off';}catch{return true;}};
const subscribe=(listener:()=>void)=>{
 window.addEventListener(event,listener);window.addEventListener('storage',listener);
 return()=>{window.removeEventListener(event,listener);window.removeEventListener('storage',listener);};
};
/** Chat and the native review dialog share one local preference. */
export function useDanmakuPreference(){
 const enabled=useSyncExternalStore(subscribe,read,()=>true);
 return [enabled,()=>{try{localStorage.setItem(key,enabled?'off':'on');}catch{}window.dispatchEvent(new Event(event));}] as const;
}
