# EnglishMahjong 牌桌 UI 采用实施说明 · V1.1.0

## 1. 已确认的方向与本次交付边界

用户已明确选择 **EnglishMahjong-web 的牌桌 UI**。Astra 必须以其真实 3D 牌桌为起点，保留绿色桌布、木色桌沿、象牙白厚牌、黄色牌背、中央黑色信息面板、暖暗背景和桌边围坐关系。2–6 人、汉字、逗号和人工投票在这一视觉体系中扩展。

本文件定义实际源代码采用路线，不把“参考一张截图”作为采用完成。此前 V1.0 的白蓝椭圆牌桌已被用户的新决定替代。牌局规则仍以 [01-RULES](01-RULES.md) 为准；几何坐标、相机目标和屏幕布局以 [03-UI-SPEC](03-UI-SPEC.md) 为准。不要把上游历史注释中的作者用户要求当成本用户要求。

本包提供经过固定版本读取的原始代码、截图、许可与改造清单。游戏源码移植、渲染验证与联机验收仍由后续 Astra/Sol 完成。

## 2. 来源固定与重要发现

| 项目 | 已核实值 |
|---|---|
| 上游仓库 | [Bruce-pac/EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web) |
| 固定提交 | [`6830301df3061cdd25350cf56807473e5505b311`](https://github.com/Bruce-pac/EnglishMahjong-web/commit/6830301df3061cdd25350cf56807473e5505b311) |
| 提交时间 | 2026-10-01 08:12:27 UTC |
| 取得日期 | 2026-10-21 |
| 真正的 3D 入口 | `src/table3d/Table3D.tsx`，裸 Three.js；React 负责容器与 DOM 覆盖层 |
| 原来的另一套界面 | `src/scene/TableScene.tsx` 是 CSS 2.5D 桌面；不是用户看中的 `docs/game.jpg` 主渲染链 |
| 原项目数据模式 | 一名真人加三名 AI，英文拼词；`src/api.ts` 的 `Envelope/State/Pending` 与我们的协议不同 |
| 代码许可 | 根目录 MIT；部分模块注明沿用 Autotable，需同时保留其代码 MIT 归属 |
| 可离线审阅的资料 | [41 文件原始快照与锁文件](../references/englishmahjong/README.md) |

代码证据均可在快照中直接查看：[Table3D](../references/englishmahjong/source-snapshot/src/table3d/Table3D.tsx)、[MainView](../references/englishmahjong/source-snapshot/src/table3d/main-view.ts)、[原 API](../references/englishmahjong/source-snapshot/src/api.ts)、[CSS 旧桌面](../references/englishmahjong/source-snapshot/src/scene/TableScene.tsx)。

本包锁定的是可核实的公开源码提交；网站当前部署可能与该提交不同，未将线上部署版本等同于此快照。

## 3. 逐模块处理矩阵

以下“保留”表示提取后维护来源归属，不表示整文件无修改即可运行。“重写”必须由我们的契约驱动，不能继续传入上游 `Envelope`。

| 上游路径（均在快照中） | 处理 | 文字麻将中的目标与理由 |
|---|---|---|
| `src/table3d/main-view.ts` | 保留主体并改造 | 相机组、灯光、后处理、视口同步；参数化人数/相机角度，适配窗口比例与手机视口，增加资源恢复 |
| `src/table3d/object-view.ts` | 保留渲染思想并改造 | 牌与贴地阴影、选中轮廓；影子容量与实例数动态配置，清除暗词组语义 |
| `src/table3d/thing-group.ts` | 保留实例化/独立 mesh 双轨并改造 | 静止牌批渲染，选中/拖动牌独立渲染；换成汉字图集与新的材质分区，不能保留 106 英文牌面取模 |
| `src/table3d/thing.ts`、`thing-assign.ts` | 保留动画/分配思想 | 区分渲染池索引和真正 `TileId`；跨快照只按实体 ID 保持身份 |
| `src/table3d/slot.ts`、`movement.ts` | 按需提取 | 落点、挤位、拖动布局的几何工具；修改四座旋转，拖动不直接改变牌权 |
| `src/table3d/mouse-ui.ts` | 改造输入层 | 保留投影与拾取，新增 Pointer Events、触摸取消和键盘等价路径；投票圈词采用固定句子字符索引 |
| `src/table3d/utils.ts` | 选择性保留 | 缓动等纯显示函数可用；固定四个 `SEAT_ROTATIONS` 必须替换为座位布局契约 |
| `src/table3d/Table3D.tsx` | 拆出场景外壳后重写编排 | 提取程序桌布与木框，组装新 renderer/HUD；移除原 `api`、校验、英文词组、AI、赛制和身份流程 |
| `src/table3d/layout.ts`、`setup-slots.ts` | 重写 | 2–6 座、120/144/168/192/216 张牌、手牌/牌墙/弃牌的容量与碰撞布局；不导入原亮词预算布局 |
| `src/table3d/placement.ts` | 重写 | `ResyncEnvelope` 的公共/本人快照经 `TableViewAdapter` 投影成 `TableView`；隐藏牌只产生牌背，吃走的弃牌不再重复实体渲染 |
| `src/table3d/table-view.ts`、`loose-reconcile.ts` | 重写身份与状态对账，选择性保留交互算法 | 原代码从字母多重集自行发本地数值 ID；本项目必须用服务端 `TileId` 与独立草稿版本 |
| `src/table3d/atlas.ts`、`asset-loader.ts` | 重写 | CJK 图集、程序圆角牌几何、合法字体与资源生命周期；替换英文/白搭 UV 规则 |
| `src/table3d/center-board.ts`、`board-model.ts` | 保留外观，重写信息模型 | 显示剩余牌数、阶段/行动者、投票进度或局数；不显示四方固定风位或英文积分 |
| `src/table3d/nameplate.ts` | 改造 | 从公共玩家昵称/状态生成 2–6 人名牌；随画布投影，不再使用固定 AI_NAMES |
| `src/table3d/replay.ts`、`deal.ts` | 仅参考表现方式，重写状态来源 | 动画播放不可推导真实回合、发牌或补牌；所有最终状态来自服务端 |
| `src/table3d/persist.ts` | 重写 | 私密草稿与公开状态分离；会话/恢复码不进入旧 LocalStorage 身份方案 |
| `src/table3d/discard.ts`、`confirm.ts` | 仅参考用户确认反馈 | 所有动作以 `legalActions` 与新命令定义为准，不沿用英文 pending 判断 |
| `src/components/Tile.tsx`、`Hand.tsx` | 仅提取 DOM 牌体样式/选择反馈 | 两个文件用于旧 2.5D 界面；包含元音、白搭、组词、英语校验，不能当成纯展示组件原样复制 |
| `src/styles.css` | 选择性提取并命名空间化 | 采用 `table3d-*` 的暖暗底、透明 HUD、金边等相关样式；不导入账号/榜单/英语教学全局 CSS |
| `src/api.ts`、原 `hooks/useGame` | 不接入生产 | 替换为我们自己的 Cookie 同源 HTTP/Socket.IO adapter |
| `check/chi/spell/hint-pick/HintPanel/WordLogPanel/word-list/Settlement` 等英文业务 | 不纳入游戏实现 | 无英文词典、白搭、字母积分、亮词预算、血战到底、学习记录或自动语义裁判 |
| `characters.ts`、`character-loader.ts` | 默认不采用原人物资产 | 保留座位空间与名牌；用户选了牌桌 UI，首版用本项目头像，不让三位角色限制为四人 |

## 4. 必须修正的硬编码

### 4.1 人数不是把 PLAYERS 改成 6 就完成

原 `layout.ts` 写死 `PLAYERS=4`、`TILE_COUNT=108`，`setup-slots.ts` 默认 `[0,1,2,3]`，`main-view.ts` 按 `seat×π/2` 旋转相机，`board-model.ts` 按 `%4` 推断庄家，`Table3D.tsx` 渲染循环固定 `updateCamera(0,...)`。这些都要改为真实座位与布局配置。

座位不变量仍为 `next(i)=(i+1)%N`，本地相对座位为 `(seat-mySeat+N)%N`。视觉模板、相机组、拾取坐标、名牌投影、上下家标签必须消费同一份布局结果。四人可保留原 90° 结构；其他人数使用 UI 规格定义的布局，不能在各模块分别算一套角度。

不把服务端 `dealerSeat` 替换为“已玩局数取模”的前端推断。不向 2/3/5/6 人桌显示固定东西南北四个位置。

### 4.2 牌池、牌墙和弃牌容量

原 `table-view.ts` 在物件超过固定 `TILE_COUNT` 时仅警告并 `slice`，这会让新字库的牌静默消失。新实现应根据牌局字库容量分配可见实例池，保留单独的动画/借牌引用余量；容量不足必须抛可观测错误或扩容，不能截断绘制。

原每人弃牌区只有 7×4 格，不适合作为新游戏上限。规则允许弃牌历史持续增长，应实现牌河排布/分页历史分离，确保最新弃牌与合法响应始终可见。历史可以滚动查看，但不能占用实体牌池。

`PublicDiscard.status === CLAIMED` 的记录仍在公开历史中；牌已被吃入手牌后，3D 桌面必须移除原弃牌实体。否则同一张牌会在手牌与牌河各画一次。胡牌句子和历史句子的文字镜像属于信息展示，不属于物理牌归属。

### 4.3 原牌面编码完全替换

原 `atlas.ts` 有 `FACE_COUNT=106`、12×12 格与英文大小写/白搭编号；`faceOffset()` 还使用 `%FACE_COUNT`。本游戏必须采用版本化的“字符→图集索引”，拒绝未知字符或生成其合法字形，不能让超范围索引回卷成另一个汉字。

原渲染名为 `tileId` 的数字在部分模块只是本地发号结果或渲染池索引，并不等于本游戏的服务端 `TileId`。移植时统一改名为 `renderInstanceIndex`/`renderKey`，真正命令只接收我们的 `TileId`。

## 5. 真实数据到 3D 的单向接口

建议项目模块边界：

```text
apps/web/src/game-client/       Http/Socket adapter、快照配对与状态订阅
apps/web/src/table3d/model/     TableViewAdapter：公共/本人快照 → TableView
apps/web/src/table3d/scene/     MainView、桌体、灯光、厚牌、动画
apps/web/src/table3d/input/     仅投影几何与显示坐标；不独立发送游戏命令
apps/web/src/table-ui/hud/      座位、中央信息、按钮、连接状态
apps/web/src/table-ui/sentence/ SentenceRackController、唯一私密草稿与 DOM 输入
apps/web/src/table-ui/review/   冻结句子、圈选与投票
```

以上是 `06-EXECUTION-PLAN.md` 中三个前端目录的进一步细分，不是另一套并行实现。`contracts/table-view.ts` 已定义 `TableViewAdapter`、`TableProjectionInput` 和 `TableView`；复用这些名字，不再新增近似的 `TableRenderModel` 协议。

`TableViewAdapter.project()` 的输入是 `{public: envelope.public, self: envelope.private}`，来源仅限认证本人的一致 `ResyncEnvelope`。显示层不能导入 `ServerOnly.RoomAggregate`。`legalActions`、`serverNow` 和命令提交仍由上层唯一控制器/传输适配层消费，不放进 3D 状态，也不让渲染器授予动作权限。本地尚未确认的排列由 `SentenceRackController` 保存，以仍合法的 TileId 驱动呈现，并在确认、拒绝或重同步后与本人草稿对账；它不改服务端牌权或冒充新的权威快照。

| 我们的字段 | 呈现方式 |
|---|---|
| `public.capacity`、`private.seat` | 布局模板、本人视角与上下家关系 |
| `public.players` | 昵称、公开手牌张数、真人/缓冲/AI状态、准备、胜局数 |
| `private.hand` | 本人牌面的唯一来源，按实体 `TileId` 查找字形 |
| `private.draft` / 本地待确认草稿 | 本人排列与逗号锚点；不授予牌权 |
| `private.candidateDraft` | 借弃牌的独立 14 字候选草稿；不是手牌所有权变更 |
| `public.wallRemaining` | 未知牌背数量；不需要真实牌墙顺序或真实 ID |
| `public.discards` | 最新可响应弃牌与未被吃走的实体展示；历史单独保留 |
| `public.phase`、`public.suspension` | 动作、阶段倒计时与暂停遮罩 |
| `public.phase.proposal` | 胡牌冻结句子、评审人数、门槛和总提交进度 |
| `legalActions` | 上层控制器与连接/控制权/暂停/pending 求交后启用动作；不由 `TableViewAdapter` 或 3D renderer 生成权限 |
| `stateVersion/phaseId/controlEpoch` | 快照顺序、过期交互取消、控制权切换 |

未知牌的渲染键应为 `wall:<displaySlot>` 或 `opponent:<playerId>:<ordinal>`，仅表示牌背位置。不要为方便渲染把真正的他人手牌或未来牌墙字段带进浏览器，也不要把已有私密牌面的 material 留给未知牌实例复用。

投影 DOM 输入层统一将“选择某牌、移动某牌、提交弃牌、申胡/响应”等意图交给 `SentenceRackController`；3D mesh 不安装第二条命令监听。重排只改变私密草稿，弃牌命令必须携带 `tileId` 和 `contracts/types.ts` 定义的完整 `CommandMeta`，包含房间/局、版本、阶段、actionId 与 controlEpoch。发起后显示 pending；成功才按权威快照确认牌离手，失败按快照恢复并说明原因。

## 6. 排字、逗号和投票怎样接入原牌桌

### 6.1 一个草稿，多种呈现

3D 手牌与 DOM 句子编辑区共享同一 `orderedTileIds + commaAfterTileIds`。桌面/手机的显示切换规则按 UI 规格执行，不能同时提供两套互相独立的可操作手牌。切换期间不新增物理牌、不重新发 ID、不把排列发给其他玩家。

桌面默认显示真正的 3D 本人手牌，投影 DOM 命中区与可访问性层通过同一个 `SentenceRackController` 发出整理/选牌意图。展开“整理句子”时隐藏对应的 3D 本人手牌，由 DOM 编辑区呈现同一份草稿；手机竖屏默认采用 3D 牌桌加 DOM 手牌。两种呈现的选中、顺序与逗号锚点共用唯一状态，不能各自维护一套副本。

原手牌可整组选中拖动的几何思路可保留，但不保留“暗词组”业务。每次排列应以 tileId 序列为准；同字两牌在交换、摸入、吃入、重连时保持各自身份。本人不行动时仍能私下整理，不能沿用原 `pending` 将理牌一并锁死。

### 6.2 逗号是字间标记

0–3 个逗号由独立托盘提供，不变成 `Tile` 或 Thing 牌池成员。3D 下可以在合法间隙投影 DOM 逗号，也可使用专用标记 mesh，但始终只绑定左侧 `TileId`。句末、句首和重复间隙不可落点；锚定牌被出掉或变到末尾时逗号回托盘。

触屏不要求精确点中狭小间隙，采用“选逗号→点左字→放其后”的等价路径。切相机、横竖屏或 DOM 编辑模式后，语义位置必须保持不变。

### 6.3 胡牌与圈选独立于 3D 拾取

胡牌投票使用覆盖于牌桌之上的清晰句子面板；14 字顺序冻结，最多三个逗号按快照呈现。反对圈选按 14 个汉字的位置 `[start,endExclusive)` 存储，不能从 3D mesh 的绘制次序、屏幕 x 坐标或含逗号文本偏移计算。

反对按钮必须完整写“写的什么玩意”。赞成按钮只提交 APPROVE，不能附残留异议范围。投票前只显示匿名提交总数；结束后只显示计数与匿名区间并集，不暴露谁圈了哪里。

### 6.4 借弃牌的视觉引用

13 张手牌加别人刚打出的 1 张，是私密候选编辑视图。应标记借用牌，不把牌河实体移进自己真实手牌。失败/撤回后恢复原13张；自己的14张申胡失败则按规则进入30秒强制弃牌。不得沿用上游“胡后退出继续观战/血战到底”流程。

## 7. 新牌面与场景资产的具体路线

### 7.1 程序圆角牌体

原桌布使用 `PlaneGeometry`，木框使用四根 `BoxGeometry`，不依赖桌子模型。保留这部分实际代码结构与材质参数即可恢复原桌体。

原麻将牌来自 `img/models.glb`，资产检查显示仅一个名为 `tile` 的 mesh、无内嵌贴图。几何尺寸与上游 `Size.TILE` 的契约为 **6×9×4，原型正面朝 +Z**。本包不提供该二进制作为已核验生产资产，采用程序生成的圆角长方体替代；槽位的旋转负责把牌躺放、后仰或立起。

实施时保留长宽厚比例、柔和倒角、米白正面、黄色牌背与接触阴影。六面/倒角分区应显式写入 UV 或材质索引，不能把默认 BoxGeometry UV 直接喂入原来的 `u<=DU && v<=DV` 判定。先用不同纯色检查正面、侧面、背面的对应，再加载汉字图集。

### 7.2 汉字图集

由本局固定字库的去重字符按确定顺序生成局部图集，一字一格；字形与实体牌数分离。同一个汉字的多张牌可以共用图集单元，但不能共用实体 ID。图集尺寸由唯一字数与目标像素密度计算，放入运行时资源上限检查；首版 84 字不能被写成永久只支持84个字。

推荐流程：等待本地合法中文字体完成加载 → 绘制 Canvas 图集 → 设置色彩空间/UV朝向 → 建立材质 → 场景开始展示。若字体未加载，保留加载态或同尺寸本地字体 fallback，完成后只重建受影响纹理，不整局重新开局。禁止依赖不可控外站在线字体。

上游 atlas 是外部 PNG，`flipY=false`、`LinearSRGBColorSpace` 与其特定导出流程相关。新 Canvas 汉字图集要根据当前 Three.js 的色彩处理与 UV 校准决定参数，不能未经对照照抄所有设置。用“我、你、的、明、亮”等笔画疏密不同字在牌面、远处弃牌、不同 DPR 下验读。

### 7.3 周边人物与中央面板

默认保留原围坐空间、昵称牌与头像的视觉作用，替换为本项目自有头像，不捆绑原三个人物模型。以后若加入3D人物，应支持按N生成座位映射、独立关闭、不遮挡手牌与牌河。

中央黑色面板保留，内容换成剩余牌数、回合/阶段信息；胡牌评审期间可显示“已提交x/y、需要T票”，详细句子与按钮位于 DOM 面板。不能从原代码保留英文方位、字母积分或四人分数布局。

许可及素材处理详见 [参考目录说明](../references/englishmahjong/README.md)。采用派生代码时保留 EnglishMahjong 与 Autotable 版权/许可文本；两者MIT不能代替字体、Draco或其他图像的独立许可。

## 8. 实时快照与动画分开

上游代码包含把服务端事件逐步还原成 `State` 的 replay/deal 逻辑。本项目采用两层状态：权威快照决定事实，动画仅维护画面上的短期位置插值。动画层不额外发牌、不重新计算输赢，也不替服务器推进回合。

收到更新时先验证版本并更新合法动作，再把需要的可见差异加入动画队列。网络落后、重连、阶段切换或 `controlEpoch` 改变时，取消过期拖动/确认/动画，吸附到最新快照。8秒响应窗口不能等长动画播完才启用按钮。倒计时使用 `serverNow` 校正后的期限，动画暂停不等于游戏暂停。

断线恢复时不重放已经提交的AI动作；从当前快照继续。正在拖动的tileId已不在手中时立即取消该拖动，不能用旧mesh继续发送合法外观的弃牌。重复命令重试保留同一 actionId，不能在每个点击或渲染帧重新生成。

## 9. 手机、性能与资源生命周期

原输入主要是 mouse/keyboard，手机不能假设自然兼容。统一 Pointer Events，记录 pointer capture；`pointercancel`、失焦、视口改变、会话失效都结束拖动。牌桌缩放与手牌拖动要分开手势，DOM文本输入焦点下不能触发牌桌快捷键。

原3D画布固定3:2，不能把它整张缩进390宽屏后让汉字不可点。手机保留同一绿色3D桌面风格，私人句子区域采用 UI 规格的可读布局；不强制横屏。低画质降低DPR、关闭不必要轮廓通道，保留实体牌、文字和状态。性能目标和测试设备由验收文档定义，不在未实测时承诺帧率。

WebGL初始化失败或 context lost 必须有可用的同状态降级界面，不白屏、不清空牌局。context恢复后以最新快照重建，不重发 START_ROUND。降级界面沿用木色/绿色/象牙牌视觉，不作为默认交付替代真正3D。

资源审计至少覆盖：requestAnimationFrame、window/元素监听器、ResizeObserver、指针捕获、纹理/图集、几何、材质、后处理render target、轮廓pass、木框的多份BoxGeometry和共享材料、中央CanvasTexture。原代码已有部分 dispose，但不能据此宣称移植后无泄漏。用多次进入/离开、切相机/横竖屏和Context恢复验证资源数量趋于稳定。

渲染常驻纹理应复用，计时器不要每帧重画整个字库；中央纹理仅信息变化时更新。阴影继续优先使用轻量贴地方案；单张牌独立高亮时不能同时出现在InstancedMesh与独立mesh里。

## 10. Astra 与 Sol 的实施顺序

1. **Astra：原版视觉基线。** 在独立组件中提取MainView、桌布/木框和厚牌渲染，把固定汉字mock摆上真实3D桌面，保留来源归属；提供与 `original-game.jpg` 同视角对照。不能用原商业网站API支撑演示。
2. **Astra：布局与交互。** 接2–6人布局，完成私人排句、逗号、评审面板和掉线状态；mock数据与真实adapter使用同一view model接口。
3. **Sol：模型/输入契约。** 接我们自己的ResyncEnvelope、TileId、private草稿、legalActions和命令；逐项移除英文pending/校验接口，处理隐藏牌/历史牌/实例容量。
4. **Sol：真实联机。** 接入已经定义的引擎、房间、投票、AI、恢复、存档；采用本包原91项游戏场景及新增3D/UI场景验收。
5. **Astra：视觉与可用性复核。** 验证原选定牌桌视觉仍被保留，文字清楚、手机可用、所有人数状态可识别；发现缺陷按编号回给Sol修复。

## 11. 采用完成的证据

- 代码清单：哪些文件从固定上游采用、哪些改写、哪些仅参考，包含许可与提交号。
- 运行截图：四人桌面对照、六人扩展、手机竖屏、胡牌评审；截图中的状态可从fixture或真实快照复现。
- 技术证据：使用真实 Three.js 场景，牌厚度、相机、选中/拖动、牌墙与最新弃牌确实运行；不是截图背景叠按钮。
- 规则证据：2–6人座次、重复汉字ID、吃牌来源、最多三个逗号、圈词范围、掉线AI与恢复遵守原契约。
- 隐私证据：别家未知牌只画背，公共句子按规则公开；纹理/DOM/网络/事件日志不含隐藏手牌或恢复凭据。
- 生命周期证据：渲染故障可恢复、进入退出无持续增长资源、重连不重复动作、移动端可完成关键操作。

以上是后续实现的验收要求。当前包验证的是资料完整性、来源固定与规格一致性，不能用这些说明代替真实游戏验收。
