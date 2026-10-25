# 小麻将精表情包 · v1.27.0

原创六款透明贴纸：得意一下、偷偷乐、啥意思、妙啊、委屈巴巴、快出牌。采用奶白牌身、松绿描边、古金装饰的俏皮小麻将精，避免emoji字体差异。

## 使用

闲聊 → 输入框左边的小麻将笑脸 → 点选表情立即发送。文字草稿保留；失败时再次点同张可重试。记录随房间持久保存（接口显示最近60条），头像展示约4.2秒后收起。候场名单和游戏角色头像都会显示；本人发送时闲聊入口也显示一次反馈。它们不占新布局、不拦截点牌，昵称不被盖住。

仅新收到的权威消息驱动亮相，ACK与广播去重；历史、刷新、重连不补播。隐藏页面、身份改变、胡牌评审/确认、关房时清理。文字弹幕开关只控制文字，头像表情独立显示。减少动态效果偏好禁用弹跳。

## 素材与来源

2026-10-26通过内置 OpenAI image_gen 工具逐张生成，透明背景。原图保留在Codex生成目录；项目使用320×320 WebP，透明通道保留。六张合计179818字节，进入房间预加载。图像仅缩小与编码，无程序补画。

资源：`apps/web/public/stickers/v1/{proud,giggle,confused,applause,sad,hurry}.webp`。

来源文件名、原图SHA256、交付SHA256、尺寸、基础提示词及表情变化记录在同目录 `manifest.json`，可核对来源与版本。

基础提示词：

> Create ONE original cute cheeky chat sticker for a Chinese literary mahjong game, square composition, transparent background. A chubby anthropomorphic ivory mahjong tile mascot, rounded chunky body, jade green sides, warm gold trim, tiny mitten hands and short feet, rosy cheeks, expressive dark jade eyes. Polished hand-painted cartoon, bold clean silhouette readable at 72 pixels, playful restrained antique Chinese style, soft cel shading, NOT emoji glyphs, not realistic, no text, no letters, no watermark. Character centered with generous transparent padding, all limbs fully visible. 

每款表情变化：

- **proud**: Smug proud grin, one eyebrow raised, hands on hips, tiny green scholar cap; golden sparkles.
- **giggle**: Giggling behind a jade folding fan, squinting eyes, mischievous rosy smile.
- **confused**: Puzzled wide eyes, head tilted, scratching scholar cap, small golden question mark.
- **applause**: Delighted admiration, clapping tiny hands with golden sparks, joyful smile.
- **sad**: Pouting with watery eyes and two teardrops, exaggerated wounded pride.
- **hurry**: Playful impatient pout, holding a tiny hourglass and pointing at it, tapping foot.

## 协议与恢复

- 共享白名单 `packages/contracts/stickers.ts`；客户端仅发送stickerId，不接收任意图片URL，也不接收文字/表情混合命令。
- 复用已鉴权chat:send Socket，座位/昵称/头像/发送者由服务端派生，消息不进入公开大厅或观战快照。
- SQLite room_chat新增可空sticker_id，旧文字与评审记录原样保留。文字/表情共享幂等收据及3条/5秒、12条/分钟限流。失败不广播。
- 头像按发送者playerId匹配，不能仅靠昵称/座位导致换座后冒名；不改牌局stateVersion、规则和期限。
- 测试入口 `scripts/verify-stickers.mjs`，本地/公网均走真实房间、输入与Socket；验收创建的房间最后关闭，不产生天书记录。
