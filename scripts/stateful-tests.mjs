/** Seeded model-based tests on a real, in-process EVM with fictitious ENS state. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {network, artifacts} from 'hardhat';
import {ethers} from 'ethers';
import {sourceDigest} from './source-digest.mjs';
import {revertData} from '../test/revert-data.mjs';

const seeds = [0xa61c1b, 0x12345678, 0x5eedcafe, 0xdeadbeef];
const randomSteps = 128;
const report = {
  status: 'RUNNING', at: new Date().toISOString(), sourceSha256: sourceDigest().sourceSha256,
  scope: 'LOCAL HARDHAT / MOCK ENS. Bounded simulations, not mainnet-fork, real-wallet or audit evidence.',
  mainnetAuthorization: false, seeds: [], coverage: {},
};
fs.mkdirSync('qualification', {recursive: true});
// Invalidate the previous report before constructing network fixtures. A PASS
// file alone is not qualification: the enclosing command must also exit zero.
const save = () => fs.writeFileSync('qualification/stateful-tests.json', JSON.stringify(report, null, 2) + '\n');
save();
let connection, provider;
try {
  connection = await network.create();
  assert.equal(connection.networkName, 'hardhat', 'Simulations require the in-process hardhat network');
  const rpc = connection.provider;
  provider = new ethers.BrowserProvider(rpc, undefined, {cacheTimeout: -1});
  provider.pollingInterval = 10;
  assert.equal((await provider.getNetwork()).chainId, 31337n, 'Never run these fixtures on Ethereum mainnet');
  const addresses = await Promise.all(Array.from({length: 7}, async (_, i) => (await provider.getSigner(i)).getAddress()));
  const deployer = await provider.getSigner(0);
  const zero = ethers.ZeroAddress, root = ethers.namehash('club.agi.eth');
  const labels = Array.from({length: 8}, (_, i) => 'simulation-' + i);
  const nodes = labels.map(label => ethers.namehash(label + '.club.agi.eth'));
  const category = ethers.id('FICTITIOUS_SIMULATION'), reason = ethers.id('FICTITIOUS_TEST_REASON');
  const ids = [0, 1, 2].map(i => ethers.id('SIMULATION_ENTITLEMENT_' + i));
  async function deploy(name, args = []) {
    const a = await artifacts.readArtifact(name);
    const c = await new ethers.ContractFactory(a.abi, a.bytecode, deployer).deploy(...args);
    await c.waitForDeployment();
    return c;
  }
  async function fixture(promise) { assert.equal((await (await promise).wait()).status, 1); }

  for (const seed of seeds) {
    let rng = seed >>> 0;
    const pick = n => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return (rng >>> 0) % n; };
    const result = {seed: '0x' + seed.toString(16), status: 'RUNNING', steps: 0, accepted: 0, rejected: 0, environmentChanges: 0, invariantChecks: 0};
    report.seeds.push(result);
    const ens = await deploy('QualificationENS'), wrapper = await deploy('QualificationWrapper');
    const wrapperAddress = await wrapper.getAddress();
    await fixture(ens.setOwner(root, addresses[1]));
    const c = await deploy('AGIClubEntitlementRegistry', [await ens.getAddress(), [wrapperAddress]]);
    // This model is updated only by successful commands. Counters are derived from
    // its records, never copied from contract output or contract claimability().
    const model = {
      admin: 1, wrappedRoot: false, expiredRoot: false, ensDown: false, wrapperMode: 0, paused: false,
      members: labels.map((_, i) => ({owner: 3 + i % 4, wrapped: i % 2 === 1})),
      entitlements: ids.map(() => ({capacity: 3, state: 2, records: new Map(), order: []})),
    };
    for (let i = 0; i < labels.length; i++) {
      const m = model.members[i];
      await fixture(ens.setOwner(nodes[i], m.wrapped ? wrapperAddress : addresses[m.owner]));
      await fixture(wrapper.setData(nodes[i], addresses[m.owner], 0));
    }
    for (const id of ids) await fixture(c.connect(await provider.getSigner(1)).createEntitlement(id, category, 3, 0, 0, 2, ethers.ZeroHash));
    const authority = () => model.ensDown || (model.wrappedRoot && (model.expiredRoot || model.wrapperMode)) ? zero : addresses[model.admin];
    const owner = i => model.ensDown || (model.members[i].wrapped && model.wrapperMode) ? zero : addresses[model.members[i].owner];
    const active = e => [...e.records.values()].filter(r => r.status === 1).length;
    const full = e => e.capacity !== 0 && active(e) >= e.capacity;
    const blankRecord = () => ({claimant: zero, first: 0, last: 0, revoked: 0, revision: 0, status: 0});

    async function invariants() {
      assert.equal(await c.admin(), authority(), 'ENS authority');
      assert.equal(await c.isAdmin(addresses[0]), false, 'Disposable deployer must never gain a role');
      assert.equal(await c.paused(), model.paused);
      assert.deepEqual([...await c.entitlementIdsPage(0, 100)], ids, 'Stable entitlement index');
      for (let j = 0; j < ids.length; j++) {
        const e = model.entitlements[j], id = ids[j], count = active(e);
        assert(e.capacity === 0 || count <= e.capacity, 'Model capacity invariant');
        assert.deepEqual([...await c.entitlement(id)], [category, ethers.ZeroHash, BigInt(e.capacity), BigInt(count), BigInt(e.records.size), 0n, 0n, BigInt(e.state), true]);
        assert.equal(await c.claimNodeCount(id), BigInt(e.records.size));
        assert.deepEqual([...await c.claimNodesPage(id, 0, 100)], e.order.map(i => nodes[i]), 'One indexed record per membership; order survives corrections');
        assert.deepEqual([...await c.remainingCapacity(id)], [e.capacity !== 0, BigInt(e.capacity ? e.capacity - count : 0)]);
        for (let i = 0; i < labels.length; i++) {
          const r = e.records.get(i) || blankRecord();
          assert.deepEqual([...await c.claimRecord(id, nodes[i])], [r.claimant, BigInt(r.first), BigInt(r.last), BigInt(r.revoked), BigInt(r.revision), BigInt(r.status)], 'Claim history ' + j + '/' + i);
          assert.equal(await c.claimantOf(id, nodes[i]), r.status === 1 ? r.claimant : zero);
        }
      }
      for (let i = 0; i < labels.length; i++) assert.equal((await c.membershipInfo(labels[i]))[1], owner(i));
      assert.equal(await provider.getBalance(await c.getAddress()), 0n);
      result.invariantChecks++;
    }

    // Supplying gas skips estimation: even rejected commands execute in a mined
    // EVM transaction. A transport error is never accepted as a Solidity revert.
    async function transact(method, args, actor, expected) {
      const before = Number(BigInt(await rpc.request({method: 'eth_blockNumber', params: []})));
      let caught, hash;
      try {
        hash = await rpc.request({method: 'eth_sendTransaction', params: [{from: addresses[actor], to: await c.getAddress(), data: c.interface.encodeFunctionData(method, args), gas: '0x1e8480'}]});
      } catch (error) { caught = error; }
      const after = Number(BigInt(await rpc.request({method: 'eth_blockNumber', params: []})));
      assert.equal(after, before + 1, 'Command must execute in exactly one local block');
      if (expected) {
        assert(caught, 'Expected ' + expected[0] + ', but transaction succeeded');
        const decoded = c.interface.parseError(revertData(caught));
        assert.equal(decoded?.name, expected[0]);
        if (expected[1]) assert.deepEqual([...decoded.args], expected[1]);
        result.rejected++;
      } else {
        if (caught) throw caught;
        assert.equal((await provider.getTransactionReceipt(hash)).status, 1);
        result.accepted++;
      }
      const key = method + (expected ? ':revert:' + expected[0] : ':success');
      report.coverage[key] = (report.coverage[key] || 0) + 1;
      return (await provider.getBlock(after)).timestamp;
    }

    async function step(command) {
      report.current = {seed: result.seed, step: result.steps, command};
      const {op, item = 0, member = 0, value = 0, actor = model.admin} = command;
      const e = model.entitlements[item], r = e.records.get(member), id = ids[item], label = labels[member];
      const recordArgs = [id, nodes[member]];
      let method, args, expected, claimant, apply = () => {};
      if (op === 'root') {
        await fixture(wrapper.setDataFull(root, addresses[value], command.expired ? 65536 : 0, command.expired ? 1 : 0));
        await fixture(ens.setOwner(root, command.wrapped ? wrapperAddress : addresses[value]));
        Object.assign(model, {admin: value, wrappedRoot: !!command.wrapped, expiredRoot: !!command.expired});
      } else if (op === 'fault') {
        await fixture(ens.setUnavailable(!!command.down));
        await fixture(wrapper.setResponseMode(value));
        Object.assign(model, {ensDown: !!command.down, wrapperMode: value});
      } else if (op === 'transfer') {
        const m = model.members[member];
        await fixture(m.wrapped ? wrapper.setData(nodes[member], addresses[value], 0) : ens.setOwner(nodes[member], addresses[value]));
        m.owner = value;
      } else {
        if (op === 'claim') {
          method = 'claim'; args = [id, label]; claimant = addresses[actor];
          let code = ({1: 4, 3: 5, 4: 6})[e.state];
          if (!code && r) code = r.status === 1 ? 9 : 10;
          if (!code && owner(member) === zero) code = 11;
          if (!code && owner(member) !== claimant) code = 12;
          if (!code && full(e)) code = 14;
          expected = model.paused ? ['EnforcedPause'] : code ? ['ClaimRejected', [BigInt(code)]] : undefined;
        } else if (op === 'grant' || op === 'override') {
          method = op === 'grant' ? 'adminGrantClaimToCurrentOwner' : 'adminGrantClaimOverride';
          claimant = op === 'grant' ? owner(member) : addresses[value];
          args = op === 'grant' ? [id, label] : [id, label, claimant, reason];
          if (claimant === zero) expected = ['MembershipNotFound', [nodes[member]]];
          else if (r) expected = ['ClaimRecordAlreadyExists', recordArgs];
          else if (full(e)) expected = ['CapacityFull', [id]];
        } else if (['revoke', 'reinstate', 'reassign'].includes(op)) {
          method = {revoke: 'revokeClaim', reinstate: 'reinstateClaim', reassign: 'reassignRevokedClaim'}[op];
          args = op === 'revoke' ? [id, label, reason] : op === 'reassign' ? [id, label, addresses[value]] : [id, label];
          if (!r) expected = ['ClaimRecordDoesNotExist', recordArgs];
          else if (r.status !== (op === 'revoke' ? 1 : 2)) expected = [op === 'revoke' ? 'ClaimNotActive' : 'ClaimNotRevoked', recordArgs];
          else if (op !== 'revoke' && full(e)) expected = ['CapacityFull', [id]];
          apply = time => {
            r.status = op === 'revoke' ? 2 : 1; r.revision++;
            if (op === 'revoke') r.revoked = time;
            else { r.revoked = 0; r.last = time; if (op === 'reassign') r.claimant = addresses[value]; }
          };
        } else if (op === 'capacity') {
          method = 'setCapacity'; args = [id, value];
          if (value && value < active(e)) expected = ['CapacityBelowActiveClaims', [BigInt(value), BigInt(active(e))]];
          apply = () => { e.capacity = value; };
        } else if (op === 'state') {
          method = 'setEntitlementState'; args = [id, value]; apply = () => { e.state = value; };
        } else if (op === 'pause') {
          method = value ? 'pause' : 'unpause'; args = [];
          if (model.paused === !!value) expected = [value ? 'EnforcedPause' : 'ExpectedPause'];
          apply = () => { model.paused = !!value; };
        } else if (op === 'batchGrantRollback') {
          // First member is fresh; the second is the same node. Both writes must revert.
          assert(!r && !full(e) && owner(member) !== zero);
          method = 'adminGrantBatchToCurrentOwners'; args = [id, [label, label]];
          expected = ['ClaimRecordAlreadyExists', recordArgs];
        } else if (op === 'batchRevokeRollback') {
          // First revoke would succeed; the second hits the now-revoked record.
          assert.equal(r?.status, 1);
          method = 'revokeBatch'; args = [id, [label, label], reason];
          expected = ['ClaimNotActive', recordArgs];
        } else assert.fail('Unknown simulation command: ' + op);
        if (['claim', 'grant', 'override'].includes(op)) apply = time => {
          assert(!e.records.has(member));
          e.records.set(member, {claimant, first: time, last: time, revoked: 0, revision: 1, status: 1});
          e.order.push(member);
        };
        if (op !== 'claim') {
          if (authority() === zero) expected = ['AdminUnavailable'];
          else if (addresses[actor] !== authority()) expected = ['NotClubAdmin', [addresses[actor], authority()]];
        }
        const time = await transact(method, args, actor, expected);
        if (!expected) apply(time);
      }
      if (['root', 'fault', 'transfer'].includes(op)) result.environmentChanges++;
      await invariants(); // Includes full rollback checks after rejected transactions.
      result.steps++;
    }

    // A fixed adversarial prefix ensures the random walk cannot miss essential
    // successful transitions, last-seat competition or partial-batch rollback.
    const prefix = [
      {op: 'capacity', value: 1}, {op: 'claim', actor: 3},
      {op: 'claim', member: 1, actor: 4}, {op: 'revoke'},
      {op: 'claim', member: 1, actor: 4}, {op: 'reinstate'},
      {op: 'revoke', member: 1}, {op: 'reassign', value: 5},
      {op: 'transfer', value: 6}, {op: 'claim', actor: 6},
      {op: 'revoke'}, {op: 'reinstate'}, {op: 'capacity', value: 0},
      {op: 'pause', value: 1}, {op: 'claim', member: 2, actor: 5},
      {op: 'override', member: 2, value: 6}, {op: 'grant', member: 3},
      {op: 'batchGrantRollback', member: 4}, {op: 'batchRevokeRollback', member: 3},
      {op: 'pause', value: 0}, {op: 'state', value: 4},
      {op: 'root', value: 2, wrapped: true}, {op: 'capacity', value: 5, actor: 1},
      {op: 'capacity', value: 5, actor: 0}, {op: 'capacity', value: 5},
      {op: 'fault', value: 2}, {op: 'pause', value: 1},
      {op: 'fault', value: 0}, {op: 'root', value: 1, wrapped: true, expired: true},
      {op: 'pause', value: 1}, {op: 'root', value: 1},
    ];
    await invariants();
    for (const command of prefix) await step(command);
    const ops = ['claim', 'grant', 'override', 'revoke', 'reinstate', 'reassign', 'capacity', 'state', 'pause', 'root', 'fault', 'transfer'];
    for (let i = 0; i < randomSteps; i++) {
      const op = ops[pick(ops.length)], member = pick(labels.length), item = pick(ids.length);
      const correctActor = op === 'claim' ? model.members[member].owner : model.admin;
      const actor = pick(4) ? correctActor : pick(addresses.length);
      const value = op === 'capacity' ? pick(9) : op === 'state' ? 1 + pick(4) : op === 'pause' ? pick(2)
        : op === 'root' ? 1 + pick(2) : op === 'fault' ? (pick(4) ? 0 : 1 + pick(3)) : 3 + pick(4);
      await step({op, member, item, actor, value, wrapped: !!pick(2), expired: pick(5) === 0, down: pick(5) === 0});
    }
    result.status = 'PASS'; save();
    console.log('Stateful seed', result.seed, 'PASS:', result.steps, 'steps,', result.accepted, 'accepted,', result.rejected, 'reverted transactions');
  }
  for (const method of ['claim', 'adminGrantClaimToCurrentOwner', 'adminGrantClaimOverride', 'revokeClaim', 'reinstateClaim', 'reassignRevokedClaim', 'setCapacity', 'setEntitlementState', 'pause', 'unpause']) {
    assert(report.coverage[method + ':success'] > 0, 'Missing successful transition: ' + method);
  }
  assert(report.coverage['adminGrantBatchToCurrentOwners:revert:ClaimRecordAlreadyExists'] >= seeds.length);
  assert(report.coverage['revokeBatch:revert:ClaimNotActive'] >= seeds.length);
  assert.equal(sourceDigest().sourceSha256, report.sourceSha256, 'Source changed during simulations');
  report.status = 'PASS'; delete report.current;
} catch (error) {
  report.status = 'FAIL_OR_BLOCKED';
  report.error = error.message;
  const current = report.seeds.at(-1); if (current?.status === 'RUNNING') current.status = 'FAIL';
  process.exitCode = 1;
} finally {
  report.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify(report, null, 2));
  provider?.destroy();
  if (connection) await connection.close();
}
