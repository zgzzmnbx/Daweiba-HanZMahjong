# 字牌与胡句语音运维

采用阿里云北京地域 `qwen3-tts-flash`、Cherry、显式Chinese；[官方API](https://help.aliyun.com/zh/model-studio/qwen-tts-api)。普通摸打AI不调用外部模型；本模块仅合成声音。

- `DASHSCOPE_API_KEY_FILE`：仓库外0600纯密钥文件；也支持服务器环境变量`DASHSCOPE_API_KEY`。浏览器不接触凭据。
- `SPEECH_CACHE_DIR`：独立持久目录；默认在SQLite所在目录的`speech/`。二字词与胡句文件以音色/规范化版本、文本及种类的SHA-256命名，0600原子写入。目录和语音素材可随数据独立备份；删除缓存可再生成，不改牌局数据库。
- `FFMPEG_BINARY`：保留旧版音频工具配置；1.20.0词语与胡句使用自然语速，不再压缩成单字时长。
- 当前Mac路径配置已保存至Application Support私有game.env，安装脚本保留上述配置字段。部署前一致备份原配置及SQLite；应用版本和服务状态以实际发布记录为准。

管理员在“麻将字库”点击“补全本套组语音”，只为已保存且已有固定配词的汉字生成缺失词语音频；状态每三秒更新，已有标签可点播。新字须先保存；若显示“待配词”，先在`apps/server/tile-words.ts`补充以该字开头的二字词并更新词语profile再发布。不能用任意输入消耗API，也不能降级成单字朗读。失败可再次补全，2并发、1200ms起始间隔，不无限重试；同字/同胡句合并请求，已有缓存不再收费。

也可在已配置凭据与缓存路径的服务器环境运行：

```sh
node --import tsx scripts/generate-tile-speech.ts
```

此开发脚本需Node24和tsx；生产可直接用管理员入口。`DB_PATH`必须指向实际保存了套组的数据库；脚本只读SELECT最新字库修订，不写活动牌局。脚本默认将不含秘密的结果放Codex-Temp，可通过`SPEECH_REPORT`指定审计文件。

1.20.0每张字牌对应固定二字词，首字与牌面相同；词表见`【牌库】/出牌朗读词表-v1.0-【codex】.md`。去首尾多余静音、统一响度，保留自然语速。新词语profile与旧单字缓存隔离；胡句保留原profile，已生成的整句缓存继续可用。

出牌只消费新增公开discardId，所有真人/AI/托管及观战共用缓存；点选手牌不朗读。公共GET只读现存文件，缺失返回404，不调用模型。仅管理员明确补全或部署前脚本会生成牌词；仅公开胡句可按需调用TTS。

胡句路由只从请求房间当前已公开提案或本局历史取字序，不接受客户端任意text/voice；私房由本人或独立管理员鉴权，开放观战的房间允许公共句子朗读。Cookie、恢复码与他人手牌不进入音频接口。返回音频为no-store，私房音频不经公开静态路径暴露。

游戏工具与评审弹窗可开关声音、手动重读。首次打开/恢复不重播旧胡句；新公开申请实时朗读，用户从未操作时浏览器可能要求点击朗读。语音失败不阻断投票、摸打或服务器计时；身份、局、连接或暂停变化清理旧播放与迟到请求。

## 浏览器语音回归

现有锁定Playwright1.56.1可配套Chromium141执行：先按标准Playwright安装配套浏览器到临时目录，设置`PLAYWRIGHT_BROWSERS_PATH`后运行`scripts/verify-discard-speech.mjs`或`verify-speech.mjs`。未设置时仍使用已安装Chrome。报告记录实际版本；本机Chrome156与旧版控制协议的异常不能当作配套浏览器通过证据。`EVIDENCE_PREFIX`必须唯一，进程退出0后才归档结果。

## 1.28.1扩充

牌词profile为tile-word-v2，共358词；v1旧URL按冻结的tile-words-v1.json继续只读。`migrate-tile-word-cache.ts`验证旧178词是否一致并复制已验证WAV到新key，不覆盖旧文件；`generate-tile-speech.ts`可用SPEECH_DECK_FILE预生成尚未入库的已审核候选配置。`verify-tile-word-cache.ts --local`强制使用无凭据本地服务，即使环境文件带有生产PUBLIC_ORIGIN；报告路径通过EVIDENCE_PREFIX和SPEECH_REPORT指定，不固定178数量。

原“素质满满”用scripts/apply-suzhi-deck.mjs管理API修订，HANZ_ADMIN_PASSWORD从环境读取、不存源码。目标必须唯一同名且与原配置revision和entries一致，否则停止避免覆盖管理员并发编辑。回退请对当前revision提交原始entries，不能把活跃数据库降级。
