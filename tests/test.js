const { BITE } = require('..');
const ethers = require('ethers');

// sample to address and data
const originalToAddress = "0x1234567890abcdef1234567890abcdef12345678";
const originalData = "0x248d4687c924890afaf2ace3bcfdcc3df7f876b704d616dbde952d6b2d511415";

async function runSampleBITE1( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY ) {

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
            to: encryptedEthersTx.to,
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

async function runSampleBITE2( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY ) {
    // deploy a contract
    const bytecode = "60806040526000600260006101000a81548160ff0219169083151502179055506000600355610fbe806100336000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806305b8a7d71461006757806357983ac81461008557806365eebab2146100a157806366df7a65146100bf5780636db3f6b1146100db578063e94b059e146100e5575b600080fd5b61006f610101565b60405161007c9190610476565b60405180910390f35b61009f600480360381019061009a9190610500565b61010b565b005b6100a9610215565b6040516100b6919061059c565b60405180910390f35b6100d960048036038101906100d4919061060d565b61022c565b005b6100e361026e565b005b6100ff60048036038101906100fa919061060d565b61041b565b005b6000600354905090565b6000805b838390508110156101645783838281811061012d5761012c61065a565b5b905060200281019061013f9190610698565b81019061014c9190610727565b826101579190610783565b915080600101905061010f565b506000805b868690508110156101be578686828181106101875761018661065a565b5b90506020028101906101999190610698565b8101906101a69190610727565b826101b19190610783565b9150806001019050610169565b508060038190555060008183116101e05782826101db91906107b7565b6101ed565b81836101ec91906107b7565b5b905060658110600260006101000a81548160ff02191690831515021790555050505050505050565b6000600260009054906101000a900460ff16905090565b6001828290918060018154018082558091505060019003906000526020600020016000909192909192909192909192509182610269929190610a31565b505050565b6000620f4240622625a0424360405160200161028b929190610b22565b6040516020818303038152906040528051906020012060001c6102ae9190610b7d565b6102b89190610783565b90506000600160006040516020016102d1929190610d09565b6040516020818303038152906040529050600082826040516020016102f7929190610dd0565b6040516020818303038152906040529050600080601b73ffffffffffffffffffffffffffffffffffffffff16836040516103319190610e3c565b600060405180830381855afa9150503d806000811461036c576040519150601f19603f3d011682016040523d82523d6000602084013e610371565b606091505b5091509150816103b6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103ad90610eb0565b60405180910390fd5b6000816103c290610f21565b60601c90508073ffffffffffffffffffffffffffffffffffffffff166108fc646865cafa809081150290604051600060405180830381858888f19350505050158015610412573d6000803e3d6000fd5b50505050505050565b6000828290918060018154018082558091505060019003906000526020600020016000909192909192909192909192509182610458929190610a31565b505050565b6000819050919050565b6104708161045d565b82525050565b600060208201905061048b6000830184610467565b92915050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f8401126104c0576104bf61049b565b5b8235905067ffffffffffffffff8111156104dd576104dc6104a0565b5b6020830191508360208202830111156104f9576104f86104a5565b5b9250929050565b6000806000806040858703121561051a57610519610491565b5b600085013567ffffffffffffffff81111561053857610537610496565b5b610544878288016104aa565b9450945050602085013567ffffffffffffffff81111561056757610566610496565b5b610573878288016104aa565b925092505092959194509250565b60008115159050919050565b61059681610581565b82525050565b60006020820190506105b1600083018461058d565b92915050565b60008083601f8401126105cd576105cc61049b565b5b8235905067ffffffffffffffff8111156105ea576105e96104a0565b5b602083019150836001820283011115610606576106056104a5565b5b9250929050565b6000806020838503121561062457610623610491565b5b600083013567ffffffffffffffff81111561064257610641610496565b5b61064e858286016105b7565b92509250509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b600080833560016020038436030381126106b5576106b4610689565b5b80840192508235915067ffffffffffffffff8211156106d7576106d661068e565b5b6020830192506001820236038313156106f3576106f2610693565b5b509250929050565b6107048161045d565b811461070f57600080fd5b50565b600081359050610721816106fb565b92915050565b60006020828403121561073d5761073c610491565b5b600061074b84828501610712565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061078e8261045d565b91506107998361045d565b92508282019050808211156107b1576107b0610754565b5b92915050565b60006107c28261045d565b91506107cd8361045d565b92508282039050818111156107e5576107e4610754565b5b92915050565b600082905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061086c57607f821691505b60208210810361087f5761087e610825565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026108e77fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826108aa565b6108f186836108aa565b95508019841693508086168417925050509392505050565b6000819050919050565b600061092e6109296109248461045d565b610909565b61045d565b9050919050565b6000819050919050565b61094883610913565b61095c61095482610935565b8484546108b7565b825550505050565b600090565b610971610964565b61097c81848461093f565b505050565b5b818110156109a057610995600082610969565b600181019050610982565b5050565b601f8211156109e5576109b681610885565b6109bf8461089a565b810160208510156109ce578190505b6109e26109da8561089a565b830182610981565b50505b505050565b600082821c905092915050565b6000610a08600019846008026109ea565b1980831691505092915050565b6000610a2183836109f7565b9150826002028217905092915050565b610a3b83836107eb565b67ffffffffffffffff811115610a5457610a536107f6565b5b610a5e8254610854565b610a698282856109a4565b6000601f831160018114610a985760008415610a86578287013590505b610a908582610a15565b865550610af8565b601f198416610aa686610885565b60005b82811015610ace57848901358255600182019150602085019450602081019050610aa9565b86831015610aeb5784890135610ae7601f8916826109f7565b8355505b6001600288020188555050505b50505050505050565b6000819050919050565b610b1c610b178261045d565b610b01565b82525050565b6000610b2e8285610b0b565b602082019150610b3e8284610b0b565b6020820191508190509392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b6000610b888261045d565b9150610b938361045d565b925082610ba357610ba2610b4e565b5b828206905092915050565b600081549050919050565b600082825260208201905092915050565b60008190508160005260206000209050919050565b600082825260208201905092915050565b60008154610bfd81610854565b610c078186610bdf565b94506001821660008114610c225760018114610c3857610c6b565b60ff198316865281151560200286019350610c6b565b610c4185610885565b60005b83811015610c6357815481890152600182019150602081019050610c44565b808801955050505b50505092915050565b6000610c808383610bf0565b905092915050565b6000600182019050919050565b6000610ca082610bae565b610caa8185610bb9565b935083602082028501610cbc85610bca565b8060005b85811015610cf757848403895281610cd88582610c74565b9450610ce383610c88565b925060208a01995050600181019050610cc0565b50829750879550505050505092915050565b60006040820190508181036000830152610d238185610c95565b90508181036020830152610d378184610c95565b90509392505050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610d7a578082015181840152602081019050610d5f565b60008484015250505050565b6000601f19601f8301169050919050565b6000610da282610d40565b610dac8185610d4b565b9350610dbc818560208601610d5c565b610dc581610d86565b840191505092915050565b6000604082019050610de56000830185610467565b8181036020830152610df78184610d97565b90509392505050565b600081905092915050565b6000610e1682610d40565b610e208185610e00565b9350610e30818560208601610d5c565b80840191505092915050565b6000610e488284610e0b565b915081905092915050565b600082825260208201905092915050565b7f307831622063616c6c206661696c656400000000000000000000000000000000600082015250565b6000610e9a601083610e53565b9150610ea582610e64565b602082019050919050565b60006020820190508181036000830152610ec981610e8d565b9050919050565b6000819050602082019050919050565b60007fffffffffffffffffffffffffffffffffffffffff00000000000000000000000082169050919050565b6000610f188251610ee0565b80915050919050565b6000610f2c82610d40565b82610f3684610ed0565b9050610f4181610f0c565b92506014821015610f8157610f7c7fffffffffffffffffffffffffffffffffffffffff000000000000000000000000836014036008026108aa565b831692505b505091905056fea2646970667358221220cb77b7d354924c4ef781654ff6d186483a0d2ebf283b22656ed5b8a43a1edba364736f6c634300081f0033";
    const abi = '[ { "inputs": [], "stateMutability": "payable", "type": "constructor" }, { "inputs": [], "name": "decryptAndExecute", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "didUserWin", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getSumDecrypted", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes[]", "name": "decryptedArguments", "type": "bytes[]" }, { "internalType": "bytes[]", "name": "plaintextArguments", "type": "bytes[]" } ], "name": "onDecrypt", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "_encrypted", "type": "bytes" } ], "name": "submitEncrypted", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "_plaintext", "type": "bytes" } ], "name": "submitPlaintext", "outputs": [], "stateMutability": "nonpayable", "type": "function" } ]';

    console.log("\n=== Starting BITE Sample 2: Smart Contract with Encrypted Data ===\n");

    try {
        // Initialize provider and signer
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const signer = new ethers.Wallet(INSECURE_ETH_PRIVATE_KEY, provider);
        const bite = new BITE(providerUrl);

        // Deploy the contract
        console.log("Step 1: Deploying smart contract...");
        const factory = new ethers.ContractFactory(abi, bytecode, signer);
        const contract = await factory.deploy({ value: BigInt(1000000000000000000) });
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();
        console.log(`✓ Contract deployed at: ${contractAddress}\n`);

        // Generate several random numbers for encrypted submission
        console.log("Step 2: Generating random numbers for encrypted submission...");
        const encryptedNumbers = [];
        for (let i = 0; i < 5; i++) {
            encryptedNumbers.push(Math.floor(Math.random() * 200) + 50); // Random numbers between 50-249
        }
        console.log(`Generated encrypted numbers: ${encryptedNumbers.join(', ')} (sum: ${encryptedNumbers.reduce((a, b) => a + b, 0)})`);

        // Submit encrypted data to smart contract
        console.log("\nStep 3: Submitting encrypted data to contract...");
        for (let i = 0; i < encryptedNumbers.length; i++) {
            const hexValue = '0x' + encryptedNumbers[i].toString(16).padStart(64, '0'); // Convert to 32 bytes hex

            const encryptedNumber = await bite.encryptMessageForCTX(hexValue, contractAddress);
            
            const tx = await contract.submitEncrypted(encryptedNumber);
            await tx.wait();
            console.log(`✓ Submitted encrypted number ${i + 1}/${encryptedNumbers.length}: ${encryptedNumbers[i]}`);
        }

        // Generate plaintext numbers
        console.log("\nStep 4: Generating plaintext numbers...");
        const encryptedSum = encryptedNumbers.reduce((a, b) => a + b, 0);
        const plaintextNumbers = [];
        let plaintextSum = 0;
        
        // Generate 5 random numbers
        for (let i = 0; i < 5; i++) {
            const num = Math.floor(Math.random() * 200) + 50; // Random numbers between 50-249
            plaintextNumbers.push(num);
            plaintextSum += num;
        }
        
        console.log(`Generated plaintext numbers: ${plaintextNumbers.join(', ')} (sum: ${plaintextNumbers.reduce((a, b) => a + b, 0)})`);
        console.log(`Difference between encrypted and plaintext sums: ${Math.abs(encryptedNumbers.reduce((a, b) => a + b, 0) - plaintextNumbers.reduce((a, b) => a + b, 0))}`);

        // Submit plaintext data to smart contract
        console.log("\nStep 5: Submitting plaintext data to contract...");
        for (let i = 0; i < plaintextNumbers.length; i++) {
            const hexValue = '0x' + plaintextNumbers[i].toString(16).padStart(64, '0');
            const tx = await contract.submitPlaintext(hexValue);
            await tx.wait();
            console.log(`✓ Submitted plaintext number ${i + 1}/${plaintextNumbers.length}: ${plaintextNumbers[i]}`);
        }

        // Call decryptAndExecute
        console.log("\nStep 6: Calling decryptAndExecute...");
        const decryptTx = await contract.decryptAndExecute({ gasLimit: 5000000 });
        // const decryptTx = await contract.decryptAndExecute();
        const decryptReceipt = await decryptTx.wait();
        console.log(`✓ decryptAndExecute transaction confirmed in block ${decryptReceipt.blockNumber}`);

        // Wait for one more block to be created
        console.log("\nStep 7: Waiting for one more block...");
        let currentBlock = await provider.getBlockNumber();
        console.log(`Current block: ${currentBlock}`);
        
        // Poll for next block
        while (currentBlock == decryptReceipt.blockNumber) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentBlock = await provider.getBlockNumber();
        }
        console.log(`✓ Next block created: ${currentBlock}`);

        // Call getSumDecrypted
        console.log("\nStep 8: Calling getSumDecrypted...");
        const decryptedSum = await contract.getSumDecrypted();
        console.log(`Decrypted sum from contract: ${decryptedSum.toString()}`);
        
        const expectedEncryptedSum = encryptedNumbers.reduce((a, b) => a + b, 0);
        console.log(`Expected encrypted sum: ${expectedEncryptedSum}`);
        
        if (decryptedSum.toString() === expectedEncryptedSum.toString()) {
            console.log(`✓ Decrypted sum matches encrypted sum!`);
        } else {
            throw new Error(`✗ Error: Decrypted sum (${decryptedSum}) does not match encrypted sum (${expectedEncryptedSum})`);
        }

        // Call didUserWin
        console.log("\nStep 9: Calling didUserWin...");
        const didWin = await contract.didUserWin();
        console.log(`Result: ${didWin ? '✓ User WON!' : '✗ User LOST'}`);

        // Verify the result is correct
        const expectedWin = Math.abs(encryptedNumbers.reduce((a, b) => a + b, 0) - plaintextNumbers.reduce((a, b) => a + b, 0)) <= 100;
        console.log(`\n=== Verification ===`);
        console.log(`Encrypted sum: ${encryptedNumbers.reduce((a, b) => a + b, 0)}`);
        console.log(`Plaintext sum: ${plaintextNumbers.reduce((a, b) => a + b, 0)}`);
        console.log(`Difference: ${Math.abs(encryptedNumbers.reduce((a, b) => a + b, 0) - plaintextNumbers.reduce((a, b) => a + b, 0))}`);
        console.log(`Expected result: ${expectedWin ? 'WIN' : 'LOSE'}`);
        console.log(`Actual result: ${didWin ? 'WIN' : 'LOSE'}`);
        
        if (didWin === expectedWin) {
            console.log(`✓ Result is CORRECT!\n`);
        } else {
            throw new Error(`Result mismatch! Expected ${expectedWin} but got ${didWin}`);
        }

    } catch (error) {
        console.error("\nFailed in runSampleBITE2:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        throw error;
    }
}

const providerUrl = process.argv[2] || "http://127.0.0.1:1234";
const chainID = process.argv[3] || "0x2f8d4b0d3abc9";
const INSECURE_ETH_PRIVATE_KEY = process.argv[4] || "0x0e394ff21db60660a27a6383aedf8c75070648965acbef7c369c1bae2141a485";
const bite = new BITE(providerUrl);

(async () => {
    await runSampleBITE1(providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY);
    await runSampleBITE2(providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY);
})();