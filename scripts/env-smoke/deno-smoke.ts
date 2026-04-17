import { BITE } from '../../dist/index.mjs';
import { decode } from 'npm:@ethereumjs/rlp@10.0.0';

const COMMITTEE_INFO = [
    {
        commonBLSPublicKey: '2d3846dc859e04cf130cd58a6b73f6f94def67adbec30df6dcfe0d6ab7d8a280173fff75e7afa1eaaf98b18282ae1a832475602f27480120adca88f6c3febc5b2b3a808057137751edbd32f3b6ec003fe120c53b133b0c25f2d050f123fb36ef2f2e6876d111b220ef84a86deb891c45571907e19366d405692f59e46f443d02',
        epochId: 777
    }
];

const SAMPLE_TX = {
    to: '0x1234567890123456789012345678901234567890',
    data: '0x1234abcd'
};

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(clean.length / 2);

    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }

    return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

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

console.log('PASS deno-smoke');
