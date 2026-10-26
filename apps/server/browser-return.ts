import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import type {Response} from 'express';
import type {Game} from '../../packages/engine/index';
import type {PlayerId} from '../../packages/contracts/types';
export const RETURN_COOKIE='hanz_mahjong_return_v1';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function returnToken(header:string|undefined,cookieName=RETURN_COOKIE){const value=header?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;}
export function browserPlayer(g:Game,header:string|undefined,cookieName=RETURN_COOKIE):PlayerId|null{
 const token=returnToken(header,cookieName);if(!token||g.public.phase.kind==='ROOM_CLOSED')return null;
 const proof=Buffer.from(hash(token),'hex');
 for(const [id,p] of g.players)if(p.seat!==null&&p.browserReturnHash&&/^[a-f0-9]{64}$/.test(p.browserReturnHash)&&timingSafeEqual(proof,Buffer.from(p.browserReturnHash,'hex'))&&g.public.players.some(x=>x.playerId===id&&!x.isBotSeat))return id;
 return null;
}
/** Mutate only a transaction clone. Write its cookie only after that transaction commits. */
export function prepareBrowserReturn(g:Game,id:PlayerId,header:string|undefined,cookieName=RETURN_COOKIE){
 if(browserPlayer(g,header,cookieName)===id)return null;
 const p=g.players.get(id);if(!p||p.seat===null||g.public.phase.kind==='ROOM_CLOSED')return null;
 const token=randomBytes(32).toString('base64url');p.browserReturnHash=hash(token);return token;
}
export function writeBrowserReturn(r:Response,roomId:string,token:string|null,secure:boolean,cookieName=RETURN_COOKIE){if(token)r.cookie(cookieName,token,{httpOnly:true,secure,sameSite:'lax',path:`/api/rooms/${roomId}`,maxAge:30*86400000});}
