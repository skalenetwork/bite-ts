import { BITE } from '../../dist/index.mjs';
import { decode } from 'npm:@ethereumjs/rlp@10.0.0';
import { COMMITTEE_INFO, SAMPLE_TX, assert, bytesToHex, hexToBytes, runNegativeChecks } from './shared-fixture.mjs';

const encryptedTx = await BITE.encryptTransactionWithCommitteeInfo(SAMPLE_TX, COMMITTEE_INFO);

assert(encryptedTx.to.toLowerCase() === '0x42495445204d452049274d20454e435259505444', 'Encrypted tx target must be BITE precompile');
assert(/^0x[0-9a-fA-F]+$/.test(encryptedTx.data), 'Encrypted tx data must be hex with 0x prefix');

const decoded = decode(hexToBytes(encryptedTx.data));
assert(Array.isArray(decoded), 'Encrypted tx data must be RLP list');
assert(decoded.length === 2, 'Encrypted tx data must contain [epochId, encryptedData]');

const [epochRaw, encryptedRaw] = decoded as Uint8Array[];
const epochHex = bytesToHex(epochRaw);
const epochId = epochHex === '' ? 0 : parseInt(epochHex, 16);

assert(epochId === COMMITTEE_INFO[0].epochId, 'Epoch ID mismatch in encrypted payload');
assert(encryptedRaw instanceof Uint8Array, 'Encrypted payload body must be bytes');
assert(encryptedRaw.length > 0, 'Encrypted payload body must not be empty');

await runNegativeChecks(BITE);

console.log('PASS deno-smoke');
