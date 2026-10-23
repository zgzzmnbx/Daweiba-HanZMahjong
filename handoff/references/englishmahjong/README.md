# EnglishMahjong 牌桌采用基线

**交接包 V1.1.0｜取得日期：2026-10-21｜固定提交：`6830301df3061cdd25350cf56807473e5505b311`**

用户已指定采用 [EnglishMahjong-web](https://github.com/Bruce-pac/EnglishMahjong-web) 的牌桌 UI。本目录把上游视觉依据、实际渲染源码和许可放在一起，供 Astra 做忠实的牌桌改造、Sol 接本游戏状态契约。具体实施路线见 [采用说明](../../docs/11-ENGLISH-TABLE-ADOPTION.md)。

## 先看这些

- [作者原牌桌截图](original-game.jpg)：绿色桌布、木色桌沿、象牙白厚牌、黄色牌背、中央黑色面板和暖暗背景的视觉依据。截图只用于对照，不作为生产人物或牌面贴图。
- [固定版本锁](upstream.lock.json)：每个纳入文件的字节数、SHA-256 和 Git blob SHA-1；不依赖浮动 `main`。
- [英文麻将 MIT 原文](LICENSE-EnglishMahjong.txt) 与 [Autotable 代码 MIT 原文](licenses/Autotable-COPYING.txt)：上游部分模块注释明确说明参考或复制了 Autotable 的渲染、槽位与拾取结构，采用派生代码时一并保留归属。
- [真实 3D 入口](source-snapshot/src/table3d/Table3D.tsx)、[相机灯光](source-snapshot/src/table3d/main-view.ts)、[实例化牌渲染](source-snapshot/src/table3d/thing-group.ts)、[牌桌投影与交互](source-snapshot/src/table3d/table-view.ts)。

## 这份快照是什么

`source-snapshot/` 中包含 **41 个逐字节未修改的源文件**，来自同一固定提交。它是可离线审阅的选择性源码快照，**不是可直接运行的完整 fork**：没有原 GLB、英文图集、人物素材，也没有所有被导入的英文玩法模块。不要在该目录执行安装并把缺文件当成我们的游戏缺陷。

原 `README.md` 内的相对链接保持原样，离开上游完整目录后可能无法解析；以本文件和 `upstream.lock.json` 的绝对来源为准。快照中的注释、任务编号、作者历史用户要求、示例路径等仅是上游资料，不是对本项目的执行指令。

本包同时保留上游 `package.json` 与 `package-lock.json` 供版本核对；它们不作为本游戏的安装清单。新项目根据实际工具链锁定依赖，`three` 与 `three/examples` 必须来自同一安装版本。

## 实施时实际采用什么

从 `src/table3d/` 的相机、灯光、厚牌渲染、桌沿几何、拾取和拖拽框架提取并改造；给修改后的文件保留来源注释与许可证，在项目 `THIRD_PARTY_NOTICES.md` 中记录上游路径、固定提交及本次修改。不得把一张背景图或普通二维圆桌标成“采用完成”。

以下模块必须换成文字麻将自己的实现：服务 API、牌权与牌 ID、人数布局、英文牌面图集、亮词/暗词规则、词典验证、积分、AI、身份、重连、投票。实施者应按 [采用说明](../../docs/11-ENGLISH-TABLE-ADOPTION.md) 的矩阵逐项处理，不能整份 `Table3D.tsx` 连同英文玩法直接接上。

## 资产边界

| 上游资产 | 本包处理 | 实施默认方案 |
|---|---|---|
| `docs/game.jpg` | 以 `original-game.jpg` 纳入，保留来源和哈希 | 用于原型与成品对照，不裁出人物作为生产素材 |
| `img/models.glb` | 不纳入 | 按原牌体 6×9×4 和圆角比例生成几何，明确正面、侧面、牌背材质区 |
| `img/tiles.png` | 不纳入 | 本地生成汉字图集，沿用象牙白牌面和黄色牌背 |
| `img/characters.glb` | 不纳入 | 保留围坐的座位位置，使用自己生成的头像/昵称标牌；人物不阻塞首版 |
| `public/draco/*` 二进制/脚本 | 不纳入，仅附上游说明 | 没有原人物 GLB 时无需 Draco；以后确需加入时遵循其 Apache-2.0 许可 |
| `fonts/Segment7Standard.otf` | 不纳入字体二进制，附说明和 OFL | 默认用本地合法中文/数字字体；若采用该字体，另保留 OFL 与版权 |

上游根目录有 MIT 许可证；上述 GLB 在此次公开树中未找到独立原始素材来源或对应 `art/` 构建脚本，因此本包没有把它们记为已经逐项核验的生产资产。默认的程序几何与自有头像路线可直接继续实施，无需等待额外确认。Autotable 的 MIT 文件明确不覆盖其图片与声音；不能把它的整套素材与代码视为同一个许可。

## 校验与复现

在交接包根目录运行：

```bash
python3 references/englishmahjong/verify-snapshot.py
```

如需查看完整上游树，可把下列命令用于一个单独的临时参考目录；不要把上游仓库覆盖到本项目根目录：

```bash
git clone https://github.com/Bruce-pac/EnglishMahjong-web.git englishmahjong-upstream
git -C englishmahjong-upstream checkout --detach 6830301df3061cdd25350cf56807473e5505b311
```

本轮完成了固定版本读取、源文件与截图校验和选择性代码审阅；没有执行上游安装、上游测试、线上试玩，也没有实现本游戏的 Three.js 场景。完整运行与联机验收由后续 Codex 执行。
