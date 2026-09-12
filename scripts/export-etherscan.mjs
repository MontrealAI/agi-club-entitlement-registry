/** Export public, exact compiler input for Etherscan's Standard JSON verifier. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import solc from 'solc';
import {ethers} from 'ethers';
import {sourceDigest, sha256} from './source-digest.mjs';
import {PROD} from './runtime.mjs';

const productionSource = 'project/contracts/AGIClubEntitlementRegistryMainnet.sol';
const allowedSources = [productionSource, 'project/contracts/AGIClubEntitlementRegistry.sol', 'project/vendor/openzeppelin/utils/Context.sol', 'project/vendor/openzeppelin/utils/Pausable.sol'];
export function verificationPackage({artifact, buildInfo, compilerReport, sourceSha256, readSource, compiler = solc}) {
  assert.equal(compilerReport.status, 'PASS', 'Production compilation must pass first');
  assert.equal(compilerReport.sourceSha256, sourceSha256, 'Compiler evidence is stale');
  assert.equal(compilerReport.productionContract, PROD);
  assert.equal(compilerReport.profile, 'production');
  assert.equal(artifact.contractName, 'AGIClubEntitlementRegistryMainnet');
  assert.equal(artifact.inputSourceName, productionSource);
  assert.equal(artifact.buildInfoId, buildInfo.id, 'Use the artifact’s exact build input');
  assert.equal(buildInfo.solcVersion, '0.8.37');
  assert.equal(compiler.version().split('.Emscripten')[0], buildInfo.solcLongVersion);
  const input = buildInfo.input;
  assert.equal(input.language, 'Solidity');
  assert.equal(input.settings.viaIR, true);
  assert.equal(input.settings.evmVersion, 'shanghai');
  assert.deepEqual(input.settings.optimizer, {enabled: true, runs: 200});
  assert.deepEqual(Object.keys(input.sources).sort(), [...allowedSources].sort(), 'Only reviewed public contract sources may be exported');
  for (const [name, value] of Object.entries(input.sources)) {
    assert.deepEqual(Object.keys(value), ['content'], 'Compiler sources must be embedded content');
    assert.equal(value.content, readSource(name.slice('project/'.length)), 'Stale source input: ' + name);
  }
  assert.equal(ethers.keccak256(artifact.bytecode), compilerReport.creationCodeHash);
  assert.equal((artifact.abi.find(x => x.type === 'constructor')?.inputs || []).length, 0);
  assert.deepEqual(artifact.linkReferences, {});
  const inputText = JSON.stringify(input, null, 2) + '\n';
  // Recompile the bytes we will export; never claim verification from settings alone.
  const output = JSON.parse(compiler.compile(inputText));
  assert(!(output.errors || []).some(x => x.severity === 'error'), 'Exported compiler input failed to compile');
  const compiled = output.contracts?.[productionSource]?.AGIClubEntitlementRegistryMainnet;
  assert(compiled, 'Production contract missing from recompiled input');
  assert.equal('0x' + compiled.evm.bytecode.object, artifact.bytecode, 'Exported input does not reproduce creation bytecode');
  assert.equal('0x' + compiled.evm.deployedBytecode.object, artifact.deployedBytecode, 'Exported input does not reproduce runtime template');
  assert.deepEqual(compiled.abi, artifact.abi);
  return {
    inputText, abiText: JSON.stringify(artifact.abi, null, 2) + '\n',
    manifest: {
      schema: 'AGIClubEtherscanVerification/1', sourceSha256, chainId: 1,
      contract: productionSource + ':AGIClubEntitlementRegistryMainnet', compilerVersion: 'v' + buildInfo.solcLongVersion,
      verificationMethod: 'Solidity (Standard-Json-Input)', license: 'MIT', constructorArguments: '', libraries: {},
      optimizer: {enabled: true, runs: 200}, viaIR: true, evmVersion: 'shanghai',
      creationCodeHash: compilerReport.creationCodeHash, standardInputSha256: sha256(inputText),
      mainnetAuthorization: false, etherscanVerified: false,
      note: 'Public compiler material only. Recompilation passed locally. Upload to the actual approved contract address on Etherscan; independently inspect the exact finalized creation transaction, runtime and ENS authority.',
    },
  };
}

export function exportEtherscan(root = fileURLToPath(new URL('..', import.meta.url))) {
  const outputDir = path.join(root, 'dist/etherscan'), reportFile = path.join(root, 'qualification/etherscan-export.json');
  const report = {status: 'RUNNING', sourceSha256: sourceDigest(root).sourceSha256, mainnetAuthorization: false, etherscanVerified: false};
  fs.mkdirSync(path.dirname(reportFile), {recursive: true});
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  // This directory contains generated public compiler exports only. A failed
  // attempt must not leave an older upload package looking current.
  fs.rmSync(outputDir, {recursive: true, force: true});
  try {
    const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const artifact = read('artifacts/contracts/AGIClubEntitlementRegistryMainnet.sol/AGIClubEntitlementRegistryMainnet.json');
    assert(/^[a-zA-Z0-9_-]+$/.test(artifact.buildInfoId), 'Invalid build input identifier');
    const bundle = verificationPackage({artifact, buildInfo: read('artifacts/build-info/' + artifact.buildInfoId + '.json'), compilerReport: read('qualification/compiler-status.json'), sourceSha256: report.sourceSha256, readSource: file => fs.readFileSync(path.join(root, file), 'utf8')});
    assert.equal(sourceDigest(root).sourceSha256, report.sourceSha256, 'Source changed during export');
    fs.mkdirSync(outputDir, {recursive: true});
    const files = {
      'standard-input.json': bundle.inputText,
      'contract-abi.json': bundle.abiText,
      'VERIFICATION.json': JSON.stringify(bundle.manifest, null, 2) + '\n',
      'README.txt': 'AGI CLUB — Public Etherscan verification package\n\nChoose Solidity (Standard-Json-Input) in Verify & Publish at the actual approved deployment address. Upload standard-input.json. Read the exact compiler version and contract path in VERIFICATION.json. Leave constructor arguments and library addresses empty. Do not flatten, rename source paths or change settings.\n\nChoisissez Solidity (Standard-Json-Input) dans Verify & Publish à l’adresse du déploiement approuvé. Téléversez standard-input.json. La version exacte du compilateur et le chemin du contrat figurent dans VERIFICATION.json. Laissez les arguments du constructeur et les adresses de bibliothèques vides. Ne modifiez ni les chemins ni les réglages.\n\nThis package does not deploy, publish, audit or authorize anything. / Ce dossier ne déploie, ne publie, n’audite et n’autorise rien.\n',
    };
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(outputDir, name), content);
    report.status = 'PASS'; report.files = Object.entries(files).map(([name, content]) => ({name, sha256: sha256(content)}));
    report.creationCodeHash = bundle.manifest.creationCodeHash;
  } catch (error) {
    fs.rmSync(outputDir, {recursive: true, force: true});
    report.status = 'FAIL_OR_BLOCKED'; report.error = error.message;
  }
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = exportEtherscan(); console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
