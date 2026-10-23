# 当前任务板

应用 1.12.0 / 新局规则 1.3.0；旧 1.1/1.2 局下次 START 归档后升级，活动旧局冻结。1.11 DONE 已归档到 CHANGELOG/HANDOFF。

| ID | 目标 | 状态 | 验收依据 |
|---|---|---|---|
| REVIEW112 | 60秒实名投票、80%弹窗、圈词鸡蛋及通过/未通过效果 | DONE | 206 项阶段测试、108 项窗口回归；本地和公网各9组真实多客户端交互 |
| SYNC112 | 补同步 GitHub 完整快照 | IN_PROGRESS | 连接器已恢复，核对远端后补同步1.11/1.12及固定牌组记录 |
| EXPERIENCE | 后续九项玩家体验增量 | OTHER_THREAD | docs/increments/PLAYER-EXPERIENCE-20261024-【codex】.md |
| ENV | 实体手机GPU/软键盘/蜂窝/真实读屏 | NOT_RUN_ENV_REQUIRED | 浏览器模拟不替代实体实测 |

## 当前协作占用

评审线程已完成软件验证与公网发布，正在提交及同步源码；暂仍占用 contracts、engine、GameTable、HuReviewDialog、版本/交接文档。SentenceRackController.ts、tests/ui/acquisition-dismiss.test.ts、scripts/verify-acquisition-dismiss.mjs、docs/increments/、TTS探针由另一线程持有，本次不暂存这些文件。turnMs本次仍60000，仅voteMs为60000；后续120秒思考/AI5秒、观战/托管/TTS由玩家体验线程按序实现。全部同步结束后在此释放共享文件。
