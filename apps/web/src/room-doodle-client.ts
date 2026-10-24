import type {Socket} from 'socket.io-client';
import type {DoodleTransport,DoodleAction,DoodleBoard,DoodleEvent} from '../../../packages/contracts/doodle';
export class RoomDoodleClient implements DoodleTransport{
 private listeners=new Set<(e:DoodleEvent)=>void>();
 constructor(private current:()=>{socket:Socket;roomId:string}|null){}
 listen(socket:Socket,isCurrent:()=>boolean){socket.on('doodle:event',(e:DoodleEvent)=>{if(isCurrent()&&e.roomId===this.current()?.roomId)for(const fn of this.listeners)fn(e);});}
 subscribe(fn:(e:DoodleEvent)=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
 async history(signal:AbortSignal):Promise<DoodleBoard>{const c=this.current();if(!c)throw Error('OFFLINE');const r=await fetch(`/api/rooms/${c.roomId}/doodle`,{signal,cache:'no-store',credentials:'same-origin'}),body=await r.json();if(!r.ok||this.current()?.socket!==c.socket)throw Error('OFFLINE');return body;}
 async send(action:DoodleAction):Promise<DoodleEvent>{const c=this.current();if(!c)throw Error('OFFLINE');const r=await c.socket.timeout(4000).emitWithAck('doodle:draw',{roomId:c.roomId,action});if(this.current()?.socket!==c.socket||!r.ok)throw Error(r.error??'OFFLINE');return r.event;}
}
