# 牌桌涂鸦增量（2026-10-24）

状态：PUBLIC_PASS / 1.14.0 已上线。独立于1.13冻结树，已接续发布。

## 已完成

- 桌边小画笔按钮、5 色 / 3 档粗细、收起 / 调笔 / 完成。开始落笔自动收起菜单，手机画笔浮层贴屏幕边缘。
- 真实 Three.js 绿绒平面贴图，射线命中桌面坐标，缩放后对齐；麻将深度遮挡笔迹，图层不盖住牌面。
- 同桌逐笔实时同步，观战沿既有授权快照只读看笔迹；服务器生成作者昵称及座位，不接受客户端冒名。
- 仅撤销 / 清空自己的笔迹、独立本机显隐；房间保留最近 48 笔，每笔最多 160 点。SQLite 保存，刷新 / 重连恢复。
- 默认事件透传，绘画模式才捕获桌面指针；断线、身份变化、评审、本人行动末 10 秒 / 弃牌响应期退出绘画。移动端支持真实触摸指针；次指针不接管当前笔画。
- 涂鸦独立于游戏命令、stateVersion / deadline；同房鉴权、逐请求撤销检查、每玩家每秒 20 请求、颜色/坐标/点数白名单、追加前缀与单调序号、撤销幂等收据、SQLite savepoint 后广播。旧笔迹墓碑与操作收据各保留 256 条。

## 验证

- `npm run build`：通过；原有 bundle 大小提示保留。
- `npm test`：269 / 269 通过，包括 4 项新增服务端测试。
- `node --import tsx scripts/verify-doodle.mjs`：19 项真实 Chrome / HTTP / Socket.IO / SQLite 检查通过，独立身份与隔离本地库；覆盖边画边收、跨房隔离、所有权、字牌点击透传、4 种小屏、触摸、离线重连、评审优先，额外覆盖 3–6 人相机与真实观战渲染。
- 真实计时独立服务：16 项通过，包括同步限流窗口和无计分关闭测试房；证据 `doodle-liveclock-20261024-results.json`。
- 证据：`docs/evidence/doodle-20261024-results.json` 及同前缀截图。公网复验模式：`PUBLIC_ORIGIN=https://118.196.107.182:1240 node --import tsx scripts/verify-doodle.mjs`，仅创建本脚本私房并无计分关闭。

## 文件和发布边界

独立模块：contracts/doodle、server/room-doodle、RoomDoodle、SpectatorDoodle、room-doodle-client、room-doodle.css、table3d/doodle-surface。接线：server、game-client、OnlineApp、GameTable、SpectatorTable、spectator 合同、MainView.refresh。

暂无未修复功能问题。版本、README/CHANGELOG/大厅日志、生产备份与公网16项验收完成；GitHub同步收尾中。

应用 **1.14.0** / 规则仍为 **1.4.0**。新增共享桌面涂鸦：五色三档笔刷、真实绿绒平面笔迹、同桌实时同步、仅撤销/清空本人、本机显隐、刷新恢复与只读观战。落笔收起菜单，绘画以外事件透传；评审、响应和本人行动末十秒退出。

269 项自动测试、生产构建、19 项本地真实浏览器检查、16 项独立真实计时检查以及 **16 项公网 Chrome 检查**通过。覆盖 2–6 人投影、多人同步、触摸、跨房隔离、所有权、离线恢复和评审优先。公网验收仅用自身私房，已无计分关闭。

正式 release `1.14.0-20261024-083259`，一致性备份 `pre-release-20261024-083300.sqlite`；公网 ready=true，首页与 JS/CSS 字节匹配独立候选构建。沿用 1240 入口和已发布的六人候场修复。源码基于 `d4bebb9` 加发布版本文件与候场 CSS 补丁，运行配置/原局/字库未改写。

证据：`docs/evidence/public-doodle-1.14.0-results.json`、`public-doodle-1.14.0-release.json`；实现边界见 `docs/increments/TABLE-DOODLE-20261024-【codex】.md`。GitHub 同步单独核对后记录；实体手机触控/GPU未以 Chrome 模拟冒充。

