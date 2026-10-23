# 当前任务板

应用 1.12.0 / 新局规则 1.3.0；旧 1.1/1.2 局下次 START 归档后升级，活动旧局冻结。1.11 DONE 已归档到 CHANGELOG/HANDOFF。

| ID | 目标 | 状态 | 验收依据 |
|---|---|---|---|
| REVIEW112 | 60秒实名投票、80%弹窗、圈词鸡蛋及通过/未通过效果 | DONE | 206 项阶段测试、108 项窗口回归；本地和公网各9组真实多客户端交互 |
| SYNC112 | 补同步 GitHub 完整快照 | DONE | 1.11/1.12及固定牌组记录已补同步，远端文件树与冻结提交7804df2一致 |
| EXPERIENCE | 后续九项玩家体验增量 | OTHER_THREAD | docs/increments/PLAYER-EXPERIENCE-20261024-【codex】.md |
| ENV | 实体手机GPU/软键盘/蜂窝/真实读屏 | NOT_RUN_ENV_REQUIRED | 浏览器模拟不替代实体实测 |

## 当前协作占用

评审线程在本地提交 `7804df2` 固定1.12源码快照，已通过公网验收并部署。**源码文件现已释放：GameTable、contracts、engine 等可由玩家体验线程继续修改；本线程不再修改这些源码，也不再重新构建或部署。** GitHub同步严格读取7804df2的Git对象，不读取后续工作区，避免混入新功能。GitHub同步已完成；**本线程源码与项目文档全部释放**，玩家体验线程可继续按用户顺序接线、更新版本和部署。

SentenceRackController.ts、tests/ui/acquisition-dismiss.test.ts、scripts/verify-acquisition-dismiss.mjs、turn-attention.ts及对应测试、docs/increments/、TTS探针由另一线程持有，未纳入1.12暂存/提交。turnMs本阶段仍60000，仅voteMs为60000；后续120秒思考/AI5秒、观战/托管/TTS由玩家体验线程按序实现。tileProps的dismissAcquisition接线留给该线程，本线程未执行。
