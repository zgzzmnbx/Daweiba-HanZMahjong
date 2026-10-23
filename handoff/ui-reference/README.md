# EnglishMahjong 牌桌视觉参考 · V1.1.0

本目录采用用户已选定的 [EnglishMahjong](https://englishmahjong.com) 牌桌方向：深棕暖暗环境、木边绿绒、奶白厚牌、金色牌背、透视围坐，以及金色/青色高亮。固定源码基线为 [Bruce-pac/EnglishMahjong-web · 6830301](https://github.com/Bruce-pac/EnglishMahjong-web/tree/6830301df3061cdd25350cf56807473e5505b311)，参考其 `src/table3d/` 与 `docs/game.jpg`。

打开 **`reference.html`** 可离线切换四个场景；SVG、中文字体和脚本均已内嵌，没有运行依赖。HTML 是静态设计查看器，不是已实现的 Three.js 游戏，也不演示实际联机、拖拽或投票。

| 文件（SVG 与 PNG 同名） | 尺寸 | 内容 |
|---|---:|---|
| `desktop-4p` | 1440×1000 | 接近原版的四人构图：正上、左右三位对手，前沿本人 14 张大牌，中央桌面显示盘 |
| `desktop-6p` | 1440×1000 | 同一木边绿绒桌扩展到六人，展示重连缓冲和 AI 托管 |
| `vote-objection` | 1440×1000 | 冻结 14 字、匿名提交进度、两段异议与完整反对按钮 |
| `mobile-390` | 390×844 | 上方三维桌面构图、下方 DOM 双行 7+7 手字牌，44×58 px 牌面和 28 px 汉字 |

`design-tokens.json` 给出视觉颜色、交互目标、显示模式、2–6 人座位模板、移动尺寸和渲染预算。源码几何事实与本项目待调的布局初值分别记录；帧率只是目标。`build-reference.py` 是可复现的源文件，SVG 保留可编辑文字与图形，PNG 从 SVG 实际渲染。

## 实现时的采用边界

这些 SVG 是表达三维构图和交互层次的矢量设计图；正式游戏必须接入真实 Three.js 桌、牌、相机、材质和灯光。不得用本目录的平面图替代上游真实渲染器。桌面默认显示三维本人手牌，通过同步投影的 DOM 命中层送入唯一 `SentenceRackController`；展开“整理句子”时隐藏本人三维牌并显示 DOM 排句区；手机竖屏固定使用三维桌加 DOM 手字牌。所有模式共享 tileId 顺序、逗号锚和同一命令入口。

图中的人物仅用中性昵称头像，未复制源项目人物模型或其他未核实素材。木桌、牌和背景是本包原生矢量绘制，没有把原截图贴成游戏界面。上游代码和素材的实际复用范围、许可与署名要求见 [11-ENGLISH-TABLE-ADOPTION.md](../docs/11-ENGLISH-TABLE-ADOPTION.md)。

文字玩法按项目定制，图中圈选只演示位置操作，不代表示例词句应被语义否决。牌背、弃牌和中央余牌数字用于构图示意，不是一份可用于牌数守恒测试的完整对局快照；实际游戏必须从同一合法快照渲染全部区域。源游戏的英语字母、积分、四方位、骰子规则不进入本项目。所有交互以 [03-UI-SPEC.md](../docs/03-UI-SPEC.md) 为准，业务语义以 [01-RULES.md](../docs/01-RULES.md) 为准，真实接入验收见 [12-UI-ACCEPTANCE.md](../docs/12-UI-ACCEPTANCE.md)。

## 重新生成

本目录已有生成产物，无须先安装工具才能查看。重新生成 SVG 与 HTML 需要 Python 3；无参数时会复用已附的字形子集：

```bash
python3 build-reference.py
```

如果修改了参考文字，需用 `fontTools` 和完整的 Noto Sans CJK SC Regular OTF 重新生成字形子集。参数应指向本地合法字体文件：

```bash
python3 build-reference.py /absolute/path/NotoSansCJKsc-Regular.otf
```

PNG 使用 Inkscape 从 SVG 渲染；机器须安装同一完整中文字体或配置 Fontconfig 指向字体目录。依次渲染四个文件：

```bash
inkscape desktop-4p.svg --export-type=png --export-filename=desktop-4p.png
inkscape desktop-6p.svg --export-type=png --export-filename=desktop-6p.png
inkscape vote-objection.svg --export-type=png --export-filename=vote-objection.png
inkscape mobile-390.svg --export-type=png --export-filename=mobile-390.png
```

每次更改后重新查看 PNG 的全部 14 个汉字、逗号、标记和按钮，不能仅凭脚本退出码认定视觉完成。生成脚本只生成 SVG/HTML/字体，不会自动更新 PNG 或验证记录。

## 字体

SVG 和 HTML 内嵌本次所需中文子集 `ui-cjk-subset.woff`。字体基于 [Noto Sans CJK SC](https://github.com/notofonts/noto-cjk)，遵循同目录 `FONT-LICENSE.txt` 中的 SIL Open Font License 1.1；字形子集仅覆盖示例文字。

真实产品需等待字体就绪后生成字牌纹理，并覆盖实际字库全部汉字。不能用本目录的示例子集作为任意汉字生产字体，也不能因缺字而退回英文字母。验证状态见 `VERIFICATION.md`。
