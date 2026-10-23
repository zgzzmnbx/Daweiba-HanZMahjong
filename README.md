<div align="center">

# 字间 · 文字麻将

**把麻将里的牌，变成一句完整的人话。**

一款支持 2–6 人在线同桌的中文文字游戏。摸字、吃字、排句，再由同桌评审决定能否胡牌。

[![应用版本](https://img.shields.io/badge/version-1.10.0-2f855a)](package.json)
[![游戏人数](https://img.shields.io/badge/players-2–6-d69e2e)](docs/01-RULES.md)
[![Node.js](https://img.shields.io/badge/Node.js-24.19.0–24.x-43853d)](package.json)
[![Three.js](https://img.shields.io/badge/3D-Three.js-black)](docs/UI-ADOPTION.md)

[开始游戏](https://118.196.107.182:1240) · [快速启动](#快速启动) · [游戏规则](docs/01-RULES.md) · [更新日志](CHANGELOG.md)

</div>

![字间文字麻将项目介绍](docs/assets/字间-项目介绍图-v1.9.0-【codex】.png)

> 上图为项目介绍示意图，制作于 v1.9.0；实际运行截图与验收证据见 [docs/evidence](docs/evidence/)。在线入口依赖运行游戏的 Mac 保持在线。

## 游戏亮点

- **真实 3D 牌桌**：深棕环境、木边绿绒桌面、厚实奶白字牌，支持 2–6 人围坐与手机布局。
- **把字排成句**：拖动整理手牌，使用最多 3 个逗号，将 14 张字牌组成完整句子。
- **一起决定能不能胡**：支持自摸胡与借字胡；真人可以投票并标记有异议的文字区间。
- **随时开桌**：六张共享公共桌，也可创建邀请房；空位可由房主安排 AI，单人可练习。
- **有动作，也有亮相**：摸、打、吃、借字均有飞牌轨迹；提交胡牌后，全桌同步观看逐字亮相。
- **断线还能接着玩**：保存手牌排列、房间与结算，支持刷新恢复、恢复码换设备和服务重启恢复。
- **自己的麻将套组**：管理员可复制、命名和编辑字库、调整不同人数配比，并设置默认套组。

## 怎么玩

1. 选择公共桌或创建邀请房，设置 2–6 个座位；邀请朋友，或让 AI 补齐空位。
2. 真人全部准备后开局。庄家拿 14 张字牌，其余玩家各拿 13 张。
3. 轮到自己时摸字、整理、出牌；可以吃上家的弃牌，每局最多吃 3 次。
4. 将 14 张字牌全部排成一句话，可加入 0–3 个逗号。自摸或借字排好后，确认提交胡牌申请。
5. 由冻结的评审名单投票，严格过半同意即通过。普通局累计胜局，单真人练习局不累计。

指定 AI 使用简单摸打策略，不主动吃牌或申胡，也不调用外部大模型。规则 1.2.0 中，每位指定 AI 对胡牌申请独立以 70% 概率赞成；AI 不判断句子语义。完整的响应时限、座次、评审与旧局兼容规则见 [规则说明](docs/01-RULES.md)。

## 快速启动

### 环境要求

- Node.js **≥24.19.0 且 <25**，以及 npm；当前生产运行于 macOS。
- 支持 WebGL 的浏览器；需要中文系统字体来绘制字牌。
- SQLite 使用 Node.js 内置模块，无需单独安装数据库服务。

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

v1.10.0 的已归档验收记录包含 **200 项自动测试**、TypeScript 检查及生产构建，以及本地/公网三个独立浏览器身份的确认、取消、自胡、借字胡、投票、结算刷新与 AI 即时评审。桌面 1440、手机模拟宽度 390/430 和减少动态效果已有记录，详见 [最新功能验收](docs/HU-SHOWCASE-1.10.0-【codex】.md) 与 [验证记录](docs/VERIFICATION.md)。

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

当前应用 **1.10.0**，新房规则 **1.2.0**，交接包 **V1.1.0**。最近游戏发布为 `1.10.0-20261023-134321`；实现与该阶段软件验收已收口，任务板保留现场验证项。README 展示修订为 **1.1.0（2026-10-23）**，本次仅更新仓库文档。

## 来源与许可

3D 牌桌渲染移植自 [Bruce-pac/EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web)，固定提交 `6830301df3061cdd25350cf56807473e5505b311`，并保留其涉及的 Autotable 来源与 MIT 许可文本。当前字牌使用程序几何和本地系统字体生成。

第三方许可与具体使用范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 及 [licenses](licenses/)。这些许可对应第三方采用部分；本仓库未另行声明整个项目的开源许可证。
