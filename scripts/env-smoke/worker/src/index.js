import { BITE, bytesToHex, hexToBytes } from '@skalenetwork/bite';
import { decode } from '@ethereumjs/rlp';
import { COMMITTEE_INFO, SAMPLE_TX, INVALID_COMMITTEE_INFO } from '../../fixture-data.mjs';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function expectRejects(promiseFactory, pattern, message) {
    let failed = false;

    try {
        await promiseFactory();
    } catch (error) {
        failed = true;
        const text = String(error?.message ?? error);
        if (!pattern.test(text)) {
            throw new Error(`${message}. Unexpected error: ${text}`);
        }
    }

    if (!failed) {
        throw new Error(`${message}. Expected operation to throw.`);
    }
}

async function runNegativeChecks() {
    await expectRejects(
        () => BITE.encryptTransactionWithCommitteeInfo({ to: SAMPLE_TX.to, data: '0x123' }, COMMITTEE_INFO),
        /even length/i,
        'Invalid hex data must be rejected'
    );

    await expectRejects(
        () => BITE.encryptTransactionWithCommitteeInfo({ to: '0x1234', data: SAMPLE_TX.data }, COMMITTEE_INFO),
        /20 bytes|40 hex/i,
        'Invalid to length must be rejected'
    );

    await expectRejects(
        () => BITE.encryptTransactionWithCommitteeInfo(SAMPLE_TX, INVALID_COMMITTEE_INFO),
        /invalid|factory|module|wrong string size|failed to proceed data/i,
        'Malformed committee data must be rejected'
    );

    await expectRejects(
        () => BITE.encryptTransactionWithCommitteeInfo({}, COMMITTEE_INFO),
        /data|to|invalid input/i,
        'Missing transaction fields must be rejected'
    );
}

export default {
    async fetch() {
        try {
            const encryptedTx = await BITE.encryptTransactionWithCommitteeInfo(SAMPLE_TX, COMMITTEE_INFO);

            assert(encryptedTx.to.toLowerCase() === '0x42495445204d452049274d20454e435259505444', 'Encrypted tx target must be BITE precompile');
            assert(/^0x[0-9a-fA-F]+$/.test(encryptedTx.data), 'Encrypted tx data must be hex with 0x prefix');

            const decoded = decode(hexToBytes(encryptedTx.data));
            assert(Array.isArray(decoded), 'Encrypted tx data must be RLP list');
            assert(decoded.length === 2, 'Encrypted tx data must contain [epochId, encryptedData]');

            const [epochRaw, encryptedRaw] = decoded;
            const epochHex = bytesToHex(epochRaw);
            const epochId = epochHex === '' ? 0 : parseInt(epochHex, 16);

            assert(epochId === COMMITTEE_INFO[0].epochId, 'Epoch ID mismatch in encrypted payload');
            assert(encryptedRaw instanceof Uint8Array, 'Encrypted payload body must be bytes');
            assert(encryptedRaw.length > 0, 'Encrypted payload body must not be empty');

            await runNegativeChecks();

            return new Response(JSON.stringify({
                ok: true,
                result: 'PASS worker-smoke',
                encryptedPrefix: encryptedTx.data.slice(0, 30)
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                ok: false,
                result: 'FAIL worker-smoke',
                error: String(error)
            }), {
                status: 500,
                headers: { 'content-type': 'application/json' }
            });
        }
    }
};
