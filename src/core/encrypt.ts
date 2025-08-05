/**
 * @license
 * SKALE bite.ts
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
 * @file encrypt.ts
 * @copyright SKALE Labs 2025-Present
 */

import {
    encryptMessage as encryptRawMessage,
    encryptMessageMockup as encryptRawMessageMockup
} from '@skalenetwork/t-encrypt';
import {getCommonPublicKey} from './biteRpc';
import {logger} from "../utils/logger";
import * as utils from '../utils/helper';
import * as constants from '../utils/constants';


export interface Transaction {
    to: string;
    data: string;
    gasLimit?: string;
}

/**
 * Encrypts a transaction using the real BLS key.
 *
 * @param {Transaction} tx - The transaction object.
 * @param {string} endpoint - BITE URL provider.
 * @returns {Promise<Transaction>} - A promise with encrypted transaction.
 *
 */
export async function encryptTransaction(
    tx: Transaction,
    endpoint: string
): Promise<Transaction> {
    try {
        const validatedTx = validateAndExtractTransactionFields(tx);
        const txTo = validatedTx.to;
        let txData = validatedTx.data;

        // append 'to' field to end of data
        txData += txTo;

        tx.data = await encryptMessage(txData, endpoint);
        tx.to = constants.BITE_ADDRESS;

        // Set default gasLimit if not set
        if ( !tx.gasLimit ) {
            tx.gasLimit = constants.DEFAULT_GAS_LIMIT;
        }

        return tx;
    } catch (error) {
        logger.error('Error encrypting transaction:', error);
        throw error;
    }
}

/**
 * Encrypts a transaction using mock encryption.
 *
 * @param {Transaction} tx - The transaction object.
 * @returns {Promise<Transaction>} - A promise with encrypted transaction.
 *
 */
export async function encryptTransactionMockup(tx: Transaction): Promise<Transaction> {
    try {
        const validatedTx = validateAndExtractTransactionFields(tx);
        const txTo = validatedTx.to;
        let txData = validatedTx.data;

        // append 'to' field to end of data
        txData += txTo;

        tx.data = await encryptMessageMockup(txData);
        tx.to = constants.BITE_ADDRESS;

        // Set default gasLimit if not set
        if ( !tx.gasLimit ) {
            tx.gasLimit = constants.DEFAULT_GAS_LIMIT;
        }

        return tx;
    } catch (error) {
        logger.error('Error encrypting transaction (mockup):', error);
        throw error;
    }
}

/**
 * Encrypts a raw hex-encoded message using the real BLS key.
 *
 * @param {string} message - The message to encrypt, as a hex string (with or without 0x prefix).
 * @param {string} endpoint - BITE URL provider.
 * @returns {Promise<string>} - The encrypted message.
 */
export async function encryptMessage(
    message: string,
    endpoint: string
): Promise<string> {
    try {
        const data = utils.remove0xPrefixIfNeeded(message);
        utils.validateHexString(data);

        const BLS_PUBLIC_KEY = await getCommonPublicKey(endpoint);
        const encryptedRawMessage = await encryptRawMessage(data, BLS_PUBLIC_KEY);
        const epochIDHex = utils.intTo8BytesHex(0);

        return `0x${epochIDHex}${encryptedRawMessage}`;
    } catch (error) {
        logger.error('Error encrypting message:', error);
        throw error;
    }
}

/**
 * Encrypts a raw hex-encoded message using mock encryption.
 *
 * @param {string} message - The message to encrypt, as a hex string (with or without 0x prefix).
 * @returns {Promise<string>} - The encrypted message.
 */
export async function encryptMessageMockup(
    message: string
): Promise<string> {
    try {
        const data = utils.remove0xPrefixIfNeeded(message);

        if (!/^[0-9a-fA-F]*$/.test(data) || data.length % 2 !== 0) {
            throw new Error("Invalid input: message must be valid hex and even length");
        }

        const encryptedRawMessage = await encryptRawMessageMockup(data);
        const epochIDHex = utils.intTo8BytesHex(0);

        return `0x${epochIDHex}${encryptedRawMessage}`;
    } catch (error) {
        logger.error('Error encrypting message:', error);
        throw error;
    }
}



/**
 * Validates a transaction object for encryption and extracts the fields to be encrypted.
 * @param {object} tx -  The transaction object containing a 'data' and 'to' fields (hex string).
 * @returns {{ data: string, to: string}} An object with the 'data' and 'to' fields properly validated
 * and formatted as hexadecimal strings without the '0x' prefix.
 */
function validateAndExtractTransactionFields(tx: Transaction): Transaction {
    const isValid = tx && typeof tx === 'object' && 
        tx.data && tx.to && 
        typeof tx.data === 'string' && 
        typeof tx.to === 'string';
    
    if (!isValid) {
        throw new Error("Invalid input: Must be an object with 'data' and 'to' fields of type string");
    }

    const txData = utils.remove0xPrefixIfNeeded(tx.data);
    const txTo = utils.remove0xPrefixIfNeeded(tx.to);

    // Validate that the data and to fields contain only hex characters and are of even length
    utils.validateHexString(txData);
    utils.validateHexString(txTo);

    if (txTo.length !== 40) {
        throw new Error("Invalid input: 'to' field must be exactly 20 bytes (40 hex characters) long");
    }

    return { data: txData, to: txTo };
}