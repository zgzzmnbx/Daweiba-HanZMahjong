# 1.17.0 · 桌边行动计时 · 2026-10-24

倒计时与一句行动提示合并到牌桌下沿偏右的固定高度栏；不再占用左上方标题。提示区在左，数字和进度在右。剩余比例大于50%为绿，20%–50%为金，不超过20%为红；同时显示数字，不依赖颜色辨识。角色/响应/投票状态只消费权威快照，不发送命令。

共享冻结版本的时长配置：新局真人120秒、响应8秒、评审60秒；旧局各阶段沿用旧规则，1.4的AI显示5秒预算。刷新与重连不把当前剩余时间当满格；暂停采用remainingMsWhenPaused，零秒等待服务器结算。评审结束不借用下一回合时间，观战用只读提示。视口固定布局，时间和文字变化不调整牌桌几何。

正式 release `1.17.0-20261024-093254`，源码 `c2e31fe`，发布前一致性备份 `pre-release-20261024-093255.sqlite`。公网ready=true，JS/CSS与冻结构建逐字节一致；原端口、数据和规则保留。286项自动测试、20项本地/15项公网连续摸打稳定性、17项本地/14项公网计时检查通过。最后补丁仅调整短竖屏评审七字换行，补丁后重新构建、286测试与17项计时/四窗口评审复验；公网在最终构建上完成全部检查。自建测试房均无计分关闭，没有新增天书记录。

证据：`docs/evidence/public-turn-hud-1.17.0-release.json`、`public-turn-hud-1.17.0-results.json`、`public-table-timer-1.17.0-results.json`。源码和验收证据已同步GitHub `5033c14`，远端文件树与本地交付一致。

手机为Chrome窗口模拟，未冒充实体设备。

实现：table-ui/turn-hud.ts、TurnHud.tsx/css；GameTable、HuReviewDialog、SpectatorTable接线。验证：tests/ui/turn-hud.test.ts、scripts/verify-turn-hud.mjs、scripts/verify-table-stability.mjs。运行配置与数据无修改，不新增依赖。
