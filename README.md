# bite.ts

## Description
`bite.ts` is a TypeScript library for encrypting transaction data using the BITE (Blockchain Integrated Threshold Encryption) protocol. BITE is an extension of the SKALE provably secure consensus protocol that enables threshold encryption of transaction data.

The library provides functionality to:
- Encrypt transaction data using BLS threshold encryption public keys
- Handle both single and dual committee encryption scenarios during committee rotations
- Interact with BITE-enabled SKALE chains via JSON-RPC methods

### How BITE Works
Nodes participating in a SKALE consensus committee share a common threshold encryption (TE) public key and possess a set of TE private key shares. The committee size is typically `3t + 1`, where `t` is an integer. A user can encrypt plaintext using the TE public key. To decrypt the resulting ciphertext, a threshold decryption protocol must be executed by a supermajority of `2t + 1` nodes.

### Committee Rotation Support
During committee rotation periods, the library automatically handles dual encryption:
- **Single Committee**: Normal operation where data is encrypted once with the current committee's BLS public key
- **Dual Committee**: During rotation periods, data is encrypted with both current and next committee keys to ensure seamless transitions

## Installation
Install the library using npm:

```bash
npm i @skalenetwork/bite
```

## Usage

> ⚠️ **Warning**  
> When passing a transaction to `bite.ts`, it is necessary to set the gasLimit field manually.
This is because estimateGas does not return a proper value for encrypted transactions.
If gasLimit is omitted, `bite.ts` will automatically set it to **300000**.
For best results, always calculate and set a gas limit appropriate for your specific transaction.

Here is an example of how to use the library to encrypt transaction data:

```javascript
import { BITE } from '@skalenetwork/bite';

const providerUrl = 'https://example.com/jsonrpc'; // Replace with your provider URL
const transaction = {
  data: '0x1234567890abcdef'
};

(async () => {
  try {
    const bite = new BITE(providerUrl);

    // Encrypt transaction using the BLS public key
    const encryptedTx = await bite.encryptTransaction(transaction);
    console.log('Encrypted Transaction:', encryptedTx);

    // Optionally get the committees info
    const committeesInfo = await bite.getCommitteesInfo();
    console.log('Committees Info:', committeesInfo);
    console.log('Current BLS Public Key:', committeesInfo[0].commonBLSPublicKey);
    console.log('Current Epoch ID:', committeesInfo[0].epochId);
  } catch (error) {
    console.error('Encryption Error:', error);
  }
})();
```

## API Reference

---

### `new BITE(endpoint: string)`

Creates a new instance of the `BITE` class, configured to use a specific BITE JSON-RPC endpoint.

- **Parameters**:
  - `endpoint`: `string` – The BITE URL provider (JSON-RPC endpoint).

---

### `bite.encryptTransaction(tx)`

Encrypts a transaction object using the BLS threshold encryption public key(s) from the configured BITE provider. The encrypted transaction will have its `to` field set to the BITE magic address.

- **Parameters**:
  - `tx`: An object containing `data` and `to` fields as hex strings.
- **Returns**: `Promise<Transaction>` – The encrypted transaction with modified `data` and `to` fields.

**Encryption Process**:
1. RLP encodes the original `data` and `to` fields
2. Encrypts the encoded data using AES with a randomly generated key
3. Encrypts the AES key using BLS threshold encryption
4. Creates the final payload in RLP format: `[EPOCH_ID, ENCRYPTED_BITE_DATA]`

**Committee Behavior**:
- **Single Committee**: AES key is encrypted with the current BLS public key
- **Dual Committee** (during rotation): AES key is encrypted twice - first with the current committee's key, then with the next committee's key

---

### `BITE.encryptTransactionWithCommitteeInfo(tx, committees)`

Static method that encrypts a transaction object using the provided committee information, avoiding an internal RPC call to fetch committees.

- **Parameters**:
  - `tx`: An object containing `data` and `to` fields as hex strings.
  - `committees`: `Array` – An array of committee info objects (as returned by `getCommitteesInfo`).
- **Returns**: `Promise<Transaction>` – The encrypted transaction with modified `data` and `to` fields.

**Use Cases**:
- **Offline / Cached Encryption**: When committee information is already known or cached, preventing redundant RPC calls.

---

### `bite.encryptMessage(message)`

Encrypts a raw hex-encoded message using the BLS threshold encryption from the configured BITE provider.

- **Parameters**:
  - `message`: `string` – A hex string to encrypt (with or without `0x` prefix).
- **Returns**: `Promise<string>` – An encrypted hex string in RLP format with epoch and encryption data.

**Note**: This method encrypts raw data directly without transaction formatting.

---

### `bite.getDecryptedTransactionData(transactionHash)`

Retrieves decrypted transaction data from the configured BITE provider using the `bite_getDecryptedTransactionData` JSON-RPC method.

- **Parameters**:
  - `transactionHash`: `string` – The transaction hash to decrypt.
- **Returns**: `Promise<object>` – JSON object with `data` and `to` keys containing the original decrypted fields.

**Note**: This method only works for BITE transactions that have been processed and decrypted by the consensus. If the transaction doesn't exist or has no decrypted data, an error is thrown.

---

### `bite.getCommitteesInfo()`

Fetches committee information from the configured BITE provider using the `bite_getCommitteesInfo` JSON-RPC method.

- **Returns**: `Promise<Array>` – An array of 1-2 JSON objects, each containing:
  - `commonBLSPublicKey`: A 256-character hex string (128-byte BLS public key)
  - `epochId`: An integer representing the epoch identifier

**Array Contents**:
- **1 element**: During normal operation (single active committee)
- **2 elements**: During committee rotation periods (scheduled for next 3 minutes)

**Committee Rotation Timing**:
When committee rotation is scheduled for the next 3 minutes, this method returns information for both the current and next committees. The encryption methods will automatically use both keys during this transition period.

**Use Cases**:
- **Rotation monitoring**: Check if committee rotation is imminent by examining array length
- **Epoch tracking**: Monitor epoch transitions and committee changes
- **Key management**: Access current BLS public keys for manual encryption scenarios

**Note**: Nodes in catch-up state may return outdated information.

## Run test

Run skaled using the script provided under `scripts/run_skaled.sh` or use the existing endpoint.

Run `node test.js $PROVIDER_URL $CHAIN_ID $INSECURE_ETH_PRIVATE_KEY` or change corresponding values in `test.js`.
