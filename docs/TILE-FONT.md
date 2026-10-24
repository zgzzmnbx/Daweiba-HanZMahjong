# 牌面字体 · 1.21.3

采用Noto Sans SC半粗体600。修改后的静态字体名为Hanz Tile Sans；标题、头像与菜单保留原字体。DOM牌面由tile-font.css统一，3D由tile-font.ts提供Canvas字体串，并显式请求可见字；字体加载完成时重建缓存纹理，不阻塞玩家操作。

## 来源与许可

官方[Google Fonts / Noto Sans SC](https://github.com/google/fonts/tree/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc)，固定提交`a85815a42757630ce188fdad368c2dfc444d4773`。源TTF SHA256：`a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`。Copyright 2014–2021 Adobe，SIL Open Font License 1.1，保留名称Source。修改包括600实例化、重命名、Unicode分片和WOFF2压缩；保留版权、OFL与来源，未再绘制字形。

完整许可随应用发布：`apps/web/public/fonts/OFL-NotoSansSC.txt`；源文件URL和SHA、输出文件名/大小/SHA/Unicode范围见同目录`manifest.json`。

## 加载与边界

- 核心947字符，共122,588字节（约120 KiB），覆盖固定二字词表的178种麻将字。HTML预加载核心，系统无需安装字体。
- 30份不重叠子集共4,803,756字节，30,890码位。剩余字符由浏览器按unicode-range从同源`/fonts/`下载；不在正常开局一次下载全部4.8 MB。
- 自定义套组新字在源字体覆盖范围内按需显示；超出范围或下载失败使用系统sans-serif回退。不承诺覆盖任意Unicode字符。
- 字体文件名带SHA片段；CSS与Canvas字重均600，不使用浏览器合成粗体。字体文件中派生字体名与CSS一致。

## 重新生成

生产构建无需Python。只有修改字体子集时才需要Python及`fonttools==4.60.2`、`Brotli==1.1.0`。

1. 在Codex-Temp创建Python虚拟环境，安装上述两个依赖。
2. 从manifest.source.files的固定URL下载TTF、OFL.txt、METADATA.pb到同一临时目录，逐一校验SHA256；将manifest.source保存为该目录的source.json。
3. 使用该虚拟环境执行：`python scripts/build-tile-fonts.py --source Codex-Temp/font-source`。核心清单冻结在scripts/tile-font-core.txt，修改前评估首屏体积。工具验证源TTF SHA和每个输出cmap。
4. `npm run build`、`npm test`，再执行`node --import tsx scripts/verify-tile-font.mjs`。项目Chromium位于Codex-Temp时设置PLAYWRIGHT_BROWSERS_PATH；公网复验另设PUBLIC_ORIGIN。

保留本次字体清单与许可，原始17.8 MB TTF和临时环境不提交。更新子集后，只能移除已不被CSS/manifest引用的旧生成字体；不要删除运行中旧版本资源。

## 已执行验证

303项自动测试、构建通过；本地41项浏览器检查见evidence/tile-font-1.21.3-results.json。通过CDP实际渲染字体（isCustomFont及familyName）核对手机手牌、逗号、弃牌、胡牌确认与双方评审；Canvas记录实际fillText字体及加载状态，刻意延迟核心文件后验证纹理重绘。正常开局只请求同源核心文件；“龘”触发额外子集，天书牌类也取得自定义字形。截图为真实渲染；罕见字仅在测试DOM探针显示，没有修改字库。实体手机/Safari仍需现场验证。

公网同流程41项通过，HTML/JS/CSS及30份字体SHA与冻结构建相同，见evidence/public-tile-font-1.21.3-results.json和public-tile-font-1.21.3-release.json。
