export type DeckCounts = Readonly<Record<'2'|'3'|'4'|'5'|'6',number>>;
export type DeckEntry = Readonly<{char:string;copiesByPlayers:DeckCounts}>;
/** Administration configuration, not a future wall order or any player's hand. */
export type DeckSnapshot = Readonly<{
 revision:number;version:string;entries:readonly DeckEntry[];totals:DeckCounts;
}>;
export type SaveDeckRequest = Readonly<{expectedRevision:number;entries:readonly DeckEntry[]}>;
export type DeckSetSnapshot = DeckSnapshot & Readonly<{id:string;name:string}>;
export type DeckSetSummary = Readonly<{
 id:string;name:string;revision:number;version:string;totals:DeckCounts;charCount:number;
}>;
/** Public configuration metadata only, never complete entries or shuffled walls. */
export type DeckSetCatalog = Readonly<{revision:number;defaultSetId:string;sets:readonly DeckSetSummary[]}>;
export type CreateDeckSetRequest = Readonly<{actionId:string;name:string;sourceSetId:string;expectedCatalogRevision:number}>;
export type SaveDeckSetRequest = SaveDeckRequest & Readonly<{name:string}>;
export type SetDefaultDeckSetRequest = Readonly<{expectedCatalogRevision:number;setId:string}>;
