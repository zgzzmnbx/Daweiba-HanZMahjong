#!/usr/bin/env python3
"""Install an already-tested build in macOS Application Support and start its own LaunchAgent."""
import argparse,json,os,shutil,subprocess,sys
from datetime import datetime
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--node',required=True);a=p.parse_args()
if sys.platform!='darwin':p.error('macOS installer only')
root=Path(__file__).resolve().parents[1];node=Path(a.node).expanduser().resolve()
version=json.loads((root/'package.json').read_text())['version']
if not (root/'dist/server/main.mjs').is_file():p.error('Run npm run build first')
base=Path.home()/'Library/Application Support/WordMahjong';base.mkdir(parents=True,exist_ok=True);base.chmod(0o700)
release=base/'releases'/f'{version}-{datetime.now().strftime("%Y%m%d-%H%M%S")}';release.mkdir(parents=True)
for name in ['dist','scripts']:shutil.copytree(root/name,release/name)
for name in ['package.json','package-lock.json']:shutil.copy2(root/name,release/name)
env=dict(os.environ);env['PATH']=str(node.parent)+os.pathsep+env.get('PATH','')
npm=node.parent/'npm'
if not npm.exists():
 found=shutil.which('npm')
 if not found:p.error('npm is required to install locked production dependencies')
 npm=Path(found)
subprocess.run([str(npm),'ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],cwd=release,env=env,check=True)
for name in ['data','config','backups']:(base/name).mkdir(mode=0o700,exist_ok=True)
db=base/'data/mahjong.sqlite'
if db.exists():
 backup=base/'backups'/f'pre-release-{datetime.now().strftime("%Y%m%d-%H%M%S")}.sqlite'
 backup_root=root
 prior_record=root/'runtime/deployment.json'
 if prior_record.exists():
  prior_release=Path(json.loads(prior_record.read_text())['release'])
  if (prior_release/'scripts/db-backup.mjs').is_file():backup_root=prior_release
 subprocess.run([str(node),str(backup_root/'scripts/db-backup.mjs'),str(backup)],cwd=backup_root,env={**env,'DB_PATH':str(db)},check=True)
config=base/'config/game.env'
private_lines=[]
if config.exists():
 for line in config.read_text().splitlines():
  if line.split('=',1)[0] in {'ADMIN_PASSWORD_HASH','DASHSCOPE_API_KEY_FILE','SPEECH_CACHE_DIR','FFMPEG_BINARY'}:private_lines.append(line)
if config.exists():shutil.copy2(config,base/'backups'/f'game-{datetime.now().strftime("%Y%m%d-%H%M%S")}.env')
config.write_text(f'NODE_ENV=production\nPORT=3000\nPUBLIC_ORIGIN=https://118.196.107.182:1240\nDB_PATH="{db}"\nWEB_DIST="{release / "dist/web"}"\n'+'\n'.join(private_lines)+'\n');config.chmod(0o600)
subprocess.run([sys.executable,str(root/'ops/macos-service.py'),'install','--node',str(node),'--root',str(release),'--env',str(config)],check=True)
record={'version':version,'release':str(release),'env':str(config),'database':str(db),'installedAt':datetime.now().isoformat()}
(root/'runtime/deployment.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(record,ensure_ascii=False,indent=2));print('Installed; verify /readyz and real game commands before declaring deployment successful.')
