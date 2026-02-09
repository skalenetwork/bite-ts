/**
 * @license
 * SKALE libte-ts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @file bite.ts
 * @copyright SKALE Labs 2025-Present
 */

import * as encrypt from './encrypt';
import * as biteRpc from './biteRpc';
import * as utils from '../utils/helper';

export class BITE {
    private readonly providerURL: string;

    constructor(providerURL: string) {
        this.providerURL = providerURL;
    }

    /**
     * Encrypt a hex-encoded message using BLS public key.
     * @param message - Hex string (with or without 0x).
     */
    async encryptMessage(message: string): Promise<string> {
        const committees = await biteRpc.getCommitteesInfo(this.providerURL);
        return encrypt.encryptMessage(message, committees);
    }

    /**
     * Encrypt a transaction object using BLS public key.
     * @param tx - The transaction to encrypt.
     */
    async encryptTransaction(tx: encrypt.Transaction): Promise<encrypt.Transaction> {
        const committees = await biteRpc.getCommitteesInfo(this.providerURL);
        return encrypt.encryptTransaction(tx, committees);
    }

    /**
     * Encrypt a hex-encoded message using BLS public key for CTX.
     * @param message - Hex string (with or without 0x).
     * @param scAddress - Smart Contract Address for AADTE.
     */
    async encryptMessageForCTX(message: string, scAddress: string): Promise<string> {
        const committees = await biteRpc.getCommitteesInfo(this.providerURL);
        return encrypt.encryptMessage(message, committees, scAddress);
    }

    /**
     * Encrypt a transaction object using BLS public key and provided committees info.
     * @param tx - The transaction to encrypt.
     * @param committees - The committees info object.
     */
    static async encryptTransactionWithCommitteeInfo(
        tx: encrypt.Transaction,
        committees: utils.CommitteeInfo[]
    ): Promise<encrypt.Transaction> {
        return encrypt.encryptTransaction(tx, committees);
    }

    /**
     * Fetch the committees info from the configured endpoint.
     */
    async getCommitteesInfo(): Promise<utils.CommitteeInfo[]> {
        return biteRpc.getCommitteesInfo(this.providerURL);
    }

    /**
     * Get decrypted transaction data using the configured endpoint.
     * @param transactionHash - The hash of the transaction.
     */
    async getDecryptedTransactionData(transactionHash: string): Promise<string> {
        return biteRpc.getDecryptedTransactionData(this.providerURL, transactionHash);
    }
}


export class BITEMockup {
    /**
     * Simulates encryption of a hex-encoded message
     *
     * @param message - Hex string (with or without 0x).
     */
    async encryptMessage(message: string): Promise<string> {
        return encrypt.encryptMessageMockup(message);
    }

    /**
     * Simulates encryption of a transaction object
     *
     * @param tx - The transaction to encrypt.
     */
    async encryptTransaction(tx: encrypt.Transaction): Promise<encrypt.Transaction> {
        return encrypt.encryptTransactionMockup(tx);
    }
}