# 官方技术依据

查阅日期：2026-10-21（Asia/Hong_Kong）。下列是实现能力及配置字段的原始来源。牌局规则、参数、架构取舍由本项目设计，不是这些资料提供的既定规则。实施时需要把实际使用的补丁版本写入锁文件和交付报告。

<a id="s01"></a>
## S01 · Node.js支持分支

[Node.js官方发布表](https://nodejs.org/en/about/previous-releases)。查阅时24列为LTS；官方建议生产使用Active LTS或Maintenance LTS。项目选择Node 24的受支持补丁版本，不将本包日期理解为永久固定最新版。

<a id="s02"></a>
## S02 · SQLite WAL运行约束

[SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html)。WAL涉及同机共享内存，不适合作为跨机器网络文件系统上的活跃数据库；需要注意WAL与SHM伴随文件和checkpoint。

<a id="s03"></a>
## S03 · SQLite WAL修复版本

[同一官方文档第11节](https://www.sqlite.org/wal.html#the_wal_reset_bug)。官方记录WAL-reset问题修复于3.51.3及后续版本，并提供特定旧分支回补。本项目实施时应检查真实数据库引擎版本，不能只检查JavaScript包名或Node版本。

<a id="s04"></a>
## S04 · Socket.IO断线恢复的边界

[Connection state recovery](https://socket.io/docs/v4/connection-state-recovery/)。恢复可能失败，应用仍需处理客户端与服务端状态同步。牌局重启恢复、席位认证和AI控制权交接由本项目实现。

<a id="s05"></a>
## S05 · Socket.IO交付保证

[Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)。消息顺序与消息一定送达是不同保证；默认at-most-once，应用需自行设计更强恢复策略。本项目据此采用actionId收据、权威快照和提交后ACK。

<a id="s06"></a>
## S06 · frp服务端字段

[Server Configuration](https://gofrp.org/en/docs/reference/server-configures/)与[Common Configuration](https://gofrp.org/en/docs/reference/common/)。已核对`bindPort`、`proxyBindAddr`、`allowPorts`、`auth.method/token`、`additionalScopes`、`PortsRange.single`、`transport.tls.force`等字段语义。模板使用专用frps实例，避免全局字段影响其他应用。

<a id="s07"></a>
## S07 · Caddy反向代理及HTTPS

[reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)：支持WebSocket升级与双向隧道，配置重载可能关闭现有WebSocket。[Automatic HTTPS](https://caddyserver.com/docs/automatic-https)：说明域名、证书和HTTPS自动化。是否成功签发仍以实际DNS和网络条件为准。

<a id="s08"></a>
## S08 · frp TLS与客户端配置

[Custom TLS Protocol Encryption](https://gofrp.org/en/docs/features/common/network/network-tls/)、[Client Configuration](https://gofrp.org/en/docs/reference/client-configures/)及[官方完整客户端示例](https://github.com/fatedier/frp/blob/dev/conf/frpc_full_example.toml)。默认TLS加密不等于默认验证frps身份；已核对`trustedCaFile`、证书/私钥路径和`serverName`。正式实施应使用锁定发行版本对应的文档/示例，不能未经核验追随dev分支新字段。

<a id="s09"></a>
## S09 · frp TOML与原生预检

[Configuration File](https://gofrp.org/en/docs/features/common/configure/)。支持TOML；提供`frpc verify -c`与`frps verify -c`。本包仅做格式和字段资料核验，实际二进制验证由实施环境完成。

<a id="s10"></a>
## S10 · Apple launchd

[Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)。官方归档文档说明用户Agent、ProgramArguments、KeepAlive等。用户Agent跟随登录用户，实际加载/重启命令以现场macOS手册为准。

<a id="s11"></a>
## S11 · Mac睡眠设置

[Set sleep and wake settings for your Mac](https://support.apple.com/guide/mac-help/set-sleep-and-wake-settings-mchle41a6ccd/mac)。包含接电且显示器关闭时防止自动睡眠的设置；某些选项随机型变化。真实合盖及网络持续在线能力需实测。

<a id="s12"></a>
## S12 · SQLite备份

[SQLite Backup API](https://www.sqlite.org/backup.html)。介绍在线一致备份及其他方式，包括VACUUM INTO。备份功能与实际恢复演练必须由实现交付证明，不能以存在配置模板代替。

<a id="s13"></a>
## S13 · EnglishMahjong-web：用户指定的牌桌UI

[项目仓库与README](https://github.com/Bruce-pac/EnglishMahjong-web)、[项目网站](https://englishmahjong.com)、[固定提交](https://github.com/Bruce-pac/EnglishMahjong-web/commit/6830301df3061cdd25350cf56807473e5505b311)。本包以该提交的源文件与 `docs/game.jpg` 为可核实依据，未将当前网站部署版本视为与该提交相同。

已从固定提交读取真实Three.js入口 `src/table3d/Table3D.tsx`、相机/对象/布局/图集等模块，并区别于旧 `src/scene/TableScene.tsx` CSS界面。原README说明前端React/TypeScript/Three.js，原后端未包含在此前端仓库；本项目只提取牌桌展示并接入自己的游戏服务。原始资料、取得方式与逐文件哈希见 [references/englishmahjong](../references/englishmahjong/README.md)，实施映射见 [docs/11](11-ENGLISH-TABLE-ADOPTION.md)。

<a id="s14"></a>
## S14 · 代码归属与资产边界

[EnglishMahjong LICENSE](https://github.com/Bruce-pac/EnglishMahjong-web/blob/main/LICENSE)、[Autotable仓库与许可说明](https://github.com/pwmarcz/autotable)。EnglishMahjong根目录为MIT；采用模块中含Autotable来源注释，故本包同时附带相关代码许可。许可文本固定副本随源码快照提供。

代码许可与仓库中个别第三方图片、模型、字体的许可分别处理。原GLB模型、人物、英文字母图集与Draco二进制未作为本项目生产素材分发；首版厚牌使用程序几何，汉字使用系统字体或已确认许可的字体绘制。`original-game.jpg`仅作原UI比对资料。字体子集仅服务本包参考图，不能当成完整运行字库。

<a id="s15"></a>
## S15 · Three.js资源释放

[Three.js官方文档](https://threejs.org/docs/)、[Material.dispose](https://threejs.org/docs/#Material.dispose)。资源释放按实际使用的Three.js锁定版本核对，包括几何、材质、纹理、渲染目标、后处理与渲染器；卸载React容器不自动证明GPU资源已释放。本包要求20轮进入/离开与Context恢复的实际资源观察，不预填通过。

<a id="s16"></a>
## S16 · CJK字体加载与WebGL故障恢复

[Document.fonts](https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts)说明字体加载集合与就绪状态；[webglcontextlost事件](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event)说明上下文丢失事件。项目据此要求字体就绪后生成/刷新汉字纹理，以及WebGL丢失时保持同一牌局身份、草稿和命令控制器。具体降级界面、重试3D、动画代次与保局策略由本项目定义。

## V1.1来源使用边界

上述资料用于核验技术能力和上游文件，不提供本项目的玩法。规则仍以本包V1.0规则与V1.1新增展示规格为准；源文件注释、README中的英文玩法或历史作者需求不能覆盖用户已确认的文字麻将规则。包内41份源码快照是经过筛选的审阅材料，不是完整可运行fork，安装/启动命令不得在该不完整目录执行。
