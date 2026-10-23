import source from '../../handoff/fixtures/deck.daily-v1.json';
import type {DeckCounts,DeckEntry,DeckSnapshot,DeckSetSnapshot} from '../contracts/deck';
export const classicDeckSetId='classic';
const counts=['2','3','4','5','6'] as const;
export const isHanChar=(value:unknown):value is string=>typeof value==='string'&&/^\p{Unified_Ideograph}$/u.test(value);
/** Shared validation for trusted START injection and administrator writes. No implicit coercion. */
export function validateDeckEntries(value:unknown):{entries:DeckEntry[];totals:DeckCounts}{
 if(!Array.isArray(value)||value.length<1||value.length>500)throw new Error('INVALID_DECK');
 const totals={'2':0,'3':0,'4':0,'5':0,'6':0},seen=new Set<string>();
 const entries=value.map(entry=>{
  if(!entry||typeof entry!=='object'||Object.keys(entry).some(k=>!['char','copiesByPlayers'].includes(k))||!isHanChar(entry.char)||seen.has(entry.char))throw new Error('INVALID_DECK');
  seen.add(entry.char);const copies=entry.copiesByPlayers;
  if(!copies||typeof copies!=='object'||Array.isArray(copies)||Object.keys(copies).length!==5||counts.some(n=>!Number.isInteger(copies[n])||copies[n]<0||copies[n]>20))throw new Error('INVALID_DECK');
  const copiesByPlayers={} as Record<typeof counts[number],number>;
  for(const n of counts){copiesByPlayers[n]=copies[n];totals[n]+=copies[n];}
  return{char:entry.char,copiesByPlayers};
 });
 for(const n of counts)if(totals[n]<13*Number(n)+1+20||totals[n]>1000)throw new Error('INVALID_DECK');
 return{entries,totals};
}
export const initialDeck:DeckSnapshot={revision:0,version:'daily-v1',...validateDeckEntries(source.entries.map(({char,copiesByPlayers})=>({char,copiesByPlayers})))};
export function validateDeck(deck:DeckSnapshot){
 const classicVersion=deck.revision===0?'daily-v1':`managed-r${deck.revision}`;
 const named=deck as Partial<DeckSetSnapshot>;
 if(!Number.isSafeInteger(deck.revision)||deck.revision<0||(deck.version!==classicVersion&&!(typeof deck.version==='string'&&new RegExp(`^set-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-r${deck.revision}$`).test(deck.version))))throw new Error('INVALID_DECK');
 if(named.id!==undefined&&(typeof named.id!=='string'||typeof named.name!=='string'||named.name.trim()!==named.name||[...named.name].length<1||[...named.name].length>30||(named.id===classicDeckSetId?deck.version!==classicVersion:deck.version!==`${named.id}-r${deck.revision}`)))throw new Error('INVALID_DECK_SET_METADATA');
 const checked=validateDeckEntries(deck.entries);if(counts.some(n=>checked.totals[n]!==deck.totals[n]))throw new Error('INVALID_DECK');return checked;
}
