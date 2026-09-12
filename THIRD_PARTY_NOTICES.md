# Third-party notices

OpenZeppelin Context/Pausable sources and MIT licence are retained under `vendor/openzeppelin/`. Their presence does not mean the custom registry was audited.

The frontend build installs exact `ethers@6.15.0`, copies its official UMD distribution and `LICENSE.md` into public assets. Never substitute a test facade or private keys. No font files or remote font service are included.

Hardhat, solc, the explorer-verification plugin and their transitive dependencies retain their upstream licences and must be resolved through a genuine reviewed package lock. Test-only crypto reference code is not a production dependency and is never included in `dist/site`.
