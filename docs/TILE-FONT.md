# 界面与牌面字体 · 1.23.3

当前全界面使用用户提供的苹方Web字体：regular 400、medium 500、semibold 600–900。CSS别名Hanz PingFang；原始字体内部名称.PingFang SC、各字重PostScript名称和字形轮廓保留。仅打牌按钮.game-action b保留原serif，按钮说明文字仍统一为苹方。

来源：用户提供的`公文项目字体包-含苹方-【codex】.zip`，用于本内部测试项目。源包与三个WOFF2的SHA、字重、内部名称、输出分片SHA和Unicode范围见`apps/web/public/fonts/pingfang/manifest.json`。源ZIP不重复提交。

三个字重各覆盖29,924码位；75个不重叠Unicode分片共15,561,036字节，每字重的947核心码位优先加载，三份合计398,668字节。其余字形按unicode-range同源下载，超出源字体覆盖范围使用系统回退。旧Noto文件及许可保留作历史来源，当前CSS/HTML不再引用。

DOM由pingfang-ui.css统一，牌面600字重由tile-font.css统一；Canvas通过tile-font.ts的tileCanvasFont/uiCanvasFont请求可见字，字体加载后重建纹理。3D中央计数与标签也统一为苹方。

## 重新生成

使用Codex-Temp内Python虚拟环境，依赖fonttools 4.60.2、Brotli 1.1.0。核心列表冻结在scripts/pingfang-font-core.txt；修改前评估首屏体积。

```sh
python scripts/build-pingfang-fonts.py --zip /absolute/path/公文项目字体包-含苹方-【codex】.zip --root . --output .
npm run build
node --import tsx scripts/verify-pingfang-font.mjs
```

生成器保留原字体名字/轮廓，产出分片、CSS、manifest并更新HTML预加载。生产构建不依赖Python。验收可设置PLAYWRIGHT_BROWSERS_PATH使用配套Chromium；PUBLIC_ORIGIN指向公网后仅使用自建私房。

## 验证

构建及本地18项通过：实际CDP字体核对、延迟字体下载与Canvas重绘、罕见字龘、界面字体审计、打牌按钮例外、320/390/667/1280视口与真实两人聊天/摸打/评审。公网相同18项检查通过，HTML/JS/CSS、清单和75份字体共79个资源与冻结构建逐字节一致；证据见evidence/public-pingfang-1.23.3-*。实体手机/Safari未实测。

## 历史：牌面字体 · 1.21.3

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
