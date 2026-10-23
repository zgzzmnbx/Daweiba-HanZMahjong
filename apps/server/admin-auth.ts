import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
export const ADMIN_COOKIE='hanz_mahjong_admin_v1';
export const ADMIN_SESSION_MS=8*60*60*1000;
const pattern=/^scrypt:([a-f\d]{32}):([a-f\d]{128})$/i;
const derive=(password:string,salt:Buffer)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)));
/** Kept server-only, also used by provisioning/tests. Never accepts a plaintext configured password. */
export async function hashAdminPassword(password:string){const salt=randomBytes(16);return`scrypt:${salt.toString('hex')}:${(await derive(password,salt)).toString('hex')}`;}
export function isAdminConfigured(hash:unknown):hash is string{return typeof hash==='string'&&pattern.test(hash);}
export async function verifyAdminPassword(password:unknown,hash:string){
 const match=pattern.exec(hash);if(!match||typeof password!=='string'||password.length<1||Buffer.byteLength(password)>1024)return false;
 const actual=await derive(password,Buffer.from(match[1],'hex'));return timingSafeEqual(actual,Buffer.from(match[2],'hex'));
}
export class AdminError extends Error {constructor(public code:string,public status:number){super(code);}}
