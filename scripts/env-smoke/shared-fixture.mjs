import { bytesToHex, hexToBytes } from '../../dist/index.mjs';
import { COMMITTEE_INFO, SAMPLE_TX, INVALID_COMMITTEE_INFO } from './fixture-data.mjs';

export { bytesToHex, hexToBytes, COMMITTEE_INFO, SAMPLE_TX, INVALID_COMMITTEE_INFO };

export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

export async function expectRejects(promiseFactory, pattern, message) {
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

export async function runNegativeChecks(BITE) {
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
