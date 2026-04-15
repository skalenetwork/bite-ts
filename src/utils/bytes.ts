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
 * @file bytes.ts
 * @copyright SKALE Labs 2026-Present
 */

export function hexToBytes(hex: string): Uint8Array {
    const sanitizedHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(sanitizedHex.length / 2);

    for (let i = 0; i < sanitizedHex.length; i += 2) {
        bytes[i / 2] = parseInt(sanitizedHex.slice(i, i + 2), 16);
    }

    return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }

    return result;
}