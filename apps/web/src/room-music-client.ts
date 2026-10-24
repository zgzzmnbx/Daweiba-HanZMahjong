import type {Socket} from 'socket.io-client';import type {MusicSnapshot,MusicTransport} from '../../../packages/contracts/music';
export class RoomMusicClient implements MusicTransport{
 private listeners=new Set<(s:MusicSnapshot)=>void>();
 constructor(private room:()=>string|undefined){}
 listen(socket:Socket,current:()=>boolean){socket.on('music:state',(state:MusicSnapshot)=>{if(current()&&state.roomId===this.room())for(const fn of this.listeners)fn(state);});}
 subscribe(fn:(s:MusicSnapshot)=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
}
