# 部署模板使用说明

这里提供可核对、可替换占位符的模板，未在用户机器运行。本目录不是一键自动安装程序；Sol应在实际软件版本上验证后补全最终启动命令。

## 文件

| 文件 | 放置位置与用途 |
|---|---|
| `frps.toml.example` | 火山云专用frps实例；公网控制7000，代理仅回环7300 |
| `frpc.toml.example` | Mac；转发到本机游戏3000 |
| `Caddyfile.example` | 云端现有Caddy的新增游戏站点块 |
| `.env.example` | Mac游戏服务的生产环境配置样例 |
| `launchd.plist.example` | Mac登录用户的游戏后台服务 |
| `frpc.launchd.plist.example` | Mac登录用户的frpc后台服务 |

## 现场操作顺序

1. 盘点现有3000/7000/7300端口和已运行服务，确认Mac处理器架构、Node/frp/Caddy版本；不要停止其他业务。共享frps不可直接套用本包全局监听限制，使用专用实例与空闲端口。
2. Sol先完成应用构建和本地真实多人验收，约定后端入口为`apps/server/dist/index.js`，静态目录为`apps/web/dist`。
3. 建立独立发布目录及shared配置、数据、日志、备份目录。复制模板后替换`MAC_USER`、`/ABS/PATH`、`example.com`和全部`REPLACE_WITH`。实际配置不入git。
4. frp使用独立随机token。给frps配置带`relay.example.com`对应SAN的证书和私钥；将签发CA公钥证书交给Mac frpc，匹配`trustedCaFile`和`serverName`。可使用现有可信PKI或按frp官方TLS文档生成专用CA。私钥不放到浏览器、源码或公开下载目录。
5. 用所安装的frp二进制执行`frps verify -c /实际路径/frps.toml`、`frpc verify -c /实际路径/frpc.toml`；用`caddy validate --config /实际路径/Caddyfile --adapter caddyfile`检查合并后的Caddy配置。严禁为了忽略未知字段而关闭严格校验。
6. 启动Mac应用、专用云frps、Mac frpc，先在云上验证回环7300能到游戏healthz/readyz；再配置公网域名、证书和Caddy站点。
7. Mac上先用`plutil -lint /实际路径/任务.plist`检查两个实际plist。确保程序、env、日志目录存在，文件权限合适；按现场macOS的launchctl用法加载用户Agent。不要在已登录的旧同名Agent上盲目重复bootstrap，也不要卸载其他服务。
8. 手机断开Wi-Fi、用蜂窝网络进入域名，至少两位真人同桌实际出牌、断线和恢复；完成架构文档A—F证据表。

可用的非写入检查例子（占位路径需先替换）：

```bash
curl --fail http://127.0.0.1:3000/healthz
curl --fail http://127.0.0.1:3000/readyz
curl --fail http://127.0.0.1:7300/healthz
curl --fail https://mahjong.example.com/readyz
```

第一、二条在Mac执行，第三条在云机执行，第四条在外网客户端执行。HTTP成功不代表Socket.IO与牌局恢复已通过，仍需多人实际测试。

## 日常启动与重启

Mac保持用户登录、接电、网络稳定并避免自动睡眠；屏幕关闭可以单独验证。应用与frpc都由各自Agent维护。后台进程的启动状态不依赖是否打开浏览器页面。

重启游戏服务会使所有房间断线，恢复依据数据库快照；重载Caddy/frp也可能打断实时连接。先让房间结束或进入维护暂停，再重启对应服务，记录版本和时间，验证玩家凭原会话/恢复码回到正确座位。不要通过清空数据库解决“重连异常”。

## 备份与回滚

应用必须实现并文档化`db:backup`，采用SQLite在线备份机制，备份输出到独立新文件，执行完整性检查后才标记成功。不要直接把运行中的单个`.sqlite`文件拖到网盘当作已验证备份。

发布前保留当前应用版本与一份可恢复备份；发布后验证再结束观察。回滚时先核对schema兼容性。若必须恢复旧数据库，先停所有写进程、保留故障数据库及日志，再恢复匹配版本并验证；有数据损失范围时应明确列出，不自动覆盖。

## 实际交付报告必须填写

- Mac系统/架构、Node精确版本、实际SQLite版本、frpc/frps/Caddy精确版本。
- 应用commit、应用版本、schema版本、规则版本、字库版本。
- 已完成的本地/隧道/公网/掉线恢复层级及证据。
- 外网地址、后台管理方式、日志位置、备份命令与最近恢复演练结果。
- 未具备域名/证书/云权限时，明确待现场执行的动作；不标记公网成功。

详细架构与官方依据见[05-ARCHITECTURE-DEPLOYMENT.md](../docs/05-ARCHITECTURE-DEPLOYMENT.md)及[09-SOURCES.md](../docs/09-SOURCES.md)。
