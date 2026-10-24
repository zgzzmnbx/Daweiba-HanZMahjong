import {useEffect,useRef,type MutableRefObject} from 'react';
import type {DoodleBoard} from '../../../packages/contracts/doodle';
import type {MainView} from './table3d/main-view';
import {DoodleSurface} from './table3d/doodle-surface';
/** Observers receive only public ink through the already-authorized spectator snapshot. */
export function SpectatorDoodle({renderer,board}:{renderer:MutableRefObject<MainView|undefined>;board?:DoodleBoard}){
 const latest=useRef(board);latest.current=board;
 useEffect(()=>{let surface:DoodleSurface|undefined,revision=-1;const update=()=>{if(surface?.view!==renderer.current){surface?.dispose();surface=renderer.current?new DoodleSurface(renderer.current):undefined;revision=-1;}if(surface&&revision!==(latest.current?.revision??0)){surface.paint(latest.current?.strokes??[]);revision=latest.current?.revision??0;}};update();const timer=setInterval(update,150);return()=>{clearInterval(timer);surface?.dispose();};},[renderer]);
 return null;
}
