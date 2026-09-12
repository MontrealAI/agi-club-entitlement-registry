import assert from 'node:assert/strict';

// Accept only explicit RPC revert-data fields, never a message or transaction input.
export function revertData(error) {
  const fields = [error?.data, error?.info?.error?.data];
  const data = fields.flatMap(value => [value, value?.data, value?.result])
    .find(value => typeof value === 'string' && /^0x(?:[0-9a-fA-F]{2}){4,}$/.test(value));
  assert(data, 'missing Solidity revert data; transport errors are NOT acceptable rejection evidence');
  return data;
}
