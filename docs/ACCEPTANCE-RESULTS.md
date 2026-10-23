# 验收结果 · 应用1.1.0

2026-10-23。原91项按实现断言逐项映射；下表列明验证层级，并不声称每一条都单独在公网浏览器重演。引擎测试通过真实applyCommand入口和可控时钟；网络测试通过真实HTTP/Socket.IO/SQLite；浏览器通过独立Cookie上下文实际点击。测试不以scenario.expected构造返回值。

最新JUnit：**97测试，0失败、0跳过**，见 `docs/evidence/automated-tests.xml`。S11在旧规则1.0.0保持PASS，新规则1.1.0按用户追加允许指定AI，另有全人数AI矩阵和真实浏览器/公网证据。

## 证据索引

- `docs/evidence/automated-tests.xml`：可控时钟/seed、命令权限、Map/Set codec、SQLite失败回滚、重启回执与结算、真实两个房间、坏输入与恢复限流。
- `docs/evidence/scenario-results.json`：91项到真实测试名称及文件的机器可读索引。
- `docs/evidence/real-browser-results.json`：2/3/4/5/6独立浏览器，真实创建/选座/准备/摸打/胡牌/投票/结算、刷新与换设备恢复，画布持续存在。
- `docs/evidence/advanced-browser-results.json`：真实候选队列、独立草稿、跨逗号匿名异议、吃牌保护、强制弃牌、AI延时、全离线context重建；只有服务器时钟可控，无测试HTTP路由。
- `docs/evidence/client-lifecycle-results.json`：迟到HTTP/Set-Cookie与离开/换房竞态，校验后续真实HTTP及READY仍属于新房。
- `docs/evidence/astra-ai-local-results.json`：实际六座房设置/移除AI、一真人练习、结算补真人与混合评审、430px和应用版本。
- `docs/evidence/astra-paused-context-results.json`：申请人真实断线后，暂停中的评审者丢context/重建/恢复，不改变权威阶段。
- `docs/evidence/public-network-results.json`、`public-ai-results.json`：真实可信HTTPS/WSS公网全人数及混合AI联机。
- `docs/evidence/public-operations-results.json`：真实短断、AI接管、全离线、LaunchAgent重启、Caddy重载、在线备份与独立沙盒恢复。

## 原91项逐项结果

| Case | 状态 | 实际验证层级 / 文件 |
|---|---|---|
| S02-seat-cycle | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S03-seat-cycle | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S04-seat-cycle | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S05-seat-cycle | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S06-seat-cycle | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S10-start-all-ready | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S11-no-bot-fill | PASS；1.0兼容，1.1被用户新要求覆盖 | implemented-engine-command · `tests/engine/rules.test.ts` |
| S12-freeze-seats | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S13-normal-auto-draw | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S14-no-extra-draw | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S15-response-gates-next-draw | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S16-concurrent-responses | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S17-hu-priority-seat-order | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S18-eat-after-hu-fail | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S19-no-late-claim | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S20-intent-once | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S21-eat-tile-protection | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S22-eat-limit | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S23-idempotent-eat | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S24-wall-empty-still-respond | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S25-human-timeout | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S26-manual-fourteen-and-commas | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S27-invalid-sentence-no-transition | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S28-comma-reorder-accessibility | PASS | real-browser-keyboard-pointer-touch + actual-controller · `docs/evidence/ui-browser-results.json`、`tests/ui/model.test.ts` |
| S29-discard-hu-reservation | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S30-compose-timeout | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S31-full-online-thresholds | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S32-no-reviewer-own | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S33-no-reviewer-discard | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S34-concurrent-votes | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S35-vote-freeze-disconnect | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S36-reviewer-return | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S37-reviewer-late-join | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S38-vote-hidden-progress | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S39-reject-ranges | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S40-anonymous-union | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S41-self-hu-rejected | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S42-discard-hu-rejected | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S43-win-once | PASS | real-http-socket-sqlite + engine · `tests/engine/rules.test.ts`、`tests/server/server.test.ts` |
| S44-disconnect-grace | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S45-grace-beats-turn-timeout | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S46-offturn-grace-no-table-freeze | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S47-bot-policy-restriction | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S48-applicant-grace-return | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S49-applicant-grace-expires | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S50-recovery-wins-race | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S51-bot-wins-race | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S52-refresh-identity | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S53-cross-device-secret | PASS | real-http-socket-sqlite + engine · `tests/server/server.test.ts` |
| S54-recovery-code-rotation | PASS | real-http-socket-sqlite + engine · `tests/server/server.test.ts` |
| S55-all-offline-pause | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S56-all-offline-expiry | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S57-restart-recovery | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S58-restart-receipt | PASS | real-http-socket-sqlite + engine · `tests/engine/rules.test.ts`、`tests/server/server.test.ts` |
| S59-hidden-projections | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S60-multiroom-isolation | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S61-action-id-content-conflict | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S62-old-phase-replay | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S63-one-vote-per-reviewer | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S64-deadline-boundary | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S65-next-dealer-and-ready | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S66-host-transfer | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S67-close-running | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S68-end-unscored-race | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S69-end-unscored-single | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S70-leave-not-delete | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S71-lobby-finish-close | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S72-pause-withdrawal-pending | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S73-own-withdraw-discard | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S74-http-seat-race | PASS | real-http-socket-sqlite + engine · `tests/server/server.test.ts` |
| S75-cookie-restore-boundary | PASS | real-http-socket-sqlite + engine · `tests/server/server.test.ts` |
| S76-server-time-calibration | PASS | real-http-socket-sqlite + engine · `tests/engine/rules.test.ts`、`tests/server/server.test.ts` |
| S77-draft-independent-version | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S78-grace-timer-cross-phase | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S79-retention-original-expiry | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S80-queued-hu-remaining-grace | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S81-reserved-eat-bot-invalid | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S82-queued-hu-bot-invalid | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S83-persistence-codec-roundtrip | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S84-private-stale-event | PASS | actual-client/adapter/controller + engine · `tests/ui/network.test.ts` |
| S85-draft-stale-rebase | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S86-other-returns-first | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S87-restart-other-returns-first | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S88-idle-seat-release | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S89-capacity-and-no-reseat | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S90-finished-win-retention | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S91-lobby-grace-null-round | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S92-finished-refill-next-start | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S93-eat-grace-cancel-immediate | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S94-compose-manual-withdraw | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |
| S95-candidate-draft-private-restore | PASS | implemented-engine-command · `tests/engine/rules.test.ts` |

## 新增1.1与高风险回归

| 范围 | 结果 | 证据 |
|---|---|---|
| 2—6座、一真人+指定AI，800ms只摸打 | PASS | designated-ai.test；astra-ai-local；public-ai |
| 至少1真人、真人全准备、指定AI自动准备 | PASS | designated-ai.test；真实UI/API |
| 仅房主候场/结算增减AI；不覆盖真人/不在局内改席 | PASS | designated-ai.test；astra-ai-local |
| AI无会话/恢复码，房主只移给真人，全离线暂停 | PASS | designated-ai.test；真实服务与公网 |
| 练习局不胡不投不计分，混合桌仅冻结真人 | PASS | designated-ai.test；astra-ai-local；public-ai |
| 结算移除持牌AI→重设/补真人→下一局，牌权守恒 | PASS | designated-ai.test；S92；astra-ai-local |
| 旧1.0房间重启保留版本并拒绝AI补位 | PASS | legacy test；无全局迁移 |
| 普通/候选旧私密版本丢弃，未知ACK不重放 | PASS | tests/ui/network.test.ts；model.test.ts |
| 初连RESYNC后才写、READY明确CAS失败安全重试 | PASS | network.test.ts；最终公网Astra复核 |
| 旧restore不能复活已离开的房间或覆盖新房Cookie | PASS | network.test.ts；client-lifecycle-results |

## UI32项

| ID | 状态 | 实际依据 / 边界 |
|---|---|---|
| UI01 | PASS | UI-ADOPTION及原图对照；table-4-desktop与真实牌局截图 |
| UI02 | PASS | 真实游戏路由canvas/Three材质；每次发牌/投票/结算后canvas断言 |
| UI03 | PASS | actual adapter 20组合、2—6真实独立浏览器及截图 |
| UI04 | PASS | 本地汉字纹理、重复字ID、390/430实际bounds与系统字体；未代称物理手机GPU |
| UI05 | PASS | 实体ID模型、S21同字不同实体、真实EAT保护及前后快照 |
| UI06 | PASS | 单一controller、3D/DOM输入切换、真实键盘/触摸脚本 |
| UI07 | PASS | 安全投影源码、真实网络与两房间、无对手暗牌/未来山牌/生产诊断出口 |
| UI08 | PASS | 真实renderer可增长集合；旧UI报告216+额外视图容量实测 |
| UI09 | PASS | 390/430双行14字、3逗号bounds、Astra430新版截图及版本底部独立行 |
| UI10 | PASS | 实际Pointer/CDP触摸、键盘取消、权威增牌本地草稿归一化 |
| UI11 | PASS | 真实三逗号锚点与形式案例/牌权变化修剪 |
| UI12 | PASS | 实际44px逗号替代按钮与跨行操作 |
| UI13 | PASS | 键盘Space/方向/Enter/Escape及DOM位置汉字逗号标签；真实读屏见UI31边界 |
| UI14 | PASS | advanced真实13+1候选/私密独立保存；S95保存/恢复/清理断言 |
| UI15 | PASS | S02—S06全逻辑座次；真实HU失败后EAT/不补摸/禁打同实体 |
| UI16 | PASS | 全人数真实评审阈值、混合真人评审、冻结集合掉线/恢复测试 |
| UI17 | PASS | advanced异议跨逗号、匿名计数与并集实际显示；网络无逐票归因 |
| UI18 | PASS | 实际触摸/键盘/鼠标索引、合并删除、APPROVE无ranges |
| UI19 | PASS | 权威快照先进入显示、没有飞牌业务回调；真实8秒响应不等动画 |
| UI20 | PASS | epoch/round/phase/private普通及候选版本门控，旧结果丢弃 |
| UI21 | PASS | 真实WIN、否决后30秒mustDiscard和下一局；旧WIN独立归档 |
| UI22 | PASS | advanced真人超时文字、15秒缓冲、BOT800ms与AI标签 |
| UI23 | PASS | 恢复先/AI先两种提交顺序；真实跨设备撤旧页与已提交动作保留 |
| UI24 | PASS | astra-paused-context真实申请人断线暂停与恢复；引擎原grace优先级 |
| UI25 | PASS | 真实公网LaunchAgent重启/全离线；引擎原24h与申请人撤回优先级 |
| UI26 | PASS | 实际禁WebGL启动后可用DOM回退，保留同身份与命令链 |
| UI27 | PASS | 正常投票context、暂停投票context、全部浏览器offline+服务暂停context三组合；离线页不冒称收到最后暂停广播 |
| UI28 | PASS | 真实丢context/重建，最新权威投影，无重放动作；草稿/冻结句保持 |
| UI29 | NOT_RUN_ENV_REQUIRED | 物理中档手机/约定桌面硬件GPU预算未现场测；旧无头帧样本只作观察，不算预算通过 |
| UI30 | PASS | 旧UI报告20次重建GPU对象数稳定；新房切换AbortSignal/socket/定时器代次回归 |
| UI31 | NOT_RUN_ENV_REQUIRED | 真实读屏软件、浏览器菜单200%缩放及硬件辅助功能未现场测；已有ARIA、焦点、文本状态与reduced-motion实现 |
| UI32 | PASS | real-browser全人数、advanced、public-network/AI/operations，实际HTTP/Socket/SQLite |

## 未执行与限制

- UI29、UI31保留现场未验收，不能将Chrome触摸模拟、无头帧率或等效窄视口称为实体手机GPU/真实读屏/真实200%浏览器菜单缩放。
- 真实公网使用当前Mac网络访问云HTTPS；无已确认的手机蜂窝现场结果。
- 备份恢复已做逐表沙盒核对；旧1.0版本的应用回滚演练不证明含1.1指定AI数据能回退到不理解AI的1.0应用。
- 字库daily-v1是实验配比，尚未验证真实多人局长、胜率或平衡。
- Vite保留Three主包体积提示（约746KB未压缩）；构建和npm audit通过，不把体积提示写成性能通过。
