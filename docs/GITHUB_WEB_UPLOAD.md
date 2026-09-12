# Publish with the GitHub website — no Git command required

Target: **`MontrealAI/agi-club-entitlement-registry`**. Source upload is not mainnet deployment and does not start the member portal.

## 1. Extract the delivery

Unzip the downloaded archive on your computer. Open the inner `agi-club-entitlement-registry` folder. You should see `README.md`, `package.json`, `hardhat.config.ts`, `contracts`, `frontend`, `docs`, and `.github`.

**Upload this folder's contents, not the ZIP and not an extra enclosing folder.** Use a fresh delivery extraction, not a working directory containing keys, `.env`, node_modules or member files.

Show hidden files before selecting:
- macOS Finder: **Command + Shift + .**
- Windows File Explorer: **View → Show → Hidden items** (wording may vary).

## 2. Create the repository

Log into GitHub. Top-right **+ → New repository**. Choose **MontrealAI** as owner, then enter `agi-club-entitlement-registry`.

Suggested description: `Reusable AGI Club entitlements with ENS-rooted administration and static, no-contact-storage ticket requests.`

Choose Public if you intend public source review. Do **not** initialize with a generated README, .gitignore or licence: those are already included. Click **Create repository**.

If a repository with that name already exists, do not overwrite its history blindly. Use a new branch and pull request; first reconcile any deployments, old claims and issued tickets.

## 3. Upload in the website

On an empty repository select **uploading an existing file**. On an existing repository select **Add file → Upload files**.

Drag in the extracted contents. GitHub permits up to 100 files per browser upload and up to 25 MiB per file. If the complete tree exceeds 100 files, use two uploads: root files plus `contracts`, `vendor`, `shared`, `frontend` first; then `.github`, `docs`, `scripts`, `test`, `tools`, `metadata`, `evidence` and `releases`. Preserve folder paths.

Commit message: `Add static-privacy AGI Club registry 2.3.0-rc.1`.

Confirm these paths exist in the **repository root**, not inside a second folder:

```text
README.md
package.json
hardhat.config.ts
.github/workflows/bootstrap-lock.yml
.github/workflows/ci.yml
.env.example
.gitignore
```

If the browser omits dotfiles: **Add file → Create new file**, enter the exact path (for example `.github/workflows/ci.yml`), paste the corresponding delivered text and commit. Do the same for any omitted `.github/CODEOWNERS`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.gitattributes` and `.gitignore`.

**Never upload `.env`.** `.env.example` contains empty placeholders and is meant to be uploaded.

## 4. Use the committed dependency lock

The repository now includes a genuine npm-generated `package-lock.json`. Include it in source uploads and proceed to workflow 02. Do not run workflow 01 against an existing lock: it deliberately refuses to overwrite one.

Only for an older source extraction that has no lock: open **Actions → 01 — Generate dependency lock (manual) → Run workflow** on its branch.

The workflow only installs/builds in a runner and produces artifacts; it does not deploy, send mail or commit automatically. When completed, open the run and download **dependency-lock-candidate**.

Review `package-lock.json`, the audit report and any failed steps. Resolve high-severity advisories rather than suppressing the audit. Upload **only the reviewed package-lock.json** to the repository root in a new commit. Do not upload runner logs or secrets blindly.

If the workflow fails, inspect its actual error. An unavailable npm version, dependency conflict or vulnerability requires engineering correction—not a “passed” label. Generated dependency metadata is not a security review.

## 5. Inspect real CI evidence

Open **02 — Build and qualify (no deployment)**. It requires the committed lock and a successful clean installation. If a source upload omits the lock, restore it from the same reviewed revision; do not disable the gate.

Review every job and artifact. Green CI is evidence of those checks only, not an independent audit, proof of real wallet ownership, or production authorization.

For the browser jobs, the runner must have Chrome/Chromium and OpenSSL. The built-site smoke test and explicitly mocked privacy-UI rehearsal are separate scopes.

## 6. Repository hygiene

Set the default branch to `main`. Where your GitHub plan permits, require pull requests and passing checks before merging; disallow force pushes to the protected branch. Keep workflow permissions read-only. CODEOWNERS names `@MontrealAI`; ensure that account has the necessary repository rights.

Never put wallet seeds, root private keys, keystores, RPC keys, signed requests, customer emails or deployment approvals in repository files, issues, Actions logs or uploaded artifacts. The supplied workflows contain no blockchain signing secrets.

## 7. Source repository is not GitHub Pages

Publishing under `github.com/MontrealAI` is appropriate for source collaboration. It does **not** automatically host a functioning portal or deploy a smart contract.

This package intentionally has no automatic GitHub Pages deployment workflow. GitHub places restrictions on commercial/sensitive Pages use. Use an appropriate dedicated static HTTPS host for the live member service, after review; see `PRIVACY.md`. Only the built `dist/site` folder is public-site output.

## Official references

- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
