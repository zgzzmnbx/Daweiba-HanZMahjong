# 文字麻将 · Codex 目标模式交接包

**交接包 V1.1.0｜2026-10-21（Asia/Hong_Kong）｜EnglishMahjong 牌桌采用版**

用户已经选择采用 [EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web) 的牌桌 UI。实施目标是：以它的真实 Three.js 牌桌代码为起点，保留深棕环境、木边绿绒桌、奶白厚牌、围坐透视与选牌反馈，接入本项目的 2—6 人文字麻将规则。**视觉方向已确定，不再重新选风格。**

分工：**Astra 规划、改造牌桌与制作 UI；Sol 完成规则、服务端、联机与恢复；Astra 最终复核。**

这是完整的开发交接材料，包含固定版本的上游参考源码与许可、改造图、接口、夹具、验收和部署模板；不是已经完成的联网游戏。包内的 SVG/PNG 是改造设计参考，不能当作实际 Three.js 或联机验收证据。

## 一、直接这样交给 Codex

1. 选择独立的“文字麻将”项目。解压本包，将最外层文件夹命名为 `handoff`，放在项目根，确认 `handoff/README.md` 直接存在。
2. 在 Codex 中选择实际可用的 Astra，使用你的目标模式，粘贴 [Astra 启动提示词](prompts/01-ASTRA-START.md)。先完成原牌桌源码定位与真实 WebGL 视觉基线，再改为汉字、2—6 人和专属交互。
3. 同一项目切换到实际可用的 Sol，粘贴 [Sol 接棒提示词](prompts/02-SOL-IMPLEMENT.md)，完成引擎、服务、真实 adapter、断线 AI、身份恢复与验收。
4. 切回 Astra，粘贴 [最终复核提示词](prompts/03-ASTRA-REVIEW.md)，对照原项目截图、源代码采用记录和真实游戏证据验收。

若此前已经开始按 V1.0.0 开发，按 [升级说明](docs/13-V1.0-UPGRADE.md) 增量迁移；保存既有引擎和用户修改，替换旧视觉要求。无需重写已经通过验证的游戏逻辑。当前包可以独立使用，不需要另取 V1.0.0。

“Astra”和“Sol”在这里指模型职责；游戏使用独立项目目录。当前 Codex 若支持指定模型委派，可按同样边界编排；否则手动切换，不虚构模型 ID、CLI 参数或自动切换已发生。

## 二、先读这几份

| 文件 | 用途 |
|---|---|
| [docs/01-RULES.md](docs/01-RULES.md) | 游戏语义权威；六项原始确认与明确默认 |
| [docs/02-STATE-MACHINE.md](docs/02-STATE-MACHINE.md) | 回合、投票、身份与离线恢复状态机 |
| [docs/03-UI-SPEC.md](docs/03-UI-SPEC.md) | 新牌桌视觉、2—6 人布局、汉字/逗号/投票交互 |
| [docs/11-ENGLISH-TABLE-ADOPTION.md](docs/11-ENGLISH-TABLE-ADOPTION.md) | 固定上游版本、逐文件采用/改造路线、素材边界 |
| [references/englishmahjong/README.md](references/englishmahjong/README.md) | 原始源码快照、来源与许可入口 |
| [contracts/types.ts](contracts/types.ts) | 公共、本人私密与服务端契约 |
| [contracts/table-view.ts](contracts/table-view.ts) | 新增显示适配契约；渲染不改变牌局权威 |
| [contracts/rules.defaults.json](contracts/rules.defaults.json) | 冻结规则配置，不能被上游常量覆盖 |
| [docs/04-ACCEPTANCE.md](docs/04-ACCEPTANCE.md) | 原 91 条规则、联机与恢复场景 |
| [docs/12-UI-ACCEPTANCE.md](docs/12-UI-ACCEPTANCE.md) | 新增源码采用、视觉、WebGL、手机与泄露边界验收 |
| [docs/05-ARCHITECTURE-DEPLOYMENT.md](docs/05-ARCHITECTURE-DEPLOYMENT.md) | Mac、火山云入口、持久化和渲染边界 |
| [docs/06-EXECUTION-PLAN.md](docs/06-EXECUTION-PLAN.md) | M0—M7，先建立原牌桌基线再适配 |
| [docs/07-HANDOFF-PROTOCOL.md](docs/07-HANDOFF-PROTOCOL.md) | 模型交接、代码来源和真实证据 |
| [docs/08-DECISIONS.md](docs/08-DECISIONS.md) | 用户确认与实施默认的区别 |
| [docs/09-SOURCES.md](docs/09-SOURCES.md) | 官方资料与固定上游来源 |
| [docs/10-PACKAGE-QA.md](docs/10-PACKAGE-QA.md) | 本包实际检查范围与未实施项 |

打开 [ui-reference/reference.html](ui-reference/reference.html) 查看四人、六人、投票、手机的设计参考；它是自包含查看器。`fixtures/` 提供规则与显示数据；`deploy/` 提供待填写现场值的模板；`templates/` 提供工作记录骨架。

## 三、这次修订解决什么

- 将旧白蓝椭圆桌替换为用户选中的 EnglishMahjong 牌桌方向，并明确正常设备必须使用真实 Three.js 场景。
- 固定采用提交 `6830301df3061cdd25350cf56807473e5505b311`，避免“拉最新版”造成画面与接口漂移。
- 指向实际的 `src/table3d/` 渲染实现，区别于另一套 `src/scene/` 展示代码；记录保留、拆出和重写的文件。
- 原项目的四人座次、108 张实例容量、英文字母图集均需改造。当前字库按人数为 120/144/168/192/216 张，不能静默裁掉超出容量的显示对象。
- 桌面默认显示真正的 3D 本人手牌，由投影 DOM 命中/可访问性层和一个控制器处理操作；展开整理句子时隐藏对应 3D 本人手牌，手机竖屏用 3D 桌面加 DOM 手牌。所有模式共用一份草稿和一个命令入口。
- 原人物和其他外部素材按来源逐项处理；未确认可复用的素材使用中性头像或程序几何替代，牌桌构图和材质仍按选定基准复现。

**交接包版本与规则版本分开。** 本次是 UI 采用修订；原 `01-RULES`、`02-STATE-MACHINE`、游戏 `types.ts`、`rules.defaults.json`、字库及原 91 条夹具不改变游戏语义。文中保留的规则 V1.0.0 是有意保留，不是漏改包版本。

## 四、六项玩法要求继续有效

1. 只吃上家刚打出的那张牌，接入手牌后弃一张。
2. 最多三个拖拽中文逗号，不占汉字牌数。
3. 2—6 人全部可玩；逻辑座次和投票不写死四人。
4. 反对票可圈选词句，按钮完整显示 **“写的什么玩意”**。
5. 掉线先缓冲，随后简单 AI 只摸牌、打牌；不吃、不胡、不投票。
6. 原玩家可重新登录，已提交的合法 AI 动作保留，旧控制任务失效。

## 五、完成的判断

必须同时满足：原 91 条场景、新增 UI 验收、真实 2—6 人多浏览器覆盖、Mac 本地生产构建可运行。源码采用记录要能追到原文件；正常 WebGL 设备不能只交 CSS 桌面或背景截图。网页打开、mock 演示、静态改造图、包内夹具检查通过均不足以证明游戏已完成。

实际公网部署取决于域名、主机与访问条件。缺少条件时继续完成全部本地功能和部署准备，将现场项标为 `NOT_RUN_ENV_REQUIRED`。不要宣称已上线，也不要以此停掉不受影响的工作。
