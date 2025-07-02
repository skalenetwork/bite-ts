const { BITE } = require('..');
const ethers = require('ethers');

// sample to address and data
const originalToAddress = "0x1234567890abcdef1234567890abcdef12345678";
const originalData = "0x248d4687c924890afaf2ace3bcfdcc3df7f876b704d616dbde952d6b2d511415";

async function runSample( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY ) {

    // Create a transaction object using ethers
    const ethersTransaction = new ethers.Transaction();
    ethersTransaction.data = originalData;
    ethersTransaction.to = originalToAddress;
    ethersTransaction.value = BigInt(100000000000000000);
    ethersTransaction.chainId = chainID;
    ethersTransaction.gasLimit = 50000;
    ethersTransaction.gasPrice = BigInt(50000000000);

    // Create a regular transaction object
    const transaction = {
        to: originalToAddress,
        value: BigInt(100000000000000000),
        chainId: chainID,
        gas: 21000,
        gasPrice: BigInt(50000000000),
        data: originalData
    };

    try {
        // Encrypt the regular transaction
        const encryptedTx = await bite.encryptTransaction(transaction);
        console.log("Encrypted regular Transaction:", encryptedTx.data);

        // Encrypt the ethers transaction
        const encryptedEthersTx = await bite.encryptTransaction(ethersTransaction);
        console.log("Encrypted Ethers Transaction:", encryptedEthersTx.data);

        // Send the encrypted transaction using ethers
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const signer = new ethers.Wallet(INSECURE_ETH_PRIVATE_KEY, provider);

        const txResponse = await signer.sendTransaction({
            to: ethersTransaction.to,
            value: ethersTransaction.value,
            gasLimit: ethersTransaction.gasLimit,
            gasPrice: ethersTransaction.gasPrice,
            data: encryptedEthersTx.data
        });

        console.log("Transaction sent! Hash:", txResponse.hash);
        const receipt = await txResponse.wait();

        // check receipt status
        if (receipt.status !== 1) {
            throw new Error("Transaction failed");
        }

        console.log("Transaction confirmed in block:\n", receipt);

        // check decrypted `to` address matches
        if (receipt.to.toLowerCase() != originalToAddress) {
            console.log("Decrypted transaction to address:", receipt.to);
            console.log("Expected to address:", originalToAddress);
            throw new Error("Transaction to address mismatch");
        }

        // check decrypted data & to fields match
        const decryptedData = await getDecryptedTransactionData(providerUrl, txResponse.hash);
        if (decryptedData.to.toLowerCase() !== originalToAddress || 
            decryptedData.data.toLowerCase() !== originalData) {
            throw new Error("Decrypted transaction data mismatch");
        }

        console.log("Transaction data is correctly decrypted:\n", decryptedData);

        
    } catch (error) {
        console.error("Failed to send encrypted transaction:", error);
        throw error;
    }
}

async function getDecryptedTransactionData(endpoint, txHash) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'bite_getDecryptedTransactionData',
            params: [txHash],
            id: 1,
        }),
    });
    const json = await response.json();
    return json.result;


}

const providerUrl = process.argv[2] || "http://127.0.0.1:1234";
const chainID = process.argv[3] || "0x2f8d4b0d3abc9";
const INSECURE_ETH_PRIVATE_KEY = process.argv[4] || "0x0e394ff21db60660a27a6383aedf8c75070648965acbef7c369c1bae2141a485";
const bite = new BITE(providerUrl);

runSample( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY );