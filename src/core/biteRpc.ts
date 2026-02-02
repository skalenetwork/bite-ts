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
 * @file biteRpc.ts
 * @copyright SKALE Labs 2025-Present
 */

import * as utils from '../utils/helper';
import {logger} from "../utils/logger";

interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params: unknown[];
    id: number;
}

interface JsonRpcSuccess<T> {
    jsonrpc: '2.0';
    result: T;
    id: number;
}

interface JsonRpcError<E> {
    jsonrpc: '2.0';
    error: {
        code: number;
        message: string;
        data?: E;
    };
    id: number;
}

type JsonRpcResponse<T = unknown, E = unknown> = JsonRpcSuccess<T> | JsonRpcError<E>;

/**
 * Fetch decrypted transaction data via JSON-RPC endpoint.
 *
 * @param endpoint - BITE URL provider.
 * @param transactionHash - The hash of the transaction to decrypt.
 * @returns The decrypted transaction data.
 */
export async function getDecryptedTransactionData(
    endpoint: string,
    transactionHash: string
): Promise<string> {
    try {
        utils.validateUrl(endpoint);

        const requestBody: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'bite_getDecryptedTransactionData',
            params: [transactionHash],
            id: 1,
        };

        const result = await sendRpcRequest<string>(endpoint, requestBody);

        return result;
    } catch (error) {
        logger.error('Error fetching decrypted transaction data:', error);
        throw error;
    }
}

/**
 * Requests the committees info via JSON-RPC.
 *
 * @param endpoint - BITE URL provider.
 * @returns An array of objects containing the BLS public key and epoch ID.
 * @throws If the response is invalid or the key format is incorrect.
 */
export async function getCommitteesInfo(endpoint: string): Promise<utils.CommitteeInfo[]> {
    try {
        const requestBody: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'bite_getCommitteesInfo',
            params: [],
            id: 1,
        };
        
        const result = await sendRpcRequest<utils.CommitteeInfo[]>(endpoint, requestBody);

        if (!Array.isArray(result)) {
            throw new Error('Result is not an array');
        }

        if (result.length === 0 || result.length > 2) {
            throw new Error(`Expected array of size 1 or 2, got ${result.length}`);
        }

        // Validate each element in the array
        for (const item of result) {
            if (typeof item !== 'object' || item === null) {
                throw new Error('Array element is not an object');
            }

            if (typeof item.commonBLSPublicKey !== 'string') {
                throw new Error('commonBLSPublicKey is not a string');
            }

            if (typeof item.epochId !== 'number') {
                throw new Error('epochId is not a number');
            }

            if (!/^[0-9a-fA-F]{256}$/.test(item.commonBLSPublicKey)) {
                throw new Error('commonBLSPublicKey is not a valid 256-character hexadecimal string');
            }
        }

        return result;
    } catch (error) {
        logger.error('Error fetching BITE common public key:', error);
        throw error;
    }
}

async function sendRpcRequest<ResponseType>(endpoint: string, requestBody: JsonRpcRequest): Promise<ResponseType> {
    try {
        utils.validateUrl(endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (response.status !== 200) {
            throw new Error(`Received status code: ${response.status}`);
        }

        const data = await response.json() as JsonRpcResponse<ResponseType>;

        if ('error' in data) {
            throw new Error(`Error from server: ${data.error.message}`);
        }

        return data.result;
    } catch (error) {
        logger.error('Error sending RPC request:', error);
        throw error;
    }
}
