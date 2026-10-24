<div align="center">

# 字间 · 文字麻将

**把麻将里的牌，变成一句完整的人话。**

一款支持 2–6 人在线同桌的中文文字游戏。摸字、吃字、排句，再由同桌评审决定能否胡牌。

[![应用版本](https://img.shields.io/badge/version-1.17.0-2f855a)](package.json)
[![游戏人数](https://img.shields.io/badge/players-2–6-d69e2e)](docs/01-RULES.md)
[![Node.js](https://img.shields.io/badge/Node.js-24.19.0–24.x-43853d)](package.json)
[![Three.js](https://img.shields.io/badge/3D-Three.js-black)](docs/UI-ADOPTION.md)

[开始游戏](https://118.196.107.182:1240) · [快速启动](#快速启动) · [游戏规则](docs/01-RULES.md) · [更新日志](CHANGELOG.md)

</div>

![字间文字麻将项目介绍](docs/assets/字间-项目介绍图-v1.9.0-【codex】.png)

> 上图为项目介绍示意图，制作于 v1.9.0；实际运行截图与验收证据见 [docs/evidence](docs/evidence/)。在线入口依赖运行游戏的 Mac 保持在线。

## 游戏亮点

- **胡牌天书**：大厅共赏获批胡句，每天送出一个赞；管理员可移除天书记录。
- **一屏游戏界面**：大厅与牌桌自适应窗口，主要操作留在画面内；长名单和菜单内部滚动，大厅可查看更新日志。
- **真实 3D 牌桌**：深棕环境、木边绿绒桌面、厚实奶白字牌，支持 2–6 人围坐与手机布局。
- **把字排成句**：拖动整理手牌，使用最多 3 个逗号，将 14 张字牌组成完整句子。
- **一起决定能不能胡**：八成窗口评审，自摸胡与借字胡共用一分钟实名投票；圈选不通顺字词投反对票，全桌看到鸡蛋砸牌，通过/未通过各有结果动效。
- **随时开桌**：六张共享公共桌，也可创建邀请房；空位可由房主安排 AI，单人可练习。
- **有动作，也有亮相**：摸、打、吃、借字均有飞牌轨迹；提交胡牌后，全桌同步观看逐字亮相。
- **断线还能接着玩**：保存手牌排列、房间与结算，支持原浏览器从大厅点击自己的托管座位接管、刷新与服务重启恢复。
- **想久一点，随时接回**：真人行动两分钟，AI 五秒；临期手牌发红轻抖，工具可主动托管或接回。
- **能看，也能听**：新房默认允许观战；字牌点读、字库试听和胡牌整句朗读，游戏语音可关闭。管理员可查看对局记录。
- **桌面随手涂鸦**：五色三档画笔，同桌实时可见；笔迹贴在牌下，可撤销/擦除本人、本机隐藏，刷新和观战仍可看见。
- **和同桌聊聊**：收起式聊天记录与轻量弹幕，评审时停下弹幕，游戏操作保持可达。
- **自己的麻将套组**：默认采用“基于文字失明”的固定 144 张套组，2–6 人配比相同；原有随人数增减张数的套组保留为“动态牌组”。管理员可继续复制与编辑。

## v1.17.0 · 轮到谁，该做什么，一眼就懂

倒计时移到牌桌下沿偏右；左侧显示当前行动提示，右侧为秒数和由绿转金、转红的剩余进度条。评审弹窗与观战使用同一组件；暂停、掉线、已投票和结算有独立状态，不遮住手牌。规则仍为1.4.0，期限由服务器决定。

正式 release `1.17.0-20261024-093254`，源码 `c2e31fe`，发布前一致性备份 `pre-release-20261024-093255.sqlite`。公网ready=true，JS/CSS与冻结构建逐字节一致；原端口、数据和规则保留。286项自动测试、20项本地/15项公网连续摸打稳定性、17项本地/14项公网计时检查通过。最后补丁仅调整短竖屏评审七字换行，补丁后重新构建、286测试与17项计时/四窗口评审复验；公网在最终构建上完成全部检查。自建测试房均无计分关闭，没有新增天书记录。

证据：`docs/evidence/public-turn-hud-1.17.0-release.json`、`public-turn-hud-1.17.0-results.json`、`public-table-timer-1.17.0-results.json`。源码和验收证据已同步GitHub `5033c14`，远端文件树与本地交付一致。

## v1.16.0 · 落牌有声，胡牌有势

已发布到[公网游戏](https://118.196.107.182:1240/)。开局、摸打吃、胡牌亮相、反对投票和结算加入九类程序合成音效；工具→声音可分别控制音效、语音并调节音量。首次点击后启用，朗读时自动压低音效，刷新重连不补播旧动作。

280项自动测试、14项本地与12项公网音频/联机检查通过，已备份并保留既有房间和天书。声音波形和八路混合无削波；实体设备听感不以自动检测代替。[音效增量](docs/increments/GAME-SOUND-20261024-【codex】.md) · [九类音效试听](docs/evidence/sound-effects-1.16.0-preview.mp3)。

源码、试听和验收证据已同步 GitHub `822120f`，远端与本地文件树逐项一致。任务板旧完成项已归档。

## v1.15.0 · 胡牌天书

已发布到[公网游戏](https://118.196.107.182:1240/)。刷新大厅，点击书本“天书”即可共赏历史获批胡句、送出每日一赞；管理员登录后可移除句子。点赞按原浏览器识别，北京时间零点重置，每天全站总计一次。没有账号系统，换浏览器无法合并额度。

275 项自动测试、11 项天书本地和9项天书公网检查通过；牌桌缩放修复一并上线，20项本地、15项公网布局检查通过。上线前已备份数据库，天书采用删除墓碑与审计；原始对局成绩保留。详见[天书增量](docs/increments/HU-BOOK-20261024-【codex】.md)、[布局修复](docs/increments/TABLE-STABILITY-20261024-【codex】.md)。

源码与验收证据已同步 GitHub 提交 `9450da5`，远端文件树与本地交付逐项一致；任务板已清理旧完成项。

## v1.14.0 · 桌边随手画

涂鸦已发布到[公网游戏](https://118.196.107.182:1240/)。269 项自动测试、19 项本地浏览器、16 项真实计时与16 项公网交互检查通过。点桌边画笔选择颜色与粗细，直接在桌面画；落笔自动收起菜单，点击画笔结束。详见[涂鸦增量](docs/increments/TABLE-DOODLE-20261024-【codex】.md)。

## 怎么玩

1. 选择公共桌或创建邀请房，设置 2–6 个座位；邀请朋友，或让 AI 补齐空位。
2. 真人全部准备后开局。庄家拿 14 张字牌，其余玩家各拿 13 张。
3. 轮到自己时摸字、整理、出牌；可以吃上家的弃牌，每局最多吃 3 次。
4. 将 14 张字牌全部排成一句话，可加入 0–3 个逗号。自摸或借字排好后，确认提交胡牌申请。
5. 由冻结的评审名单投票，严格过半同意即通过。普通局累计胜局，单真人练习局不累计。

指定 AI 使用简单摸打策略，不主动吃牌或申胡；语音独立使用 Qwen-TTS。规则 1.2.0 中，每位指定 AI 对胡牌申请独立以 70% 概率赞成；AI 不判断句子语义。完整的响应时限、座次、评审与旧局兼容规则见 [规则说明](docs/01-RULES.md)。

## 默认牌组

当前运行服务默认使用 **默认麻将套组（基于文字失明）**，按[原始牌库](【牌库】/默认麻将套组-（基于文字失明）-v1.0.txt)逐字导入，共 **144 张、142 种汉字**；“像”和“个”各两张，其余各一张。2–6 人均使用相同张数。

原“经典字库”改名为 **动态牌组**，2/3/4/5/6 人仍分别为 120/144/168/192/216 张。新默认只影响新建房间，已有房间继续使用绑定套组；进行中的局不变。此项是运行数据库配置，空白数据库不会仅因克隆源码自动载入；[标准配置](【牌库】/默认麻将套组-配置-v1.0-【codex】.json)与[导入及验证记录](docs/FIXED-DECK-v1.0-【codex】.md)供重建核对。

## 快速启动

### 环境要求

- Node.js **≥24.19.0 且 <25**，以及 npm；当前生产运行于 macOS。
- 支持 WebGL 的浏览器；需要中文系统字体来绘制字牌。
- SQLite 使用 Node.js 内置模块，无需单独安装数据库服务。
- 使用语音及运行完整音频测试时需 FFmpeg；服务可用 `FFMPEG_BINARY` 指定位置。

### 本地运行

```bash
git clone https://github.com/zgzzmnbx/Daweiba-HanZMahjong.git
cd Daweiba-HanZMahjong
npm ci
npm run build
mkdir -p Codex-Temp

NODE_ENV=development \
PORT=3000 \
PUBLIC_ORIGIN=http://127.0.0.1:3000 \
DB_PATH="$PWD/Codex-Temp/local-game.sqlite" \
npm start
```

在浏览器打开 **http://127.0.0.1:3000**。静态页面、HTTP API 和 Socket.IO 由同一进程提供，以上命令使用独立本地存档。

### 开发模式

在两个终端分别运行：

```bash
# 终端一：前端，默认 http://127.0.0.1:5173
npm run dev
```

```bash
# 终端二：服务端
mkdir -p Codex-Temp
PORT=3001 \
PUBLIC_ORIGIN=http://127.0.0.1:5173 \
DB_PATH="$PWD/Codex-Temp/dev.sqlite" \
npm run dev:server
```

`/dev/baseline` 仅在开发编译中提供，用于界面夹具检查；真实联机验收使用实际房间与独立玩家身份。

## 技术栈与目录

**React + TypeScript + Three.js + Vite** 构建界面，**Express + Socket.IO + SQLite** 提供实时联机和持久化。

```text
apps/
  web/                 React 界面、3D 牌桌与排句交互
  server/              HTTP、会话、Socket.IO、定时器与存储
packages/
  engine/              独立规则引擎，可注入时钟与随机种子
  contracts/           前后端共享协议和默认规则
scripts/               构建、浏览器验收、备份与恢复脚本
tests/                 引擎、服务端与客户端模型测试
ops/                   macOS 后台服务与发布工具
docs/                  规则、采用记录、运维、交接及验收证据
handoff/               原始交接包、固定上游源码与许可
```

服务器维护权威牌局，房间命令串行事务执行；`actionId` 保证重试幂等，`controlEpoch` 撤销旧设备控制。其他玩家的手牌、私密草稿和恢复凭据不广播。应用版本与规则版本独立，已开始牌局冻结规则和本局字库。

## 测试与验证

```bash
npm test
npm run build

# 浏览器验收需已安装 Chrome，使用独立端口、临时库与 Cookie 上下文
node --import tsx scripts/verify-real-browser.mjs
node --import tsx scripts/verify-advanced-browser.mjs
node --import tsx scripts/verify-client-lifecycle.mjs
```

v1.13.0 已通过 **265 项自动测试**、TypeScript/生产构建、**108 项本地窗口检查**与**45 项公网窗口检查**；观战、托管、聊天、原浏览器找回和真实 Qwen 播放也已公网验证。完整结果见 [玩家体验增量](docs/increments/PLAYER-EXPERIENCE-20261024-【codex】.md) 与 [验证记录](docs/VERIFICATION.md)。此前评审弹窗证据保留于 [v1.12.0](docs/HU-REVIEW-1.12.0-【codex】.md)。

实体手机 GPU、蜂窝网络、真实读屏及字库多人实玩平衡仍待现场验证；浏览器模拟不替代这些结果。

## 部署与存档

当前部署结构为 **浏览器 → 火山云 Caddy / FRP HTTPS 入口 → Mac 游戏服务与 SQLite**。服务仅监听回环地址；`/healthz` 检查存活，`/readyz` 检查 SQLite 就绪。

生产环境设置 `NODE_ENV=production`、精确的 HTTPS `PUBLIC_ORIGIN` 与绝对路径 `DB_PATH`。macOS 常驻应用安装在 `~/Library/Application Support/WordMahjong/`，采用独立发布目录和单个 LaunchAgent，活跃数据库不放在同步盘。操作步骤见 [运维手册](docs/OPERATIONS.md)、[后台服务说明](ops/README.md) 和 [公网部署记录](docs/PUBLIC-DEPLOYMENT.md)。

```bash
DB_PATH=/absolute/path/mahjong.sqlite npm run db:backup -- /absolute/path/backup.sqlite

# 恢复前停止唯一写库服务；脚本会保留旧主库及 WAL / SHM
DB_PATH=/absolute/path/mahjong.sqlite CONFIRM_SERVICE_STOPPED=yes \
npm run db:restore -- /absolute/path/backup.sqlite
```

`runtime/` 是本机私有部署目录。配置凭据、数据库、Cookie、恢复码、运行日志和备份不提交仓库。含命名套组的存档应使用兼容 v1.9 及以上数据结构的构建恢复，不能直接交给旧版继续写库。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [游戏规则](docs/01-RULES.md) | 当前权威规则、AI 评审、字库与旧局兼容 |
| [3D 牌桌采用](docs/UI-ADOPTION.md) | 上游源文件映射、视觉实现与素材边界 |
| [变更记录](CHANGELOG.md) | 各版本功能与发布摘要 |
| [历史变更](CHANGELOG-历史归档.md) | 早期阶段归档 |
| [验收结果](docs/ACCEPTANCE-RESULTS.md) | 验收项目与证据层级 |
| [验证记录](docs/VERIFICATION.md) | 实际执行结果与现场验证边界 |
| [运维手册](docs/OPERATIONS.md) | 发布、备份、恢复与故障处理 |
| [当前任务](docs/TASKBOARD.md) · [交接记录](docs/HANDOFF.md) | 协作状态与后续现场事项 |

当前应用 **1.14.0**，新房规则 **1.4.0**，交接包 **V1.1.0**；正式发布 `1.14.0-20261024-083259`，公网与冻结构建一致。固定默认牌组配置 **1.0.0** 保留，旧牌局继续冻结规则。

圆头像、中央开局菜单、原浏览器找回座位和同桌聊天已通过各自隔离验证，统一并入本批。具体证据见 [头像](docs/increments/SEAT-BADGES-20261024-【codex】.md)、[开局面板](docs/increments/ROOM-SETUP-20261024-【codex】.md)、[原浏览器恢复](docs/increments/BROWSER-RETURN-20261024-【codex】.md) 与 [聊天](docs/increments/ROOM-CHAT-20261024-【codex】.md)。

### 可选语音配置

服务器设置仓库外的 `DASHSCOPE_API_KEY_FILE` 和持久 `SPEECH_CACHE_DIR`，并提供 `ffmpeg` 或 `FFMPEG_BINARY`。管理员在麻将字库补全已保存汉字的语音，已有音频可直接试听。当前运行数据已补齐两个套组合计178个不同汉字。凭据与缓存不在仓库中；未配置语音时游戏仍可运行，已有缓存仍可播放。细节见 [语音运维](docs/increments/SPEECH-OPERATIONS-20261024-【codex】.md)。

## 来源与许可

3D 牌桌渲染移植自 [Bruce-pac/EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web)，固定提交 `6830301df3061cdd25350cf56807473e5505b311`，并保留其涉及的 Autotable 来源与 MIT 许可文本。当前字牌使用程序几何和本地系统字体生成。

第三方许可与具体使用范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 及 [licenses](licenses/)。这些许可对应第三方采用部分；本仓库未另行声明整个项目的开源许可证。
