# bite.ts

## Description
`bite.ts` is a library for encrypting transaction data using BLS public keys. It provides functionality to securely encrypt data and append metadata such as a magic number and epoch ID.

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

    // Optionally get the BLS public key
    const publicKey = await bite.getCommonPublicKey();
    console.log('BLS Public Key:', publicKey);
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

Encrypts a transaction object using the BLS public key from the configured BITE provider.

- **Parameters**:
  - `tx`: An object containing `data` and `to` fields as a hex string.
- **Returns**: `Promise` – The encrypted transaction with a modified `data` and `to` fields.

---

### `bite.encryptMessage(message)`

Encrypts a raw hex-encoded message using the BLS public key from the configured BITE provider.

- **Parameters**:
  - `message`: `string` – A hex string to encrypt (with or without `0x` prefix).
- **Returns**: `Promise` – An encrypted hex string prefixed with an epoch ID.

---

### `bite.getDecryptedTransactionData(transactionHash)`

Retrieves decrypted transaction data from the configured BITE provider.

- **Parameters**:
  - `transactionHash`: `string` – The transaction hash to decrypt.
- **Returns**: `Promise` – JSON object, with `data` and `to` keys holding the decrypted `data` and `to` fields used originally.

---

### `bite.getCommonPublicKey()`

Fetches the common BLS public key from the configured BITE provider.

- **Returns**: `Promise` – A 256-character hex string representing the common public key.

## Run test

Run skaled using the script provided under `scripts/run_skaled.sh` or use the existing endpoint.

Run `node test.js $PROVIDER_URL $CHAIN_ID $INSECURE_ETH_PRIVATE_KEY` or change corresponding values in `test.js`.
