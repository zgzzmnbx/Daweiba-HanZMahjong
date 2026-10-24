# 开局面板合并 · READY_FOR_INTEGRATION

2026-10-24。用户要求将牌桌下方的AI座位设置合进中央开局菜单。

## 实现

- 新增RoomSetupPanel.tsx、room-setup.css；GameTable仅导入组件、将原LOBBY/ROUND_FINISHED面板及底部seat-management合为table-stage内一个面板。
- 中央面板包含入座人数、当前套组、座位名单、房主添加/移除AI，以及邀请/准备/开始按钮。下一局使用相同面板，保留结果和公开句子。
- 座位名单可在面板内部滚动，底部操作区保持可见。等待设置时隐藏无实际排句操作的旧手牌栏和整理入口；开局后正常恢复游戏界面。
- 所有命令沿用原controller和legalActions，未修改房主权限、准备/开局规则或AI逻辑。真实发牌按服务器决定庄家，不能假设房主总拿14张。
- 未覆盖另一线程的计时、观战、管理员、记录、托管、TTS改动；不另行部署、不修改当前应用版本。

## 验证

- 隔离生产构建（TypeScript、Vite、server bundle）PASS；已修正旧规则practiceMode可选字段的类型兼容。
- scripts/verify-room-setup.mjs真实Chrome/HTTP/Socket.IO/SQLite共26项PASS，覆盖2–6人房AI添加/移除/再添加、准备开局、非房主无AI/开始权限、另一玩家同步收到座位变化、开局后设置面板卸载。
- 6人房在1440×900、1024×768、390×844、320×480、667×375、844×390验证中央面板与底部按钮边界；结束后四种尺寸验证下一局面板。全程无外层滚动或页面脚本错误，名单内部可用高度至少70px。
- 所有验收房在不计分结束后关闭；证据为docs/evidence/room-setup-20261024-*。使用独立测试库，不属于公网验收。

## 交接

源码及文档已可冻结，联合纳入1.13.0；当前生产仍1.12.0。统一发布者执行 `PUBLIC_ORIGIN=https://118.196.107.182:1240 node --import tsx scripts/verify-room-setup.mjs`，再将本条与头像增量一同更新release-notes、正式版本及GitHub。隔离Codex-Temp/setup-release与runtime不提交。

## 联合发布结果 · 2026-10-24

已并入1.13.0-20261024-082620，冻结源码d8383c3。public-room-setup-20261024-results.json（公网26项；短屏合并修复后复验）已通过，均只操作自身验证房。后续主线涂鸦不在本次冻结树。共同文档与完整软件/现场边界见VERIFICATION。
