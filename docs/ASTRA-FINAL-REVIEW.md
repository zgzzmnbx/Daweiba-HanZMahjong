# Astra 成品终审 · 应用 1.1.0

日期：2026-10-23。复核边界：沿用已确认的 EnglishMahjong 牌桌视觉，独立检查最终 UI、隐私投影、生命周期和真实浏览器流程；引擎、联机与部署另由 Sol / 主代理实现并留证。用户新增空位 AI 和左下角版本号已纳入本次复核，新房规则 1.1.0，旧房规则 1.0.0 保留。

## 当前结论

软件范围终审通过：本次发现的 P0/P1 已修复并有真实回归证据；保留原牌桌风格、完整 2—6 人、匿名评审、恢复和新增 AI 空位。公网 `https://118.196.107.182:1240` 的 `1.1.0-20261023-094705` 发布完成独立三真人 10 项与六座混合 AI 5 项浏览器验收。最终发布 `1.1.0-20261023-094939` 仅增加倒计时显示钳位，服务器期限与游戏语义不变；Astra 对该发布的公网定向检查 4 项通过，实际秒数样本 `[60,8,60]`，390px 手机及 1440px 桌面的 v1.1.0 底行均无覆盖。物理设备/辅助技术限制见文末，不扩称为全硬件验收。

## 采用与视觉

直接核对 `handoff/references/englishmahjong/original-game.jpg`、`docs/evidence/table-4-desktop.png`、`table-6-desktop.png` 与真实联机 `real-6-players.png`；深棕环境、木边绿绒桌、前近后远的围坐视角、厚奶白字牌保留。人物改中性名牌符合资产授权边界。源码映射与固定上游提交见 `docs/UI-ADOPTION.md`、`docs/evidence/ui-source-manifest.json`（0.1.0 历史里程碑）。最终 1.1.0 源码/契约/测试/ops 以及与部署一致的 dist 共 37 文件 SHA 见主代理生成的 `docs/evidence/release-source-manifest.json`；不篡改历史哈希来冒充当前构建。

实际桌体来自 Three.js 几何，不是截图背景。正常设备仍有 WebGL；DOM 排句模式只保留一副可操作本人手牌；他人暗牌仅有匿名可视序号，没有真实字或 tileId。2—6 人真实完整链路证据为 `real-browser-results.json`，不能以开发夹具替代。

## 本次发现与修复

| 问题 | 级别 | 修复与依据 |
|---|---|---|
| 完整服务器新快照与旧控制器草稿短暂混用，导致 INVALID 投影卸载 canvas | P0（此前发现） | Sol 改 `GameTable.tsx`：useLayoutEffect 对账，过渡渲染先使用完整服务器草稿，renderer 生命周期跟随 view 就绪；真实多阶段浏览器检查 canvas。 |
| 退出/换房后迟到 restore 可重新打开旧 socket，迟到 Set-Cookie 可覆盖新身份 | P1 | 本次给 Sol 的最小反例已修：`game-client.ts` generation、AbortController、socket 身份门控；`OnlineApp.tsx` 操作 token、HTTP 中止、卸载门控。两种实际延迟 HTTP 场景见 `client-lifecycle-results.json`，Astra 在当前构建上也独立复跑，两项通过。 |
| 同一公共版本下迟到旧候选草稿版本可覆盖新草稿 | P1 | Sol 的 `acceptEnvelope` 增加独立 candidateDraftVersion 比较；`tests/ui/network.test.ts` 回归。 |
| 公网相邻两名玩家准备时，前一个广播未抵达第二个客户端，READY 被拒 STALE_STATE_VERSION | P1 | 独立公网实际失败保留于 `astra-public-initial-failure.json` / `astra-ready-failure.png`。Sol 对明确拒绝的 READY 获取最新快照后有限重试；未知结果仍复用原 actionId，其他游戏命令 CAS 不放松。 |
| 新快照抵达而 500ms 本地时钟状态未刷新，首帧偶尔显示 61 秒/缓冲 16 秒 | P2 | Astra 对阶段及掉线缓冲共用的估算 now 钳至不早于 envelope.serverNow；只改显示，不改服务端期限。TypeScript/构建通过；094939 公网定向复测见 `astra-final-display-results.json`，样本 [60,8,60]。 |
| 未完成圈词起点、拖动指针和逗号意图可跨阶段/控制权残留 | P2 | Astra 在 `GameTable.tsx` 以 room/round/phase/epoch 清理三个瞬态 UI 引用。 |

## 新增 UI 实现

- `GameTable.tsx`：候场/结算逐座显示“设为 AI”“移除 AI · 留给朋友”，只依服务端 legalActions 启用；开始后不显示座位编辑。`isBotSeat` 区分指定 AI 与真人离线托管，练习模式明确说明不评审及可不计分结束。
- `App.tsx`：直接导入根 `package.json` 的版本字段，大厅和牌桌统一显示。没有另写一个版本常量。
- `style.css`：版本独占底部一行，支持 safe-area，内容滚动区止于该行上方；手机座位清单一列，维护动作允许换行。旧规则候场/结算明确提示新建房才能使用 AI 空位；练习局隐藏自摸/借字申胡，吃/过保留。

## 实际验证与证据

- `npm run build`：TypeScript、Vite 和服务器构建通过。Vite 仍提示 Three.js 主包超过 500 kB；不是运行失败。
- `npm run test:ui`：本次执行 14 项通过（完整测试数量由 Sol 最终证据维护）。
- `node --import tsx scripts/verify-astra-ai-ui.mjs`：Node 24.19.0，Chrome 156.0.8078.47，真实生产静态构建 + HTTP/Socket.IO/SQLite，无引擎状态注入。5 项通过，见 `docs/evidence/astra-ai-local-results.json`。
- 上述浏览器验证 430×932 触摸视口：逐个设置五个 AI、移除再设、一真人练习真实发牌、无中途改座/申胡、不计分结束、局后移除 AI 给真人入座、两真人四 AI 以 1/1 真人评审计分、退出 canvas 销毁；无浏览器错误。
- 截图：`astra-ai-local-home-version.png`、`astra-ai-local-six-seat-controls.png`、`astra-ai-local-practice-table.png`、`astra-ai-local-desktop-result.png`。已经逐图人工核对手机布局及版本行。
- `node --import tsx scripts/verify-astra-context.mjs`：补齐申请人真实断线导致 PAUSED_CLAIMANT_GRACE 后评审者的 context 丢失、回退和重建。两项通过，phase/epoch/stateVersion 不变且投票禁用；申请人正常恢复后原冻结评审完成。证据 `astra-paused-context-results.json` 与 `astra-paused-vote-fallback.png`。采用真实本地生产构建/HTTP/Socket/SQLite，仅服务器时钟固定以隔离缓冲期限，没有注入界面快照。
- `node scripts/verify-astra-public.mjs`：094705 公网发布，3 个独立认证浏览器，10 项 PASS，见 `astra-public-review-results.json`。真实投影选牌/排列保存、三人 2/2 评审、390px 换设备并撤销旧私密区、匿名圈词、拒绝后保留 14 张、context 恢复、每阶段单一 canvas、生产 `/dev` 404。720×500 等效 CSS 视口对应 1440×1000 的 200% 可用布局，14 字字号 28px、无横向溢出；不冒称浏览器菜单真实缩放。
- `PUBLIC_URL=https://118.196.107.182:1240 node --import tsx scripts/verify-astra-ai-ui.mjs`：同一公网发布六座实际 AI 功能 5 项 PASS，见 `astra-ai-public-results.json`；复核了与本地相同的完整 AI/真人入座/练习/正常评审流程。430px 手机与 1440px 桌面截图 `astra-ai-public-*.png` 已人工查看；左下角 v1.1.0 真实可见、独占底行，未遮手牌、逗号或按钮。
- `node scripts/verify-astra-final-display.mjs`：094939 最终公网发布 4 项 PASS，证据 `astra-final-display-results.json`、`astra-final-mobile-390.png`、`astra-final-desktop.png`。一真人一 AI 的真实练习局经过牌响应到本人 14 张，秒数钳位正常、两个尺寸版本底行无挡，正常不计分结束并关房。旧 `astra-public-desktop-action.png` 和 `astra-ai-public-practice-table.png` 等 094705 截图中的 61 秒只记录修复前显示；最新展示使用本条 final 截图，不删除历史缺陷证据。
- 其他独立可复核证据：`advanced-browser-results.json`（借字队列、匿名异议、WebGL丢失、AI缓冲/超时），`client-lifecycle-results.json`（两种迟到恢复），`public-network-results.json` / `public-operations-results.json`（主代理实际公网与进程/代理重启）。证据各自标明实际环境，不混用为物理手机实测。

## 环境限制

物理手机 GPU/温升/真实弱网蜂窝、真实读屏器环境尚未提供，相关设备现场项保持 NOT_RUN_ENV_REQUIRED。Mac Chrome 手机视口及触摸模拟只确认布局和交互。200% 等效 CSS 视口检查与真正浏览器菜单缩放不是同一测试；未做的后者不宣称通过。全离线时没有已连接客户端可接收最后一帧暂停广播，不能声称离线页面已获知服务端最终暂停。Sol 在 advanced-browser-results.json 第 8 项补了实际所有上下文离线/所有 socket 断开、服务端 PAUSED_ALL_OFFLINE、离线页 context 丢失与重建、恢复网络的组合；phase/wall/epoch 不变，动作禁用，重连保留已提交动作。字库为实验配比，玩法平衡尚未做多人长期实玩验证。

## 交棒状态

Astra 本轮代码修改：`apps/web/src/GameTable.tsx`、`App.tsx`、`style.css`；新增四个 `scripts/verify-astra-*.mjs` 验证脚本与对应正式证据；更新 `docs/UI-ADOPTION.md` 和本独立终审报告。应用/新房规则 1.1.0 由 Sol 更新，README/CHANGELOG/HANDOFF/VERIFICATION/任务板由 Sol 与主代理收口，避免并发覆盖；本次不另建版本或提交。M7 可标完成。用户现场硬件与读屏项目继续明确保留，不影响已验证的软件与真实公网功能交付。
