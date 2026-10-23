# 执行任务板

以下均为待实施，不代表本交接包已经完成游戏代码。

| ID | 目标 | 负责人 | 前置条件 | 状态 | 验收/证据 | 下一步 |
|---|---|---|---|---|---|---|
| M0 | 仓库、契约与上游来源基线 | Astra | V1.1.0交接包 | NOT_STARTED | 待补 | 核对固定源码、许可、采用清单 |
| M0-V | EnglishMahjong真实3D四人视觉基线 | Astra | M0 | NOT_STARTED | 待补 | 提取renderer并接合成可见快照 |
| M1 | 2–6人UI、排句与评审交互 | Astra | M0-V | NOT_STARTED | 待补 | 按docs/03实现唯一输入控制器 |
| M2 | 规则引擎 | Sol | M0 | NOT_STARTED | 待补 | 落位固定夹具 |
| M3 | 服务/身份/恢复 | Sol | M2 | NOT_STARTED | 待补 | 房间串行队列 |
| M4 | 真实TableViewAdapter与命令连接 | Sol | M1/M3 | NOT_STARTED | 待补 | 快照对账、动画代次、移除默认mock |
| M5 | 全链路与新增UI验收 | Sol/Astra | M4 | NOT_STARTED | 待补 | 原91场景与UI01–UI32分开记录 |
| M6 | Mac与云入口 | Sol | M5 | NOT_STARTED | 待补 | 本地生产启动 |
| M7 | 最终复核 | Astra | M5/M6 | NOT_STARTED | 待补 | 审核证据 |

采用记录使用UI-ADOPTION.md模板。正常路径必须是真实Three.js牌桌；参考SVG/PNG/HTML只用于设计对照，不作为M0-V完成证据。类型、夹具和资料校验通过不能将本任务板改成已完成。
