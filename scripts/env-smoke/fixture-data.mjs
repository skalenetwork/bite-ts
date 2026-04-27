export const COMMITTEE_INFO = [
    {
        commonBLSPublicKey: '2d3846dc859e04cf130cd58a6b73f6f94def67adbec30df6dcfe0d6ab7d8a280173fff75e7afa1eaaf98b18282ae1a832475602f27480120adca88f6c3febc5b2b3a808057137751edbd32f3b6ec003fe120c53b133b0c25f2d050f123fb36ef2f2e6876d111b220ef84a86deb891c45571907e19366d405692f59e46f443d02',
        epochId: 777
    }
];

export const SAMPLE_TX = {
    to: '0x1234567890123456789012345678901234567890',
    data: '0x1234abcd'
};

export const INVALID_COMMITTEE_INFO = [
    {
        commonBLSPublicKey: 'not-a-valid-key',
        epochId: 777
    }
];
