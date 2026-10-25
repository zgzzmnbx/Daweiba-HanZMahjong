# 文豪头像 v1 · 2026-10-26

## 交付与来源

30张头像，男性10、女性10、动物10。以古代文人为创作灵感，是游戏中的虚构演绎，不是历史肖像复原。采用原生 image_gen 工具逐张生成；工具不返回底层模型编号，因此不标注已核验的具体模型版本。没有使用第三方人物照片。兔子首版偏兔耳人物，最终改成完整白兔动物头。

- 游戏资源：`apps/web/public/avatars/v1/*.webp`，256×256，quality 88。
- 总览：`docs/assets/avatars-v1-contact-sheet.webp`，从上至下为男、女、动物；每行顺序对应清单。
- 原图本机副本：`Codex-Temp/avatar-originals/*.png`，保留供以后高分辨率导出，不打包进前端。
- `docs/avatar-manifest-v1.json`记录每张原图及WebP的SHA256、字节数、主题和昵称。
- `scripts/prepare-avatars.cjs`负责复制原图、等比缩小、编码和合成总览，不修改内容；输入JSON含清单项及sourcePath。需要本地sharp。

## 提示词整理（供复用）

统一画风与构图：

> Create one square portrait avatar for a refined Chinese literary mahjong game. Premium hand-painted 2.5D editorial illustration, expressive warm face, jade green background, cream light and antique gold accents. Close-up head and shoulders; face large and readable at 40 pixels. Keep important features inside a circular crop. Ancient Chinese scholar clothing, subtle paper and gouache texture. Cohesive jade/ivory/gold palette. No text, no letters, no watermark, no interface, no grid. One character only.

逐张主体如下。将统一提示与对应主体合并；动物必须保留对应物种的完整动物头、毛发/羽毛/耳朵，不画成人脸加动物耳朵。提示词为创作规格整理，不能保证再次生成逐像素一致的图像，原图校验值才是本次资产标识。

| 资源ID | 展示名 | 默认昵称示例 | 主体提示 |
|---|---|---|---|
| m-li-bai | 李白 | 杯酒就胡 | Li Bai, mischievous handsome middle-aged poet, loose white robe with jade green collar, black hair loosely tied, fine mustache and small wine cup |
| m-su-shi | 苏轼 | 东坡不背锅 | Su Shi, warm round-faced bearded middle-aged scholar, black Dongpo square scholar cap, jade robe, amused smile, small bamboo scroll |
| m-du-fu | 杜甫 | 子美先别急 | Du Fu, lean older poet with furrowed brow, thin gray beard, simple sage green cloth cap and weathered cream robe, wry skeptical raised eyebrow |
| m-bai-juyi | 白居易 | 乐天摸鱼中 | Bai Juyi, friendly middle-aged poet, neat short beard, rounded soft dark green scholar hat, cream collar, knowing gentle grin, small folding fan |
| m-tao-yuanming | 陶渊明 | 五柳不加班 | Tao Yuanming, relaxed middle-aged recluse, wispy beard, straw hat, loose moss-green robe, smiling eyes, a single chrysanthemum near shoulder |
| m-wang-wei | 王维 | 摩诘佛系打 | Wang Wei, serene elegant young adult poet, clean shaven slender face, modest tied hair under green scholar scarf, pale jade robe, quiet smile, bamboo leaf motif |
| m-xin-qiji | 辛弃疾 | 稼轩拍桌子 | Xin Qiji, vigorous middle-aged warrior poet with strong eyebrows and short beard, dark scholar headband, green robe with bronze clasp, confident playful grin |
| m-liu-yong | 柳永 | 柳七慢慢来 | Liu Yong, romantic slim young adult lyric poet, long black hair with antique gold pin, jade and cream robe, sideways roguish smile, folded fan near shoulder |
| m-lu-you | 陆游 | 放翁还想胡 | Lu You, sprightly elderly poet, white eyebrows and neat gray beard, soft sage cloth hat, dark emerald robe, bright determined eyes, rolled manuscript |
| m-cao-zhi | 曹植 | 子建才八斗 | Cao Zhi, proud brilliant young aristocratic poet, high tied hair with small bronze crown, clean shaven, richly embroidered ivory robe with jade trim, playful smug smile |
| f-li-qingzhao | 李清照 | 易安今天赢 | Li Qingzhao, confident witty adult woman poet, oval face, elegant loosely swept hair with simple gold chrysanthemum pin, cream and deep green Song-style robe, lively raised eyebrow, small wine cup |
| f-shangguan-waner | 上官婉儿 | 婉儿改卷中 | Shangguan Waner, sharp poised adult woman scholar, high Tang-style coiffure with restrained antique gold ornament, jade green robe, amused intelligent eyes, slim writing brush |
| f-cai-wenji | 蔡文姬 | 文姬别催稿 | Cai Wenji, thoughtful adult woman scholar, neatly swept black hair with green ribbon, modest Han-inspired cream robe with jade trim, gentle wistful smile, bamboo manuscript |
| f-xue-tao | 薛涛 | 薛涛笺上见 | Xue Tao, self-assured mature woman poet, soft updo with copper hairpin, green Tang-inspired shawl with muted coral collar, warm cheeky smile, pale pink paper near shoulder |
| f-yu-xuanji | 鱼玄机 | 玄机有点多 | Yu Xuanji, spirited young adult woman poet, Daoist-inspired hair bun with jade pin, pale sage robe, curious playful side glance, small bamboo scroll |
| f-zhu-shuzhen | 朱淑真 | 淑真不认输 | Zhu Shuzhen, expressive young adult woman poet, paired soft hair loops and gold plum-blossom pin, emerald robe with ivory scarf, determined teasing smile |
| f-li-ye | 李冶 | 季兰先落笔 | Li Ye, mature composed woman poet, tall simple Taoist hair bun and bronze pin, gray jade robe, bright shrewd eyes, lightly smiling, brush held near shoulder |
| f-ban-zhao | 班昭 | 班昭有批注 | Ban Zhao, dignified older woman scholar with subtle gray hair, formal neat updo and simple jade hairpin, deep green Han-inspired robe, clever kindly smile, bamboo book |
| f-zuo-fen | 左棻 | 左棻不服卷 | Zuo Fen, reserved adult woman poet, rounded face, elegant dark hair swept back with understated gold comb, pale cream and emerald robe, confident small smile |
| f-guan-daosheng | 管道昇 | 道昇画个圈 | Guan Daosheng, elegant mature woman calligrapher, long swept up hair with bamboo-shaped gold pin, jade green robe, warm assured smile, ink brush and bamboo leaf near shoulder |
| a-cat | 东坡猫 | 东坡喵一声 | anthropomorphic orange tabby cat as Su Shi, round cuddly cheeks, black Dongpo scholar cap, deep jade robe, tiny mustache-like whiskers, delighted mischievous grin |
| a-fox | 太白狐 | 太白狐说话 | anthropomorphic red fox as Li Bai, bright narrow clever eyes, white poet scarf, black topknot ribbon, green robe, small wine cup, roguish smile |
| a-panda | 子美熊 | 子美熊有理 | anthropomorphic giant panda as Du Fu, distinctive black eye patches, worried funny eyebrow, sage cloth scholar hat, ivory and jade robe, small scroll |
| a-crane | 摩诘鹤 | 摩诘鹤一下 | anthropomorphic white crane as Wang Wei, red crown and elegant black neck markings, jade scholar robe, small bamboo leaf, serene witty half-closed eyes, beak fully within frame |
| a-rabbit | 易安兔 | 易安兔个胡 | anthropomorphic white rabbit as Li Qingzhao, expressive bright eyes, upright ears kept inside frame, small gold chrysanthemum pin, jade green robe, cheeky smile |
| a-deer | 五柳鹿 | 五柳鹿过此 | anthropomorphic small brown deer as Tao Yuanming, short antlers with one chrysanthemum, sage green recluse robe, lazy contented eyes, straw ribbon |
| a-owl | 班昭鸮 | 班昭鸮得很 | anthropomorphic tawny owl as Ban Zhao, large inquisitive golden eyes, neat ancient scholar headband, jade robe, bamboo book, wise humorous expression, no modern glasses |
| a-raccoon | 乐天浣熊 | 乐天浣个牌 | anthropomorphic raccoon as Bai Juyi, soft gray fur and dark eye mask, rounded green scholar hat, cream collar, open friendly grin, small folding fan |
| a-tiger | 稼轩虎 | 稼轩虎一把 | anthropomorphic friendly tiger as Xin Qiji, bold orange black stripes, strong expressive brows, dark green poet headband, bronze robe clasp, confident playful grin |
| a-otter | 柳七獭 | 柳七獭着赢 | anthropomorphic brown otter as Liu Yong, rounded muzzle and shiny eyes, loose ivory scholar scarf, jade robe, small fan, mischievous leisurely smile |

## 接口与兼容

`packages/contracts/avatars.ts`是资源与昵称唯一清单。CreateRoomRequest/JoinRoomRequest允许省略或留空nickname、avatarId；非空头像必须在白名单内。服务器crypto.randomInt选择当前房间未占用候选并持久化；昵称为界面称呼，不修改内部playerId。失败请求不占座，成功请求重试不重抽。头像无法加载时显示昵称首字，后续地址变化可重新加载。

公开玩家、座位目录、大厅、聊天消息和冻结评审票携带可选avatarId。已有房间和AI缺省使用stableAvatarId(playerId)；刷新不乱跳。聊天新增nullable字段兼容老记录，客户端伪造头像字段不生效。图片为同源静态文件，匿名下载不会暴露手牌或凭据。

## 验证

自动测试：tests/server/avatars.test.ts（目录/分组、随机与幂等、同房避重、重启/恢复、聊天冒用拒绝、非法输入）。

真实浏览器：scripts/verify-avatars.mjs，四视口、三组30图、创建与加入、六真人候场、大厅/聊天、刷新、开局牌桌及胡牌确认。证据前缀avatars-1.26.0-local-r2，手机为Chromium模拟。公网结果见VERIFICATION。
