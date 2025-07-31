#!/usr/bin/env node

const { BITE } = require('..');
const { encode } = require('@ethereumjs/rlp');
const ethers = require('ethers');

/**
 * Generates a random hex string of specified length
 * @param {number} length - The length of the hex string (without 0x prefix)
 * @returns {string} - Random hex string with 0x prefix
 */
function generateRandomHex(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return '0x' + result;
}

/**
 * Generates a random Ethereum address
 * @returns {string} - Random Ethereum address
 */
function generateRandomAddress() {
    return generateRandomHex(40); // 20 bytes = 40 hex characters
}

/**
 * Generates random transaction data
 * @returns {string} - Random transaction data
 */
function generateRandomData() {
    // Generate random data between 32 and 128 bytes
    const length = Math.floor(Math.random() * 96) + 32; // 32 to 128 bytes
    return generateRandomHex(length * 2); // Each byte = 2 hex characters
}

// Generate random transaction parameters
const originalToAddress = generateRandomAddress();
const originalData = generateRandomData();

console.log(`🎲 Generated random transaction:`);
console.log(`  To: ${originalToAddress}`);
console.log(`  Data: ${originalData.slice(0, 50)}... (${originalData.length - 2} hex chars)`);
console.log();

/**
 * Creates a forged transaction using the same approach as the valid transaction
 * but with a different epochId
 * @param {Object} transaction - The original transaction object {to, data}
 * @param {number} forgedEpochId - The forged epoch ID to use
 * @param {string} publicKey - The BLS public key to use for encryption
 * @returns {Promise<string>} - The forged encrypted transaction data
 */
async function createForgedTransaction(transaction, forgedEpochId, publicKey) {
    try {
        // Import the required encryption functions
        const { encryptMessage: encryptRawMessage } = require('@skalenetwork/t-encrypt');
        
        // Validate transaction fields (same as in the real encrypt function)
        const txTo = transaction.to.startsWith('0x') ? transaction.to.slice(2) : transaction.to;
        const txData = transaction.data.startsWith('0x') ? transaction.data.slice(2) : transaction.data;
        
        // RLP encode transaction data (same as in the real encrypt function)
        const toBuffer = Buffer.from(txTo, 'hex');
        const dataBuffer = Buffer.from(txData, 'hex');
        const rlpEncodedTxData = encode([dataBuffer, toBuffer]);
        const rlpEncodedTxHex = Buffer.from(rlpEncodedTxData).toString('hex');
        
        // Encrypt the RLP encoded transaction data using the same BLS key
        const encryptedRawMessage = await encryptRawMessage(rlpEncodedTxHex, publicKey);
        
        // RLP encode with forged epochId (same structure as real encrypt function)
        const encryptedMessageBuffer = Buffer.from(encryptedRawMessage, 'hex');
        const forgedRlpEncoded = encode([forgedEpochId, encryptedMessageBuffer]);
        
        return '0x' + Buffer.from(forgedRlpEncoded).toString('hex');
    } catch (error) {
        console.error('Error creating forged transaction:', error);
        throw error;
    }
}

async function testEpochValidation(providerUrl, chainID, privateKey) {
    console.log('🔐 Testing Epoch ID Validation');
    console.log('================================\n');
    
    const bite = new BITE(providerUrl);
    
    // Create a test transaction
    const transaction = {
        to: originalToAddress,
        data: originalData
    };
    
    try {
        // Get the current epoch info
        console.log('📡 Getting current epoch info...');
        const publicKeyResponse = await bite.getCommitteesInfo();
        const currentEpochId = publicKeyResponse[0].epochId;
        const blsPublicKey = publicKeyResponse[0].commonBLSPublicKey;
        console.log(`Current Epoch ID: ${currentEpochId}`);
        console.log(`BLS Public Key: ${blsPublicKey.slice(0, 20)}...`);
        console.log();
        
        // 1. Send valid transaction
        console.log('✅ Test 1: Sending VALID transaction with correct epochId...');
        const validEncryptedTx = await bite.encryptTransaction(transaction);
        console.log(`Valid encrypted data: ${validEncryptedTx.data.slice(0, 50)}...`);
        
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        
        try {
            const validTxResponse = await signer.sendTransaction({
                to: validEncryptedTx.to,
                data: validEncryptedTx.data,
                gasLimit: 100000,
                gasPrice: ethers.parseUnits('50', 'gwei')
            });
            
            console.log(`✅ Valid transaction sent! Hash: ${validTxResponse.hash}`);
            const validReceipt = await validTxResponse.wait();
            
            if (validReceipt.status === 1) {
                console.log('✅ Valid transaction confirmed successfully!');
                
                // Verify decryption
                console.log('🔍 Verifying transaction decryption...');
                try {
                    const decryptedData = await bite.getDecryptedTransactionData(validTxResponse.hash);
                    console.log('📄 Decrypted transaction data:', decryptedData);
                    
                    // Verify decrypted data matches original
                    const originalToLower = originalToAddress.toLowerCase();
                    const originalDataLower = originalData.toLowerCase();
                    const decryptedToLower = decryptedData.to.toLowerCase();
                    const decryptedDataLower = decryptedData.data.toLowerCase();
                    
                    console.log(`Original to: ${originalToAddress}`);
                    console.log(`Decrypted to: ${decryptedData.to}`);
                    console.log(`Original data: ${originalData}`);
                    console.log(`Decrypted data: ${decryptedData.data}`);
                    
                    if (decryptedToLower === originalToLower && decryptedDataLower === originalDataLower) {
                        console.log('✅ Decryption verification PASSED - data matches original!');
                    } else {
                        console.log('❌ Decryption verification FAILED - data mismatch!');
                        if (decryptedToLower !== originalToLower) {
                            console.log(`  - 'to' field mismatch: expected ${originalToAddress}, got ${decryptedData.to}`);
                        }
                        if (decryptedDataLower !== originalDataLower) {
                            console.log(`  - 'data' field mismatch: expected ${originalData}, got ${decryptedData.data}`);
                        }
                    }
                } catch (decryptError) {
                    console.log(`❌ Decryption failed: ${decryptError.message}`);
                    process.exit(1);
                }
                console.log();
            } else {
                console.log('❌ Valid transaction failed!\n');
                process.exit(1);
            }
        } catch (error) {
            console.log(`❌ Valid transaction failed: ${error.message}\n`);
            console.error('❌ Test failed:', error);
            process.exit(1);
        }
        
        // 2. Send forged transaction with wrong epochId
        console.log('🔍 Test 2: Sending FORGED transaction with wrong epochId...');
        const forgedEpochId = currentEpochId + 1000; // Use a clearly wrong epoch ID
        console.log(`Forged Epoch ID: ${forgedEpochId}`);
        
        // Create forged transaction using same approach as valid transaction
        const forgedEncryptedData = await createForgedTransaction(transaction, forgedEpochId, blsPublicKey);
        console.log(`Forged encrypted data: ${forgedEncryptedData.slice(0, 50)}...`);
        
        try {
            const forgedTxResponse = await signer.sendTransaction({
                to: validEncryptedTx.to, // Same target address
                data: forgedEncryptedData,
                gasLimit: 100000,
                gasPrice: ethers.parseUnits('50', 'gwei')
            });
            
            console.log(`📤 Forged transaction sent! Hash: ${forgedTxResponse.hash}`);
            const forgedReceipt = await forgedTxResponse.wait();
            
            if (forgedReceipt.status === 1) {
                console.log('⚠️  WARNING: Forged transaction was accepted! This may indicate a security issue.');
                console.error('❌ Test failed!');
                process.exit(1);
            } else {
                console.log('✅ Good: Forged transaction was rejected by the network.');
            }
        } catch (error) {
            // Extract the actual error details if it's a nested error structure
            let errorDetails = error.message;
            if (error.error && typeof error.error === 'object') {
                errorDetails = JSON.stringify(error.error);
            } else if (error.message && error.message.includes('error={')) {
                // Extract the error object from the message
                const errorMatch = error.message.match(/error=(\{[^}]+\})/);
                if (errorMatch) {
                    errorDetails = errorMatch[1];
                }
            }
            console.log(`✅ Good: Forged transaction failed as expected: ${errorDetails}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Command line arguments
const providerUrl = process.argv[2] || "http://127.0.0.1:1234";
const chainID = process.argv[3] || "0x2f8d4b0d3abc9";
const privateKey = process.argv[4] || "0x0e394ff21db60660a27a6383aedf8c75070648965acbef7c369c1bae2141a485";

console.log(`Provider URL: ${providerUrl}`);
console.log(`Chain ID: ${chainID}`);

// Run the test
testEpochValidation(providerUrl, chainID, privateKey)
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
