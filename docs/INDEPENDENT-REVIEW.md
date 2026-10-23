# 独立实现复核

2026-10-23，主代理复核 Sol 实现。先用真实引擎函数/SQLite 构造反例，再交 Sol 修复；不改手工预期来迁就实现。以下是开发阶段发现及复测，不代表当前发布版仍存在这些缺陷。

| 规则 / 范围 | 最小反例及影响 | 复测状态 |
|---|---|---|
| R-007 候场房主顺序 | 房主从0移到1、2；1重新入座，2离开，在线1和3应由3接任，原实现错误选1 | 已复测 p3，PASS |
| R-048 重启首返宽限 | 重启20秒后首位真人回来，其余人应从此刻获得15秒恢复期，原实现重启时开始计时已变BOT | 首返21000→其余graceEndsAt36000，PASS |
| 候场全离线后重入 | 全员席位释放后原用户重新入座，原实现仍PAUSED_ALL_OFFLINE，无法准备 | RUNNING，PASS |
| R-047/049 恢复与过期 | 申报者离线超时，回来先撤回评审，再继续牌局；原实现遗留旧24h expiresAt | RUNNING且expiresAt=null，PASS |
| R-050/052 关闭后留结果 | 开局→本局后关闭→另一人离线→唯一真人无分结束，原实现ROOM_CLOSED覆盖终局且SQLite无结果 | archive=1、round_results=1，PASS |
| 房间回收定时器 | 候场全离线24h后关闭，原实现保留过去RETENTION_END，服务每1ms空跑 | 关闭后RUNNING、pendingJobs=[]，后续runDue无过期任务，PASS |

公网验证已由 `scripts/verify-public.mjs` 执行并生成 `docs/evidence/public-network-results.json`。此脚本使用真实公网 HTTPS/WSS、独立会话和正常命令入口；其范围不等于浏览器操作或实物手机验收。Astra 最终独立视觉与操作复核另列在最终验证记录。

最终接线另修复身份恢复请求迟到覆盖Cookie/重开已退出房间，以及权威手牌变化导致canvas卸载未恢复。真实延迟HTTP、独立浏览器与WebGL丢失/恢复证据分别见 `client-lifecycle-results.json`、`advanced-browser-results.json` 和 `ASTRA-FINAL-REVIEW.md`。
