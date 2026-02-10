# BITE2 Sample Test

This document describes the **BITE2** test case implemented in `test.js` (specifically the `runSampleBITE2` function). This test demonstrates the capabilities of the BITE2 protocol in handling encrypted data within a smart contract context.

## Overview

The BITE2 test validates an end-to-end workflow where:
1.  Data is encrypted on the client side.
2.  Encrypted data is submitted to a smart contract on the blockchain.
3.  The blockchain (via a trusted execution environment) decrypts the data securely.
4.  The decrypted data is used in on-chain logic to update the contract state.

## The Smart Contract (`Game.sol`)

The test relies on a Solidity contract named `Game`. This contract implements a simple game mechanic to prove that decryption occurred correctly:

*   **State Variables**:
    *   `encrypted`: Stores the encrypted bytes submitted by the user.
    *   `plaintext`: Stores plaintext bytes submitted by the user for comparison/game logic.
    *   `sumDecryptedTotal`: Stores the sum of the decrypted values (used for verification).
    *   `userWon`: A boolean flag indicating the game result.

*   **Key Functions**:
    *   `submitEncrypted(bytes)`: Adds encrypted data to the state.
    *   `submitPlaintext(bytes)`: Adds plaintext data to the state.
    *   `decryptAndExecute()`: Packages the encrypted and plaintext data and performs a `staticcall` to the precompiled `submitCTX` stored at address `0x14`. The `submitCTX` precompile creates a BITE2 Transaction (Confidential Transaction - CTX), which is then added to the next block.
    *   `onDecrypt(bytes[], bytes[])`: Called as part of the execution flow to process the now-decrypted data. It calculates the sums of the values and determines if the user "won" (difference between sums < 101). Every CTX created via the `submitCTX` precompile is sent to the `onDecrypt(bytes[], bytes[])` function of the same address that initiated the call to `submitCTX`.

## Test Steps

The `runSampleBITE2` function performs the following steps:

1.  **Setup & Deployment**:
    *   Initializes the `BITE` client and Ethers.js provider.
    *   Deploys the `Game` smart contract using pre-compiled bytecode.

2.  **Encrypted Data Submission**:
    *   Generates 5 random numbers (range 50-249).
    *   Encrypts each number using `bite.encryptMessage(hexValue)`.
    *   Calls `submitEncrypted` on the contract to store these values.

3.  **Plaintext Data Submission**:
    *   Generates 5 random numbers.
    *   Calls `submitPlaintext` on the contract.

4.  **Trigger Decryption**:
    *   Calls `contract.decryptAndExecute()`. This initiates the secure decryption process on-chain.

5.  **Verification**:
    *   **Block Wait**: Waits for the `decryptAndExecute` transaction to be mined and for the subsequent block where the `onDecrypt` transaction is executed.
    *   **Decryption Check**: Calls `getSumDecrypted()` to retrieve the sum calculated by the contract. It compares this against the sum of the original numbers generated in Step 2.
    *   **Logic Check**: Calls `didUserWin()` to see the game result. It compares this against a locally calculated result to ensure the on-chain logic (subtraction and comparison of decrypted values) executed correctly.

## Running the Test

The test is executed as part of the `tests/test.js` script:

```bash
# From the project root
node tests/test.js <providerUrl> <chainID> <privateKey>
```

*   `providerUrl`: RPC endpoint of the SKALE chain.
*   `chainID`: Chain ID of the SKALE chain.
*   `privateKey`: Private key for the account sending transactions.

## Success Criteria

The test passes if:
1.  The transaction to `decryptAndExecute` succeeds.
2.  The `sumDecryptedTotal` field in the contract matches the sum of the validation numbers.
3.  The `userWon` status in the contract matches the expected result based on the random numbers generated.
