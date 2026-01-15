const { BITE } = require('..');
const ethers = require('ethers');

// USAGE: node stress_test.js <providerUrl1> <providerUrl2> <chainID> <privateKey>
// providerUrl1: Used for sending transactions and BITE encryption
// providerUrl2: Used for RPC calls (consensus control, transaction decryption)
// If both URLs are the same, you can provide the same URL twice

// Configuration
const NUM_TRANSACTIONS = 1000;
const BATCH_SIZE = 50; // Send transactions in batches to avoid overwhelming the node
const BATCH_DELAY = 100; // Delay between batches in milliseconds

// Generate random hex string of specified length
function generateRandomHex(length) {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// Generate random Ethereum address
function generateRandomAddress() {
    return generateRandomHex(40); // 20 bytes = 40 hex characters
}

// Generate random transaction data (between 32 and 256 bytes)
function generateRandomData() {
    const minLength = 64; // 32 bytes = 64 hex characters
    const maxLength = 512; // 256 bytes = 512 hex characters
    let length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    if ( length % 2 !== 0 )
        length++; // Ensure even length for hex string
    return generateRandomHex(length);
}

async function stressTest(providerUrl1, providerUrl2, providerUrl3, providerUrl4, chainID, privateKey) {
    console.log(`Starting stress test: sending ${NUM_TRANSACTIONS} transactions...`);
    console.log(`Using ${providerUrl1} for transactions and ${providerUrl2} for RPC calls`);
    
    // providerUrl1 is used for sending transactions and BITE encryption
    const provider = new ethers.JsonRpcProvider(providerUrl1);
    const signer = new ethers.Wallet(privateKey, provider);
    const bite = new BITE(providerUrl1);
    
    // Get initial nonce
    let nonce = await signer.getNonce();
    console.log(`Starting nonce: ${nonce}`);
    
    const sentTransactions = [];
    const startTime = Date.now();
    
    try {
        // Pause consensus before sending transactions
        console.log(`\nPausing consensus before sending transactions...`);
        await pauseConsensus(providerUrl1, true);
        await pauseConsensus(providerUrl2, true);
        await pauseConsensus(providerUrl3, true);
        await pauseConsensus(providerUrl4, true);

        // Send transactions in batches
        for (let batchStart = 0; batchStart < NUM_TRANSACTIONS; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, NUM_TRANSACTIONS);
            const batchPromises = [];
            
            console.log(`Sending batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(NUM_TRANSACTIONS / BATCH_SIZE)} (transactions ${batchStart + 1}-${batchEnd})`);
            
            for (let i = batchStart; i < batchEnd; i++) {
                // Generate random to address and data for each transaction
                const randomToAddress = generateRandomAddress();
                const randomData = generateRandomData();
                
                const transaction = {
                    to: randomToAddress,
                    value: BigInt(1000000000000000), // 0.001 ETH
                    chainId: chainID,
                    gas: 21000,
                    gasPrice: BigInt(50000000000),
                    nonce: nonce + i,
                    data: randomData
                };
                
                // Encrypt the transaction
                const encryptedTx = await bite.encryptTransaction(transaction);
                
                // Send the encrypted transaction (don't await here to send in parallel)
                const txPromise = signer.sendTransaction({
                    to: transaction.to,
                    value: transaction.value,
                    gasLimit: 60000,
                    gasPrice: transaction.gasPrice,
                    nonce: transaction.nonce,
                    data: encryptedTx.data,
                }).then(txResponse => {
                    console.log(`Transaction ${i + 1}/${NUM_TRANSACTIONS} sent: ${txResponse.hash} (to: ${randomToAddress.substring(0, 10)}..., data: ${randomData.length - 2} bytes)`);
                    return {
                        index: i,
                        hash: txResponse.hash,
                        txResponse,
                        originalTo: randomToAddress,
                        originalData: randomData
                    };
                }).catch(error => {
                    console.error(`Transaction ${i + 1} failed:`, error.message);
                    return {
                        index: i,
                        error: error.message,
                        originalTo: randomToAddress,
                        originalData: randomData
                    };
                });
                
                batchPromises.push(txPromise);
            }
            
            // Wait for current batch to complete
            const batchResults = await Promise.all(batchPromises);
            sentTransactions.push(...batchResults);
            
            // Add delay between batches to avoid overwhelming the node
            if (batchEnd < NUM_TRANSACTIONS) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }
        
        const sendTime = Date.now();
        console.log(`\nAll ${NUM_TRANSACTIONS} transactions sent in ${sendTime - startTime}ms`);
        
        // Resume consensus after all transactions are submitted
        console.log(`\nResuming consensus after all transactions are submitted...`);
        await pauseConsensus(providerUrl1, false);
        await pauseConsensus(providerUrl2, false);
        await pauseConsensus(providerUrl3, false);
        await pauseConsensus(providerUrl4, false);

        // Find the last successfully sent transaction
        const successfulTxs = sentTransactions.filter(tx => tx.hash && !tx.error);
        const failedTxs = sentTransactions.filter(tx => tx.error);
        
        console.log(`\nResults:`);
        console.log(`- Successful: ${successfulTxs.length}`);
        console.log(`- Failed: ${failedTxs.length}`);
        
        if (failedTxs.length > 0) {
            console.log(`\nFirst 5 failed transactions:`);
            failedTxs.slice(0, 5).forEach(tx => {
                console.log(`  Transaction ${tx.index + 1}: ${tx.error}`);
            });
        }
        
        if (successfulTxs.length === 0) {
            throw new Error("No transactions were successfully sent!");
        }
        
        // Wait for the last transaction receipt
        const lastTx = successfulTxs[successfulTxs.length - 1];
        console.log(`\nWaiting for receipt of last transaction: ${lastTx.hash}`);
        
        const receipt = await lastTx.txResponse.wait();
        const endTime = Date.now();
        
        console.log(`\n=== STRESS TEST COMPLETED ===`);
        console.log(`Total time: ${endTime - startTime}ms`);
        console.log(`Send time: ${sendTime - startTime}ms`);
        console.log(`Confirmation time: ${endTime - sendTime}ms`);
        console.log(`Last transaction receipt:`);
        console.log(`- Hash: ${receipt.hash}`);
        console.log(`- Block: ${receipt.blockNumber}`);
        console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`- Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
        
        // Verify last transaction decryption
        if (receipt.status === 1) {
            console.log(`\nVerifying last transaction decryption...`);
            try {
                const decryptedData = await getDecryptedTransactionData(providerUrl2, receipt.hash);
                if (decryptedData.to.toLowerCase() === lastTx.originalTo.toLowerCase() && 
                    decryptedData.data.toLowerCase() === lastTx.originalData.toLowerCase()) {
                    console.log(`✓ Last transaction correctly decrypted!`);
                    console.log(`  Original to: ${lastTx.originalTo}`);
                    console.log(`  Decrypted to: ${decryptedData.to}`);
                    console.log(`  Data length: ${(lastTx.originalData.length - 2) / 2} bytes`);
                } else {
                    console.log(`✗ Last transaction decryption mismatch`);
                    console.log(`  Expected to: ${lastTx.originalTo}`);
                    console.log(`  Decrypted to: ${decryptedData.to}`);
                    console.log(`  Expected data length: ${(lastTx.originalData.length - 2) / 2} bytes`);
                    console.log(`  Decrypted data length: ${(decryptedData.data.length - 2) / 2} bytes`);
                }
            } catch (error) {
                console.log(`✗ Failed to decrypt last transaction: ${error.message}`);
            }
        }
        
        return {
            totalTransactions: NUM_TRANSACTIONS,
            successfulTransactions: successfulTxs.length,
            failedTransactions: failedTxs.length,
            totalTime: endTime - startTime,
            sendTime: sendTime - startTime,
            confirmationTime: endTime - sendTime,
            lastTransactionHash: receipt.hash,
            lastTransactionStatus: receipt.status
        };
        
    } catch (error) {
        console.error("Stress test failed:", error);
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

async function pauseConsensus(endpoint, pause = true) {
    const action = pause ? 'pause' : 'resume';
    console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ing consensus...`);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'debug_pauseConsensus',
                params: [pause],
                id: 1,
            }),
        });
        
        const json = await response.json();
        
        if (json.error) {
            throw new Error(`RPC Error: ${json.error.message || json.error}`);
        }
        
        console.log(`✓ Consensus ${action}d successfully`);
        return json.result;
    } catch (error) {
        console.error(`✗ Failed to ${action} consensus:`, error.message);
        throw error;
    }
}

// Parse command line arguments
const providerUrl1 = process.argv[2] || "http://127.0.0.1:1134";
const providerUrl2 = process.argv[3] || "http://127.0.0.1:1234";
const providerUrl3 = process.argv[4] || "http://127.0.0.1:1334";
const providerUrl4 = process.argv[5] || "http://127.0.0.1:1434";
const chainID = process.argv[6] || "0x2f8d4b0d3abc9";
const privateKey = process.argv[7] || "0x0e394ff21db60660a27a6383aedf8c75070648965acbef7c369c1bae2141a485";

console.log(`Configuration:`);
console.log(`- Provider URL 1 (transactions): ${providerUrl1}`);
console.log(`- Provider URL 2 (RPC calls): ${providerUrl2}`);
console.log(`- Provider URL 3 (RPC calls): ${providerUrl3}`);
console.log(`- Provider URL 4 (RPC calls): ${providerUrl4}`);
console.log(`- Chain ID: ${chainID}`);
console.log(`- Number of transactions: ${NUM_TRANSACTIONS}`);
console.log(`- Batch size: ${BATCH_SIZE}`);
console.log(`- Batch delay: ${BATCH_DELAY}ms`);

// Run the stress test
stressTest(providerUrl1, providerUrl2, providerUrl3, providerUrl4, chainID, privateKey)
    .then(results => {
        console.log(`\n=== FINAL RESULTS ===`);
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error("Stress test failed:", error);
        process.exit(1);
    });
