# BITE usage examples

## Message Encryption Demo

Run skaled using the script provided under `scripts/run_skaled.sh` or use the existing endpoint. Also, make sure to spin up BlockExplorer to ensure the demo functions properly. Demo is working with Metamask wallet, make sure to switch the network before encrypting transactions.

Create `.env` file under `message-encrypt-demo` directory.
```
VITE_EXPLORER_URL=
VITE_SCHAIN_ENDPOINT=
```
Run `yarn && yarn dev`.

## Encrypted Transfer Demo

### 1. Deploy the Smart Contract

First, deploy the following contract to a chain that supports **BITE**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleTransferDemo {
    mapping(address => uint256) public balances;

    event Transferred(address indexed from, address indexed to, uint256 amount);

    constructor() {
        balances[msg.sender] = 1_000_000;
    }

    function allocate(address user, uint256 amount) external {
        balances[user] += amount;
    }

    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Not enough balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transferred(msg.sender, to, amount);
    }

    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
}
```

### 2. Set Up the Environment
Create a .env file inside the encrypted-transfer-demo directory with the following content:

```bash
VITE_EXPLORER_URL=
VITE_SCHAIN_ENDPOINT=
VITE_TRANSFER_CONTRACT=
```
Fill in the required values based on your deployment.

Create `.env` file under `encrypted-transfer-demo` directory:
```
VITE_EXPLORER_URL=
VITE_SCHAIN_ENDPOINT=
VITE_TRANSFER_CONTRACT=
```

### 3. Start the Demo

Install dependencies and run the project locally:
```
yarn && yarn build && yarn dev
```
