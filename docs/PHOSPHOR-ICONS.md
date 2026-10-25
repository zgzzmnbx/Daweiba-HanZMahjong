# 图标体系 · v1.29.0

来源：[Phosphor Icons Core 官方仓库](https://github.com/phosphor-icons/core)，锁定 `@phosphor-icons/core@2.1.1`，MIT。包完整性及每个SVG SHA-256见 `PHOSPHOR-ICONS.json`；许可证随网页发布于 `/licenses/phosphor-icons-MIT.txt`。

## 设计与接入

- 功能图标统一 Regular；鸡蛋为Duotone，点赞选中/亮相火花为Fill，均取原库完整SVG路径，不重新描摹。
- `apps/web/src/GameIcon.tsx`是唯一SVG图标入口。显式导入所需SVG原文件，随Vite构建内嵌，没有运行时CDN、图标字体或外部请求。容器统一256×256 viewBox、currentColor、不可收缩的方形尺寸，继承原绿金颜色。
- 内部SVG字符串只来自锁定依赖静态导入，不接收用户内容、网址或服务端HTML。按钮仍由原处理器执行，图标aria-hidden，不代替按钮可访问名称。
- 顶栏与菜单同一功能同一图形。标点用Quotes（引号符号），文书记录用Scroll、牌架用Cards、管理员用ShieldCheck。闭合、上下折叠、发送与回退不再依赖操作系统Unicode/emoji。
- 大厅、房间、聊天、音乐及音效、涂鸦、天书、头像选择、管理员、评审和观战均纳入；麻将字牌/标点牌、摸打吃胡大字、品牌字章、原创人物头像与聊天贴纸属于游戏内容，保留原设计。
- 状态小圆点、画笔粗细/色板、进度条、蛋液和纸屑是CSS反馈图形，保留原有动画逻辑。飞蛋与亮相火花的SVG改为Phosphor，动画时序不变。

## 验证

`npm run build`、`npm test`，以及 `scripts/verify-phosphor.mjs`。真实双浏览器在320×480、390×844、667×375、1280×800检查SVG实际墨迹、方形比例、填充、旧描边污染、可访问属性和菜单/游戏操作，实际聊天发送、涂鸦入口、摸打和评审后返回。

验收结果与发布记录见 `VERIFICATION.md`。手机视口为Chromium模拟，实体Safari未测。
