import { ethers } from 'ethers';
import {
    encryptMessage as encryptRawMessage,
    encryptMessageDualKey as encryptRawMessageDualKey
} from '@skalenetwork/t-encrypt';
import { encode } from '@ethereumjs/rlp';
import crypto from 'crypto';

const BITE_ADDRESS = '0x42495445204D452049274d20454e435259505444';

function remove0xPrefixIfNeeded(str) {
    if (typeof str !== 'string') return str;
    return str.startsWith('0x') ? str.slice(2) : str;
}

function validateHexString(str) {
   if (!/^[0-9a-fA-F]*$/.test(str)) {
       throw new Error("Invalid input: Must contain only hexadecimal characters");
   }
   if (str.length % 2 !== 0) {
       throw new Error("Invalid input: Must have an even length");
   }
}

async function getCommitteesInfo(rpcUrl) {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'bite_getCommitteesInfo',
            params: [],
            id: 1
        })
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }
    
    const result = data.result;

    if (!Array.isArray(result)) {
        throw new Error('Result is not an array');
    }
    return result;
}

async function encryptMessage(message, rpcUrl) {
    const data = remove0xPrefixIfNeeded(message);
    validateHexString(data);

    const publicKeyResponses = await getCommitteesInfo(rpcUrl);

    if (publicKeyResponses.length === 1) {
        const publicKeyResponse = publicKeyResponses[0];
        const encryptedRawMessage = await encryptRawMessage(data, publicKeyResponse.commonBLSPublicKey);
        
        const rlpEncodedResult = encode([publicKeyResponse.epochId, Buffer.from(encryptedRawMessage, 'hex')]);
        return `0x${Buffer.from(rlpEncodedResult).toString('hex')}`;
    } else {
        const encryptedRawMessage = await encryptRawMessageDualKey(data, publicKeyResponses[0].commonBLSPublicKey, publicKeyResponses[1].commonBLSPublicKey);
        
        const rlpEncodedResult = encode([publicKeyResponses[0].epochId, Buffer.from(encryptedRawMessage, 'hex')]);
        return `0x${Buffer.from(rlpEncodedResult).toString('hex')}`;
    }
}

export async function encryptTokenTransfer(rpcUrl, provider, tokenAddress, recipient, amount) {
    if (!rpcUrl || !provider || !tokenAddress || !recipient || !amount) {
        throw new Error("Missing parameters for encryption");
    }

    const result = await provider.request({ method: 'eth_chainId' });
    const chainID = parseInt(result, 16);

    // Generate ERC-20 Calldata
    const erc20Abi = [
        "function transfer(address to, uint256 value) public returns (bool)"
    ];
    const iface = new ethers.Interface(erc20Abi);
    
    // Encode the function call: transfer(recipient, amount)
    const data = iface.encodeFunctionData("transfer", [recipient, amount]);

    const txTo = remove0xPrefixIfNeeded(tokenAddress);
    const txData = remove0xPrefixIfNeeded(data);
    
    // RLP encode data and to fields
    const toBuffer = Buffer.from(txTo, 'hex');
    const dataBuffer = Buffer.from(txData, 'hex');
    const rlpEncodedData = Buffer.from(encode([dataBuffer, toBuffer])).toString('hex');

    const encryptedData = await encryptMessage(rlpEncodedData, rpcUrl);
    
    return {
        data: encryptedData,
        to: BITE_ADDRESS,
    };
}

export function decryptBalance(secretKey, encryptedDataHex) {
    // Remove 0x prefix if present
    const cleanSecretKey = secretKey.startsWith('0x') ? secretKey.slice(2) : secretKey;
    const cleanEncryptedData = encryptedDataHex.startsWith('0x') ? encryptedDataHex.slice(2) : encryptedDataHex;

    const encryptedDataBuffer = Buffer.from(cleanEncryptedData, 'hex');

    // Extract parts
    const iv = encryptedDataBuffer.subarray(0, 16);
    const ephemeralPublicKey = encryptedDataBuffer.subarray(16, 16 + 33);
    const ciphertext = encryptedDataBuffer.subarray(16 + 33);

    // Derive Shared Secret
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(cleanSecretKey, 'hex'));
    
    // computeSecret requires the other party's public key
    const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);

    // Derive Encryption Key: SHA-256(shared_secret)
    const hash = crypto.createHash('sha256');
    hash.update(sharedSecret);
    const encryptionKey = hash.digest();

    // Decrypt: AES-256-CBC with PKCS7 unpadding (default for createDecipheriv)
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // If the plaintext was stored as a *textual* hex string (e.g. "0x..."), UTF-8 decoding is correct.
    // If it was stored as raw bytes, represent it as hex instead.
    let decryptedString = decrypted.toString('utf8');

    const maybeHex = decryptedString.startsWith('0x') ? decryptedString.slice(2) : decryptedString;
    const looksLikeHex = /^[0-9a-fA-F]*$/.test(maybeHex) && maybeHex.length % 2 === 0;

    if (!looksLikeHex) {
        decryptedString = `0x${decrypted.toString('hex')}`;
    }

    // Convert hex string to decimal if applicable
    if (decryptedString.startsWith('0x')) {
        return BigInt(decryptedString).toString();
    }

    return decryptedString;
}

