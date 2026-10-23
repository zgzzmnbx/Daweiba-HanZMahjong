# 运行、备份与恢复 · 1.1.0

生产为单进程Node24.19.0，`dist/server/main.mjs`承载`dist/web`、HTTP及Socket.IO；持久层SQLite3.53.3，schema1，WAL / synchronous FULL / foreign_keys ON / busy_timeout 5000。私密HTTP全部no-store。

## 环境

必填`NODE_ENV=production`、`PUBLIC_ORIGIN=https://118.196.107.182:1240`、`PORT=3000`、绝对`DB_PATH`。静态目录默认工作目录`dist/web`，可用`WEB_DIST`绝对覆盖。反代仅信任回环；服务不接外网监听。

macOS生产安装在`~/Library/Application Support/WordMahjong/releases/版本-时间/`，数据独立放`data/mahjong.sqlite`。源码留Downloads项目，不直接作为后台服务目录，避免macOS TCC阻塞后台文件读取。`ops/install-release.py`与`ops/macos-service.py`负责有界等待的LaunchAgent切换。具体运行位置以主代理部署记录为准，不在文档复制.env、FRP token或证书。

## 数据安全与正常重启

每个房间独立串行队列；真人命令、断线、恢复和定时器均通过SQLite短事务。事务成功后才替换内存并广播；失败不确认动作，客户端可保留同actionId重试。SIGTERM停止接新请求，完成队列及连接关闭后关闭DB。

重启加载完整快照与Map/Set显式codec，进入PAUSED_RECOVERY；原24小时到期时间不刷新。第一位原真人恢复后只给其他真人一次15秒宽限；指定AI保持BOT。先处理过期及申请人撤回待办，再恢复业务阶段至少10秒，不重复摸牌或计分。旧1.0规则房间继续1.0，不进行数据库全量规则升级。

## 备份

`DB_PATH=/absolute/live.sqlite npm run db:backup -- /absolute/new-backup.sqlite`使用SQLite VACUUM INTO，允许在线一致备份；不是直接复制活跃主库。脚本拒绝覆盖，执行integrity_check，并写应用/schema/SQLite版本及SHA-256清单。DB与清单均0600。

## 恢复与回滚

1. 停止唯一游戏写入进程，确认3000不再监听。
2. 保留故障库与日志。执行`DB_PATH=/absolute/live.sqlite CONFIRM_SERVICE_STOPPED=yes npm run db:restore -- /absolute/backup.sqlite`。脚本先校验备份完整性/schema1；原主库、WAL、SHM以时间戳保存，再安装备份主库。
3. 启动一个服务，检查healthz/readyz。用原Cookie或恢复码恢复，核对规则版本、牌数、结果及胜局。不要用复制Cookie到报告的方式验证。
4. 应用回滚使用匹配schema的旧release。数据恢复可能丢失备份后的对局，必须明确影响范围，不自动静默覆盖。备份、数据库、恢复凭据不进入Git或公开下载。

已实际完成的公网断线/重启/代理重载/在线备份及独立沙盒逐表恢复证据见`docs/evidence/public-operations-results.json`。真实外部账号/秘密不在本文件内。
