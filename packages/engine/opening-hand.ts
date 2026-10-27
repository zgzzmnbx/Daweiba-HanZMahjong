import type {DeckSnapshot} from '../contracts/deck';
import type {PlayerCount,Tile,TileId} from '../contracts/types';
import {isNominalTile,tilePartOfSpeech} from './tile-pos';
/** Pools are disjoint, so this condition is both necessary and sufficient for every seat. */
export function supportsPosOpening(deck:DeckSnapshot,capacity:PlayerCount){
 let nominals=0,verbs=0;for(const e of deck.entries){const copies=e.copiesByPlayers[String(capacity) as '2'];if(isNominalTile(e.char))nominals+=copies;else if(tilePartOfSpeech(e.char)==='verb')verbs+=copies;}
 return nominals>=capacity*2&&verbs>=capacity;
}
/** Reorder only existing entities in an already shuffled wall. First three dealing passes are S/V/O;
 * the untouched residual order provides every other initial tile and all later draws. */
export function posOpeningWall(wall:readonly TileId[],tiles:ReadonlyMap<TileId,Tile>,capacity:PlayerCount):TileId[]{
 const nominal:TileId[]=[],verbs:TileId[]=[];
 for(const id of wall){const char=tiles.get(id)!.char;if(isNominalTile(char))nominal.push(id);else if(tilePartOfSpeech(char)==='verb')verbs.push(id);}
 if(nominal.length<capacity*2||verbs.length<capacity)throw new Error('INSUFFICIENT_OPENING_POS');
 const reserved=[...nominal.slice(0,capacity),...verbs.slice(0,capacity),...nominal.slice(capacity,capacity*2)],used=new Set(reserved);
 return [...reserved,...wall.filter(id=>!used.has(id))];
}
