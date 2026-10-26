# 大厅木桌素材 v1

2026-10-26，应用1.30.7。按用户“桌子太简陋，可以不用SVG”的要求，仅替换大厅装饰桌图。原图其实由CSS边框/渐变拼接；现在使用内置imagegen生成的透明位图，真正牌局继续使用Three.js，不用图片替代可操作牌桌。

## 设计与分工

- 背景深棕 `#2c2017`，木框胡桃棕 `#5b3823`，绿绒 `#18523e`，黄铜 `#c5a25f`，信息米金 `#ead6a3`。
- 牌桌是视觉重心：对称俯视、木纹、软垫、黄铜包角与真实光影；周围桌号/状态/操作保持克制。
- 三列两行桌面；手机竖屏单列内部滚动。桌图object-fit:contain、不拉伸；桌号、状态、席位人数和昵称由真实大厅快照提供，家具的四张凳子只是美术造型，不代表四人限制。
- 原苹方界面、文楷牌字/品牌字体分工不变。未添加持续循环装饰动画。

## 文件、处理与来源

- `apps/web/public/lobby/v1/table-480.webp`：480×320，27944字节（约27.3KiB），用于≤699px设备。
- `apps/web/public/lobby/v1/table-960.webp`：960×640，85832字节（约83.8KiB），用于宽屏。
- `docs/lobby-art-manifest-v1.json`：原图与WebP SHA-256、尺寸、来源记录。
- `scripts/prepare-lobby-art.cjs`：只做等比缩放与WebP编码，不绘制/编辑美术内容；需要Node和sharp开发工具。运行方式：`node scripts/prepare-lobby-art.cjs <透明原图路径>`。
- 原始透明PNG已留在本机 `Codex-Temp/lobby-art/table-source.png`（1536×1024，不随前端下载）；生成工具为宿主内置imagegen，无外部图库引用。
- 六桌共用同一URL，浏览器合并同一资源；服务端按版本目录一年immutable缓存。后续改图须换目录版本或文件名，不覆盖已缓存v1内容。
- 图片延迟时容器仍固定比例；加载失败显示品牌占位，真实按钮与状态不依赖素材加载。

## 原始生成提示词

```text
Create a single premium game UI sprite for a Chinese literary mahjong game's room lobby. One exquisite square Chinese Ming-inspired mahjong table with a deep emerald green wool baize playing surface, substantial polished warm dark walnut wood frame, restrained antique brass fine inlays and small elegant brass corner fittings. Four matching compact upholstered stools at north south west east, shown as real three dimensional stools with short wooden legs. Orthographic elevated front view, camera centered with no sideways rotation: front edge perfectly horizontal, left and right symmetrical, see top surface and short front legs. It must read as a welcoming high quality cozy Chinese game asset at 300 pixels wide, not a flat diagram. Semi-realistic hand-crafted 3D videogame render, delicate wood grain, fine felt fibers visible at full resolution, lovely warm upper-left key light, soft ambient occlusion and small contact shadows, strong readable silhouette. Felt center completely blank, plenty of uncluttered playing space. Table dark walnut but highlights readable against deep warm brown game UI. Controlled beautiful materials, graceful proportions, slightly rounded edges, elegant understated design, no excessive decoration. Full table and all four stools fit with an 8% transparent margin. Landscape canvas 3:2. Genuine transparent background outside the isolated object and its subtle shadow, no floor, no room. No text, no letters, no calligraphy, no logos, no chips, no playing cards, no mahjong tiles, no people, no UI panels, no border, no other objects. Deliver one centered finished asset only, not a sprite sheet.
```
