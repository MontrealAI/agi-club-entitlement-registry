from pathlib import Path
import argparse,json,re
from urllib.parse import urlparse
p=argparse.ArgumentParser(description='Write public configuration only. No wallet keys, deployment or email.')
p.add_argument('--contract',required=True)
p.add_argument('--runtime-code-hash',required=True,help='Approved deployed runtime Keccak-256, not creation bytecode hash')
p.add_argument('--origin',required=True)
p.add_argument('--entitlement',action='append',required=True,help='Repeat for each allowed canonical name or 32-byte ID')
p.add_argument('--output',default=str(Path(__file__).resolve().parents[1]/'frontend/config.js'))
a=p.parse_args()
if not re.fullmatch(r'0x[0-9a-fA-F]{40}',a.contract) or int(a.contract[2:],16)==0:p.error('Nonzero contract address required')
if not re.fullmatch(r'0x[0-9a-fA-F]{64}',a.runtime_code_hash) or int(a.runtime_code_hash[2:],16)==0:p.error('Nonzero approved runtime code hash required')
u=urlparse(a.origin)
if u.scheme!='https' or not u.netloc or u.path or u.query or u.fragment or u.username or u.password:p.error('Exact HTTPS origin required, no path or trailing slash')
for v in a.entitlement:
 if not (re.fullmatch(r'[A-Z0-9][A-Z0-9_-]{0,127}',v) or re.fullmatch(r'0x[0-9a-fA-F]{64}',v)):p.error('Invalid entitlement')
cfg=dict(registryAddress=a.contract.lower(),registryCodeHash=a.runtime_code_hash.lower(),chainId=1,expectedOrigin=a.origin,allowedEntitlements=a.entitlement,contactEmail='president@montreal.ai',defaultEntitlement=a.entitlement[0])
Path(a.output).write_text('window.AGI_CONFIG = Object.freeze('+json.dumps(cfg,ensure_ascii=False,indent=2)+');\n')
print('Public config saved. Rebuild the site. This does not verify or deploy the contract.')
