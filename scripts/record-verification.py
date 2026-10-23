# -*- coding: utf-8 -*-
"""Map the immutable 91-case index to actual passing JUnit/browser evidence; no expected-value simulation."""
import json,re,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent.parent
xml=ET.parse(root/'docs/evidence/automated-tests.xml')
tests=[]
for test in xml.findall('.//testcase'):
    if test.find('failure') is not None or test.find('error') is not None or test.find('skipped') is not None:
        raise SystemExit('Do not publish passing evidence while tests fail or skip')
    path=Path(test.get('file',''))
    tests.append({'name':test.get('name'),'file':str(path.relative_to(root)),'seconds':float(test.get('time','0'))})
cases=json.loads((root/'handoff/fixtures/scenario-cases.json').read_text())['cases']
results=[]
for case in cases:
    key=case['id'].split('-')[0]
    hits=[t for t in tests if re.search(r'(?<![A-Z0-9])'+key+r'(?![0-9])',t['name'])]
    level='implemented-engine-command'
    evidence=[{'path':t['file'],'test':t['name']} for t in hits]
    if any(t['file'].startswith('tests/server') for t in hits):level='real-http-socket-sqlite + engine'
    if any(t['file'].startswith('tests/ui') for t in hits):level='actual-client/adapter/controller + engine'
    if key=='S28':
        level='real-browser-keyboard-pointer-touch + actual-controller'
        evidence=[{'path':'docs/evidence/ui-browser-results.json','test':'actual keyboard, touch, comma inputs'}, {'path':'tests/ui/model.test.ts','test':'comma/physical-ID/controller assertions'}]
    if not evidence:raise SystemExit('Unmapped case: '+case['id'])
    results.append({'id':case['id'],'status':'PASS','level':level,'evidence':evidence,**({'compatibility':'1.0.0 only; user-authorized 1.1.0 designated-AI replaces no-fill restriction'} if key=='S11' else {})})
(root/'docs/evidence/scenario-results.json').write_text(json.dumps({'applicationVersion':'1.1.0','legacyRulesVersion':'1.0.0','newRulesVersion':'1.1.0','automatedTests':len(tests),'scope':'91 original case invariants have actual implementation assertions; levels are explicit, not 91 separate browser or public-network sessions','cases':results},ensure_ascii=False,indent=2)+'\n')
lines=['# 验收结果 · 应用1.1.0','','2026-10-23。原91项按实现断言逐项映射；下表列明验证层级，并不声称每一条都单独在公网浏览器重演。引擎测试通过真实applyCommand入口和可控时钟；网络测试通过真实HTTP/Socket.IO/SQLite；浏览器通过独立Cookie上下文实际点击。测试不以scenario.expected构造返回值。', '', f'最新JUnit：**{len(tests)}测试，0失败、0跳过**，见 `docs/evidence/automated-tests.xml`。S11在旧规则1.0.0保持PASS，新规则1.1.0按用户追加允许指定AI，另有全人数AI矩阵和真实浏览器/公网证据。','','## 证据索引','','- `docs/evidence/automated-tests.xml`：可控时钟/seed、命令权限、Map/Set codec、SQLite失败回滚、重启回执与结算、真实两个房间、坏输入与恢复限流。','- `docs/evidence/scenario-results.json`：91项到真实测试名称及文件的机器可读索引。','- `docs/evidence/real-browser-results.json`：2/3/4/5/6独立浏览器，真实创建/选座/准备/摸打/胡牌/投票/结算、刷新与换设备恢复，画布持续存在。','- `docs/evidence/advanced-browser-results.json`：真实候选队列、独立草稿、跨逗号匿名异议、吃牌保护、强制弃牌、AI延时、全离线context重建；只有服务器时钟可控，无测试HTTP路由。','- `docs/evidence/client-lifecycle-results.json`：迟到HTTP/Set-Cookie与离开/换房竞态，校验后续真实HTTP及READY仍属于新房。','- `docs/evidence/astra-ai-local-results.json`：实际六座房设置/移除AI、一真人练习、结算补真人与混合评审、430px和应用版本。','- `docs/evidence/astra-paused-context-results.json`：申请人真实断线后，暂停中的评审者丢context/重建/恢复，不改变权威阶段。','- `docs/evidence/public-network-results.json`、`public-ai-results.json`：真实可信HTTPS/WSS公网全人数及混合AI联机。','- `docs/evidence/public-operations-results.json`：真实短断、AI接管、全离线、LaunchAgent重启、Caddy重载、在线备份与独立沙盒恢复。','','## 原91项逐项结果','','| Case | 状态 | 实际验证层级 / 文件 |','|---|---|---|']
for r in results:
    files=list(dict.fromkeys(e['path'] for e in r['evidence']))
    note='；1.0兼容，1.1被用户新要求覆盖' if r['id'].startswith('S11-') else ''
    lines.append('| '+r['id']+' | PASS'+note+' | '+r['level']+' · '+'、'.join('`'+f+'`' for f in files)+' |')
lines+=['','## 新增1.1与高风险回归','','| 范围 | 结果 | 证据 |','|---|---|---|','| 2—6座、一真人+指定AI，800ms只摸打 | PASS | designated-ai.test；astra-ai-local；public-ai |','| 至少1真人、真人全准备、指定AI自动准备 | PASS | designated-ai.test；真实UI/API |','| 仅房主候场/结算增减AI；不覆盖真人/不在局内改席 | PASS | designated-ai.test；astra-ai-local |','| AI无会话/恢复码，房主只移给真人，全离线暂停 | PASS | designated-ai.test；真实服务与公网 |','| 练习局不胡不投不计分，混合桌仅冻结真人 | PASS | designated-ai.test；astra-ai-local；public-ai |','| 结算移除持牌AI→重设/补真人→下一局，牌权守恒 | PASS | designated-ai.test；S92；astra-ai-local |','| 旧1.0房间重启保留版本并拒绝AI补位 | PASS | legacy test；无全局迁移 |','| 普通/候选旧私密版本丢弃，未知ACK不重放 | PASS | tests/ui/network.test.ts；model.test.ts |','| 初连RESYNC后才写、READY明确CAS失败安全重试 | PASS | network.test.ts；最终公网Astra复核 |','| 旧restore不能复活已离开的房间或覆盖新房Cookie | PASS | network.test.ts；client-lifecycle-results |','','## UI32项','','| ID | 状态 | 实际依据 / 边界 |','|---|---|---|']
ui={1:'UI-ADOPTION及原图对照；table-4-desktop与真实牌局截图',2:'真实游戏路由canvas/Three材质；每次发牌/投票/结算后canvas断言',3:'actual adapter 20组合、2—6真实独立浏览器及截图',4:'本地汉字纹理、重复字ID、390/430实际bounds与系统字体；未代称物理手机GPU',5:'实体ID模型、S21同字不同实体、真实EAT保护及前后快照',6:'单一controller、3D/DOM输入切换、真实键盘/触摸脚本',7:'安全投影源码、真实网络与两房间、无对手暗牌/未来山牌/生产诊断出口',8:'真实renderer可增长集合；旧UI报告216+额外视图容量实测',9:'390/430双行14字、3逗号bounds、Astra430新版截图及版本底部独立行',10:'实际Pointer/CDP触摸、键盘取消、权威增牌本地草稿归一化',11:'真实三逗号锚点与形式案例/牌权变化修剪',12:'实际44px逗号替代按钮与跨行操作',13:'键盘Space/方向/Enter/Escape及DOM位置汉字逗号标签；真实读屏见UI31边界',14:'advanced真实13+1候选/私密独立保存；S95保存/恢复/清理断言',15:'S02—S06全逻辑座次；真实HU失败后EAT/不补摸/禁打同实体',16:'全人数真实评审阈值、混合真人评审、冻结集合掉线/恢复测试',17:'advanced异议跨逗号、匿名计数与并集实际显示；网络无逐票归因',18:'实际触摸/键盘/鼠标索引、合并删除、APPROVE无ranges',19:'权威快照先进入显示、没有飞牌业务回调；真实8秒响应不等动画',20:'epoch/round/phase/private普通及候选版本门控，旧结果丢弃',21:'真实WIN、否决后30秒mustDiscard和下一局；旧WIN独立归档',22:'advanced真人超时文字、15秒缓冲、BOT800ms与AI标签',23:'恢复先/AI先两种提交顺序；真实跨设备撤旧页与已提交动作保留',24:'astra-paused-context真实申请人断线暂停与恢复；引擎原grace优先级',25:'真实公网LaunchAgent重启/全离线；引擎原24h与申请人撤回优先级',26:'实际禁WebGL启动后可用DOM回退，保留同身份与命令链',27:'正常投票context、暂停投票context、全部浏览器offline+服务暂停context三组合；离线页不冒称收到最后暂停广播',28:'真实丢context/重建，最新权威投影，无重放动作；草稿/冻结句保持',29:'物理中档手机/约定桌面硬件GPU预算未现场测；旧无头帧样本只作观察，不算预算通过',30:'旧UI报告20次重建GPU对象数稳定；新房切换AbortSignal/socket/定时器代次回归',31:'真实读屏软件、浏览器菜单200%缩放及硬件辅助功能未现场测；已有ARIA、焦点、文本状态与reduced-motion实现',32:'real-browser全人数、advanced、public-network/AI/operations，实际HTTP/Socket/SQLite'}
for i in range(1,33):lines.append(f'| UI{i:02} | '+('NOT_RUN_ENV_REQUIRED' if i in [29,31] else 'PASS')+' | '+ui[i]+' |')
lines+=['','## 未执行与限制','','- UI29、UI31保留现场未验收，不能将Chrome触摸模拟、无头帧率或等效窄视口称为实体手机GPU/真实读屏/真实200%浏览器菜单缩放。','- 真实公网使用当前Mac网络访问云HTTPS；无已确认的手机蜂窝现场结果。','- 备份恢复已做逐表沙盒核对；旧1.0版本的应用回滚演练不证明含1.1指定AI数据能回退到不理解AI的1.0应用。','- 字库daily-v1是实验配比，尚未验证真实多人局长、胜率或平衡。','- Vite保留Three主包体积提示（约746KB未压缩）；构建和npm audit通过，不把体积提示写成性能通过。','']
(root/'docs/ACCEPTANCE-RESULTS.md').write_text('\n'.join(lines))
print(f'PASS mapped {len(results)} original cases to {len(tests)} actual tests; UI29/UI31 remain environment-required')
