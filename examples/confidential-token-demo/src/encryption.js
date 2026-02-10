import { ethers } from 'ethers';
import { BITE } from '@skalenetwork/bite';
import crypto from 'crypto';

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

    const bite = new BITE(rpcUrl);

    const tx = {
        to: tokenAddress,
        data: data
    };

    const encryptedTx = await bite.encryptTransaction(tx);
    
    return {
        data: encryptedTx.data,
        to: encryptedTx.to,
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

