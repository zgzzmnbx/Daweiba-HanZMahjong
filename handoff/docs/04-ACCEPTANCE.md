# 验收规范 · 文字麻将 V1.0.0

这是待实施服务和UI的验收清单，不是已实现或已通过的游戏测试结果。规则权威为01-RULES.md与rules.defaults.json。机器可读输入见 `../fixtures/scenario-cases.json`；固定数学/形式夹具另见 vote-cases.json、sentence-cases.json、deck.daily-v1.json。

## 验收层次与运行方法

1. `python3 checks/validate-fixtures.py` 只验证本交接包的JSON结构、牌库总数、数学阈值、形式案例和文档索引一致性。它不连接游戏服务。
2. Sol落实服务后，为scenario每个case构建独立房间状态，通过真实命令入口、可控服务器时钟、持久层和网络断连运行。不得用scenario.expected作为实现返回值。
3. Astra在2、3、4、5、6人桌面与触摸尺寸分别验证布局、键盘操作、反对选区和恢复提示；网络截获检查与服务端断言共同验证隐私。
4. 多客户端真实联机、进程重启、事务故障和两房间隔离是发布门槛；静态原型和本校验脚本不能替代。

## 高风险GIVEN / WHEN / THEN

每个场景的编号、规则和可机器断言字段与JSON同源。表内多个独立输入必须分别复位执行。

### S02-seat-cycle

规则：U1, U3, R-003；标签：seat-cycle, eat, 2-6-players。

**GIVEN** `{"playerCount":2,"discarderSeats":[0,1],"allOnline":true,"eatCounts":0}`。

**WHEN** 逐个测试每一弃牌者，分别由各个其他座位请求EAT。

**THEN** 仅next(discarder)成功；末座回0；渲染旋转不改变判定。

必须断言：`{"nextSeatByDiscarder":[1,0],"previousSeatBySeat":[1,0],"nonNextError":"EAT_NOT_NEXT_SEAT"}`。

### S03-seat-cycle

规则：U1, U3, R-003；标签：seat-cycle, eat, 2-6-players。

**GIVEN** `{"playerCount":3,"discarderSeats":[0,1,2],"allOnline":true,"eatCounts":0}`。

**WHEN** 逐个测试每一弃牌者，分别由各个其他座位请求EAT。

**THEN** 仅next(discarder)成功；末座回0；渲染旋转不改变判定。

必须断言：`{"nextSeatByDiscarder":[1,2,0],"previousSeatBySeat":[2,0,1],"nonNextError":"EAT_NOT_NEXT_SEAT"}`。

### S04-seat-cycle

规则：U1, U3, R-003；标签：seat-cycle, eat, 2-6-players。

**GIVEN** `{"playerCount":4,"discarderSeats":[0,1,2,3],"allOnline":true,"eatCounts":0}`。

**WHEN** 逐个测试每一弃牌者，分别由各个其他座位请求EAT。

**THEN** 仅next(discarder)成功；末座回0；渲染旋转不改变判定。

必须断言：`{"nextSeatByDiscarder":[1,2,3,0],"previousSeatBySeat":[3,0,1,2],"nonNextError":"EAT_NOT_NEXT_SEAT"}`。

### S05-seat-cycle

规则：U1, U3, R-003；标签：seat-cycle, eat, 2-6-players。

**GIVEN** `{"playerCount":5,"discarderSeats":[0,1,2,3,4],"allOnline":true,"eatCounts":0}`。

**WHEN** 逐个测试每一弃牌者，分别由各个其他座位请求EAT。

**THEN** 仅next(discarder)成功；末座回0；渲染旋转不改变判定。

必须断言：`{"nextSeatByDiscarder":[1,2,3,4,0],"previousSeatBySeat":[4,0,1,2,3],"nonNextError":"EAT_NOT_NEXT_SEAT"}`。

### S06-seat-cycle

规则：U1, U3, R-003；标签：seat-cycle, eat, 2-6-players。

**GIVEN** `{"playerCount":6,"discarderSeats":[0,1,2,3,4,5],"allOnline":true,"eatCounts":0}`。

**WHEN** 逐个测试每一弃牌者，分别由各个其他座位请求EAT。

**THEN** 仅next(discarder)成功；末座回0；渲染旋转不改变判定。

必须断言：`{"nextSeatByDiscarder":[1,2,3,4,5,0],"previousSeatBySeat":[5,0,1,2,3,4],"nonNextError":"EAT_NOT_NEXT_SEAT"}`。

### S10-start-all-ready

规则：R-001, R-004；标签：start, deal。

**GIVEN** `{"playerCounts":[2,3,4,5,6],"allSeatsHuman":true,"allReady":true}`。

**WHEN** 房主开始新局。

**THEN** 庄家14其余13，固定座次与版本，余牌精确。

必须断言：`{"dealtByPlayers":{"2":27,"3":40,"4":53,"5":66,"6":79},"wallByPlayers":{"2":93,"3":104,"4":115,"5":126,"6":137},"phase":"TURN_ACTION"}`。

### S11-no-bot-fill

规则：R-001；标签：start, bot。

**GIVEN** `{"capacity":4,"humanSeats":3,"emptySeats":1}`。

**WHEN** 尝试由AI填空位开局。

**THEN** 拒绝且不发牌。

必须断言：`{"error":"NOT_ALL_READY","dealt":0}`。

### S12-freeze-seats

规则：R-002；标签：identity, seat。

**GIVEN** `{"roundStarted":true}`。

**WHEN** 新真人试图入座，或房主试图中途改人数换座。

**THEN** 显示本局进行中，座次容量版本不变。

必须断言：`{"error":"ROUND_IN_PROGRESS","seatMutationCount":0}`。

### S13-normal-auto-draw

规则：R-020, R-021；标签：turn, draw。

**GIVEN** `{"phaseBefore":"DISCARD_RESPONSE","nextHandCount":13,"wallRemaining":5,"noClaims":true}`。

**WHEN** 响应结束开始普通回合。

**THEN** 服务端恰好摸1张、14张且60秒行动。

必须断言：`{"phase":"TURN_ACTION","handCount":14,"wallRemaining":4,"turnMs":60000,"drawCount":1}`。

### S14-no-extra-draw

规则：R-004, R-020, R-025；标签：turn, eat, draw。

**GIVEN** `{"turnSources":["DEALER_FIRST","EAT"],"handCount":14}`。

**WHEN** 进入对应行动阶段。

**THEN** 不额外摸第15张。

必须断言：`{"handCount":14,"drawCount":0}`。

### S15-response-gates-next-draw

规则：R-021；标签：response, draw。

**GIVEN** `{"responseWindowOpen":true,"responseMs":8000}`。

**WHEN** 下一家试图摸牌或先出牌。

**THEN** 响应结束前不能摸牌或行动。

必须断言：`{"earlyDrawCount":0,"illegalDiscardCount":0}`。

### S16-concurrent-responses

规则：R-022, R-023, I-03；标签：concurrency, phase-gate。

**GIVEN** `{"phaseId":"phase-r1","stateVersion":100,"responses":[{"playerId":"p1","expectedStateVersion":100,"intent":"HU"},{"playerId":"p2","expectedStateVersion":100,"intent":"HU"}]}`。

**WHEN** 同窗两个玩家的响应依次进入队列，首个使全局版本递增。

**THEN** 第二个不能仅因版本落后拒绝；二人都记录，按座次排队。

必须断言：`{"recordedResponseCount":2,"staleVersionRejectionCount":0}`。

### S17-hu-priority-seat-order

规则：R-023, R-024；标签：response, hu-priority。

**GIVEN** `{"playerCount":6,"discarderSeat":4,"intents":{"5":"HU","0":"EAT","2":"HU","3":"HU"}}`。

**WHEN** 冻结合法申请；先过滤不合法EAT，再按座次处理HU。

**THEN** HU顺序5、2、3；不能按到包先后。

必须断言：`{"huQueueSeats":[5,2,3],"invalidEatSeat":0,"registeredEaterSeat":null}`。

### S18-eat-after-hu-fail

规则：R-024, R-025；标签：response, eat。

**GIVEN** `{"playerCount":4,"discarderSeat":0,"registeredEaterSeat":1,"huQueueSeats":[2,3],"allHuFailed":true,"eaterHandCount":13}`。

**WHEN** 处理完失败HU队列。

**THEN** 执行原登记EAT，转移同一弃牌一次，不再摸牌。

必须断言：`{"actorSeat":1,"handCount":14,"eatCountDelta":1,"tileTransferCount":1,"drawCount":0}`。

### S19-no-late-claim

规则：R-022, R-024；标签：response, hidden-information。

**GIVEN** `{"responseFrozen":true,"candidateRevealed":true}`。

**WHEN** 此前PASS者现在补报HU或EAT。

**THEN** 拒绝且不重开窗口。

必须断言：`{"error":"PHASE_CLOSED","newClaimCount":0}`。

### S20-intent-once

规则：R-022, R-024；标签：response, idempotency。

**GIVEN** `{"recordedIntent":"HU","candidateFailed":true}`。

**WHEN** 同一人改报EAT或PASS。

**THEN** 不得变更最终意向。

必须断言：`{"newIntentAccepted":false}`。

### S21-eat-tile-protection

规则：U1, R-025；标签：eat, physical-tile。

**GIVEN** `{"handContains":[{"tileId":"a","char":"的"},{"tileId":"b","char":"的"}],"justEatenTileId":"a"}`。

**WHEN** 先打a，再在独立复位场景打b。

**THEN** a拒绝，b合法；按实体ID而非汉字。

必须断言：`{"aError":"EAT_TILE_PROTECTED","bAccepted":true}`。

### S22-eat-limit

规则：R-022, R-025；标签：eat, limit。

**GIVEN** `{"eatCount":3,"isNextSeat":true}`。

**WHEN** 登记第4次EAT。

**THEN** 拒绝且吃次数与牌权不变。

必须断言：`{"error":"EAT_LIMIT","eatCount":3}`。

### S23-idempotent-eat

规则：I-01, I-03；标签：eat, idempotency。

**GIVEN** `{"acceptedActionId":"eat-a","handCountAfterFirst":14}`。

**WHEN** 相同身份相同actionId相同内容重试3次。

**THEN** 返回同一回执，不重复转移或加次数。

必须断言：`{"transferCount":1,"eatCountDelta":1,"handCount":14}`。

### S24-wall-empty-still-respond

规则：R-027；标签：wall, hu, eat。

**GIVEN** `{"wallRemaining":0,"latestDiscardAvailable":true,"registeredEat":true}`。

**WHEN** 结束响应并执行合法EAT，再弃牌、处理其响应。

**THEN** 空牌山不提前流局；下一普通摸牌才流局。

必须断言：`{"eatAllowed":true,"drawOnEmpty":0,"finishReasonAtNextNormalDraw":"DRAW"}`。

### S25-human-timeout

规则：R-026, R-041；标签：timeout, human, bot。

**GIVEN** `{"presence":"HUMAN","handCount":14,"elapsedMs":60000}`。

**WHEN** 行动超时。

**THEN** 仅代出1张、显示本次超时代出、仍为真人。

必须断言：`{"presence":"HUMAN","discardCount":1,"handCount":13,"autoHuCount":0}`。

### S26-manual-fourteen-and-commas

规则：U2, R-012, R-014, R-030；标签：sentence, comma。

**GIVEN** `{"handCount":14,"sentenceFixtureIds":["sentence-valid-0-commas","sentence-valid-1-commas","sentence-valid-2-commas","sentence-valid-3-commas"]}`。

**WHEN** 逐个提交合法排列，含口语或荒诞语义。

**THEN** 只做形式校验，不词典判胜、不自动生成句子。

必须断言：`{"formalAccepted":true,"semanticApiCalls":0,"phase":"HU_VOTE"}`。

### S27-invalid-sentence-no-transition

规则：R-010, R-012, R-030；标签：sentence, ownership。

**GIVEN** `{"sentenceFixtureIds":["sentence-thirteen","sentence-repeat-physical-id","sentence-foreign-tile","sentence-last-anchor","sentence-four-commas"]}`。

**WHEN** 逐个提交非法句子。

**THEN** 按夹具错误拒绝，牌权和行动阶段不变。

必须断言：`{"phaseTransitionCount":0,"ownershipMutationCount":0}`。

### S28-comma-reorder-accessibility

规则：U2, R-013；标签：comma, keyboard, touch。

**GIVEN** `{"commaAnchorTileId":"t03","draftFixtureIds":["comma-follows-left-tile","comma-anchor-removed"]}`。

**WHEN** 鼠标、触摸、键盘各执行重排、移除锚点和退回逗号。

**THEN** 逗号跟随左字；末尾或移出后退托盘，三种输入结果一致。

必须断言：`{"equivalentInputMethods":["mouse","touch","keyboard"],"freeTextAllowed":false}`。

### S29-discard-hu-reservation

规则：R-031, I-01；标签：hu, ownership, compose。

**GIVEN** `{"handCount":13,"borrowedTileOwner":"DISCARD","intent":"HU"}`。

**WHEN** 排到本人进入45秒排句并提交。

**THEN** 候选14字只是引用；弃牌在原记录预留，不复制或提前入手。

必须断言：`{"phase":"HU_VOTE","handCount":13,"borrowedTileOwner":"DISCARD","composeMs":45000}`。

### S30-compose-timeout

规则：R-031, R-024；标签：compose, timeout。

**GIVEN** `{"phase":"HU_COMPOSE","composeElapsedMs":45000,"laterHuCandidates":1}`。

**WHEN** 未提交句子达到截止。

**THEN** 撤回并继续下一候选，仍13张，不执行语义否决。

必须断言：`{"outcome":"WITHDRAWN","handCount":13,"continueHuQueue":true}`。

### S31-full-online-thresholds

规则：U3, R-032, R-033；标签：vote, 2-6-players。

**GIVEN** `{"allOnlineHuman":true,"playerCounts":[2,3,4,5,6]}`。

**WHEN** 对每个人数进入正式投票。

**THEN** 严格过半，三人局必须两位对手全部赞成。

必须断言：`{"reviewerCounts":[1,2,3,4,5],"thresholds":[1,2,2,3,3]}`。

### S32-no-reviewer-own

规则：R-032；标签：vote, bot。

**GIVEN** `{"source":"SELF","otherOnlineHumanCount":0,"remainingTurnMs":17000}`。

**WHEN** 提交自有14字申胡。

**THEN** 不启动投票，保留原行动时间。

必须断言：`{"error":"NO_HUMAN_REVIEWER","remainingTurnMs":17000,"phase":"TURN_ACTION"}`。

### S33-no-reviewer-discard

规则：R-032；标签：vote, hu。

**GIVEN** `{"source":"DISCARD","otherOnlineHumanCount":0,"laterHuCandidates":1}`。

**WHEN** 轮到借弃牌候选进入投票。

**THEN** 撤回该候选并继续原响应队列。

必须断言：`{"outcome":"WITHDRAWN","continueHuQueue":true,"handCount":13}`。

### S34-concurrent-votes

规则：R-034, I-03；标签：concurrency, phase-gate, vote。

**GIVEN** `{"phaseId":"vote-phase-a","proposalId":"proposal-a","stateVersion":20,"reviewerIds":["p1","p2"],"bothExpectedStateVersion":20}`。

**WHEN** 两位评审独立提交，第二个到时版本已21。

**THEN** 第二票仍按提案/阶段/资格接收，统一结算。

必须断言：`{"recordedBallotCount":2,"staleVersionRejectionCount":0}`。

### S35-vote-freeze-disconnect

规则：R-034, R-035, R-044；标签：vote, disconnect。

**GIVEN** `{"frozenReviewerIds":["p1","p2","p3"],"threshold":2,"approveCount":1}`。

**WHEN** p2、p3掉线直到投票截止。

**THEN** 不冻结评审，不缩分母；缺票为未投，失败。

必须断言：`{"reviewerCount":3,"threshold":2,"approveCount":1,"rejectCount":0,"abstainCount":2,"passed":false}`。

### S36-reviewer-return

规则：U6, R-035；标签：vote, recovery。

**GIVEN** `{"frozenReviewerIds":["p1","p2"],"p2DisconnectedAfterStart":true,"deadlineNotReached":true}`。

**WHEN** p2验证原身份恢复后提交投票。

**THEN** 用新epoch接受一次，仍属于冻结集合。

必须断言：`{"accepted":true,"reviewerCount":2,"ballotCountForP2":1}`。

### S37-reviewer-late-join

规则：R-035；标签：vote, recovery。

**GIVEN** `{"frozenReviewerIds":["p1"],"p2OfflineAtVoteStart":true}`。

**WHEN** p2恢复身份后试图投票。

**THEN** 不能加入既有评审。

必须断言：`{"error":"NOT_REVIEWER","reviewerCount":1}`。

### S38-vote-hidden-progress

规则：R-034, R-037, I-04；标签：vote, hidden-information。

**GIVEN** `{"frozenReviewerCount":3,"votesSubmitted":2}`。

**WHEN** 抓取所有公共快照和投票期间广播。

**THEN** 只能看到已投2/3，不能识别谁投、何立场、选区。

必须断言：`{"submittedBallotCount":2,"publicBallotArrays":false,"publicReviewerIds":false,"publicObjectionRangesBeforeSettlement":false}`。

### S39-reject-ranges

规则：U4, R-036, R-037；标签：vote, objection, comma。

**GIVEN** `{"rejectLabel":"写的什么玩意","objectionFixtureFile":"sentence-cases.json"}`。

**WHEN** 依次测试0—3段、跨逗号、重字位置、相邻区间、越界重叠和赞成带选区。

**THEN** 按夹具接受或拒绝；索引是0based半开，不按字符串查找。

必须断言：`{"buttonLabel":"写的什么玩意","indexConvention":"ZERO_BASED_HALF_OPEN","commaConsumesIndex":false}`。

### S40-anonymous-union

规则：R-037；标签：vote, objection, privacy。

**GIVEN** `{"mergeFixtureId":"anonymous-union"}`。

**WHEN** 投票统一结算并读取公共历史、网络消息与公开导出。

**THEN** 展示匿名总票和合并选区，不包含评审与立场映射。

必须断言：`{"mergedRanges":[{"start":0,"endExclusive":5},{"start":7,"endExclusive":8}],"voterChoiceMappingExposed":false}`。

### S41-self-hu-rejected

规则：R-038；标签：hu, repeat。

**GIVEN** `{"source":"SELF","votePassed":false,"handCount":14}`。

**WHEN** 申请人再次申胡或合法弃牌。

**THEN** 本次14张机会只能弃牌，不能重复申胡，亮句留历史。

必须断言：`{"mustDiscard":true,"repeatHuError":"HU_RETRY_FORBIDDEN","historyPreserved":true,"postHuDiscardMs":30000}`。

### S42-discard-hu-rejected

规则：R-038, R-024；标签：hu, queue。

**GIVEN** `{"source":"DISCARD","votePassed":false,"handCount":13,"registeredEaterSeat":1}`。

**WHEN** 结算失败候选。

**THEN** 保持13张，继续HU队列后原EAT；不惩罚计分。

必须断言：`{"handCount":13,"scoreDelta":0,"continueOriginalResponse":true}`。

### S43-win-once

规则：R-039, R-050, I-03；标签：settlement, idempotency。

**GIVEN** `{"votePassed":true,"source":"DISCARD","laterHuCandidates":2}`。

**WHEN** 结算任务重试、客户端重复请求并模拟持久化成功后进程崩溃。

**THEN** 只固定一次赢家、只加一次胜局、取消后续候选；牌可仍留弃牌记录。

必须断言：`{"phase":"ROUND_FINISHED","winIncrement":1,"settlementRows":1,"remainingHuCandidates":0}`。

### S44-disconnect-grace

规则：U5, R-040；标签：disconnect, bot。

**GIVEN** `{"serverConfirmedDisconnectedAtMs":0,"handPreserved":true}`。

**WHEN** 分别在14999ms和15000ms处理连接状态。

**THEN** 缓冲前不AI行动；超时才BOT，保留身份座位牌。

必须断言：`{"beforeGracePresence":"DISCONNECTED_GRACE","afterGracePresence":"BOT","graceMs":15000}`。

### S45-grace-beats-turn-timeout

规则：R-041；标签：disconnect, timeout, race。

**GIVEN** `{"turnDeadlineAtMs":1000,"disconnectedAtMs":0,"graceEndsAtMs":15000}`。

**WHEN** 旧60秒任务在1000ms触发。

**THEN** 不得抢先代出，等掉线缓冲结束再AI。

必须断言：`{"discardCountBefore15000":0,"earliestBotDelayAfterGraceMs":800}`。

### S46-offturn-grace-no-table-freeze

规则：R-041；标签：disconnect, turn。

**GIVEN** `{"disconnectedPlayerIsActor":false,"otherHumanIsActor":true}`。

**WHEN** 非当前行动者掉线。

**THEN** 其他人的阶段正常进行，不因其15秒缓冲暂停。

必须断言：`{"pauseKind":"RUNNING","otherTurnCanAdvance":true}`。

### S47-bot-policy-restriction

规则：U5, R-042, I-05；标签：bot, privacy。

**GIVEN** `{"presence":"BOT","ownHandCount":14,"couldFormValidSentence":true}`。

**WHEN** 触发AI策略并捕获输入与输出。

**THEN** 只在800ms后合法弃牌；不吃不胡不投票不用外部模型，不读他人暗牌或未来山牌。

必须断言：`{"botMayEat":false,"botMayDeclareHu":false,"botMayVote":false,"externalModelCalls":0,"otherHandsInPolicyInput":false,"futureWallInPolicyInput":false}`。

### S48-applicant-grace-return

规则：R-043；标签：hu, disconnect, recovery。

**GIVEN** `{"phases":["HU_COMPOSE","HU_VOTE"],"applicantDisconnected":true,"remainingStageMs":1000}`。

**WHEN** 在掉线后第10秒恢复原身份。

**THEN** 阶段结算让出缓冲，恢复后继续且仍可操作至少10秒。

必须断言：`{"prematureSettlementCount":0,"candidateWithdrawn":false,"minRemainingActionMs":10000}`。

### S49-applicant-grace-expires

规则：R-043；标签：hu, disconnect, bot。

**GIVEN** `{"phase":"HU_VOTE","approveCountMeetsThreshold":true,"applicantDisconnected":true}`。

**WHEN** 申请人15秒未恢复。

**THEN** 候选撤回、原投票作废，不允许AI继承胜利。

必须断言：`{"outcome":"WITHDRAWN","winIncrement":0,"botWinner":false}`。

### S50-recovery-wins-race

规则：U6, R-006, R-045；标签：recovery, epoch, race。

**GIVEN** `{"oldControlEpoch":3,"queuedBotActionEpoch":3}`。

**WHEN** 恢复事务先于AI动作提交。

**THEN** epoch增为4，撤销旧任务；旧AI和旧页面均不能改牌。

必须断言：`{"newControlEpoch":4,"oldBotAccepted":false,"oldClientError":"STALE_CONTROL_EPOCH","duplicateDrawCount":0}`。

### S51-bot-wins-race

规则：R-045, R-046；标签：recovery, epoch, race。

**GIVEN** `{"oldControlEpoch":3,"botDiscardCommitted":true,"actorTurnFinished":true}`。

**WHEN** 随后恢复原身份。

**THEN** 已合法弃牌保留，不能回滚或额外摸牌，等待正常轮到。

必须断言：`{"discardRolledBack":false,"extraDrawCount":0,"newControlEpoch":4,"waitForNextTurn":true}`。

### S52-refresh-identity

规则：U6, R-005, R-046；标签：recovery, refresh, private-draft。

**GIVEN** `{"sameBrowserValidSession":true,"handCount":14,"draftHasCommas":true}`。

**WHEN** 页面刷新后恢复。

**THEN** 同playerId/seat/手牌/排句；收完整快照与权威期限，不额外摸牌。

必须断言：`{"samePlayerId":true,"sameSeat":true,"draftRestored":true,"extraDrawCount":0,"minRemainingActionMs":10000}`。

### S53-cross-device-secret

规则：U6, R-005；标签：recovery, credentials。

**GIVEN** `{"newDevice":true,"knowsNicknameAndRoomCode":true,"hasRecoveryCode":false}`。

**WHEN** 只用昵称房间码冒认；随后用正确私密恢复码恢复。

**THEN** 冒认拒绝，正确凭据恢复同座位；公共状态和日志无明码/哈希。

必须断言：`{"nicknameProofAccepted":false,"validRecoveryCodeAccepted":true,"sameSeat":true,"publicRecoveryCodeExposed":false,"publicRecoveryHashExposed":false}`。

### S54-recovery-code-rotation

规则：R-005, R-006；标签：recovery, credentials, epoch。

**GIVEN** `{"oldRecoveryCodeValid":true,"currentSessionAuthorized":true}`。

**WHEN** 重新生成码后分别使用旧码和新码恢复。

**THEN** 旧码失效，新码成功；旧控制会话撤销。

必须断言：`{"oldCodeAccepted":false,"newCodeAccepted":true,"activeControlSessionCount":1}`。

### S55-all-offline-pause

规则：R-047；标签：pause, disconnect, bot。

**GIVEN** `{"remainingPhaseMs":23000,"allHumansLoseConnections":true}`。

**WHEN** 无人恢复直到20秒后，再由原席位恢复。

**THEN** 业务时间冻结、AI不互打，离线15秒仍走，恢复后其他席位可BOT。

必须断言：`{"pauseKindBeforeRestore":"PAUSED_ALL_OFFLINE","drawsWhileAllOffline":0,"discardsWhileAllOffline":0,"retainedRemainingPhaseMs":23000}`。

### S56-all-offline-expiry

规则：R-047, R-048, R-050；标签：pause, retention。

**GIVEN** `{"allOfflineForMs":86400000}`。

**WHEN** 恢复原身份或清理任务执行。

**THEN** 过期结束，不续局不加胜局，保留结束记录。

必须断言：`{"finishReason":"EXPIRED","winIncrement":0,"resumeRound":false}`。

### S57-restart-recovery

规则：R-048；标签：restart, epoch, timer。

**GIVEN** `{"persistedPhase":"HU_VOTE","persistedFrozenReviewers":["p1","p2"],"remainingMs":1000,"oldProcessTimersExist":true}`。

**WHEN** 服务重启后首位原席位恢复。

**THEN** 先PAUSED_RECOVERY，废弃旧任务连接；重建期限至少10秒，其余席位新15秒缓冲，冻结集合不变。

必须断言：`{"initialPauseKind":"PAUSED_RECOVERY","minRemainingActionMs":10000,"otherSeatGraceMs":15000,"frozenReviewerIds":["p1","p2"],"oldProcessTimerAccepted":false}`。

### S58-restart-receipt

规则：I-03, R-039；标签：restart, idempotency。

**GIVEN** `{"discardActionCommittedBeforeRestart":true,"clientSawAck":false}`。

**WHEN** 重启后重新恢复身份并用同actionId重试。

**THEN** 已提交回执持久保留，不能重复弃牌或结算。

必须断言：`{"discardApplicationCount":1,"settlementIncrementAtMost":1}`。

### S59-hidden-projections

规则：I-04, R-010, R-014；标签：privacy, hidden-information。

**GIVEN** `{"twoAuthenticatedPlayers":true,"onePublicSubscriber":true}`。

**WHEN** 比较各快照与广播，并检查申胡前后。

**THEN** 本人独有暗牌草稿；公共只在正式亮牌后看到冻结句，永无未来牌山或凭据。

必须断言：`{"otherHandExposed":false,"otherDraftExposed":false,"futureWallExposed":false,"sessionSecretExposed":false,"composeDraftExposed":false}`。

### S60-multiroom-isolation

规则：I-02, I-04；标签：multiroom, concurrency。

**GIVEN** `{"rooms":["A","B"],"samePhaseLabel":true,"differentPhaseIds":true}`。

**WHEN** A玩家向B提交带A的actionId/phaseId/epoch，再令A与B同时行动。

**THEN** 跨房间拒绝，A阻塞不阻塞B，各自牌权计时回执隔离。

必须断言：`{"crossRoomAccepted":false,"roomBProgressIndependent":true,"crossRoomPrivateLeak":false}`。

### S61-action-id-content-conflict

规则：I-03；标签：idempotency, command。

**GIVEN** `{"acceptedActionId":"a1","acceptedPayloadTileId":"t01"}`。

**WHEN** 相同身份用a1改为弃t02。

**THEN** 返回ID复用错误，不执行第二动作。

必须断言：`{"error":"ACTION_ID_REUSED","secondMutationCount":0}`。

### S62-old-phase-replay

规则：I-02；标签：phase-gate, command。

**GIVEN** `{"currentPhaseId":"vote-b","submittedPhaseId":"vote-a","expectedStateVersionMatches":true}`。

**WHEN** 重放上一提案票或上一窗口响应。

**THEN** 即使版本相同仍以阶段不符拒绝。

必须断言：`{"error":"STALE_PHASE","mutationCount":0}`。

### S63-one-vote-per-reviewer

规则：R-034, I-03；标签：vote, idempotency。

**GIVEN** `{"firstBallot":"APPROVE","sameReviewer":true}`。

**WHEN** 同actionId重试后，再用新actionId改投REJECT。

**THEN** 重试回原回执；新动作不能改票。

必须断言：`{"ballotCount":1,"changedVoteAccepted":false,"errorOnNewAction":"ALREADY_VOTED"}`。

### S64-deadline-boundary

规则：I-02；标签：timeout, concurrency。

**GIVEN** `{"serverDeadlineAtMs":45000,"queueReceivedAtMs":[44999,45000]}`。

**WHEN** 分别在独立复位的投票阶段提交合法票。

**THEN** 截止前接收；恰等于截止时拒绝，客户端时钟无裁决权。

必须断言：`{"acceptedByCase":[true,false]}`。

### S65-next-dealer-and-ready

规则：R-004, R-051；标签：round, next-round, 2-6-players。

**GIVEN** `{"previousDealerSeats":"all","playerCounts":[2,3,4,5,6],"winnerMayDiffer":true,"oneSeatBot":true}`。

**WHEN** 结束后尝试下一局，再等待全部真人重连并准备。

**THEN** 庄家按next轮转，不能BOT自动准备或连开。

必须断言：`{"dealerPolicy":"NEXT_SEAT","botAutoReady":false,"requiresAllHumanReady":true}`。

### S66-host-transfer

规则：R-007；标签：host, disconnect。

**GIVEN** `{"playerCount":5,"hostSeat":3,"onlineHumanSeats":[0,2],"hostGraceElapsed":true}`。

**WHEN** 处理房主移交。

**THEN** 沿递增座次最近在线真人0接任，不改座位牌权。

必须断言：`{"newHostSeat":0,"seatChanged":false,"ownershipChanged":false}`。

### S67-close-running

规则：R-052；标签：close, host。

**GIVEN** `{"phase":"TURN_ACTION","onlineHumanCount":3,"actorIsHost":true}`。

**WHEN** 房主点击本局结束后关闭；尝试直接CLOSE_ROOM。

**THEN** 设置closeAfterRound；不能立即清桌，不产生解散投票。

必须断言：`{"closeAfterRound":true,"immediateCloseAccepted":false,"dissolutionProposalCreated":false}`。

### S68-end-unscored-race

规则：R-052；标签：close, concurrency, recovery。

**GIVEN** `{"onlineHumanCountAtPrompt":1,"secondHumanRestoresBeforeExecution":true}`。

**WHEN** 唯一真人点击END_UNSCORED，但第二人恢复先提交。

**THEN** 执行时重查为2人，拒绝终止。

必须断言：`{"roundTerminated":false,"winIncrement":0}`。

### S69-end-unscored-single

规则：R-052；标签：close。

**GIVEN** `{"onlineHumanCountAtExecution":1,"phase":"TURN_ACTION"}`。

**WHEN** 该真人点击结束本局（不计分）。

**THEN** 终止本局并保留历史，不加分。

必须断言：`{"finishReason":"TERMINATED","winIncrement":0,"historyPreserved":true}`。

### S70-leave-not-delete

规则：R-002, R-052；标签：identity, disconnect。

**GIVEN** `{"roundStarted":true,"seatOccupied":true}`。

**WHEN** 玩家关闭页面或点击离开。

**THEN** 按断线缓冲/AI处理，不删除席位，不让新人补位。

必须断言：`{"seatDeleted":false,"replacementAllowed":false}`。

### S71-lobby-finish-close

规则：R-052；标签：close, host。

**GIVEN** `{"phases":["LOBBY","ROUND_FINISHED"],"actorIsHost":true}`。

**WHEN** 点击关闭房间。

**THEN** 可以关闭并保留已结束局记录；非房主不能替代执行。

必须断言：`{"phase":"ROOM_CLOSED","historyPreserved":true,"nonHostCanClose":false}`。

### S72-pause-withdrawal-pending

规则：R-043, R-047；标签：pause, hu, disconnect。

**GIVEN** `{"phase":"HU_VOTE","applicantDisconnected":true,"allHumansDisconnected":true}`。

**WHEN** 15秒到期并在20秒恢复另一个原席位。

**THEN** 全离线时只标待办不推进，恢复后先撤回申请再推进原队列。

必须断言：`{"businessTransitionsWhilePaused":0,"withdrawBeforeContinuation":true,"botWinIncrement":0}`。

### S73-own-withdraw-discard

规则：R-038, R-043；标签：hu, disconnect, timeout。

**GIVEN** `{"source":"SELF","applicantGraceExpired":true,"handCount":14}`。

**WHEN** 申请人缓冲到期撤回自有牌候选。

**THEN** 返回强制弃牌阶段给30秒，不允许AI继承胡牌或重申同机会。

必须断言：`{"phase":"TURN_ACTION","mustDiscard":true,"postHuDiscardMs":30000,"handCount":14,"winIncrement":0}`。

### S74-http-seat-race

规则：R-001, R-002, R-005；标签：http, identity, concurrency。

**GIVEN** `{"phase":"LOBBY","capacity":4,"requestedSeat":2,"joiners":2}`。

**WHEN** 两个首次入座HTTP请求并发指定同一空座。

**THEN** 事务只允许一人占seat2，另一个SEAT_OCCUPIED；成功者收到私密恢复码及HttpOnly cookie。

必须断言：`{"occupiedSeat2Count":1,"loserError":"SEAT_OCCUPIED","sessionTokenInJson":false}`。

### S75-cookie-restore-boundary

规则：R-005, R-006；标签：http, recovery, credentials。

**GIVEN** `{"sameBrowserHttpOnlyCookie":true,"restoreProof":{"kind":"SESSION"}}`。

**WHEN** 同浏览器刷新并调用restore，检查JS、JSON与Socket负载。

**THEN** 服务端读取cookie并续接同座；响应安全快照，Set-Cookie作为传输副作用，JS无sessionToken。

必须断言：`{"restoredSameSeat":true,"sessionTokenInJson":false,"sessionTokenInLocalStorage":false,"sessionTokenInSocket":false,"setCookieHttpOnly":true}`。

### S76-server-time-calibration

规则：I-02；标签：timeout, clock, socket。

**GIVEN** `{"clientClockOffsetMs":3600000,"resyncContainsServerNow":true}`。

**WHEN** 客户端显示倒计时并在真实服务截止两侧发命令。

**THEN** 按serverNow校准展示，服务端receivedAt决定接受，不依赖客户端系统时钟。

必须断言：`{"clientClockDecidesAcceptance":false,"serverNowRequired":true}`。

### S77-draft-independent-version

规则：R-011, R-013；标签：draft, concurrency, phase-gate。

**GIVEN** `{"oldPhaseId":"response-a","currentPhaseId":"vote-b","publicVersionAdvanced":true,"handUnchanged":true,"expectedDraftVersion":5,"currentDraftVersion":5}`。

**WHEN** 等待别人时用旧公共观测版本和phaseId提交本人新排句。

**THEN** 只校验本人draftVersion/epoch/round/牌集合，不因公共阶段变化拒绝，不推进全桌版本。

必须断言：`{"accepted":true,"newDraftVersion":6,"publicStateVersionDelta":0}`。

### S78-grace-timer-cross-phase

规则：R-040, R-042；标签：timer, disconnect, phase-gate。

**GIVEN** `{"graceStartedInPhase":"turn-a","currentPhase":"response-b","samePlayerEpoch":true,"graceEndsAtMs":15000}`。

**WHEN** 原GRACE_END在15000ms执行。

**THEN** 虽业务phase已变化仍按原player/epoch/graceEndsAt把离线席位转BOT。

必须断言：`{"presence":"BOT","rejectedOnlyForPhaseChange":false}`。

### S79-retention-original-expiry

规则：R-047, R-048；标签：timer, restart, retention。

**GIVEN** `{"originalExpiresAtMs":86400000,"restartAtMs":86000000,"phaseIdChangedOnRestart":true,"stillNoHumanOnline":true}`。

**WHEN** 到原86400000ms执行到期任务。

**THEN** 按原expiry及暂停条件过期，不因新phase丢任务，不重新保留24小时。

必须断言：`{"finishReason":"EXPIRED","expiresAtMs":86400000,"retentionExtendedByRestart":false}`。

### S80-queued-hu-remaining-grace

规则：R-024, R-040, R-043；标签：hu, disconnect, timer。

**GIVEN** `{"queuedApplicantPresence":"DISCONNECTED_GRACE","originalGraceEndsAtMs":15000,"candidateDequeuedAtMs":13000}`。

**WHEN** 该HU候选轮到出队，直至15000ms仍未恢复。

**THEN** 最多等原剩余2000ms，不新给15秒，随后撤回继续队列。

必须断言：`{"maxAdditionalWaitMs":2000,"graceEndsAtMs":15000,"outcome":"WITHDRAWN"}`。

### S81-reserved-eat-bot-invalid

规则：R-024, R-042；标签：eat, bot, concurrency。

**GIVEN** `{"reservedEaterWasHumanAtRegistration":true,"reservedEaterPresenceAtExecution":"BOT","earlierHuCandidatesFailed":true}`。

**WHEN** 准备兑现保留EAT。

**THEN** 重验资格后作废EAT，AI不得继承吃；正常从next(discarder)摸牌。

必须断言：`{"eatExecuted":false,"eatCountDelta":0,"continueWithNormalDraw":true}`。

### S82-queued-hu-bot-invalid

规则：R-024, R-042；标签：hu, bot, concurrency。

**GIVEN** `{"queuedHuRegisteredByHuman":true,"presenceAtDequeue":"BOT","laterCandidates":1}`。

**WHEN** 准备开始该候选的排句/评审。

**THEN** 跳过该候选，AI无法借先前登记获胜，继续后续队列。

必须断言：`{"candidateStarted":false,"winIncrement":0,"continueHuQueue":true}`。

### S83-persistence-codec-roundtrip

规则：I-01, I-03, R-048；标签：codec, restart, persistence。

**GIVEN** `{"aggregateContains":["tilesMap","ownershipMap","playersMap","intentsMap","ballotsMap","receiptsMap","settlementSet","rngState","wallOrder","pendingJobs"]}`。

**WHEN** 对真实聚合encode→JSON.stringify→JSON.parse→decode并重启。

**THEN** Map/Set使用显式数组codec且内容完整，重启不重复摸牌或计分。

必须断言：`{"codecVersion":1,"allEntriesPreserved":true,"ownershipConserved":true,"duplicateDrawCount":0,"duplicateScoreCount":0}`。

### S84-private-stale-event

规则：R-006, R-046, I-04；标签：socket, recovery, epoch。

**GIVEN** `{"currentControlEpoch":4,"currentDraftVersion":8,"latePrivateSnapshotEpoch":3,"latePrivateDraftVersion":6}`。

**WHEN** 恢复新设备后迟到旧连接私密快照和旧草稿确认。

**THEN** 按epoch及版本丢弃，不能把旧手牌或排列盖回新状态。

必须断言：`{"stalePrivateSnapshotApplied":false,"currentControlEpoch":4,"currentDraftVersion":8}`。

### S85-draft-stale-rebase

规则：R-011；标签：draft, concurrency。

**GIVEN** `{"expectedDraftVersion":5,"currentDraftVersionAfterDraw":6,"newTileAppended":true}`。

**WHEN** 旧手牌的SAVE_DRAFT迟到。

**THEN** 返回STALE_DRAFT_VERSION与当前快照；客户端重合并保留剩余牌顺序，新牌仍只追加一次。

必须断言：`{"error":"STALE_DRAFT_VERSION","newTileCopiesInDraft":1,"handOwnershipMutationCount":0}`。

### S86-other-returns-first

规则：R-043, R-047, R-049；标签：pause, hu, recovery。

**GIVEN** `{"pause":"PAUSED_ALL_OFFLINE","phase":"HU_VOTE","applicantGraceEndsAtMs":15000,"otherHumanRestoresAtMs":9000,"applicantStillDisconnected":true}`。

**WHEN** 非申请人先恢复。

**THEN** 不能直接RUNNING或结算；保持申请人剩余6000ms缓冲，截止才撤回。

必须断言：`{"suspension":"PAUSED_CLAIMANT_GRACE","graceEndsAtMs":15000,"prematureSettlementCount":0}`。

### S87-restart-other-returns-first

规则：R-043, R-048, R-049；标签：restart, hu, recovery, timer。

**GIVEN** `{"persistedPhase":"HU_COMPOSE","firstRestorerIsApplicant":false,"applicantNotRestored":true,"newGraceAlreadyAssigned":true,"applicantGraceEndsAtMs":30000,"nowMs":25000}`。

**WHEN** 再次恢复另一个非申请人连接。

**THEN** 保留既有截止30000，不重开15秒；保持PAUSED_CLAIMANT_GRACE，申请人回来才续排句。

必须断言：`{"suspension":"PAUSED_CLAIMANT_GRACE","graceEndsAtMs":30000,"remainingGraceMs":5000,"graceRestarted":false}`。

### S88-idle-seat-release

规则：R-001, R-040；标签：lobby, identity, disconnect。

**GIVEN** `{"phases":["LOBBY","ROUND_FINISHED"],"playerSeat":2,"disconnectedForMs":15000,"historicalWins":4}`。

**WHEN** 离线15秒处理任务，然后原身份回来选空seat1。

**THEN** 没有进行中局所以不BOT；释放原座清准备，恢复保留playerId与4胜，不能冒领已占座。

必须断言：`{"botActivated":false,"oldSeatReleased":true,"ready":false,"samePlayerIdAfterReseat":true,"wins":4,"occupiedSeatClaimAccepted":false}`。

### S89-capacity-and-no-reseat

规则：R-001, R-002；标签：lobby, seat, 2-6-players。

**GIVEN** `{"capacity":4,"alreadySeated":true,"requestedChanges":["capacity6","moveSeat"]}`。

**WHEN** 同房间修改人数或已入座者主动换座。

**THEN** 均不支持；要换人数新建房间，首次或释放后可选空座。

必须断言：`{"capacityAfter":4,"activeSeatChanged":false,"capacityMutationAccepted":false}`。

### S90-finished-win-retention

规则：R-039, R-050；标签：settlement, retention, timer。

**GIVEN** `{"phase":"ROUND_FINISHED","reason":"WIN","winsAlreadyIncremented":1,"allOfflineForMs":86400000}`。

**WHEN** 保留期或旧业务任务到期清理。

**THEN** 只关闭房间保留WIN和原胜局，不能改EXPIRED、不扣已记分。

必须断言：`{"roundReason":"WIN","winIncrementTotal":1,"mayCloseRoom":true,"reasonRewrittenToExpired":false}`。

### S91-lobby-grace-null-round

规则：R-040；标签：timer, lobby, identity。

**GIVEN** `{"roundId":null,"phase":"LOBBY","playerDisconnectedAtMs":0,"graceEndsAtMs":15000}`。

**WHEN** 携带roundId=null的GRACE_END在15000ms执行。

**THEN** 合法释放离线座位清准备，不因没有roundId丢任务，不启用BOT。

必须断言：`{"seatReleased":true,"ready":false,"botActivated":false,"nullRoundIdTimerAllowed":true}`。

### S92-finished-refill-next-start

规则：R-001, R-040, R-051；标签：round, identity, start。

**GIVEN** `{"phase":"ROUND_FINISHED","vacantSeat":2,"historicalWinsPreserved":true}`。

**WHEN** 恢复旧身份或新真人通过join指定空座，再全部真人READY、房主START_ROUND。

**THEN** 结算页允许补座与准备，原子开始新局并清临时候选/草稿/旧任务，历史胜局保留且不能换已占座。

必须断言：`{"joinAccepted":true,"phaseAfterStart":"TURN_ACTION","newRoundId":true,"oldCandidateDraftCleared":true,"oldTimersInvalidated":true,"historyPreserved":true}`。

### S93-eat-grace-cancel-immediate

规则：R-024, R-040；标签：eat, disconnect, timer。

**GIVEN** `{"reservedEaterPresence":"DISCONNECTED_GRACE","remainingGraceMs":12000,"eatReadyToExecute":true}`。

**WHEN** 此前HU全部失败后准备兑现EAT。

**THEN** 即刻取消EAT，不等待剩余缓冲，转next(discarder)普通摸牌；不同于排队HU可等原缓冲。

必须断言：`{"eatExecuted":false,"extraWaitMs":0,"continueWithNormalDraw":true}`。

### S94-compose-manual-withdraw

规则：R-031, R-024；标签：compose, hu, command。

**GIVEN** `{"source":"DISCARD","actorIsCandidate":true,"phasesTested":["HU_COMPOSE","HU_VOTE"],"handCount":13}`。

**WHEN** 分别复位提交WITHDRAW_DISCARD_HU，HU_COMPOSE成功后重试相同actionId。

**THEN** 仅当前HU_COMPOSE本人可撤回一次并续原队列；VOTE不能撤回改句，不扣分不补响应。

必须断言：`{"acceptedByPhase":[true,false],"continuationCountAfterRetry":1,"handCount":13,"scoreDelta":0,"newResponseWindowOpened":false}`。

### S95-candidate-draft-private-restore

规则：R-011, R-013, R-031, R-046；标签：draft, compose, recovery, privacy。

**GIVEN** `{"phase":"HU_COMPOSE","ownHandCount":13,"candidateTileCount":14,"normalDraftVersion":5,"candidateDraftVersion":1}`。

**WHEN** 保存独立14字候选草稿含3逗号，刷新恢复，再正式提交或撤回。

**THEN** 按当前source/phase/epoch和候选版本保存，普通13张草稿不变；恢复含候选排列，公共不泄露；候选离开后清理且拒绝迟到保存。

必须断言：`{"candidateDraftVersionAfterSave":2,"normalDraftVersionAfterSave":5,"ownHandCount":13,"candidateDraftRestored":true,"candidateDraftExposedBeforeSubmit":false,"candidateDraftClearedAfterExit":true,"lateSaveAccepted":false}`。

## 完成证据

实施方应保存执行日期、构建版本、case ID、真实输入与权威状态差异、失败重现步骤；抓包和日志脱敏，不保存恢复码/会话密钥和投票归因。验收失败先修实现；规则改动须更新01、defaults、契约、夹具、UI和本清单。所有实验字库仍须后续多人试玩记录局长、断句体验与胜率，不得将静态总数校验称为平衡验证。
