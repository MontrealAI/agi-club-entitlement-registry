# Third-party notices

OpenZeppelin Context/Pausable sources and MIT licence are retained under `vendor/openzeppelin/`. Their presence does not mean the custom registry was audited.

The frontend build uses the exact ethers version declared in `package.json` and resolved in `package-lock.json` (currently `ethers@6.17.0`), and copies its official UMD distribution and `LICENSE.md` into public assets. The builder rejects a different installed version. Never substitute a test facade or private keys. No font files or remote font service are included.

Hardhat, solc, the explorer-verification plugin and their transitive dependencies retain their upstream licences and must be resolved through a genuine reviewed package lock. Test-only crypto reference code is not a production dependency and is never included in `dist/site`.
