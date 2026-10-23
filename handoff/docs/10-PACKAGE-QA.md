# 本交接包检查记录 · V1.1.0

日期：2026-10-21。交接包版本V1.1.0；游戏规则仍为V1.0.0。这里记录实际执行的材料、契约及参考图检查，**不是未来游戏的验收报告**。游戏验收模板保持NOT_RUN。

## 1. 实际检查结果

| 项目 | 结果 | 能证明的范围 |
|---|---|---|
| 原需求与规则保留 | PASS | 原六项确认继续有效；新增用户选择EnglishMahjong UI。17份既有规则/类型/夹具/部署相关文件与V1.0.0逐字节一致 |
| 上游固定与完整性 | PASS | 固定提交6830301df3061cdd25350cf56807473e5505b311；41份原文件+1张作者原图的字节数、SHA-256与Git blob SHA-1全部匹配 |
| 采用路线交叉审查 | PASS | 指向src/table3d真实渲染链；四人/108张/英语图集、TileId、源API、素材边界、DOM/3D唯一控制器均有明确处理 |
| 原字库与数学夹具 | PASS | 84种单字；2–6人120/144/168/192/216张；21投票例、14句子例、15异议例、2草稿例、1匿名并集例 |
| 原游戏场景索引 | PASS | 91条GIVEN/WHEN/THEN规格，六项需求与全人数可追踪；未执行对应游戏实现 |
| 新UI场景索引 | PASS | UI01–UI32共32项真实采用/交互/网络/性能验收规格；对应实现仍待完成 |
| 新显示夹具 | PASS | 972条数据/模型断言；覆盖20种N/mySeat组合、草稿、手机网格、异议、动画戳、公私快照示例、容量预算 |
| 夹具校验器反例 | PASS | 2个合法公开句/历史正例通过；9个故意破坏的输入均因指定原因被拒绝，未改正式数据来迎合结果 |
| TypeScript严格编译 | PASS | TypeScript 5.9.3，strict编译contracts/types.ts及table-view.ts；没有Three.js/React应用参与 |
| 实际显示辅助函数 | PASS | 对编译后导出的席位映射、草稿归一化、移动格位与动画戳函数执行131条断言；TableViewAdapter接口尚未实现 |
| 四张设计参考 | PASS | 4套可编辑SVG已实际渲染为PNG并逐张查看；三张1440×1000、一张390×844；14个汉字、逗号与主要按钮无已发现裁切 |
| 字体与移动尺寸 | PASS | 参考文字所需297个中文字符被子集覆盖；390/430规格与类型中的44×58/48×62数值一致，逗号不增加网格宽度 |
| 参考HTML | PASS | 四场景、唯一ID、资源内嵌和切换脚本语法检查；未运行真实浏览器点击/字体兼容测试 |
| 配置格式与文档链接 | PASS | JSON、SVG/XML、TOML、plist、Python及 authored Markdown相对文件链接通过；原始部分源码快照的未收录链接不改写，改由来源完整性校验覆盖 |
| 转发模板关系 | PASS | 云端7000控制口、回环7300转发、Mac3000端口链；仅结构与既有官方字段核验 |

972和131是不同层次的材料/辅助函数断言计数；91和32是待真实实现的验收规格数量。四者不能相加宣传为已通过的游戏测试数。

## 2. 复现命令

在解压后的交接包根目录，用Python 3.11+执行：

```bash
python3 checks/validate-fixtures.py
python3 checks/validate-table-ui.py
python3 -B checks/validate-table-ui-regressions.py
python3 references/englishmahjong/verify-snapshot.py
python3 checks/check-package.py
```

严格类型检查和真实辅助函数检查需要另外提供TypeScript 5.9.3编译器。其精确版本及tarball完整性值见上游锁文件；本次临时取得的编译器已按该SHA-512核对，不随交接包分发，也没有执行上游依赖安装或生命周期脚本：

```bash
node checks/validate-table-contract.mjs /absolute/path/to/typescript/bin/tsc
```

该脚本通过标准编译器API严格编译两个契约，在临时目录产生CommonJS后执行纯函数断言并清理；不访问网络。另已使用同版编译器以ESNext/bundler模式执行无输出strict检查。未来实现项目仍需对自己的完整代码执行typecheck/build。

PNG、字体、HTML的复现命令与实际环境限制见 [ui-reference/README.md](../ui-reference/README.md) 和 [视觉检查记录](../ui-reference/VERIFICATION.md)。执行输出保存于 [checks/RESULTS.txt](../checks/RESULTS.txt)。根目录MANIFEST记录交付文件大小和SHA-256，打包时核对ZIP成员与CRC。

## 3. 本轮修复的材料一致性问题

1. 原桌的固定四人/108牌与新的2–6人字库容量不能共用，已规定动态布局和额外引用预算。
2. 桌面3D手牌与DOM编辑必须共享唯一草稿、选中身份和命令入口，投影失配时先禁选。
3. 空座恢复示例必须属于候场/结算等非进行中状态，已修正不合法的进行中空席fixture。
4. 借牌候选独立验证申请人、来源、14张实体引用及自己的逗号；不能误读普通13张草稿的逗号数量。
5. 公共快照嵌套字段使用允许清单，防止换个字段名夹带隐藏牌ID；合法公开句/历史仍通过正例。
6. 牌池预算必须是非负整数，ghost与借牌引用均有余量；负数或小数不能让不足容量通过。
7. 实际类型名、前端目录、移动尺寸、20次资源生命周期验收和NOT_RUN状态统一。

## 4. 保持逐字节一致的17份文件

- docs/01-RULES.md、02-STATE-MACHINE.md、04-ACCEPTANCE.md。
- contracts/types.ts、rules.defaults.json。
- checks/validate-fixtures.py。
- fixtures/deck.daily-v1.json、scenario-cases.json、sentence-cases.json、vote-cases.json。
- deploy目录原有7份文件：环境模板、Caddy、frpc、frps、两个launchd样例及部署README。

这保证本次修订不通过替换UI悄悄修改既有玩法或部署模板。字库依然是实验配比，尚未通过真人实玩平衡验证。

## 5. 尚未执行

以下均为NOT_RUN；需要主机/设备条件的项，在实施阶段可进一步标NOT_RUN_ENV_REQUIRED：

- 本游戏实际Three.js牌桌、React交互、TableViewAdapter、规则引擎、HTTP/Socket服务与数据库尚待实现。
- 原站完整安装、原站线上试玩和当前部署commit确认；本包固定公开源码，不假定网站与其相同。
- 真实2–6浏览器联机、8秒响应竞态、投票、断线AI、身份恢复、进程重启和备份还原。
- 390/430手机触摸、键盘/读屏、3D投影命中、字体延迟、WebGL丢失/重建，以及目标帧率与GPU资源稳定性。
- 牌库胡牌率、平均局长、换牌频率和中文表达体验的实玩平衡试验。
- 用户Mac、火山云主机、DNS/证书、frp/Caddy原生校验、合盖在线与外网好友访问。

后续Astra/Sol必须按docs/04和docs/12逐项提供实际证据。包内参考图、源码快照、fixture与纯函数检查各有明确边界，不能代替完整软件交付。
