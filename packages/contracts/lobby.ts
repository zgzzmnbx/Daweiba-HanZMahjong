/** Public lobby is a separate minimal projection, never a room or player snapshot. */
export type TableNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type LobbyTable = Readonly<{
  tableNumber: TableNumber;
  roomId: string | null;
  capacity: number | null;
  occupied: number;
  status: 'EMPTY' | 'WAITING' | 'PLAYING' | 'FINISHED';
  /** Always emitted by current servers; optional for legacy lobby snapshots. No identity IDs. */
  players?: readonly Readonly<{seat:import('./types').SeatIndex;nickname:string;isBotSeat:boolean}>[];
}>;
export type LobbySnapshot = Readonly<{tables: readonly LobbyTable[]}>;
/** Additive field for POST /api/rooms; omitted preserves the legacy private-room API. */
export type PublicTableSelection = Readonly<{tableNumber?: TableNumber}>;
export type CreatePublicRoomRequest = import('./types').CreateRoomRequest & PublicTableSelection;
