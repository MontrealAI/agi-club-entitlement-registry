import argparse
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description='Write public configuration only. No wallet keys, deployment or email.')
p.add_argument('--contract', required=True)
p.add_argument('--runtime-code-hash', required=True, help='Approved deployed runtime Keccak-256, not creation bytecode hash')
p.add_argument('--origin', required=True)
p.add_argument('--entitlement', action='append', default=[], help='Optional restricted allowlist; omit to follow the admin-managed on-chain catalogue')
p.add_argument('--output', default=str(root / 'frontend/config.js'))
a = p.parse_args()
if not re.fullmatch(r'0x[0-9a-fA-F]{40}', a.contract) or int(a.contract[2:], 16) == 0:
    p.error('Nonzero contract address required')
if not re.fullmatch(r'0x[0-9a-fA-F]{64}', a.runtime_code_hash) or int(a.runtime_code_hash[2:], 16) == 0:
    p.error('Nonzero approved runtime code hash required')

# Browser URL serialization is part of the signed protocol. Reuse its validator
# with the required Node toolchain; urllib parsing does not enforce that policy.
try:
    validation = subprocess.run([
        'node', '--input-type=module', '--eval',
        'const {validOrigin}=await import(process.argv[1]); '
        'process.exit(validOrigin(process.argv[2]) ? 0 : 2);',
        '--', (root / 'shared/ticket-request.mjs').as_uri(), a.origin,
    ], capture_output=True, text=True)
except OSError:
    p.error('Node.js 22 must be available on PATH to validate the public origin')
if validation.returncode == 2:
    p.error('Exact HTTPS origin required in canonical browser form, no path or trailing slash')
if validation.returncode != 0:
    p.error('Unable to validate the public origin; check the Node.js 22 toolchain')

entitlements = []
for value in a.entitlement:
    if re.fullmatch(r'0x[0-9a-fA-F]{64}', value):
        entitlements.append(value.lower())
    elif re.fullmatch(r'[A-Z0-9][A-Z0-9_-]{0,127}', value):
        entitlements.append(value)
    else:
        p.error('Invalid entitlement')
cfg = dict(
    registryAddress=a.contract.lower(), registryCodeHash=a.runtime_code_hash.lower(),
    chainId=1, expectedOrigin=a.origin, allowedEntitlements=list(dict.fromkeys(entitlements)),
    entitlementMode='allowlist' if entitlements else 'registry', contactEmail='president@montreal.ai',
)
Path(a.output).write_text(
    'window.AGI_CONFIG = Object.freeze(' + json.dumps(cfg, ensure_ascii=False, indent=2) + ');\n',
    encoding='utf-8',
)
print('Public config saved. Rebuild the site. This does not verify or deploy the contract.')
