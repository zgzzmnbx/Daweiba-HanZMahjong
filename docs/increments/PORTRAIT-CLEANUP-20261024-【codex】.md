# 1.18.0 · 手机竖屏收纳与全桌报字 · 2026-10-24

手机竖屏（宽度≤699且高大于宽）采用统一菜单。顶部保留房间状态与菜单，底部重复整理/记录/工具条收起，弹幕改为不占版面的位置；打吃摸胡与计时栏不折叠。聊天含未读提示，标点牌按需打开、触摸拖入后自动收起；涂鸦从菜单开始，绘画中保留退出，显隐和同步错误重试仍可达。大厅保留天书与菜单；评审音频折为单入口。桌面和横屏维持原入口，旋转时关闭手机菜单，菜单本身不改变牌桌尺寸或游戏期限。

聊天/涂鸦通过显式React控制接口复用原功能，没有模拟隐藏按钮点击。原浏览器恢复和隐私边界未改，语音专项并入同一版本：只有公开权威弃牌后全桌报字，点选手牌不念；按钮/拖放/AI/托管一致，去重、恢复静默和个人静音保留。

已发布到原公网入口。冻结源码 `f694eea`，正式release `1.18.0-20261024-104954`，一致性备份 `pre-release-20261024-104955.sqlite`；公网ready=true且JS/CSS逐字节一致。290项自动测试通过；最终冻结构建本地13项菜单、26项候场、20项稳定性通过，公网对应13/26/15项全部通过。真实触摸插逗号、聊天联机、画笔落笔/显隐、圈词反对票与横竖屏切换均可操作，没有force点击；自建验收房均已无计分关闭。语音12项独立检查与7项真实Qwen回归通过，语音公网专项另行补录。

证据：`public-portrait-1.18.0-release.json`、`public-portrait-menu-1.18.0-results.json`、`public-portrait-setup-1.18.0-results.json`、`public-portrait-stability-1.18.0-results.json`均位于docs/evidence。GitHub同步进行中。

手机窗口与触摸为Chrome模拟，未替代实体手机实测。

主要文件：PortraitMenu.tsx/css、portrait-game.css、GameTable/GameLobby、RoomChat/RoomDoodle、HuReviewDialog。脚本verify-portrait-menu.mjs和game-ui-tools支持菜单实际路径，不使用force点击。旧完成项保留历史交接，任务板仅保留当前阶段。
