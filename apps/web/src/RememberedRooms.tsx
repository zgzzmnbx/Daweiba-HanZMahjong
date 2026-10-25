import {GameIcon} from './GameIcon';
import {useEffect,useState} from 'react';
import {api} from './game-client';
import type {RoomSeatDirectory} from '../../../packages/contracts/browser-return';
const key='hanz-mahjong-room-history-v1';
function remembered():string[]{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter((id:unknown):id is string=>typeof id==='string'&&/^[A-Z0-9]{10}$/.test(id)).slice(0,12):[];}catch{return[];}}
/** Only public room IDs are kept here. Seat authority always comes from the server's HttpOnly cookie. */
export function rememberRoom(id:string){try{localStorage.setItem(key,JSON.stringify([id,...remembered().filter(x=>x!==id)].slice(0,12)));}catch{}}
export function RememberedRooms({onOpen,busy}:{onOpen:(id:string)=>void;busy:boolean}){
 const [rooms,setRooms]=useState<{id:string;name:string}[]>([]);
 useEffect(()=>{const controller=new AbortController();void(async()=>{
  let ids=remembered();try{const session=await api('/api/session',undefined,controller.signal);if(session.roomId)ids=[session.roomId,...ids.filter(id=>id!==session.roomId)];}catch{}
  const found=await Promise.all(ids.map(async id=>{try{const d:RoomSeatDirectory=await api(`/api/rooms/${id}/seats`,undefined,controller.signal),person=d.players?.find(p=>p.seat===d.returnSeat);return !d.closed&&d.returnMethod&&person?{id,name:person.nickname}:null;}catch{return null;}}));
  if(!controller.signal.aborted)setRooms(found.filter((r):r is {id:string;name:string}=>r!==null));
 })();return()=>controller.abort();},[]);
 if(!rooms.length)return null;
 return <nav className="remembered-rooms" aria-label="我的座位"><span>我的座位</span>{rooms.map(r=><button key={r.id} disabled={busy} onClick={()=>onOpen(r.id)} title={`房间 ${r.id}`}>{r.name}<small>回到房间 <GameIcon kind="back"/></small></button>)}</nav>;
}
