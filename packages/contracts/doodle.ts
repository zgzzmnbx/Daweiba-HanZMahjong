/** Coordinates belong to the shared felt plane, never to a browser viewport. */
export type DoodlePoint=readonly [number,number];
export const DOODLE_COLORS=['#ffe4a3','#f7f2db','#7cdbed','#f5a1b9','#b9ec95'] as const;
export type DoodleStroke={id:string;seat:number;nickname:string;color:string;width:number;points:DoodlePoint[];seq:number;done:boolean};
export type DoodleBoard={revision:number;strokes:DoodleStroke[]};
export type DoodleEvent={roomId:string;revision:number;stroke?:DoodleStroke;removed:string[]};
export type DoodleAction={kind:'draw';id:string;seq:number;color:string;width:number;points:DoodlePoint[];done:boolean}|{kind:'undo'|'clear';id:string};
export interface DoodleTransport{subscribe(fn:(e:DoodleEvent)=>void):()=>void;history(signal:AbortSignal):Promise<DoodleBoard>;send(action:DoodleAction):Promise<DoodleEvent>;}
export const DOODLE_MAX_POINTS=160;
export const DOODLE_MAX_STROKES=48;
