#!/usr/bin/env python3
"""Install/control this project's per-user production LaunchAgent; secrets remain in env file."""
import argparse, os, plistlib, shutil, subprocess, sys, time
from pathlib import Path
from datetime import datetime
LABEL='com.daweiba.word-mahjong.game'
PROJECT_ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('action',choices=['install','start','stop','restart','status'])
p.add_argument('--node',default=shutil.which('node'))
p.add_argument('--entry',default='dist/server/main.mjs')
p.add_argument('--env',default='runtime/config/game.env')
p.add_argument('--root',type=Path,default=PROJECT_ROOT,help='Installed release directory; defaults to the source workspace')
a=p.parse_args()
ROOT=a.root.expanduser().resolve()
if sys.platform!='darwin':p.error('This launcher is for macOS; run the production Node command on other systems.')
service=f'gui/{os.getuid()}/{LABEL}';domain=f'gui/{os.getuid()}'
plist=Path.home()/'Library/LaunchAgents'/f'{LABEL}.plist'
def call(args,check=True):return subprocess.run(['launchctl',*args],check=check)
def loaded():return subprocess.run(['launchctl','print',service],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
def bootstrap():
 # bootout returns before launchd has always finished removing the old job.
 for attempt in range(30):
  result=subprocess.run(['launchctl','bootstrap',domain,str(plist)],capture_output=True,text=True)
  if result.returncode==0:return
  if attempt<29:time.sleep(0.2)
 sys.stderr.write(result.stderr);raise subprocess.CalledProcessError(result.returncode,result.args)
if a.action=='install':
 if not a.node:p.error('Node was not found on PATH. Provide --node with the installed Node executable.')
 node=Path(a.node).expanduser().resolve();entry=(ROOT/a.entry).resolve();env=(ROOT/a.env).resolve()
 for f in [node,entry,env]:
  if not f.is_file():p.error(f'Missing file: {f}')
 env.chmod(0o600)
 logs=ROOT/'runtime/logs';logs.mkdir(parents=True,exist_ok=True)
 data={'Label':LABEL,'ProgramArguments':[str(node),f'--env-file={env}',str(entry)],'WorkingDirectory':str(ROOT),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,'StandardOutPath':str(logs/'game.out.log'),'StandardErrorPath':str(logs/'game.err.log')}
 plist.parent.mkdir(parents=True,exist_ok=True)
 if plist.exists():
  old=plistlib.loads(plist.read_bytes())
  oldroot=Path(old.get('WorkingDirectory','/')).resolve()
  releases=Path.home()/'Library/Application Support/WordMahjong/releases'
  if oldroot not in [PROJECT_ROOT,ROOT] and releases not in oldroot.parents:p.error('Existing label belongs to another project; inspect before changing.')
  backup=ROOT/'runtime/backups';backup.mkdir(exist_ok=True)
  shutil.copy2(plist,backup/f'{LABEL}-{datetime.now().strftime("%Y%m%d-%H%M%S")}.plist')
 if loaded():call(['bootout',service])
 plist.write_bytes(plistlib.dumps(data));plist.chmod(0o600)
 bootstrap();print(f'Installed {LABEL}; application readiness must be checked separately.')
elif a.action=='start':
 if loaded():call(['kickstart',service])
 else:bootstrap()
elif a.action=='stop':
 if loaded():call(['bootout',service])
elif a.action=='restart':
 if loaded():call(['bootout',service])
 bootstrap()
else:call(['print',service])
