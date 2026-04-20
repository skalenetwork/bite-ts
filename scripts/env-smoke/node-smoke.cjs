const { BITE, bytesToHex, hexToBytes } = require('../../dist/index.js');
const { decode } = require('@ethereumjs/rlp');

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

const INVALID_COMMITTEE_INFO = [
    {
        commonBLSPublicKey: 'not-a-valid-key',
        epochId: 777
    }
];

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
        const text = String(error && error.message ? error.message : error);
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

async function main() {
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

    console.log('PASS node-smoke-cjs');
    console.log(`Encrypted length: ${encryptedTx.data.length - 2} hex chars`);
}

main().catch((error) => {
    console.error('FAIL node-smoke-cjs');
    console.error(error);
    process.exit(1);
});
