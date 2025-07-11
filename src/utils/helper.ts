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
 * @file helper.ts
 * @copyright SKALE Labs 2025-Present
 */

export function remove0xPrefixIfNeeded(str: string): string {
    return str.startsWith('0x') ? str.slice(2) : str;
}

export function validateUrl(url: string): void {
    try {
        new URL(url);
    } catch {
        throw new Error(`Invalid provider URL: ${url}`);
    }
}

export function validateHexString(str: string): void {
   if (!/^[0-9a-fA-F]*$/.test(str)) {
       throw new Error("Invalid input: Must contain only hexadecimal characters");
   }
   if (str.length % 2 !== 0) {
       throw new Error("Invalid input: Must have an even length");
   }
}