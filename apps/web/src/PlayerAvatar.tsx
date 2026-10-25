import {useState,useEffect} from 'react';
import {avatarUrl} from '../../../packages/contracts/avatars';
import './player-profile.css';
export function PlayerAvatar({avatarId,name,seed,className=''}:{avatarId?:string;name:string;seed?:string;className?:string}){
 const src=avatarUrl(avatarId,seed??name),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 return failed?<span className={'portrait-fallback '+className} aria-hidden="true">{Array.from(name)[0]??'友'}</span>:<img className={'portrait-image '+className} src={src} alt="" draggable={false} decoding="async" onError={()=>setFailed(true)}/>;
}
