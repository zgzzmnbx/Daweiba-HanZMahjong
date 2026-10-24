export type MusicTrack={id:string;title:string;durationMs:number;source:'DEFAULT'|'UPLOAD'};
export type MusicSnapshot={roomId:string;revision:number;serverNow:number;startedAt:number;track:MusicTrack|null;tracks:MusicTrack[];changedBy:string};
export const MUSIC_MAX_BYTES=15*1024*1024,MUSIC_MAX_TRACKS=12;
/** Resolve a shared looping playlist from an authoritative time anchor. */
export function musicPosition(tracks:MusicTrack[],trackId:string,startedAt:number,now:number){
 if(!tracks.length)return{track:null,startedAt:now};const first=Math.max(0,tracks.findIndex(t=>t.id===trackId)),cycle=tracks.reduce((n,t)=>n+t.durationMs,0);let elapsed=Math.max(0,now-startedAt),start=startedAt+Math.floor(elapsed/cycle)*cycle;elapsed%=cycle;
 for(let i=0;i<tracks.length;i++){const track=tracks[(first+i)%tracks.length];if(elapsed<track.durationMs)return{track,startedAt:start};elapsed-=track.durationMs;start+=track.durationMs;}
 return{track:tracks[first],startedAt:start};
}
export type MusicTransport={subscribe:(fn:(snapshot:MusicSnapshot)=>void)=>()=>void};
