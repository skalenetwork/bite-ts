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
    const bytecode = "60806040526000600260006101000a81548160ff02191690831515021790555060006003556111a5806100336000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806305b8a7d71461006757806357983ac81461008557806365eebab2146100a157806366df7a65146100bf5780636db3f6b1146100db578063e94b059e146100e5575b600080fd5b61006f610101565b60405161007c919061054f565b60405180910390f35b61009f600480360381019061009a91906105d9565b61010b565b005b6100a9610215565b6040516100b69190610675565b60405180910390f35b6100d960048036038101906100d491906106e6565b61022c565b005b6100e361026e565b005b6100ff60048036038101906100fa91906106e6565b6104f4565b005b6000600354905090565b6000805b838390508110156101645783838281811061012d5761012c610733565b5b905060200281019061013f9190610771565b81019061014c9190610800565b82610157919061085c565b915080600101905061010f565b506000805b868690508110156101be5786868281811061018757610186610733565b5b90506020028101906101999190610771565b8101906101a69190610800565b826101b1919061085c565b9150806001019050610169565b508060038190555060008183116101e05782826101db9190610890565b6101ed565b81836101ec9190610890565b5b905060658110600260006101000a81548160ff02191690831515021790555050505050505050565b6000600260009054906101000a900460ff16905090565b6001828290918060018154018082558091505060019003906000526020600020016000909192909192909192909192509182610269929190610b0a565b505050565b6000620f4240622625a0424360405160200161028b929190610bfb565b6040516020818303038152906040528051906020012060001c6102ae9190610c56565b6102b8919061085c565b90506000600160006040516020016102d1929190610de2565b604051602081830303815290604052905060003083836040516020016102f993929190610eea565b6040516020818303038152906040529050600080601373ffffffffffffffffffffffffffffffffffffffff16836040516103339190610f64565b600060405180830381855afa9150503d806000811461036e576040519150601f19603f3d011682016040523d82523d6000602084013e610373565b606091505b5091509150816103b8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103af90610fd8565b60405180910390fd5b6000816103c490611049565b60601c90508073ffffffffffffffffffffffffffffffffffffffff166108fc646865cafa809081150290604051600060405180830381858888f19350505050158015610414573d6000803e3d6000fd5b508130878760405160200161042c94939291906110b0565b6040516020818303038152906040529350601473ffffffffffffffffffffffffffffffffffffffff16846040516104639190610f64565b600060405180830381855afa9150503d806000811461049e576040519150601f19603f3d011682016040523d82523d6000602084013e6104a3565b606091505b508093508194505050826104ec576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104e39061114f565b60405180910390fd5b505050505050565b6000828290918060018154018082558091505060019003906000526020600020016000909192909192909192909192509182610531929190610b0a565b505050565b6000819050919050565b61054981610536565b82525050565b60006020820190506105646000830184610540565b92915050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f84011261059957610598610574565b5b8235905067ffffffffffffffff8111156105b6576105b5610579565b5b6020830191508360208202830111156105d2576105d161057e565b5b9250929050565b600080600080604085870312156105f3576105f261056a565b5b600085013567ffffffffffffffff8111156106115761061061056f565b5b61061d87828801610583565b9450945050602085013567ffffffffffffffff8111156106405761063f61056f565b5b61064c87828801610583565b925092505092959194509250565b60008115159050919050565b61066f8161065a565b82525050565b600060208201905061068a6000830184610666565b92915050565b60008083601f8401126106a6576106a5610574565b5b8235905067ffffffffffffffff8111156106c3576106c2610579565b5b6020830191508360018202830111156106df576106de61057e565b5b9250929050565b600080602083850312156106fd576106fc61056a565b5b600083013567ffffffffffffffff81111561071b5761071a61056f565b5b61072785828601610690565b92509250509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261078e5761078d610762565b5b80840192508235915067ffffffffffffffff8211156107b0576107af610767565b5b6020830192506001820236038313156107cc576107cb61076c565b5b509250929050565b6107dd81610536565b81146107e857600080fd5b50565b6000813590506107fa816107d4565b92915050565b6000602082840312156108165761081561056a565b5b6000610824848285016107eb565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061086782610536565b915061087283610536565b925082820190508082111561088a5761088961082d565b5b92915050565b600061089b82610536565b91506108a683610536565b92508282039050818111156108be576108bd61082d565b5b92915050565b600082905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061094557607f821691505b602082108103610958576109576108fe565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026109c07fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610983565b6109ca8683610983565b95508019841693508086168417925050509392505050565b6000819050919050565b6000610a07610a026109fd84610536565b6109e2565b610536565b9050919050565b6000819050919050565b610a21836109ec565b610a35610a2d82610a0e565b848454610990565b825550505050565b600090565b610a4a610a3d565b610a55818484610a18565b505050565b5b81811015610a7957610a6e600082610a42565b600181019050610a5b565b5050565b601f821115610abe57610a8f8161095e565b610a9884610973565b81016020851015610aa7578190505b610abb610ab385610973565b830182610a5a565b50505b505050565b600082821c905092915050565b6000610ae160001984600802610ac3565b1980831691505092915050565b6000610afa8383610ad0565b9150826002028217905092915050565b610b1483836108c4565b67ffffffffffffffff811115610b2d57610b2c6108cf565b5b610b37825461092d565b610b42828285610a7d565b6000601f831160018114610b715760008415610b5f578287013590505b610b698582610aee565b865550610bd1565b601f198416610b7f8661095e565b60005b82811015610ba757848901358255600182019150602085019450602081019050610b82565b86831015610bc45784890135610bc0601f891682610ad0565b8355505b6001600288020188555050505b50505050505050565b6000819050919050565b610bf5610bf082610536565b610bda565b82525050565b6000610c078285610be4565b602082019150610c178284610be4565b6020820191508190509392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b6000610c6182610536565b9150610c6c83610536565b925082610c7c57610c7b610c27565b5b828206905092915050565b600081549050919050565b600082825260208201905092915050565b60008190508160005260206000209050919050565b600082825260208201905092915050565b60008154610cd68161092d565b610ce08186610cb8565b94506001821660008114610cfb5760018114610d1157610d44565b60ff198316865281151560200286019350610d44565b610d1a8561095e565b60005b83811015610d3c57815481890152600182019150602081019050610d1d565b808801955050505b50505092915050565b6000610d598383610cc9565b905092915050565b6000600182019050919050565b6000610d7982610c87565b610d838185610c92565b935083602082028501610d9585610ca3565b8060005b85811015610dd057848403895281610db18582610d4d565b9450610dbc83610d61565b925060208a01995050600181019050610d99565b50829750879550505050505092915050565b60006040820190508181036000830152610dfc8185610d6e565b90508181036020830152610e108184610d6e565b90509392505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610e4482610e19565b9050919050565b610e5481610e39565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610e94578082015181840152602081019050610e79565b60008484015250505050565b6000601f19601f8301169050919050565b6000610ebc82610e5a565b610ec68185610e65565b9350610ed6818560208601610e76565b610edf81610ea0565b840191505092915050565b6000606082019050610eff6000830186610e4b565b610f0c6020830185610540565b8181036040830152610f1e8184610eb1565b9050949350505050565b600081905092915050565b6000610f3e82610e5a565b610f488185610f28565b9350610f58818560208601610e76565b80840191505092915050565b6000610f708284610f33565b915081905092915050565b600082825260208201905092915050565b7f307831332063616c6c206661696c656400000000000000000000000000000000600082015250565b6000610fc2601083610f7b565b9150610fcd82610f8c565b602082019050919050565b60006020820190508181036000830152610ff181610fb5565b9050919050565b6000819050602082019050919050565b60007fffffffffffffffffffffffffffffffffffffffff00000000000000000000000082169050919050565b60006110408251611008565b80915050919050565b600061105482610e5a565b8261105e84610ff8565b905061106981611034565b925060148210156110a9576110a47fffffffffffffffffffffffffffffffffffffffff00000000000000000000000083601403600802610983565b831692505b5050919050565b600060808201905081810360008301526110ca8187610eb1565b90506110d96020830186610e4b565b6110e66040830185610540565b81810360608301526110f88184610eb1565b905095945050505050565b7f307831342063616c6c206661696c656400000000000000000000000000000000600082015250565b6000611139601083610f7b565b915061114482611103565b602082019050919050565b600060208201905081810360008301526111688161112c565b905091905056fea2646970667358221220132b7c7a09fc753a98a50e5c778c1329f21f825dc332659e32c0ad5f32a559fe64736f6c634300081f0033";
    const abi = '[{"inputs": [],"stateMutability": "payable","type": "constructor"},{"inputs": [],"name": "decryptAndExecute","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "didUserWin","outputs": [{"internalType": "bool","name": "","type": "bool"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "getSumDecrypted","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [{"internalType": "bytes[]","name": "decryptedArguments","type": "bytes[]"},{"internalType": "bytes[]","name": "plaintextArguments","type": "bytes[]"}],"name": "onDecrypt","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [{"internalType": "bytes","name": "_encrypted","type": "bytes"}],"name": "submitEncrypted","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [{"internalType": "bytes","name": "_plaintext","type": "bytes"}],"name": "submitPlaintext","outputs": [],"stateMutability": "nonpayable","type": "function"}]';

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

            const encryptedNumber = await bite.encryptMessage(hexValue);
            
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
        const currentBlock = await provider.getBlockNumber();
        console.log(`Current block: ${currentBlock}`);
        
        // Poll for next block
        let nextBlock = currentBlock;
        while (nextBlock <= currentBlock) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            nextBlock = await provider.getBlockNumber();
        }
        console.log(`✓ Next block created: ${nextBlock}`);

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

runSampleBITE1( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY );
runSampleBITE2( providerUrl, chainID, INSECURE_ETH_PRIVATE_KEY );