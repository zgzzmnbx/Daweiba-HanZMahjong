import {useState} from 'react';
import './hall-table-art.css';
/** Decorative furniture only; capacity and occupancy always come from the live lobby. */
export function HallTableArt(){
 const [failed,setFailed]=useState(false);
 return <span className="hall-scene" aria-hidden="true">{failed?<span className="hall-art-fallback">字间<span>好友围坐 · 慢慢成句</span></span>:<picture><source media="(max-width:699px)" srcSet="/lobby/v1/table-480.webp"/><img src="/lobby/v1/table-960.webp" width="960" height="640" alt="" draggable={false} decoding="async" onError={()=>setFailed(true)}/></picture>}</span>;
}
