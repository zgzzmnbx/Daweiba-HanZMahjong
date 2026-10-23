import {useLayoutEffect} from 'react';
/** Keep the game within the actually visible browser area, including an on-screen keyboard. */
export function useGameViewport(){
 useLayoutEffect(()=>{const viewport=window.visualViewport,root=document.documentElement;
  const sync=()=>{root.style.setProperty('--app-height',`${viewport?.height??innerHeight}px`);root.style.setProperty('--app-width',`${viewport?.width??innerWidth}px`);root.style.setProperty('--app-top',`${viewport?.offsetTop??0}px`);root.style.setProperty('--app-left',`${viewport?.offsetLeft??0}px`);};
  sync();window.addEventListener('resize',sync);viewport?.addEventListener('resize',sync);viewport?.addEventListener('scroll',sync);
  return()=>{window.removeEventListener('resize',sync);viewport?.removeEventListener('resize',sync);viewport?.removeEventListener('scroll',sync);};
 },[]);
}
