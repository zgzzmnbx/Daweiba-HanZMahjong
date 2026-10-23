# 验收执行入口

原91项索引和UI32项的当前结果、实际层级与证据已转入 `docs/ACCEPTANCE-RESULTS.md`，机器可读索引为 `docs/evidence/scenario-results.json`。原始验收规范与夹具保持在handoff只读目录。

复跑 `npm test`、生产构建、独立浏览器/高级状态/生命周期脚本后，再运行 `python3 scripts/record-verification.py` 更新对应映射。该脚本读取真实JUnit及既有浏览器证据，不执行游戏、不从expected伪造通过结果。

新规则1.1.0指定AI是用户明确覆盖旧R001/S11：旧1.0规则保留兼容断言；新增AI全人数和混合桌单独验收。实体手机性能与真实读屏等现场项目继续明确标NOT_RUN_ENV_REQUIRED。
