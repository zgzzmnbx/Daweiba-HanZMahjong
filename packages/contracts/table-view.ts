/** Word Mahjong UI adoption contract 1.1.0. GAME RULES remain 1.0.0.
 * Display adapter only; no Three.js, hidden aggregate, RNG, rules engine or I/O.
 * Implementations must preserve docs/01 + contracts/types.ts unchanged.
 */
import type {
  PublicRoomSnapshot, PrivatePlayerSnapshot, PublicPhase, PublicSuspension,
  PublicPlayer, PublicDiscard, PublicSentence, Tile, TileId, PlayerId,
  RoomId, RoundId, PhaseId, StateVersion, ControlEpoch, DraftVersion,
  PlayerCount, SeatIndex, Draft, CandidateSource, ProposalId, ObjectionRange,
} from './types';

/** No session token, restore code, opponent hand, wall order or ServerOnly input. */
export type TableProjectionInput = Readonly<{
  public: PublicRoomSnapshot;
  /** Must be the authenticated viewer's snapshot; never another player's. */
  self: PrivatePlayerSnapshot;
}>;
export type RelativeSeat = 0 | 1 | 2 | 3 | 4 | 5;
export type SeatRelation = 'SELF' | 'NEXT' | 'PREVIOUS' | 'NEXT_AND_PREVIOUS' | 'OTHER';
/** Astra owns 2–6 seat templates. Coordinates are presentation, never game order. */
export type SeatPlacement = Readonly<{
  x: number; y: number; z: number; yawRadians: number;
  labelAnchor: Readonly<{ x: number; y: number }>;
}>;
export type SeatTemplate = (
  count: PlayerCount, relativeSeat: RelativeSeat,
  viewport: Readonly<{ width: number; height: number }>,
) => SeatPlacement;
export type SeatView = Readonly<{
  player: PublicPlayer | null; logicalSeat: SeatIndex; relativeSeat: RelativeSeat;
  relation: SeatRelation; placement: SeatPlacement;
  /** Procedural generic backs/count only. No per-hidden-card identity is exposed. */
  concealed: Readonly<{ kind: 'COUNT_AND_GENERIC_BACKS'; count: number }>;
}>;
/** Key each face mesh/DOM card by tileId + zone (never char/index).
 * Char textures may be cached by font+char, but mesh selection stays physical tileId.
 */
export type VisibleTile = Tile & Readonly<{
  visualKey: string;
  exposure: 'OWN_HAND' | 'PUBLIC_DISCARD' | 'PUBLIC_SENTENCE' | 'BORROWED_REFERENCE';
}>;
export type RackCell = Readonly<{
  tile: VisibleTile; position: number; row: number; column: number;
  commaAfter: boolean; borrowedReference: boolean; forbiddenToDiscard: boolean;
}>;
export type RackView = Readonly<{
  owner: 'DOM_SENTENCE_RACK';
  mode: 'OWN_DRAFT' | 'DISCARD_CANDIDATE';
  /** Ordinary hand remains 13 when candidate contains 13 + borrowed reference. */
  ownedHandCount: number; cells: readonly RackCell[];
  source: Extract<CandidateSource, { kind: 'DISCARD' }> | null;
  /** Normal-hand version stays independent even while a candidate is visible. */
  draftVersion: DraftVersion; candidateDraftVersion: DraftVersion | null;
  commaUsed: number; commaAvailable: number;
  /** Desktop default: real 3D faces with a transparent projected DOM hit/a11y layer.
   * The one SentenceRackController owns draft/input/commands. Reproject DOM hit bounds
   * on camera/viewport/mesh changes before enabling selection; disable mismatched targets.
   * In visible DOM edit mode hide the corresponding own 3D hand; mobile uses visible DOM.
   * WebGL itself is aria-hidden, nonfocusable and never independently raycastable. */
  webglMirror: 'DECORATIVE_NON_INTERACTIVE';
}>;
export type WallView = Readonly<{
  kind: 'COUNT_ONLY'; count: number;
  /** Any shown wall blocks are anonymous decoration, unrelated to future draws. */
  decoration: 'GENERIC_BACKS';
}>;
export type PublishedSentenceView = Readonly<{
  proposalId: ProposalId; snapshot: PublicSentence;
  /** Settled anonymous merged ranges only; during HU_VOTE this is empty.
   * Pending local objection selection belongs to SentenceRackController, not public state.
   * Positions use frozen 14-character order; punctuation has no character index. */
  objectionRanges: readonly ObjectionRange[];
}>;
export type ViewStamp = Readonly<{
  roomId: RoomId; roundId: RoundId | null; phaseId: PhaseId;
  publicRevision: StateVersion; controlEpoch: ControlEpoch;
  draftVersion: DraftVersion; candidateDraftVersion: DraftVersion | null;
  /** Local monotonic counter, including pause/fallback changes and any reproject. */
  renderRevision: number;
}>;
export type TableView = Readonly<{
  stamp: ViewStamp; viewerId: PlayerId;
  phase: PublicPhase; suspension: PublicSuspension; // keep separate, verbatim
  seats: readonly SeatView[]; wall: WallView;
  discards: readonly PublicDiscard[]; rack: RackView | null;
  /** Only public proposal/history may supply revealed opponents' sentences. */
  publicSentence: PublishedSentenceView | null;
}>;
export type ProjectionResult =
  | Readonly<{ kind: 'READY'; view: TableView }>
  | Readonly<{ kind: 'WAIT_FOR_COHERENT_RESYNC'; reason:
      'UNKNOWN_VIEWER' | 'SEAT_MISMATCH' | 'VERSION_MISMATCH' | 'INVALID_PRIVATE_DRAFT' }>;
export interface TableViewAdapter {
  /** No commands/timers/ownership writes. Return a fresh immutable projection.
   * Full projection requires self.basedOnStateVersion === public.stateVersion.
   * Transport buffers partial PUBLIC/PRIVATE packets then requests coherent RESYNC;
   * it may update read-only public status immediately, never combine unknown hand versions.
   * self.seat=null is legitimate after idle-seat release: rack=null, seat-choice overlay.
   * An unseated viewer need not appear in public.players; use a neutral origin for layout,
   * never label logical seat 0 SELF. UNKNOWN_VIEWER applies to a non-null claimed seat.
   */
  project(input: TableProjectionInput, placement: SeatTemplate, renderRevision: number): ProjectionResult;
}

export function relativeSeat(seat: SeatIndex, mySeat: SeatIndex, n: PlayerCount): RelativeSeat {
  if (seat >= n || mySeat >= n) throw new RangeError('seat outside frozen capacity');
  return ((seat - mySeat + n) % n) as RelativeSeat;
}
export function relationFor(relative: RelativeSeat, n: PlayerCount): SeatRelation {
  if (relative >= n) throw new RangeError('relative seat outside frozen capacity');
  if (relative === 0) return 'SELF';
  if (n === 2) return 'NEXT_AND_PREVIOUS';
  if (relative === 1) return 'NEXT';
  return relative === n - 1 ? 'PREVIOUS' : 'OTHER';
}
/** UI-only reconciliation of a server-confirmed own-hand draft, never tile ownership.
 * Keep surviving IDs in user order, append new owned IDs once, prune invalid commas.
 */
export function reconcileOwnDraft(hand: readonly Tile[], draft: Draft): Draft {
  const legal = new Set(hand.map(t => t.tileId));
  if (legal.size !== hand.length) throw new Error('duplicate physical tileId');
  const seen = new Set<TileId>();
  const orderedTileIds: TileId[] = [];
  for (const id of [...draft.orderedTileIds, ...hand.map(t => t.tileId)]) {
    if (legal.has(id) && !seen.has(id)) { seen.add(id); orderedTileIds.push(id); }
  }
  const last = orderedTileIds[orderedTileIds.length - 1];
  const commas = [...new Set(draft.commaAfterTileIds)].filter(id => legal.has(id) && id !== last);
  if (commas.length > 3) throw new Error('invalid comma count');
  let commaAfterTileIds: Draft['commaAfterTileIds'];
  switch (commas.length) {
    case 0: commaAfterTileIds = []; break;
    case 1: commaAfterTileIds = [commas[0]!]; break;
    case 2: commaAfterTileIds = [commas[0]!, commas[1]!]; break;
    case 3: commaAfterTileIds = [commas[0]!, commas[1]!, commas[2]!]; break;
    default: throw new Error('invalid comma count');
  }
  return { orderedTileIds, commaAfterTileIds };
}
export type MobileRackMetrics = Readonly<{
  viewport: 390 | 430; columns: 7; tileWidth: number; tileHeight: number;
  gap: number; padding: number; commaAddsWidth: 0; minAlternativeTarget: 44;
}>;
export const MOBILE_RACK_METRICS: readonly MobileRackMetrics[] = [
  { viewport: 390, columns: 7, tileWidth: 44, tileHeight: 58, gap: 8, padding: 17,
    commaAddsWidth: 0, minAlternativeTarget: 44 },
  { viewport: 430, columns: 7, tileWidth: 48, tileHeight: 62, gap: 9, padding: 20,
    commaAddsWidth: 0, minAlternativeTarget: 44 },
];
/** Commas are overlays in reserved trailing/bottom card whitespace, never grid columns.
 * Cross-row anchor at position 6 remains after that left tile; not before row 2.
 * Font glyph >=28 CSS px; use DOM card menus/44px targets for narrow gap operations.
 */
export function mobileCell(position: number): Readonly<{ row: number; column: number }> {
  if (!Number.isInteger(position) || position < 0 || position >= 14) throw new RangeError('position');
  return { row: Math.floor(position / 7), column: position % 7 };
}

/** Presentation effect requests are derived AFTER authoritative snapshot reduction.
 * They have no ack, ownership-transfer callback, command dispatch or rule transition.
 */
export type VisualEffect = Readonly<{
  stamp: ViewStamp;
  kind: 'OWN_DRAW' | 'OPPONENT_DRAW_BACK' | 'DISCARD' | 'EAT_REFERENCE_MOVE' |
    'PUBLIC_SENTENCE_REVEAL' | 'ROUND_RESULT';
  tileId: TileId | null; // null for opponent draw/back; never guess the next tile
  maxDurationMs: number;
}>;
export function sameViewStamp(a: ViewStamp, b: ViewStamp): boolean {
  return a.roomId === b.roomId && a.roundId === b.roundId && a.phaseId === b.phaseId &&
    a.publicRevision === b.publicRevision && a.controlEpoch === b.controlEpoch &&
    a.draftVersion === b.draftVersion && a.candidateDraftVersion === b.candidateDraftVersion &&
    a.renderRevision === b.renderRevision;
}
export interface PresentationController {
  /** On every snapshot/pause/restore/round change: cancel old effects, snap to latest view,
   * then optionally begin new stamped effects. This happens before the next animation frame.
   */
  replaceView(view: TableView): void;
  play(effect: VisualEffect): void;
  /** Completion is allowed only when sameViewStamp(effect.stamp,current.stamp).
   * Completion may clean cosmetic resources only; it never changes snapshots/drafts/actions.
   */
  cancelAll(reason: 'NEW_VIEW' | 'PAUSE' | 'RESTORE' | 'CONTEXT_LOST' | 'UNMOUNT'): void;
  dispose(): void;
}
export type RenderMode =
  | Readonly<{ kind: 'THREE_D' }>
  | Readonly<{ kind: 'DOM_FALLBACK'; cause: 'WEBGL_UNAVAILABLE' | 'CONTEXT_LOST' |
      'FONT_OR_ASSET_FAILURE' | 'USER_CHOICE'; canRetry3D: boolean }>;
/** RenderMode never changes game phase/presence/epoch. Context loss pauses drawing,
 * not the server. DOM rack, public table/status and actions remain available.
 * A manual retry rebuilds all resources from newest snapshots, never replays commands.
 * Legal action buttons are a separate transport concern: intersect ResyncEnvelope.legalActions
 * with current connection/control/pause/pending gates; DISCONNECT removes destructive actions.
 * SAVE_DRAFT has independent version semantics (S77); do not reuse animation stamp equality
 * as server draft-command authorization. No local deadline can settle a game.
 */
