# 契约使用说明

本目录是交接约定，不包含可运行游戏服务。唯一规则权威为 `../docs/01-RULES.md` 与 `rules.defaults.json`。TypeScript 使用 `strict: true`；品牌类型和元组提供编辑期约束，服务器仍须对 JSON 逐项做运行时校验。`ServerOnly` 命名空间必须留在服务端构建图内，不能把整个聚合体序列化后靠前端隐藏字段。

## V1.1牌桌展示契约

新增 `table-view.ts` 定义 `TableProjectionInput → TableViewAdapter → TableView`、相对席位、唯一手牌/候选草稿、手机几何参数和过期动画门控。它依赖既有 `types.ts`，不修改服务端规则、命令或公开/私密边界；少量纯显示辅助函数可以直接采用，adapter/controller接口仍待实现。

展示输入只允许公共快照和本人私密快照；`legalActions` 与权威时间由上层 `ResyncEnvelope` 交给唯一命令控制器。桌面默认真实3D手牌，通过投影DOM命中层操作；展开编辑时隐藏对应3D手牌；手机竖屏用3D桌面与DOM手牌。所有呈现共用同一草稿与控制器。镜像mesh没有独立发命令的权力。

按 `../checks/validate-table-ui.py` 检查新增显示夹具，并按 `../docs/12-UI-ACCEPTANCE.md` 在真实游戏中执行验收。前者不执行尚未实现的React/Three适配器，不能替代后者。source-snapshot中的英文API类型是研究资料，不得成为新项目共享业务类型。

## 命令、串行化与并发门控

全部已认证游戏命令携带 `actionId + expectedStateVersion + phaseId + controlEpoch`，由服务器绑定 `playerId/sessionId`，不相信客户端提交身份。恢复身份尚没有有效 epoch，使用单独的 `RestoreRequest`，成功后拿到新 epoch 再发游戏命令。房间是串行事务域，不同房间使用独立队列。

处理顺序：验证认证与当前控制会话 → 查询 `(roomId, playerId, actionId)` 的持久化幂等回执 → 校验 round/phase/epoch/截止时间/资格/牌权 → 原子提交动作、聚合版本、回执、后续任务。已接受动作的同内容重试返回原回执，不能再次执行；同 ID 不同内容返回 `ACTION_ID_REUSED`。旧会话即使猜到回执 ID 也不得拿到私密结果。错误优先级由服务实现统一，但不能借顺序绕过权限。

| 命令类别 | `expectedStateVersion` | 实际门控与原因 |
|---|---|---|
| `RESPOND` | 必传，作为客户端观测版本；允许落后 | 当前 `phaseId`、`responseWindowId`、round、当前 epoch、窗口仍开、本人资格、本人未提交。其他玩家先提交导致版本递增，不能拒绝本人的并发响应。 |
| `VOTE` | 必传，作为客户端观测版本；允许落后 | 当前 `phaseId`、`proposalId`、冻结评审成员、当前 epoch、投票仍开、本人未提交。不能把版本 CAS 用于整场评审。 |
| `SAVE_DRAFT` | 必传但只作观测；phaseId同样仅作观测，不因业务阶段变化拒绝草稿 | round、本人有效牌集合、epoch、独立 `expectedDraftVersion`；本人草稿 CAS，不改变全桌stateVersion、不延长截止。牌权变化后先权威归一化并递增draftVersion；旧草稿请求返回 `STALE_DRAFT_VERSION` 后重新合并。 |
| `SAVE_CANDIDATE_DRAFT` | 必传但仅作观测，不因别人公共事件递增而拒绝 | 当前HU_COMPOSE、phaseId、DISCARD source、epoch、本人候选资格及独立expectedCandidateDraftVersion；不改全桌版本。 |
| 其他改变共享牌局的命令 | 要求等于当前 `stateVersion` | 当前 phase/round/epoch 之外再用精确版本，返回快照后重试须新 actionId。身份、presence 更新也可能触发安全重试。 |

`phaseId` 是服务端每次阶段进入生成的唯一实例 ID，不能只有字符串 `HU_VOTE`；同人第二次投票、下一弃牌窗口、下一回合都不能复用。普通连接暂停/恢复保留当前业务阶段实例及冻结集合，但 epoch 变化；服务重启则为恢复的业务阶段生成新 phaseId，冻结评审集合与候选仍保留；恢复后的 deadline 由权威快照给出。阶段已过期或被替换，即使版本碰巧相同也拒绝。对并发命令，观测版本领先当前服务端版本应要求重新同步，不能接受不可能的未来版本。

截止时刻由服务器时钟决定，推荐接收进入房间队列时盖章；`receivedAt < deadlineAt` 才可提交，与到期任务同队列排序，边界相等视为已关。任何执行策略必须在客户端和验收环境一致；客户端倒计时不能裁决。当前业务阶段在申请人恢复缓冲/全员离线暂停期间不能抢先结算。

## 牌、句子与异议

物理牌登记表保证每个 tileId 仅位于 WALL/HAND/DISCARD 一处。弃牌被吃后，历史条目标为 CLAIMED，历史仍可显示但不再拥有实体牌。借弃牌候选只预留/引用弃牌，不预先移动实体牌；通过也可只在胜利证据内引用。

提交句子时 `orderedTileIds` 长度必须是14，全部不同且集合恰等于该来源的14张；逗号是0—3个不同的非末尾 tileId 锚点。渲染顺序来自牌 ID 数组，逗号跟随左字，字变末尾或离开手牌时退回托盘。不能把中文字符串当成牌权凭据，不能额外插入字/标点。

异议 `[start,endExclusive)` 在去掉逗号后的14个位置上计算，可跨逗号。REJECT 可带0—3段，段内合法，段间不重叠；相邻段合法。APPROVE 的 `objectionRanges` 字段必须不存在。输入可按 start 排序再验证；匿名结果取被选位置的并集并合并相邻区间，因此汇总后的区间数可超过3。汇总不携带选区原作者，不能原样输出逐票数组。

## 隐私与评审

`PublicRoomSnapshot` 可以广播；`PrivatePlayerSnapshot` 只发本人。未揭示的手牌、未来牌山、凭据、恢复码/哈希、RNG 状态只在服务器。申胡句子正式公开后出现在 `PublicProposal` 和公共历史。HU_COMPOSE 阶段不提前广播申请人的草稿。

评审集合、分母和阈值在每个候选进入 HU_VOTE 时冻结：`m=其他在线真人数`，`T=floor(m/2)+1`。全员在线2—6人依次为1/1、2/2、2/3、3/4、3/5；m=0不启动评审。投票进行中公共流仅有已投人数；结果只有匿名总数和合并异议，不能通过 websocket 事件、错误、日志、分析埋点或回放额外暴露身份与立场映射。

冻结评审恢复原身份后可在截止前投；不在冻结集合内的人恢复后不能加入。缺票是 ABSTAIN，不是 REJECT。AI 不吃、不胡、不投票；60秒超时代出不改变 HUMAN 模式。

## 恢复、计时和持久化

同席位恢复与 AI 定时动作进入同一事务队列。恢复成功先增加 `controlEpoch`、撤销旧控制会话和未提交 AI 任务；旧 epoch 不得再写。先合法提交的 AI 动作保留，不回滚；还可操作时至少10秒且不额外摸牌。AI 任务同时检查 round、phase、processGeneration、epoch、presence，不能仅凭一个 setTimeout 回调直接改牌。

持久化聚合、随机源、幂等回执和结算唯一键；胜局使用 `(roomId,roundId)` 唯一结算键保证一次计分。先持久化胜者/来源/句子证据，再输出结束事件。重启废弃旧定时器/连接，进入 PAUSED_RECOVERY；首个原席位恢复后重建期限至少10秒，其余席位新15秒缓冲。全员离线冻结业务时间，但15秒缓冲和24小时保留仍走；到期撤回待办可于恢复时优先处理。无需额外玩法来解决暂停。

## 夹具和验证边界

`../fixtures/*.json` 为固定输入/期望，`../checks/validate-fixtures.py` 验证数据结构、频数、引用和预期的数学一致性。它不导入游戏服务、不模拟真实网络，不是游戏实现测试；未来 Sol 须把 `scenario-cases.json` 绑定真实服务，Astra 须验证对应界面交互。字库是实验配比，未做实玩平衡验证。

管理命令：CLOSE_ROOM 仅房主在 LOBBY/ROUND_FINISHED 可用；进行中只可 CLOSE_AFTER_ROUND。END_UNSCORED 执行时必须重新确认仅1名在线真人。普通离开不删除座位；首版无解散投票，不能复用胡牌 proposalId。

暂停枚举统一使用 PublicRoomSnapshot.suspension：RUNNING / PAUSED_CLAIMANT_GRACE / PAUSED_ALL_OFFLINE / PAUSED_RECOVERY。全员离线优先于申请人缓冲：冻结业务推进、保存申请人撤回待办，恢复先处理已到期撤回。申请人缓冲时其他人只读，不能继续提交票；恢复后剩余阶段时间至少10秒。自有14张申请被否决或撤回后，进入新的 TURN_ACTION、mustDiscard=true、postHuDiscardMs=30000，不再获得同机会申胡权。内部定时任务也有唯一actionId/jobId，幂等提交并按任务种类重验门控。

## HTTP与Socket边界（首版固定）

| 入口 | 请求与成功响应 | 身份及副作用 |
|---|---|---|
| `POST /api/rooms` | CreateRoomRequest → SeatSessionResult | 校验2—6容量与昵称，创建房间并占seat=0、成为房主。仅此首次入座响应向本人交付恢复码。 |
| `POST /api/rooms/:roomId/join` | JoinRoomRequest → SeatSessionResult | requestedSeat必须0..N-1且为空；LOBBY与ROUND_FINISHED均可占空座。不能靠昵称认领已占座。首次成功签发cookie并交付本人恢复码。 |
| `POST /api/rooms/:roomId/restore` | RestoreRequest → RestoreResult | SESSION在服务器读取HttpOnly cookie；RECOVERY_CODE仅在此私密请求传恢复码。成功原子撤销旧控制、增加epoch、Set-Cookie并返回安全快照。 |
| `GET /api/rooms/:roomId/snapshot` | cookie认证 → ResyncEnvelope | 仅在座身份取得本人视图；不构成观战入口。 |
| Socket `COMMAND` / `RESYNC` | ClientSocketEvent → ServerSocketEvent | 握手读取同源cookie，服务端绑定playerId，重新连接须恢复/校验控制会话。客户端不能通过事件字段指定另一个人。 |

Cookie由服务器以HttpOnly、生产Secure与适当SameSite属性设置；JavaScript请求/响应、localStorage和Socket消息均不包含sessionToken。恢复码只在首次入座或本人主动轮换时交付（轮换使用定向RECOVERY_CODE事件），不随每次刷新反复明文返回。RestoreResult只有安全snapshot，Set-Cookie是HTTP响应副作用。失败响应使用统一错误码和服务端时间，不回显凭据；客户端与服务端日志都需删去cookie、恢复码字段。首次创建/加入重试的幂等回执必须与同一有效身份/请求上下文绑定，不能仅靠猜到actionId取得他人恢复码。

ResyncEnvelope.serverNow用于校准倒计时；公共快照按stateVersion排序，私密快照按basedOnStateVersion/controlEpoch/draftVersion接收，旧epoch或旧版本消息不能覆盖新牌。SAVE_DRAFT使用独立draftVersion，等人时业务phase变化不阻止自己排字；跨局与旧控制会话仍拒绝。恢复码明文不属于可持久化公共快照。

## 定时任务与已登记意向

TimerJob为可判别联合，禁止一种phaseId门控套所有定时器。阶段截止按roundId/phaseId/processGeneration；BOT_DISCARD还校验playerId/epoch/BOT及当前牌权。GRACE_END按playerId、epoch、精确graceEndsAt和仍在缓冲判断，即使期间换回合也要正常到期；它没有phaseId。RETENTION_END按全离线/恢复暂停与原expiresAt校验，不因阶段ID变化失效、不因重启延长24小时。所有任务在房间队列内幂等执行；同一当前阶段只重建一个有效截止任务。

登记HU/EAT并不把其真人资格永久冻结。排队HU出队、保留EAT兑现之前重验当前控制：HU排队候选为HUMAN才可继续，BOT则跳过；HU候选处于DISCONNECTED_GRACE最多等待其原graceEndsAt剩余时间，不能此时再新开15秒。预留EAT兑现时只要不是在线HUMAN就立即取消，不等待其缓冲。BOT不能继承吃或胡。真人恢复后仅保留此前已合法登记的意向，不允许补报。

## 持久化codec与round-trip门槛

ServerOnly.RoomAggregateDTO给出JSON编码形状：Map显式变为二维键值数组，Set变为去重字符串数组，包含嵌套的response.intentsByPlayer与review.ballotsByReviewer；不能直接JSON.stringify Map/Set，否则会静默变成空对象。使用codecVersion=1，decode时验证唯一键、牌权、句子、版本、截止时间后重建Map/Set。UtcMs/ID品牌在校验后恢复，不能用类型断言代替验证。

未来实现须以包含重复汉字、已投票、部分响应队列、AI待办、幂等回执与胜局唯一键的聚合执行 encode → JSON.stringify → JSON.parse → decode，断言所有Map/Set项目、RNG、剩余牌山和待办完全一致；再实际重启进程验证不重复发牌/摸牌/结算。本交接校验不运行该未实现codec，不声明它通过。

候场与结算的补充边界：容量在创建后固定，首版没有换座命令。没有进行中牌局时，离线15秒释放座位并清准备，不启用BOT；身份与历史胜局独立于座位保留。该身份用restore恢复后，private.seat=null，再调用同一join入口指定空座；服务端通过现有cookie沿用playerId，不能另造身份或冒领已占座。此类重新选座成功响应recovery=null，不再次回显旧码。进行中恢复则始终回原座、禁止选新座。

恢复统一使用R-049优先级：先检查原24小时到期；再处理已到期申请人撤回；无人在线仍暂停；申请人BOT则撤回，申请人仍在GRACE则继续其已有缓冲；其余才RUNNING。非申请人先回来不能解除申请人的剩余缓冲。重启只给其他席位一次新15秒，不循环重置；若此前未设置保留期限，在首次恢复加载时设置并持久化。已终局WIN的回收任务只可关闭房间，不能把WIN改EXPIRED或冲销胜局。


## 最终收口：候选草稿与下一局

LOBBY与ROUND_FINISHED都允许HTTP join占空座、READY与START_ROUND；仍要求容量固定、全部真人占座且全准备。START_ROUND原子创建新roundId、初始化新庄/牌权/阶段/准备状态并清理上局临时候选、手牌草稿与计时任务；旧局公共结果和胜局历史保留。已占座者不能用join换座。

TimerBase.roundId允许null，以承载尚无牌局的候场15秒座位释放。阶段截止和BOT_DISCARD分支将roundId收紧为非空；GRACE_END按当前是否存在进行中牌局选择接管或释放，不依赖phase。

SAVE_CANDIDATE_DRAFT只允许当前HU_COMPOSE候选本人，绑定当前DISCARD source、phaseId、epoch及expectedCandidateDraftVersion；expectedStateVersion仅作观测，草稿修改不递增全桌版本。候选私密candidateDraft包含自己的13张与预留弃牌共14张排列，和普通13张hand draft独立；服务端形式校验来源、实体ID、14字和0—3逗号。恢复快照同时交付两个草稿，不能把借牌加入实体手牌。候选进入投票、撤回、超时或结束即清candidateDraft；投票期间不能再修改。

WITHDRAW_DISCARD_HU只允许当前HU_COMPOSE候选本人手动撤回，source与phase必须相符，撤回继续原固定申请队列、不扣分、不重新开放响应窗；不能在HU_VOTE用来改句或重新申报。它使用一般共享动作的精确版本检查，重复actionId返回同一回执。
