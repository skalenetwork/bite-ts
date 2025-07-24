# bite.ts

## Description
`bite.ts` is a library for encrypting transaction data using BLS public keys. It provides functionality to securely encrypt data and append metadata such as epoch ID. The library supports both single and dual committee encryption scenarios:

- **Single Committee**: Normal operation where data is encrypted once with the current committee's BLS public key
- **Dual Committee**: During committee rotation periods, data is encrypted twice - once with each committee's BLS public key to ensure seamless decryption during transitions

## Installation
Install the library using npm:

```bash
npm i @skalenetwork/bite
```

## Usage
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

Encrypts a transaction object using the BLS public key(s) from the configured BITE provider.

- **Parameters**:
  - `tx`: An object containing `data` and `to` fields as a hex string.
- **Returns**: `Promise` – The encrypted transaction with a modified `data` and `to` fields.

**Encryption Behavior**:
- **Single Committee**: Encrypts once using the available BLS public key, format: `[[epochId, encryptedData]]`
- **Dual Committee** (during rotation): Encrypts twice using both BLS public keys, format: `[[epochId1, encryptedData1], [epochId2, encryptedData2]]`

---

### `bite.encryptMessage(message)`

Encrypts a raw hex-encoded message using the BLS public key from the configured BITE provider.

- **Parameters**:
  - `message`: `string` – A hex string to encrypt (with or without `0x` prefix).
- **Returns**: `Promise` – An encrypted hex string with RLP-encoded epoch and encryption data.

---

### `bite.getDecryptedTransactionData(transactionHash)`

Retrieves decrypted transaction data from the configured BITE provider.

- **Parameters**:
  - `transactionHash`: `string` – The transaction hash to decrypt.
- **Returns**: `Promise` – JSON object, with `data` and `to` keys holding the decrypted `data` and `to` fields used originally.

---

### `bite.getCommitteesInfo()`

Fetches the committees info (BLS public keys and epoch identifiers) from the configured BITE provider.

- **Returns**: `Promise<Array>` – An array of 1-2 JSON objects, each containing:
  - `commonBLSPublicKey`: A 256-character hex string representing the BLS public key
  - `epochId`: An integer number representing the epoch identifier

**Array Contents**:
- **1 element**: During normal operation (single active committee)
- **2 elements**: During committee rotation periods (current and next committees)

**Committee Rotation Behavior**:
When this method returns 2 elements, the encryption methods (`encryptTransaction` and `encryptMessage`) will automatically:
1. Encrypt the data twice - once with each committee's BLS public key
2. Create a dual-encrypted payload in format: `[[epochId1, encryptedData1], [epochId2, encryptedData2]]`
3. Ensure backward compatibility during the transition period

**Use Cases**:
- **Application monitoring**: Check if a rotation is in progress by examining array length
- **Manual key selection**: Access specific committee keys for custom encryption scenarios
- **Debugging**: Verify committee states and epoch transitions

## Run test

Run skaled using the script provided under `scripts/run_skaled.sh` or use the existing endpoint.

Run `node test.js $PROVIDER_URL $CHAIN_ID $INSECURE_ETH_PRIVATE_KEY` or change corresponding values in `test.js`.
