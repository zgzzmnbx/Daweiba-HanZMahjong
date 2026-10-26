import {useState,useEffect} from 'react';
import {avatarUrl} from '../../../packages/contracts/avatars';
import './player-profile.css';
export function PlayerAvatar({avatarId,name,seed,className=''}:{avatarId?:string;name:string;seed?:string;className?:string}){
 const src=avatarUrl(avatarId,seed??name),small=avatarUrl(avatarId,seed??name,'mobile'),[failed,setFailed]=useState(false),[smallFailed,setSmallFailed]=useState(false);
 useEffect(()=>{setFailed(false);setSmallFailed(false);},[src]);
 return failed?<span className={'portrait-fallback '+className} aria-hidden="true">{Array.from(name)[0]??'友'}</span>:<picture className="portrait-source">
  {!smallFailed&&<source media="(max-width: 699px), (pointer: coarse) and (max-width: 1023px)" srcSet={small}/>}
  <img className={'portrait-image '+className} src={src} alt="" draggable={false} decoding="async" onError={e=>{if(e.currentTarget.currentSrc.endsWith(small))setSmallFailed(true);else setFailed(true);}}/>
 </picture>;
}
