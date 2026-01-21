# Confidential Token Demo

This demo provides a client-side web interface to send encrypted ERC-20 token transfers using MetaMask.

It uses:
*   **Vite**: For bundling and development server.
*   **@skalenetwork/bite**: Directly imported in the browser to perform client-side encryption.
*   **MetaMask**: for signing and sending the transaction.

## Prerequisites

*   Node.js installed.
*   Dependencies installed in the root workspace.
*   MetaMask installed in your browser.

## How to Run

1.  Navigate to this directory:
    ```bash
    cd examples/confidential-token-demo
    ```

2.  Install dependencies (if not already done via workspace):
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

5.  **Use the Demo**:
    *   Click **Connect MetaMask**.
    *   Fill in the **Token Address** and **Recipient Address**.
    *   Enter the **Amount** (in wei).
    *   Click **Encrypt & Send**.
    *   Approve the transaction in MetaMask.

## How it works

The Application logic is in `src/encryption.js` and `src/main.js`.
1.  It initializes the `BITE` library with the SKALE Chain RPC URL.
2.  It constructs the raw ERC-20 `transfer` transaction object.
3.  It calls `bite.encryptTransaction` to encrypt the payload entirely in the browser.
4.  It requests MetaMask to sign and send the resulting encrypted transaction.
