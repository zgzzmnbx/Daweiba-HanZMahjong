# 固定默认牌组 · 配置 1.0.0

2026-10-23，按用户提供的 `【牌库】/默认麻将套组-（基于文字失明）-v1.0.txt` 设置运行服务默认麻将套组。应用保持 1.10.0，规则保持 1.2.0；未修改游戏源码、依赖或发布运行程序。

## 字牌与命名

- 新默认名称：默认麻将套组（基于文字失明）。共144张、142种汉字，“像”“个”各两张，其余各一张。
- 只忽略原文件空白与换行，按字符出现次数保留重复字；不纠正、不替换原字。
- 所有字的 copiesByPlayers 在2、3、4、5、6人时完全一致，总数均144。
- 旧classic套组改名“动态牌组”，84种汉字和120/144/168/192/216张配比完整保留；仅改名产生managed-r2。
- 新组ID及目录修订见 [导入报告](evidence/fixed-deck-v1.0-import-results.json)。原文与标准JSON位于根目录【牌库】。

## 生效范围

已应用到Mac生产数据库，并由原有火山云HTTPS入口提供，无服务重启。新建房间默认选中新组；玩家仍可手动选择动态牌组。既有房间绑定的套组ID不变，活动局字库、名称、版本及牌墙继续冻结，下一局按绑定组读取最新修订。此配置保存在运行数据库中，空白库初始化仍采用原始种子，不会自动导入本次用户牌库。

## 实施与恢复

操作前使用项目db-backup脚本VACUUM INTO完成一致性备份和integrity检查。备份文件pre-fixed-deck-20261023-v1.sqlite保存在macOS Application Support/WordMahjong/backups私有目录，未纳入Git。

先在备份副本演练，再通过现有DeckSets领域方法对运行库执行：CAS改名旧组、克隆新组、校验并保存完整固定配比、最后CAS切默认。原修订、操作审计及幂等创建回执均保留，未读取管理员密码、Cookie或恢复码。SQLite事务与busy_timeout保护并发写入；仅变更套组目录与修订，不改房间绑定或活动牌局。临时维护脚本在Codex-Temp，原始TXT未修改。

如需撤销默认选择，管理员将“动态牌组”设为默认即可；需要恢复旧名称时按当前修订保存“经典字库”，不要倒退修订号。新组可保留以维持已创建房间绑定。不要为撤销目录配置整库覆盖已产生新对局的生产数据库。

新环境如需重建，可在管理员套组界面克隆并命名新组，按标准JSON的entries逐项导入2–6人配比，核对各144张后设默认。标准JSON是配置记录，当前应用没有文件上传导入按钮。

## 已执行验证

1. 沙盒导入成功；旧组entries与totals逐项相等，SQLite integrity为ok。
2. `node --import tsx scripts/verify-fixed-deck-source.ts`：校验TXT SHA256，并对2–6人实际引擎发牌核对144个实体、142种汉字、全部重复次数和牌权守恒；余牌依次117/104/91/78/65。
3. `node --import tsx --test tests/engine/deck-sets.test.ts tests/server/deck-sets.test.ts`：16项通过。未重跑全部200项；未改应用源码，无需重新构建。
4. `node scripts/verify-public-fixed-deck.mjs`：真实公网HTTPS/WSS创建2–6人默认组练习房并发牌，全部144张；另选动态组6人发牌216张。身份恢复保持套组与版本，测试房均不计分关闭，目录未被验收改动。
5. 真实线上浏览器开房窗口默认选中新组，4人显示144张；切2人和6人均显示142种汉字、144张。下拉菜单同时提供“动态牌组”。只检查开房窗口，未占公共桌。
6. 公网readyz返回ready=true。手机GPU/蜂窝/读屏现场边界无新增证据。

证据见 [导入报告](evidence/fixed-deck-v1.0-import-results.json)、[源文件发牌验证](evidence/fixed-deck-v1.0-source-results.txt)、[套组回归](evidence/fixed-deck-v1.0-regression.txt)、[公网发牌与恢复](evidence/public-fixed-deck-v1.0-results.json)。
