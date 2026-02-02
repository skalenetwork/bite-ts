# Confidential Token Demo

This demo provides a complete client-side interface for interacting with confidential ERC-20 tokens on SKALE. It demonstrates how to encrypt transaction data in the browser (without sending private data to an RPC), send confidential transfers, manage user keys, and decrypt confidential balances.

## Features

1.  **Confidential Transfer**: Encrypts ERC-20 `transfer` calls locally using the SKALE Chain's committee public key and sends them via the BITE mechanism.
2.  **User Registration**: Helper to generate keypairs and register a user's Public Key on the contract, enabling them to receive confidential tokens.
3.  **Balance Decryption**: Decrypts the encrypted balance returned by the contract using a derived shared secret.

## Tech Stack

*   **Vite**: Frontend tooling and development server.
*   **@skalenetwork/bite-ts**: For threshold encryption of the transaction payload.
*   **ethers.js**: For blockchain interaction and encoding.
*   **Node.js Crypto**: For AES and ECDH decryption logic.

## Prerequisites

*   Node.js installed.
*   Dependencies installed in the root workspace.
*   MetaMask installed in your browser.
*   A deployed instance of the Confidential Token SC and a SKALE Chain with BITE enabled.

## How to Run

1.  Navigate to this directory:
    ```bash
    cd examples/confidential-token-demo
    ```

2.  Install dependencies (if not done in root):
    ```bash
    npm install
    # or
    yarn install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    
4.  Open the URL shown in the terminal (usually `http://localhost:5173`).

## Usage Guide

### 1. Connect Wallet
Click **Connect MetaMask** to link your account.

### 2. User Management (Sender & Recipient)
Before sending or receiving confidential tokens, users must have their public keys registered on the contract.

*   **Generate New User**: Generates a fresh random wallet (Private Key, Public Key, Address) for testing.
*   **Register New User**: 
    *   Enter a **Public Key** (uncompressed, usually 128 chars hex).
    *   Enter an amount to deposit (required to refill CTX's sender balance).
    *   Click **Register** to send a transaction to the `registerPublicKey` method of the token contract.

### 3. Send Confidential Transfer
This performs a `transfer(recipient, amount)` call that is masked from the public.

1.  Enter the **Provider URL** of your SKALE Chain.
2.  Enter the **Token Address** of the deployed Confidential ERC-20 contract.
3.  Enter the **Recipient Address**.
4.  Enter the **Amount**.
5.  Click **Encrypt & Send**.
    *   The app fetches the chain's BLS Public Key.
    *   It RLP-encodes the function call.
    *   It encrypts the payload using Threshold Encryption.
    *   It constructs a transaction to `0x4249...` (BITE Address) with the encrypted data.
    *   MetaMask prompts to sign and send.

### 4. Decrypt Balance
If you have an encrypted balance string from Confidential Token contract:

1.  Enter your **Secret Key** (Private Key).
2.  Enter the **Encrypted Balance** hex string.
3.  Click **Decrypt Balance**.
    *   The app derives the shared secret using ECDH.
    *   It decrypts the ciphertext using AES-256-CBC.
    *   It displays the decrypted numeric balance.

## Under the Hood

### Encryption (`src/encryption.js`)

The `encryptTokenTransfer` function:
1.  **Fetches Keys**: Calls `bite_getCommitteesInfo` RPC to get the BLS public key(s).
2.  **Encodes Data**: Creates an ERC-20 `transfer` calldata.
3.  **RLP Encoding**: RLP encodes `[txData, toAddress]`.
4.  **Threshold Encryption**: Encrypts the RLP bytes using the fetched BLS key.
5.  **Output**: Returns the encrypted blob to be sent as the `data` field of a transaction to the BITE precompile.

### Decryption

The `decryptBalance` function:
1.  Parses the encrypted data to extract the Ephemeral Public Key, IV, and Ciphertext.
2.  Uses **ECDH** with the user's Private Key and the Ephemeral Public Key to compute a Shared Secret.
3.  Hashes the shared secret (SHA-256) to get the AES key.
4.  Decrypts the Ciphertext using **AES-256-CBC**.

