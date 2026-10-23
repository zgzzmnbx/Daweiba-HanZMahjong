# 最新验证 · 1.8.0

## 1.9.0 命名麻将套组验证

195项自动测试（新增16项套组测试）、TypeScript与生产构建通过。真实本地浏览器完成复制、编辑、设默认、实际4人170张发牌、关闭测试房、原组隔离及401重登草稿保留；公网真实HTTP/WSS完成默认/指定组开房、开局、身份恢复和自有测试房关闭，ready=true，真实浏览器确认v1.9.0及管理/玩家选组界面。

发布 `1.9.0-20261023-131518`；一致性备份 `pre-release-20261023-131519.sqlite` 成功。端口、证书与隧道不变；正式服未创建测试套组或修改配比。

详情见 `docs/DECK-SETS-1.9.0-【codex】.md`、`docs/evidence/decksets-1.9.0-browser.json`、`docs/evidence/public-decksets-1.9.0-results.json`。


发布 `1.8.0-20261023-125951`；一致性备份 `pre-release-20261023-125952.sqlite` 成功，公网ready=true。端口、证书、隧道和服务器规则未变。公网验收只创建自身私房并关闭，不修改用户房间或字库。

179项自动测试（新增9项动作/调度测试）、TypeScript与生产build通过。真实本地浏览器捕获3D出牌/摸牌、DOM出牌/吃牌/借胡/14字胡牌，起止矩形与截图已归档，刷新后飞牌数为0。公网2/4/6人各视角真实HTTP/WSS快照通过同一动作planner，另测借胡、AI瞬结及草稿恢复；公网浏览器显示v1.8.0。

证据与范围见 `docs/MOTION-1.8.0-【codex】.md`、`docs/evidence/motion-1.8.0-browser.json`、`docs/evidence/public-motion-1.8.0-results.json`。

动画不阻塞操作与服务器期限；刷新、断线/身份恢复、换局、暂停、关房、滚动/缩放会取消旧飞牌并对齐当前状态；减少动态效果设置直接落牌。对手摸牌仅牌背，不读取暗牌或推测牌墙内容。本次没有新增物理手机GPU、蜂窝或读屏证据，公网仍依赖Mac在线唤醒。

# 历史验证 · 1.7.0

发布 `1.7.0-20261023-124000`；一致性备份 `pre-release-20261023-124001.sqlite` 成功，公网ready=true。端口、证书、隧道不变。公网验收只操作自建测试房，并保存一次与原内容相同的字库修订managed-r1，84字及各人数配比未变。

170项自动测试（新增29项）、TypeScript与生产build通过。真实本地浏览器完成字库增改删保存/重载、大厅姓名、逐座踢人和解散；公网HTTPS/WSS完成独立管理登录、同内容字库修订及并发拒绝、活动玩家踢出转AI、旧身份/恢复码拒绝、房间关闭广播、实际两分钟无人AI房解散及退出会话。公网浏览器显示v1.7.0、玩家姓名/踢出和真实字库。

详见 `docs/ADMIN-1.7.0-【codex】.md`、`docs/evidence/public-admin-1.7.0-results.json` 和 `docs/evidence/automated-1.7.0-tests.txt`。

含管理状态及自定义字库的存档应使用兼容1.7的修复构建，不直接降级1.6继续写库。服务仍依赖Mac在线唤醒；本次未新增实体手机GPU、蜂窝、读屏或字库多人平衡证据。

# 历史验证 · 1.6.0

141项自动测试与生产build通过，覆盖2–6座引擎、概率边界、事务回滚、重启、幂等、旧规则归档。公网HTTPS/WSS通过2/4/6座自胡、2座借胡、混合桌等真人票、恢复不重抽及草稿恢复。真实本地浏览器确认胡牌入口与AI否决票数；摸/吃/胡顺序由开发夹具截图验证。

发布 `1.6.0-20261023-120332`；一致性备份 `pre-release-20261023-120333.sqlite` 成功，公网ready=true，浏览器显示v1.6.0。端口、证书、隧道不变。 证据：evidence/public-ai-review-1.6.0-results.json、public-draft-1.6.0-results.json及AI-REVIEW-1.6.0-【codex】中的分层说明。

# 历史验证 · 1.2.0

107项自动测试（新增10项固定公共桌）与TypeScript/生产构建通过，实际双会话UI及公网HTTPS/WSS状态流通过。证据/环境分层见`LOBBY-1.2.0.md`；以下1.1.0保留历史。

# 当前实现验证 · 1.1.0

2026-10-23。真实引擎、HTTP/Socket.IO、SQLite与完整浏览器已实现。最新结论、原91项和UI32项逐项依据见 `ACCEPTANCE-RESULTS.md`；下面原UI0.1记录保留为历史证据，不能把其中“未实现服务”作为当前状态。

- 应用1.1.0、新规则1.1.0、旧规则1.0.0冻结、交接包V1.1.0；Node24.19.0、SQLite3.53.3。
- `npm run build`、最新JUnit、npm audit0漏洞；真实服务测试包含SQLite故障回滚、结算/回执重启、会话撤销、Origin、坏输入与限流。
- 2/3/4/5/6独立browser contexts完整局及可信HTTPS/WSS公网全人数通过；高级候选/匿名异议/EAT/AI恢复/全离线context组合有独立JSON。
- 1.1指定AI全人数与混合桌验收、应用版本底部显示、旧规则兼容均有真实实现与测试；不会给AI发凭据。
- 初连等待完整RESYNC，READY明确CAS失败安全重试；生命周期generation+AbortSignal及迟到Set-Cookie使用真实浏览器复测。
- UI29、UI31和蜂窝实体环境仍按验收表标NOT_RUN_ENV_REQUIRED。原无头帧时/触摸视口不是硬件性能、真实读屏或真实浏览器菜单缩放的证明。

# 实现验证记录 · UI 0.1.0

2026-10-23，macOS（arm64），Node22，Google Chrome 151.0.7922.174。项目初始无Git仓库，主代理现已初始化但尚未提交；本阶段以当前源码、锁定依赖和ui-source-manifest.json为构建状态。游戏规则V1.0.0、交接包V1.1.0。当前UI验证全部使用明确开发夹具，不能充当真实联机验收。

## 已执行

| 验证范围 | 实际命令/操作 | 结果 | 证据与限制 |
|---|---|---|---|
| 固定上游41源文件+原图哈希 | `python3 handoff/references/englishmahjong/verify-snapshot.py` | PASS | 仅来源完整性，不是游戏测试 |
| TypeScript + 生产构建 | `npm run build` | PASS | `dist/web/`；Three主包导致初版约696KB JS未压缩；构建有chunk体积提示 |
| 依赖审计 | 升级同主版本Vite6.4.5后 `npm audit` | PASS | 0 vulnerabilities；旧6.0.11审计的2项漏洞已修复 |
| 实际adapter/控制器10测试 | `npm run test:ui` | PASS | `tests/ui/model.test.ts`，20人数/视角组合、ID、逗号、候选/独立版本、投票、幂等重试、撤控 |
| 四人真实WebGL与原图对照（UI01/02视觉部分） | 真实Chrome打开 `/dev/baseline`；查看canvas与实际资源 | PASS | `docs/evidence/table-4-desktop.png`；原图保存在handoff，采用映射见UI-ADOPTION |
| 全人数桌面/投影输入（UI03/05/06） | `node scripts/verify-ui.mjs` | PASS | 2—6人数截图；14个DOM投影范围在1440×1000内；重复“我”ID各异；模式切换只一组手牌输入 |
| 键盘、逗号、移动触摸（UI09—13本地交互） | 同上，实际浏览器点击/键盘/CDP触摸 | PASS | 390/430两行7列、字号≥28、scrollWidth==innerWidth；三逗号含第7字锚点；Space/方向/Enter/Esc；跨行真实触摸事件 |
| 候选13+1与投票索引（UI14/18本地部分） | 单元测试 + 390/430浏览器点击起止字后投反对 | PASS | 候选仍13实体+1引用；冻结位置[2,8)跨标点；赞成无ranges字段。未测真实胡队列 |
| 实际context丢失/手动恢复（UI26—28本地部分） | WEBGL_lose_context + 二维模式/重试3D | PASS | 真实canvas消失、DOM保留三个逗号、重试恢复renderer；不发游戏动作 |
| 动态容量（UI08显示预算） | 六人夹具显示216匿名牌墙并额外显示本人/对手/弃牌 | PASS | 运行时Group实际数量≥218；没有索取隐藏牌id；未知牌只存匿名视觉槽位 |
| 资源重建（UI30部分） | 20次fallback→3D，逐次采集renderer.info.memory | PASS | 每次几何/纹理计数相同，JSON包含20采样；未声称系统总内存/所有读屏设备通过 |
| 浏览器错误 | pageerror监听 | PASS | 最新成功执行未出现页面JS错误 |

结构化结果：`docs/evidence/ui-browser-results.json`。脚本截图同时留在 `output/playwright/`。截图是实际浏览器渲染，不是原图加工；不以fixture数据宣称服务端状态机正确。

## 发现并修复的失败

1. 初始CSS含无用data URL import造成Vite构建ENOENT：删除无效import，重新构建PASS。
2. 初始桌面本人牌偏小且画布挤占动作区：依据真实截图放大本人程序牌、限制画布高度，重新检查全人数投影范围PASS。
3. 手机右侧调整容器在负margin布局中拦截逗号托盘：浏览器普通click真实超时；为非按钮容器设置pointer-events:none，按钮保留auto。未用force点击绕过；复测390/430逗号成功。
4. 候选同版本公共快照覆盖本地编辑，以及旧phase pending残留：按来源/独立版本对账；新phase/epoch清pending，撤控清私密区；新增反例测试PASS。
5. 对手倾斜与座位yaw的Euler顺序不当：改为ZXY次序，六人截图复核牌背朝向；始终不含隐藏汉字纹理。

## 明确保留的未验收项

| 范围 | 状态 | 下一步 |
|---|---|---|
| S02—S95真实游戏、UI07跨认证网络隐私、UI15—17真实评审资格/门槛、UI19—25实时状态/AI/恢复、UI32全人数真实联机 | NOT_RUN | Sol完成自有服务与SocketAdapter后逐条执行；当前没有服务端 |
| UI29物理中档手机帧率目标 | NOT_RUN_ENV_REQUIRED | 浏览器模拟不等于实机GPU；JSON可记录当前Mac Chrome样本但不替代手机测量 |
| UI30系统GPU/heap长时趋势及多房间完整寿命审计 | NOT_RUN | 已有20次renderer计数样本，最终真实服务挂载/卸载再复核 |
| UI31读屏软件、200%缩放完整操作 | NOT_RUN | 现有语义按钮、focus ring、reduced-motion；需真实辅助技术操作 |
| 公网完整游戏 | NOT_RUN | 主代理另行维护部署证据，最终由真实服务验证；公网入口连通不等于游戏完成 |

## 当前Mac渲染采样（不代替硬件验收）

2026-10-23最终脚本：Chrome151.0.7922.174，ANGLE Metal Apple M1，1440×1000，DPR1。216匿名牌墙加全部可见夹具手牌/弃牌，共296个tile Group，623次draw call。连续120个requestAnimationFrame强制绘制，丢弃前5帧，p50=16.70ms、p95=17.20ms；这是当前Mac浏览器采样，不宣称物理手机性能达标。20次重建的renderer资源计数见JSON。

正式证据已归档12张PNG、ui-browser-results.json（22检查）、ui-source-manifest.json（源码SHA256）和visual-comparison.html。

## 2026-10-23 · 1.3.0 增量验收

- `npm test`112/112；`npm run build`通过（既有>500k chunk提示）；scripts/*.mjs语法与git diff --check通过。
- `evidence/interaction-1.3.0-results.json`记录本次CUA真实指针/键盘操作、最终构建HTML确认，以及布局尺寸；完整范围见INTERACTION-1.3.0-【codex】。
- 3D与DOM使用同一排句，独立半宽逗号、真实本地AI房间拖动后刷新一致；1280×720下大厅与牌桌主操作可见。
- 发布后ready=true；`public-draft-1.3.0-results.json`真实HTTP/WSS保存/恢复完全一致；公网实际浏览器显示1.3.0并恢复已有4人练习局，新界面截图已存。网络脚本不证明浏览器动画。
- 390/430本次为纯布局测试；历史浏览器脚本只维护选择器并语法检查，未重跑全矩阵。无物理手机/蜂窝/读屏新证据。

## 2026-10-23 · 1.4.0 增量验收

113项测试、build、脚本语法通过。CUA实际3D与DOM拖到中央确认、右侧独立逗号拖入/拖回通过；本地真实2人AI牌局拖出“有”，AI出“右”触发放大提示，结束关闭成功。公网ready=true，HTTP/WSS草稿恢复PASS，实际已有4人桌截图显示AI 4出“能”及新版控件。完整范围和现场边界见TABLE-ACTIONS-1.4.0-【codex】。

## 2026-10-23 · 1.5.0

115项测试/build通过。真实本地点击直接出“眼”、拖动直接出“一”；新摸“而”与新吃“家”在最右高亮，吃牌保护有效；备用44×58，DOM逗号/字牌比例实测0.7000。公网ready及WSS恢复PASS，已有房实际刷新显示新摸“人”与宽逗号。完整证据与限制见DIRECT-PLAY-1.5.0-【codex】；物理手机/蜂窝/读屏未新增。
