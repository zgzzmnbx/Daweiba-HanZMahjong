# 公网入口运维

游戏入口：https://118.196.107.182:1240

本机运行真实游戏服务，火山云负责HTTPS和隧道。关闭Mac、退出当前用户或网络中断会使公网服务不可用；云端返回明确503，不会丢弃本机存档。生产文件安装在 `~/Library/Application Support/WordMahjong/`，源代码仍在本项目。每次发布使用独立 `releases/版本-时间/`，数据库位于 `data/mahjong.sqlite`，配置位于 `config/game.env`。当前安装路径记录在项目 `runtime/deployment.json`。

## 构建与发布

使用项目声明的 Node24.19+（24.x），先执行 `npm ci`、`npm test`、`npm run build`，再运行：

```bash
python3 ops/install-release.py --node "$(command -v node)"
python3 ops/macos-service.py status
curl --fail https://118.196.107.182:1240/readyz
```

安装器复制已构建文件，按锁文件安装生产依赖；已有数据库会先用一致性备份脚本备份。然后更新应用专属 LaunchAgent。安装成功仍须检查 ready 和真实命令。新构建不会自动修改已运行的独立 release。首次部署曾实测后台 Node 读取 Downloads 中 env 被系统挂起，因此生产安装到标准应用数据目录；未修改系统隐私权限。

`python3 ops/macos-service.py restart` 为正常 SIGTERM 停止后重新注册；工具对 launchd 异步移除 job 的短暂竞态进行最多6秒有界重试。不要使用 kill -9 代替普通维护重启。维护时先结束测试房或提前安排对局暂停。

## 已安装的网络服务

Mac：`com.daweiba.word-mahjong.frpc` 用户LaunchAgent，二进制及配置位于项目 `runtime/`，日志 `runtime/logs/frpc.*.log`。通过 `launchctl print gui/<UID>/com.daweiba.word-mahjong.frpc` 查看；UID由 `id -u` 获得，不能写死其他用户UID。

云端：`word-mahjong-caddy.service` 与 `word-mahjong-frps.service`，独立系统用户和配置 `/etc/word-mahjong`。1240HTTPS、1241FRPS、1242回环后端、2021回环管理。禁止把1242/2021改为全网监听。

Caddy使用同一公网IP既有Let's Encrypt短期证书的独立副本。现有自动续期任务完成后，`/etc/letsencrypt/renewal-hooks/deploy/90-word-mahjong` 只复制证书并重载本游戏入口。不要手动复制过期证书长期使用。维护需验证证书有效期、timer状态和真实HTTPS响应。

2026-10-26修复：外置证书文件更新后必须使用`caddy reload --config /etc/word-mahjong/Caddyfile --adapter caddyfile --address 127.0.0.1:2021 --force`。相同配置的普通reload可能保留旧证书；不能只凭磁盘证书有效或timer成功判断入口正常。当前部署钩子模板见`ops/word-mahjong-cert-deploy.sh`，只对指定lineage和游戏独立2021管理口生效；当前续期timer实测每日00/12点检查。验收应核对实际握手证书和严格HTTPS/WSS，不能关闭证书校验。

## 故障顺序

1. Mac `http://127.0.0.1:3000/healthz` 与 `/readyz`。
2. Mac游戏与FRPC LaunchAgent，FRPC日志是否连接失败。
3. 云端两个专用服务与 `127.0.0.1:1242/healthz`。
4. 公网 `https://118.196.107.182:1240/healthz`，再实际开房/Socket连接；HTTP首页正常不等于联机正常。

不因游戏故障重启主Caddy、共享FRPS、公文、中心或麒麟服务。

## 撤销本次入口

先保存游戏数据库并停止本游戏应用及Mac专属FRPC LaunchAgent；云端 `systemctl disable --now word-mahjong-caddy word-mahjong-frps`。将游戏续期钩子移至备份目录，保留配置和数据待确认，不删除其他服务配置。原文件备份位于 `/root/codex-backups/word-mahjong-20261023`。同步主机权威说明和Obsidian管理区，将端口标为停用保留，不能仅因无监听重新分配。

## 秘密与存档

管理员密码只在服务端以scrypt验证值配置，不写入前端、Git或浏览器存储。运行 `python3 ops/set-admin-password.py` 在隐藏输入中设置；脚本备份受限配置，写入ADMIN_PASSWORD_HASH，需下次重启/发布生效。发布器会保留此字段。缺配置时管理员登录禁用；密码更换后旧管理会话自动失效，普通玩家Cookie不受影响。管理员会话8小时到期，独立HttpOnly/Secure Cookie仅用于/api/admin，登录每IP每分钟最多5次。

1.7.0数据库新增管理员会话、管理审计、字库修订与当前修订表。保存字库采用revision并发校验，历史修订保留；恢复旧配比可读取相应deck_revisions记录，按当前revision重新保存，禁止直接把旧revision设回去造成版本重用。每局START固定整份roundDeck，活动牌墙不随编辑改变。回退必须兼容managed-rN和管理员撤销/两分钟期限，不能将1.7存档直接交给旧构建。

管理员解散为关闭/无计分终止，保留原存档与历史。踢出候场/结算席位会腾位；活动真人由全新AI身份接手同一实体牌，被踢者凭据撤销。活动AI不能移除，以免破坏牌局，必要时直接解散房间。含指定AI且无人在线120秒关闭；候场公共桌仍按原15秒无真人释放映射，但后台房间到120秒才关闭。重启保留既有AI空房截止，重启前在线的房间有120秒回来。

`runtime/` 不进入Git或发布压缩包。FRPC独立认证与CA仅由现有本机私有配置读取；不复制云主机SSH凭据到项目。备份/恢复数据库必须使用应用提供的一致性快照命令，不能只复制正在WAL写入的主sqlite文件。

## 存档备份、沙盒恢复与代码回退

设置 `DB_PATH` 为 `runtime/deployment.json` 中的 database 路径（含空格时必须引用）。`npm run db:backup -- /绝对路径/新备份.sqlite` 会用 VACUUM INTO 输出一致快照，检查 integrity，并生成带应用/schema版本、SQLite版本、SHA256的私有清单。先在独立沙盒路径设置 `DB_PATH`，执行 `CONFIRM_SERVICE_STOPPED=yes npm run db:restore -- /绝对路径/备份.sqlite`，对比记录；不能用生产数据覆盖正在写入的数据库。

代码回退保留当前数据库：停止游戏 Agent，恢复 `WordMahjong/backups/` 中匹配旧 release 的 game.env，再用 `macos-service.py install --node … --root /旧release路径 --env /共享config/game.env` 启动旧版本，确认 ready 并用原身份恢复。仅在数据库schema和房间规则语义都兼容时采用；1.1.0已创建指定AI房后，不能直接让1.0.0读取当前库。原1.0→1.0回退演练只证明当时同规则兼容，不证明1.1→1.0降级安全。不兼容需先保留故障库、核对备份后新增对局的影响，再执行显式数据恢复。不要删除历史 release 或备份来做回滚。

公网验收测试仅创建自己的验收房间，不读取其他玩家的私密手牌。自动脚本的备份恢复目标为独立沙盒；本机的公网 HTTPS/WSS 测试不能替代手机蜂窝网络、Mac合盖持续在线或物理手机性能验证。

## 1.9.0套组备份兼容

命名套组新增deck_sets/deck_set_revisions/deck_catalog/deck_set_receipts/room_deck_sets，整库备份自动包含全部数据；旧字库迁移classic，原deck_revisions仍镜像经典组修订。schema_info与codec仍为1，仅代表可加式迁移，不能把含新套组的存档交给1.8及更早构建继续写入。恢复须用兼容1.9的版本；若需要旧版数据恢复，必须保留当前库并核对备份之后的变化。
