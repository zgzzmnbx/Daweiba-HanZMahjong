# 牌面与界面字体分工 · 1.23.12

## 当前字体角色

- 牌字、独立标点、拖影、飞牌、胡牌确认/亮相/评审、天书作品、大厅装饰牌，以及摸/打/吃/胡大字：原版 **LXGW WenKai Medium v1.530，500**，CSS别名 `Hanz WenKai`。
- “字间”“胡牌天书”等短品牌标题使用同一文楷。普通弹窗标题、菜单、设置、聊天、昵称、说明、计时、余牌数、房间号、人数和作品元数据使用 `Hanz PingFang`，正文400、标签500、重点600。
- `--ui-font`、`--tile-font`、`--display-font`明确分工；移除旧 `body * !important`。原始样式中的宋体/系统字体声明改为角色变量，不通过追加强制覆盖切换字体。

## 锁定来源

用户提供 `Font-字体/霞鹜文楷-lxgw-wenkai-v1.530.zip`；唯一采用文件为 `lxgw-wenkai-v1.530/LXGWWenKai-Medium.ttf`，不采用 Screen、GB、Mono。

- ZIP SHA256：`1644a3f88f84b9627c1b00e3e41c5752ef1bdea0dec2ac3a024bf107a7bd149e`
- 原TTF SHA256：`f4b8a34d1f838fe411540cb7c97b1c384ac9738a876c4104500bc42508b2312a`
- 原始PostScript名：`LXGWWenKai-Medium`；OS/2字重500。源名字与轮廓保留，仅制作网页WOFF2子集。
- 150个不重叠子集，完整46,926码点，合计10,709,764字节；核心950码点195,524字节预加载，其余按unicode-range请求。原版不覆盖的自定义字符仍有苹方/系统回退，不承诺覆盖所有Unicode。
- 完整来源、分片校验和与覆盖范围：`apps/web/public/fonts/wenkai/manifest.json`；许可：同目录 `OFL.txt`。随包附加许可明确允许仅网页交付的子集/格式转换保留原名字；不发布可安装桌面字体。

## 绘制与布局

`tileCanvasFont`和`uiCanvasFont`独立，中央品牌文楷、余牌数量和说明苹方。每个可见字显式请求字体；loadingdone及字体恢复完成后清理缓存、重建纹理。加载失败不阻止操作，失败字面自动有限重试，网络恢复可再次触发。

3D字牌纹理384×576（原192×288），逻辑绘制坐标不改变牌体；使用实际字体、正常采样和有限各向异性，不加描边。汉字统一字号约增加7%–9%，保留统一基线，不逐字撑满、无水平压缩。DOM标点依据100px原版墨迹校准：逗号中心偏移(.334em,-.336em)，句号(.286em,-.2855em)。逗号字号为牌宽2.8倍、句号1.8倍，完整独立牌位保持不变。3D标点按实际墨迹居中，比例对应DOM。

保留1.23.11的大牌空间预算、两排上限与13/14张固定布局。天书作品也是两排，标点占完整牌位，作者/时间/点赞使用苹方。

## 重建和验收

```sh
python scripts/build-wenkai-fonts.py --zip /absolute/path/霞鹜文楷-lxgw-wenkai-v1.530.zip --root .
npm run build
node --import tsx scripts/verify-wenkai-font.mjs
node --import tsx scripts/verify-review-fit.mjs
node --import tsx scripts/verify-punctuation.mjs
node --import tsx scripts/verify-top-rack.mjs
```

生成器依赖fonttools4.60.2/Brotli1.1.0，生产运行不依赖Python；源ZIP不重复提交。`verify-wenkai-assets.py`可只读核对部署库当前套组，证据仅记录覆盖数量，绝不导出私有数据。`verify-pingfang-font.mjs`保留为新分工验收入口别名。真实字体通过CDP原始PostScript名核对，Canvas记录加载和绘制；天书字体排版用明确标记的展示夹具，不据此冒称真实点赞或写入测试。

验收包含320×480、390×844、667×375、1280×800；缺失请求恢复、冷启动和非核心按需加载；当前2套组及样例共188个不同字符无缺字；鼠标/触摸拖排、标点、摸打和六人评审。生产构建及82项UI测试通过，本地与公网各86项浏览器检查通过；231个线上资源与冻结构建一致。最终记录见本版本 `docs/evidence/wenkai-*`；视口模拟不等于实体手机Safari实测。

---

## 历史记录（已被以上分工替代）

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
