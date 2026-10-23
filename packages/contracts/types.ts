/** Word Mahjong 1.0.0 — design contract, not a game implementation.
 * Source of truth: docs/01-RULES.md and rules.defaults.json.
 * Compile with strict=true. Brands are created/validated at server boundaries.
 */
declare const brand: unique symbol;
export type Id<K extends string> = string & { readonly [brand]: K };
export type RoomId = Id<'RoomId'>;
export type RoundId = Id<'RoundId'>;
export type PlayerId = Id<'PlayerId'>;
export type TileId = Id<'TileId'>;
export type PhaseId = Id<'PhaseId'>;
export type ActionId = Id<'ActionId'>;
export type ProposalId = Id<'ProposalId'>;
export type ResponseWindowId = Id<'ResponseWindowId'>;
export type DiscardId = Id<'DiscardId'>;
export type SessionId = Id<'SessionId'>;
export type UtcMs = number & { readonly [brand]: 'UtcMs' };
export type StateVersion = number & { readonly [brand]: 'StateVersion' };
export type ControlEpoch = number & { readonly [brand]: 'ControlEpoch' };
export type DraftVersion = number & { readonly [brand]: 'DraftVersion' };
export type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type PlayerCount = 2 | 3 | 4 | 5 | 6;
export type RulesVersion = '1.0.0' | '1.1.0' | '1.2.0';
/** Frozen configuration for this version, loaded from rules.defaults.json at runtime. */
export type RulesDefaults = Readonly<{
  rulesVersion: RulesVersion; deckVersion: 'daily-v1';
  allowDesignatedBots?: boolean;
  playerCounts: readonly [2,3,4,5,6]; handSize: 13; winningTileCount: 14;
  maxCommas: 3; maxEatPerRound: 3;
  eatSource: 'previous_seat_latest_discard';
  eatImmediateDiscardRestriction: 'same_physical_tile';
  turnMs: 60000; responseMs: 8000; composeMs: 45000; voteMs: 45000;
  postHuDiscardMs: 30000; disconnectGraceMs: 15000; botActionDelayMs: 800;
  recoveryMinActionMs: 10000; allOfflineRetentionMs: 86400000;
  reviewerPolicy: 'freeze_other_online_humans_at_vote_start' | 'freeze_other_online_humans_and_designated_bots_at_vote_start';
  approvalPolicy: 'strict_majority'; botMayEat: false; botMayDeclareHu: false;
  /** Disconnected human BOT control never votes. Designated AI may vote only under 1.2.0. */
  designatedBotMayVote?: boolean; aiApprovalProbability?: 0.7;
  botMayVote: false; maxObjectionRanges: 3; rejectButtonLabel: '写的什么玩意';
  deckSizeByPlayers: Readonly<{'2':120; '3':144; '4':168; '5':192; '6':216}>;
}>;
export type AtMostThree<T> = readonly [] | readonly [T] | readonly [T,T] | readonly [T,T,T];
export type Fourteen<T> = readonly [T,T,T,T,T,T,T,T,T,T,T,T,T,T];
export type Tile = Readonly<{ tileId: TileId; char: string }>;
/** One single simplified CJK character; runtime registry validation is required. */
export type Sentence = Readonly<{
  orderedTileIds: Fourteen<TileId>;
  commaAfterTileIds: AtMostThree<TileId>;
}>;
export type Draft = Readonly<{
  orderedTileIds: readonly TileId[];
  commaAfterTileIds: AtMostThree<TileId>;
}>;
/** Runtime: 0 <= start < endExclusive <= 14; sorted, pairwise non-overlapping. */
export type ObjectionRange = Readonly<{ start: number; endExclusive: number }>;
export type Ballot =
  | Readonly<{ choice: 'APPROVE'; objectionRanges?: never }>
  | Readonly<{ choice: 'REJECT'; objectionRanges: AtMostThree<ObjectionRange> }>;
export type Presence = 'HUMAN' | 'DISCONNECTED_GRACE' | 'BOT';
export type Deadline = Readonly<{ endsAt: UtcMs; remainingMsWhenPaused: number | null }>;
export type PhaseHeader = Readonly<{ phaseId: PhaseId; deadline: Deadline | null }>;
export type CandidateSource =
  | Readonly<{ kind: 'SELF'; playerId: PlayerId }>
  | Readonly<{ kind: 'DISCARD'; playerId: PlayerId; discardId: DiscardId;
      responseWindowId: ResponseWindowId; borrowedTileId: TileId }>;
/** Private composition for 13 own tiles + reserved discard; independent of hand draft. */
export type CandidateDraft = Readonly<{
  phaseId: PhaseId; source: Extract<CandidateSource, {kind: 'DISCARD'}>;
  candidateDraftVersion: DraftVersion; sentence: Sentence;
}>;
export type PublicSentence = Readonly<{ sentence: Sentence; tiles: readonly Tile[] }>;
export type AnonymousVoteResult = Readonly<{
  reviewerCount: number; threshold: number; approveCount: number; rejectCount: number;
  abstainCount: number; passed: boolean;
  /** Canonical union of selected character positions, merged into ranges. No author IDs. */
  mergedObjectionRanges: readonly ObjectionRange[];
}>;
export type PublicProposal = Readonly<{
  proposalId: ProposalId; applicantId: PlayerId; source: CandidateSource;
  /** Server time of the public reveal; legacy snapshots may omit it. */
  revealedAt?: UtcMs;
  snapshot: PublicSentence; reviewerCount: number; threshold: number;
  /** Only aggregate progress before settlement; never choices, identities, or ranges. */
  submittedBallotCount: number;
}>;
export type PublicPhase = PhaseHeader & (
  | Readonly<{ kind: 'LOBBY' }>
  | Readonly<{ kind: 'ROOM_CLOSED' }>
  | Readonly<{ kind: 'TURN_ACTION'; actorId: PlayerId; mustDiscard: boolean; isEatTurn: boolean }>
  | Readonly<{ kind: 'DISCARD_RESPONSE'; responseWindowId: ResponseWindowId;
      discardId: DiscardId; discarderId: PlayerId; submittedResponseCount: number }>
  | Readonly<{ kind: 'HU_COMPOSE'; applicantId: PlayerId; source: CandidateSource }>
  | Readonly<{ kind: 'HU_VOTE'; proposal: PublicProposal }>
  | Readonly<{ kind: 'ROUND_FINISHED'; reason: 'WIN' | 'DRAW' | 'EXPIRED' | 'TERMINATED';
      winnerId: PlayerId | null }>
);
export type PublicSuspension =
  | Readonly<{ kind: 'RUNNING' }>
  | Readonly<{ kind: 'PAUSED_CLAIMANT_GRACE'; applicantId: PlayerId; endsAt: UtcMs }>
  | Readonly<{ kind: 'PAUSED_ALL_OFFLINE'; expiresAt: UtcMs }>
  | Readonly<{ kind: 'PAUSED_RECOVERY'; expiresAt: UtcMs }>;
export type PublicPlayer = Readonly<{
  /** Missing in legacy 1.0 rooms means a human-owned seat, even when presence=BOT. */
  isBotSeat?: boolean;
  playerId: PlayerId; seat: SeatIndex; nickname: string; presence: Presence;
  connected: boolean; ready: boolean; handCount: number; eatCount: number; wins: number;
  graceEndsAt: UtcMs | null;
}>;
export type PublicDiscard = Readonly<{
  discardId: DiscardId; playerId: PlayerId; tile: Tile;
  /** Historical entry persists after EAT; only AVAILABLE/RESERVED own the physical tile. */
  status: 'AVAILABLE' | 'RESERVED' | 'CLAIMED';
}>;
export type PublicHistoryEntry = Readonly<{
  /** Frozen proposal rule; omitted only in legacy snapshots, restored from the containing round. */
  rulesVersion?: RulesVersion;
  proposalId: ProposalId; applicantId: PlayerId; source: CandidateSource;
  snapshot: PublicSentence; revealedAt?: UtcMs;
  outcome: 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  result: AnonymousVoteResult | null;
}>;
export type PublicRoomSnapshot = Readonly<{
  visibility: 'PUBLIC'; roomId: RoomId; roundId: RoundId | null;
  stateVersion: StateVersion; rulesVersion: RulesVersion; deckVersion: string;
  /** Bound at room creation. Name and full deck are refreshed only when the next round starts. */
  deckSetId?: string; deckSetName?: string;
  /** Additive public notice: distinguish one-turn timeout from disconnected BOT control. */
  lastAutomaticDiscard?: Readonly<{playerId:PlayerId;at:UtcMs;reason:'TIMEOUT'|'BOT'}> | null;
  practiceMode?: boolean;
  capacity: PlayerCount; closeAfterRound: boolean; hostId: PlayerId; dealerSeat: SeatIndex | null;
  players: readonly PublicPlayer[]; wallRemaining: number;
  phase: PublicPhase; suspension: PublicSuspension;
  discards: readonly PublicDiscard[]; history: readonly PublicHistoryEntry[];
}>;
/** Sent only over this authenticated player's channel, never broadcast. */
export type PrivatePlayerSnapshot = Readonly<{
  visibility: 'PRIVATE_PLAYER'; playerId: PlayerId; controlEpoch: ControlEpoch;
  /** Null only after the non-playing lobby/finished-seat release; choose a vacant seat again. */
  seat: SeatIndex | null;
  basedOnStateVersion: StateVersion;
  hand: readonly Tile[]; draft: Draft; draftVersion: DraftVersion;
  candidateDraft: CandidateDraft | null;
  forbiddenImmediateDiscardTileId: TileId | null;
  ownResponse: 'HU' | 'EAT' | 'PASS' | null;
  ownBallot: Ballot | null; isFrozenReviewer: boolean;
}>;
export type ResyncEnvelope = Readonly<{
  serverNow: UtcMs;
  public: PublicRoomSnapshot; private: PrivatePlayerSnapshot;
  /** Server evaluated legal actions; UI still cannot grant authority. */
  legalActions: readonly ClientCommand['kind'][];
}>;
/** One-time delivery to the authenticated owner; never a session token or public event. */
export type RecoveryCodeDelivery = Readonly<{ recoveryCode: string }>;
export type CommandMeta = Readonly<{
  roomId: RoomId; roundId: RoundId | null; actionId: ActionId;
  expectedStateVersion: StateVersion; phaseId: PhaseId; controlEpoch: ControlEpoch;
}>;
export type ClientCommand = CommandMeta & (
  | Readonly<{ kind: 'READY'; ready: boolean }>
  | Readonly<{ kind: 'START_ROUND' }>
  | Readonly<{ kind: 'ASSIGN_BOT'; seat: SeatIndex }>
  | Readonly<{ kind: 'REMOVE_BOT'; seat: SeatIndex }>
  | Readonly<{ kind: 'SAVE_DRAFT'; draft: Draft; expectedDraftVersion: DraftVersion }>
  | Readonly<{ kind: 'SAVE_CANDIDATE_DRAFT';
      source: Extract<CandidateSource,{kind:'DISCARD'}>;
      expectedCandidateDraftVersion: DraftVersion; sentence: Sentence }>
  | Readonly<{ kind: 'DISCARD'; tileId: TileId }>
  | Readonly<{ kind: 'DECLARE_SELF_HU'; sentence: Sentence }>
  | Readonly<{ kind: 'RESPOND'; responseWindowId: ResponseWindowId;
      response: 'HU' | 'EAT' | 'PASS' }>
  | Readonly<{ kind: 'SUBMIT_DISCARD_SENTENCE'; source: Extract<CandidateSource,{kind:'DISCARD'}>;
      sentence: Sentence }>
  | Readonly<{ kind: 'WITHDRAW_DISCARD_HU'; source: Extract<CandidateSource,{kind:'DISCARD'}> }>
  | Readonly<{ kind: 'VOTE'; proposalId: ProposalId; ballot: Ballot }>
  | Readonly<{ kind: 'ROTATE_RECOVERY_CODE' }>
  | Readonly<{ kind: 'CLOSE_AFTER_ROUND' }>
  | Readonly<{ kind: 'CLOSE_ROOM' }>
  | Readonly<{ kind: 'END_UNSCORED' }>
);
export type CommandErrorCode =
  | 'UNAUTHENTICATED' | 'NOT_ROOM_MEMBER' | 'STALE_CONTROL_EPOCH'
  | 'STALE_STATE_VERSION' | 'STALE_PHASE' | 'WRONG_ROUND' | 'ACTION_ID_REUSED'
  | 'PHASE_CLOSED' | 'NOT_ACTOR' | 'ILLEGAL_TILE' | 'INVALID_SENTENCE'
  | 'INVALID_COMMAS' | 'INVALID_OBJECTIONS' | 'NOT_REVIEWER' | 'ALREADY_RESPONDED'
  | 'ALREADY_VOTED' | 'EAT_NOT_NEXT_SEAT' | 'EAT_LIMIT' | 'EAT_TILE_PROTECTED'
  | 'HU_RETRY_FORBIDDEN' | 'NO_HUMAN_REVIEWER' | 'BOT_ACTION_FORBIDDEN'
  | 'ROUND_IN_PROGRESS' | 'NOT_ALL_READY' | 'ROOM_PAUSED' | 'EXPIRED'
  | 'STALE_DRAFT_VERSION' | 'SEAT_OCCUPIED' | 'INVALID_CAPACITY' | 'AI_NOT_SUPPORTED';
export type CommandResult =
  | Readonly<{ ok: true; actionId: ActionId; stateVersion: StateVersion;
      status: 'APPLIED' | 'RECORDED'; needsResync: boolean }>
  | Readonly<{ ok: false; actionId: ActionId; code: CommandErrorCode;
      stateVersion: StateVersion; needsResync: boolean }>;
export type RestoreRequest = Readonly<{
  actionId: ActionId; roomId: RoomId;
  /** SESSION reads the existing HttpOnly cookie on the server; no token in JS/JSON. */
  proof: { kind: 'SESSION' } | { kind: 'RECOVERY_CODE'; code: string };
}>;
/** Identity restoration precedes possession of a current phase/epoch; no fake meta required. */
export type RestoreResult = Readonly<{ snapshot: ResyncEnvelope }>;
export type CreateRoomRequest = Readonly<{
  actionId: ActionId; capacity: PlayerCount; nickname: string;
  /** Omitted legacy requests choose the global default once, at successful creation. */
  deckSetId?: string;
}>;
export type JoinRoomRequest = Readonly<{
  actionId: ActionId; roomId: RoomId; requestedSeat: SeatIndex; nickname: string;
}>;
export type SeatSessionResult = Readonly<{
  snapshot: ResyncEnvelope; recovery: RecoveryCodeDelivery | null;
}>;
/** HTTP success sets a Secure HttpOnly SameSite cookie as a transport side effect.
 * JSON never contains that cookie value. Local HTTP dev follows deployment guidance.
 */
export type HttpEndpoints = {
  'POST /api/rooms': { request: CreateRoomRequest;
    response: SeatSessionResult & { recovery: RecoveryCodeDelivery } };
  'POST /api/rooms/:roomId/join': { request: JoinRoomRequest; response: SeatSessionResult };
  'POST /api/rooms/:roomId/restore': { request: RestoreRequest; response: RestoreResult };
  'GET /api/rooms/:roomId/snapshot': { request: Readonly<{ roomId: RoomId }>; response: ResyncEnvelope };
};
/** Cookie-authenticated same-origin Socket handshake; no client-supplied player identity. */
export type ClientSocketEvent =
  | Readonly<{ type: 'COMMAND'; command: ClientCommand }>
  | Readonly<{ type: 'RESYNC'; roomId: RoomId; lastSeenStateVersion: StateVersion | null }>;
export type ServerSocketEvent =
  | Readonly<{ type: 'PUBLIC_SNAPSHOT'; serverNow: UtcMs; snapshot: PublicRoomSnapshot }>
  | Readonly<{ type: 'RESYNC'; payload: ResyncEnvelope }>
  | Readonly<{ type: 'PRIVATE_SNAPSHOT'; serverNow: UtcMs; snapshot: PrivatePlayerSnapshot }>
  | Readonly<{ type: 'COMMAND_RESULT'; result: CommandResult }>
  | Readonly<{ type: 'RECOVERY_CODE'; actionId: ActionId; delivery: RecoveryCodeDelivery }>
  | Readonly<{ type: 'CONTROL_REVOKED'; reason: 'RESTORED_ELSEWHERE' | 'ADMIN_KICKED' }>
  | Readonly<{ type: 'ERROR'; code: CommandErrorCode; serverNow: UtcMs }>;

// SERVER ONLY: keep in the server build graph; never JSON.stringify this object to clients.
export namespace ServerOnly {
  export type AuthenticatedActor = Readonly<{ playerId: PlayerId; sessionId: SessionId }>;
  export type TileOwner =
    | Readonly<{ kind: 'WALL'; index: number }>
    | Readonly<{ kind: 'HAND'; playerId: PlayerId }>
    | Readonly<{ kind: 'DISCARD'; discardId: DiscardId }>;
  export type FrozenReview = {
    reviewerIds: readonly PlayerId[];
    ballotsByReviewer: Map<PlayerId, Ballot>;
    startedAt: UtcMs; deadlineAt: UtcMs;
  };
  export type FrozenResponse = {
    windowId: ResponseWindowId; discardId: DiscardId; discarderId: PlayerId;
    eligiblePlayerIds: readonly PlayerId[];
    intentsByPlayer: Map<PlayerId, 'HU'|'EAT'|'PASS'>;
    huQueue: readonly PlayerId[]; registeredEaterId: PlayerId | null;
  };
  export type PlayerSecretState = {
    credentialHash: string; recoveryCodeHash: string;
    activeSessionId: SessionId | null; controlEpoch: ControlEpoch;
    handTileIds: TileId[]; draft: Draft; draftVersion: DraftVersion;
    candidateDraft: CandidateDraft | null;
  };
  export type ActionReceipt = Readonly<{
    playerId: PlayerId; actionId: ActionId; canonicalPayloadHash: string;
    result: CommandResult; committedAt: UtcMs;
  }>;
  export type TimerBase = Readonly<{
    jobId: string; actionId: ActionId; roomId: RoomId; roundId: RoundId | null;
    processGeneration: string; fireAt: UtcMs;
  }>;
  export type TimerJob = TimerBase & (
    | Readonly<{ kind: 'TURN_TIMEOUT' | 'RESPONSE_END' | 'COMPOSE_END' | 'VOTE_END';
        gate: 'PHASE'; roundId: RoundId; phaseId: PhaseId }>
    | Readonly<{ kind: 'BOT_DISCARD'; gate: 'PHASE_AND_CONTROL'; phaseId: PhaseId;
        roundId: RoundId; playerId: PlayerId; expectedControlEpoch: ControlEpoch; expectedPresence: 'BOT' }>
    | Readonly<{ kind: 'GRACE_END'; gate: 'CONTROL_AND_GRACE'; playerId: PlayerId;
        expectedControlEpoch: ControlEpoch; graceEndsAt: UtcMs }>
    | Readonly<{ kind: 'RETENTION_END'; gate: 'PAUSE_AND_EXPIRY';
        expectedPause: 'PAUSED_ALL_OFFLINE' | 'PAUSED_RECOVERY'; expiresAt: UtcMs }>
    | Readonly<{ kind: 'AI_EMPTY_END'; gate: 'AI_EMPTY_DEADLINE'; autoCloseAt: UtcMs }>
  );
  /** Complete persisted aggregate, including exact RNG state and pending continuation. */
  export type RoomAggregate = {
    /** Additive codec fields; absent legacy values mean daily-v1 and no existing AI lease. */
    roundDeck?: import('./deck').DeckSnapshot;
    aiAutoCloseAt?: UtcMs | null;
    publicView: PublicRoomSnapshot;
    tiles: Map<TileId, Tile>; ownership: Map<TileId, TileOwner>;
    wallOrder: readonly TileId[]; wallCursor: number;
    players: Map<PlayerId, PlayerSecretState>;
    response: FrozenResponse | null; review: FrozenReview | null;
    receipts: Map<string, ActionReceipt>; settlementIds: Set<string>;
    rngState: string; processGeneration: string;
    /** Must survive JSON persistence via an explicit array-based codec. */
    pendingJobs: readonly TimerJob[];
    /** Persist remaining phase ms and applicant withdrawal for restart/all-offline pause. */
    pausedRemainingMs: number | null; pendingApplicantWithdrawal: boolean;
  };
  /** Explicitly restricted AI input; never pass RoomAggregate to the policy. */
  export type BotPolicyInput = Readonly<{
    ownHand: readonly Tile[]; publicView: PublicRoomSnapshot;
    protectedTileId: TileId | null; connectionWeights: Readonly<Record<string,number>>;
    replayableRngState: string;
  }>;
  /** JSON DTO: Map/Set must be converted explicitly, never JSON.stringify(RoomAggregate). */
  export type RoomAggregateDTO = Omit<RoomAggregate,
    'tiles' | 'ownership' | 'players' | 'response' | 'review' | 'receipts' | 'settlementIds'> & {
      codecVersion: 1;
      tiles: readonly (readonly [TileId, Tile])[];
      ownership: readonly (readonly [TileId, TileOwner])[];
      players: readonly (readonly [PlayerId, PlayerSecretState])[];
      response: (Omit<FrozenResponse, 'intentsByPlayer'> & {
        intentsByPlayer: readonly (readonly [PlayerId, 'HU'|'EAT'|'PASS'])[];
      }) | null;
      review: (Omit<FrozenReview, 'ballotsByReviewer'> & {
        ballotsByReviewer: readonly (readonly [PlayerId, Ballot])[];
      }) | null;
      receipts: readonly (readonly [string, ActionReceipt])[];
      settlementIds: readonly string[];
    };
}
