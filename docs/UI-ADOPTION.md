# UI 采用记录 · 0.1.0

2026-10-23，Astra 第一阶段。交接包 V1.1.0；游戏规则 V1.0.0。固定来源 [EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web/tree/6830301df3061cdd25350cf56807473e5505b311)，commit `6830301df3061cdd25350cf56807473e5505b311`。项目初始无Git；主代理已在阶段结束前初始化Git，但尚无项目commit。不得用上游commit代替项目构建标识。

## 实际采用映射

| 原文件/函数 | 本项目目标 | 保留与重写 | 证据 |
|---|---|---|---|
| `src/table3d/main-view.ts` / MainView、setupLights、updatePerspectiveCamera | `apps/web/src/table3d/main-view.ts` / MainView | 实际采用 Scene/mainGroup/viewGroup、桌心111、FOV30、位置 `(0,-222×1.44,222×1.05)`、旋转π×0.3和四盏灯参数；改为按需绘制、受限固定本人机位；5/6人取景系数1.08。取消英文暗词 OutlinePass 与自由相机。 | table-4-desktop.png、table-6-desktop.png |
| `src/table3d/Table3D.tsx` / 桌布与木框构建段 | 同上 constructor | 采用真实 PlaneGeometry 绿桌 `0x1d6b4a`、四根 BoxGeometry 木边、顶面/侧面材质数组；无截图背景。 | 同上 |
| `src/table3d/nameplate.ts` / TABLE_SIZE、RIM_WIDTH、RIM_HEIGHT、WOOD_* | 同上 constructor | 采用231桌面、宽7高3木框、侧面 `0x6b4226` 顶面 `0x8a5a36`；名牌改为本地中性汉字头像。 | 同上 |
| `src/table3d/layout.ts`、setup-slots | `apps/web/src/table3d/adapter.ts` | 仅保留222世界比例；四人/90度/108常量全部重写为明确2—6席位模板与可增长Group。 | 20个N/mySeat单元断言、容量浏览器检查 |
| thing-group、object-view、atlas、asset-loader | 同上 main-view / tile、glyph | 研究后重写；不引入旧GLB/字母图集。6×9×4程序圆角牌体，显式正面平面/背面金色，未知牌没有字纹理。单字Canvas纹理按字缓存；字体ready/loadingdone重建。 | Chinese duplicate tile tests、真实截图 |
| mouse-ui、table-view、loose-reconcile | `table-ui/SentenceRackController.ts`、App.tsx | 不采用英文状态协议。唯一tileId草稿、投影DOM命中、键盘和Pointer Events；mesh没有事件或命令通道。 | 控制器和浏览器交互测试 |
| replay、deal、confirm、characters、英文API | 未采用 | 权威状态由未来自有服务提供。无客户端摸牌/判胜/AI；暂无飞牌动画，快照直接吸附，故没有迟到动画回调。 | 源码边界 |

上述衍生代码适用 EnglishMahjong 与 Autotable MIT，原文保留于 `licenses/`，总归属见 `THIRD_PARTY_NOTICES.md`。

## 资产边界

原人物、GLB、PNG牌面、Draco、音频和Segment7字体均不进入生产。采用 Three 同版本 RoundedBoxGeometry、程序材质与当前操作系统本地中文字体（不分发系统字体）。未知牌只拥有 `wall:<slot>`、`opponent:<playerId>:<ordinal>` 匿名视觉键；没有别人的真实tileId或字形数据。原作者截图只用于 `handoff/references/englishmahjong/original-game.jpg` 对照。

## 视觉对照

正式截图存于 `docs/evidence/`，原始自动化产物在 `output/playwright/`。四人和六人桌面均为实际 Chrome WebGL 截图，包含canvas真实几何，不是包内原型。原作者图为2800×1866；对照时统一显示宽度，不能把游戏局面、UI文案或人物缺失当成逐像素差异阈值。

- 深棕环境、木框轮廓、绿色桌心、黑色中央牌盘和厚奶白牌保留。
- 原人物换中性名牌，原英文开放词区取消，只显示本游戏公开弃牌和未知牌背。
- 本人14字用较大的程序牌体；桌面保留前近后远透视，DOM整理时隐藏这组3D牌。
- 手机保留上方3D桌，下方7+7 DOM字牌，逗号不增加列宽。
- 桌面当前仅画最近24张未被吃走的弃牌，完整弃牌记录在明确标记的可展开DOM记录中，最新牌不被历史遮没。

## 生命周期与性能边界

renderer按需绘制而非常驻动画循环；dispose释放几何、材质、字纹理、中央纹理、监听器、ResizeObserver与rAF，并失去旧context。20次回退/重建检查记录每次 renderer.info.memory，而不是据此宣称系统GPU进程所有内存已经通过泄漏审计。没有物理中档手机性能测试，UI29整项仍NOT_RUN_ENV_REQUIRED；手机截图是当前Mac Chrome视口与触摸模拟。

## 1.1.0 成品复核补记

2026-10-23：牌桌现由 `GameTable.tsx` 承载，默认入口 `OnlineApp.tsx` 已接自有 HTTP / Socket.IO / SQLite 服务。上文 0.1.0 的“未来服务”仅记录第一阶段状态。几何、材质、固定上游提交和素材边界没有改变。

新增候场/局后 AI 空位操作采用牌桌下方逐座清单，不改 2—6 人围坐模板；`isBotSeat` 区分指定 AI 和真人断线托管。左下角版本来自根 `package.json`，独占支持 safe-area 的底行。430px 实际生产构建截图与验证见 `docs/evidence/astra-ai-local-*.png`、`astra-ai-local-results.json`；终审与公网证据见 `docs/ASTRA-FINAL-REVIEW.md`。所有手机截图仍是 Mac 浏览器视口模拟，不扩展为物理手机性能结论。

## 1.3.0 显示交互补记

用户要求手牌抬起、插入让位、落牌及独立透明半宽逗号，覆盖首版“快照吸附”和“逗号不占列宽”的显示策略。原Three场景、木框、绿绒、相机与灯光继续采用；本人牌mesh持久化，由本地草稿预览驱动短暂补间，动画结束停止绘制。权威状态和规则期限仍由服务控制。`table-ui/rack-layout.ts`统一半宽布局，DOM和3D不再各定义逗号偏移。

用户追加游戏化UI：大厅缩略牌桌与座位圆点、金色入场按钮；牌桌采用紧凑状态章和游戏动作，长说明及管理功能收进工具/帮助。汉字牌面与底部版本入口保留。新截图和实际验证以interaction-1.3.0-results.json及对应证据为准，旧截图只代表旧版。

## 1.5.0 显示增量

保持原采用牌桌。逗号实体/布局统一0.7宽；本人最近获得牌由权威私有hand顺序和保护ID识别，在Three材质及DOM同步金色高亮。仅显示层变化，规则与上游来源不变。
