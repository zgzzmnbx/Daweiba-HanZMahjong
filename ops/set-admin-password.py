#!/usr/bin/env python3
"""Set a server-only scrypt verifier in an existing game env; restart separately."""
import argparse,getpass,hashlib,os,re,shutil,tempfile
from datetime import datetime
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--env',type=Path,default=Path.home()/'Library/Application Support/WordMahjong/config/game.env')
a=p.parse_args()
if not a.env.is_file():p.error('Create the service configuration first')
password=getpass.getpass('Administrator password (hidden): ')
if not password or len(password)>128:p.error('Password must have 1–128 characters')
salt=os.urandom(16).hex()
# Server decodes the hex salt to the original 16 bytes.
key=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1,dklen=64).hex()
password=''
original=a.env.read_text()
line='ADMIN_PASSWORD_HASH=scrypt:'+salt+':'+key+'\n'
new=re.sub(r'^ADMIN_PASSWORD_HASH=.*\n?', '', original, flags=re.M).rstrip()+'\n'+line
backup=a.env.with_name('game-before-admin-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.env')
shutil.copy2(a.env,backup);backup.chmod(0o600)
with tempfile.NamedTemporaryFile('w',dir=a.env.parent,delete=False) as f:
 f.write(new);tmp=Path(f.name)
tmp.chmod(0o600);tmp.replace(a.env)
print('Administrator verifier saved; password was not logged. Restart the game to apply.')
