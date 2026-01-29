import { encryptTokenTransfer, decryptBalance } from './encryption';
import { ethers } from 'ethers';

const connectBtn = document.getElementById('connectBtn');
const sendBtn = document.getElementById('sendBtn');
const walletAddressDisplay = document.getElementById('walletAddress');
const statusDiv = document.getElementById('status');

let account = null;

function setStatus(msg, type = 'info') {
    statusDiv.textContent = msg;
    statusDiv.className = type;
}

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            walletAddressDisplay.textContent = `Connected: ${account}`;
            connectBtn.textContent = 'Wallet Connected';
            connectBtn.disabled = true;
            sendBtn.disabled = false;
            setStatus('Wallet connected ready to send.', 'success');
        } catch (error) {
            setStatus('Failed to connect wallet: ' + error.message, 'error');
        }
    } else {
        setStatus('MetaMask is not installed!', 'error');
    }
}

async function handleSend() {
    setStatus('Generating encrypted transaction locally...', 'info');
    sendBtn.disabled = true;

    const providerUrl = document.getElementById('providerUrl').value;
    const tokenAddress = document.getElementById('tokenAddress').value;
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;

    try {
        // 1. Execute Logic Directly (Client Side)
        const result = await encryptTokenTransfer(
            providerUrl,
            window.ethereum, 
            tokenAddress, 
            recipient, 
            amount
        );

        setStatus('Transaction encrypted. Requesting signature...', 'info');

        // 2. Send transaction via MetaMask
        const txParams = {
            from: account,
            to: result.to,
            data: result.data,
            value: '0x0', // 0 ETH
            gas: '0xf4240', // 200,000 gas 
        };

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        setStatus(`Transaction sent! Hash: ${txHash}`, 'success');

    } catch (error) {
        console.error(error);
        setStatus(`Error: ${error.message}`, 'error');
    } finally {
        sendBtn.disabled = false;
    }
}

connectBtn.addEventListener('click', connectWallet);
sendBtn.addEventListener('click', handleSend);

// Auto connect if already authorized
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
            account = accounts[0];
            walletAddressDisplay.textContent = `Connected: ${account}`;
            connectBtn.textContent = 'Wallet Connected';
            connectBtn.disabled = true;
            sendBtn.disabled = false;
        }
    });
}

const decryptBtn = document.getElementById('decryptBtn');
const secretKeyInput = document.getElementById('secretKey');
const encryptedBalanceInput = document.getElementById('encryptedBalance');
const decryptResultDiv = document.getElementById('decryptResult');

function handleDecrypt() {
    try {
        const secretKey = secretKeyInput.value.trim();
        const encryptedBalance = encryptedBalanceInput.value.trim();
        
        if (!secretKey || !encryptedBalance) {
            decryptResultDiv.textContent = 'Please provide both Secret Key and Encrypted Balance.';
            decryptResultDiv.style.color = 'red';
            return;
        }

        const balance = decryptBalance(secretKey, encryptedBalance);
        decryptResultDiv.textContent = `Decrypted Balance: ${balance}`;
        decryptResultDiv.style.color = 'green';
    } catch (error) {
        decryptResultDiv.textContent = `Error: ${error.message}`;
        decryptResultDiv.style.color = 'red';
    }
}

if (decryptBtn) {
    decryptBtn.addEventListener('click', handleDecrypt);
}

/* User Management */

const generateUserBtn = document.getElementById('generateUserBtn');
const generatedUserInfo = document.getElementById('generatedUserInfo');
const genPrivKey = document.getElementById('genPrivKey');
const genPubKey = document.getElementById('genPubKey');
const genAddress = document.getElementById('genAddress');

if (generateUserBtn) {
    generateUserBtn.addEventListener('click', () => {
        const wallet = ethers.Wallet.createRandom();
        genPrivKey.textContent = wallet.privateKey;
        genPubKey.textContent = wallet.signingKey.publicKey;
        genAddress.textContent = wallet.address;
        generatedUserInfo.style.display = 'block';
    });
}

const registerUserBtn = document.getElementById('registerUserBtn');
const regPublicKeyInput = document.getElementById('regPublicKey');
const regAmountInput = document.getElementById('regAmount');

if (registerUserBtn) {
    registerUserBtn.addEventListener('click', async () => {
        try {
            const pubKeyHex = regPublicKeyInput.value.trim();
            const amount = regAmountInput.value.trim();
            const tokenAddr = document.getElementById('tokenAddress').value;

            if (!pubKeyHex || !amount || !tokenAddr) {
                 setStatus("Please fill all fields (Token Addr, Public Key, Amount)", "error");
                 return;
            }
            
            // Parse Public Key
            let cleanKey = pubKeyHex;
            if (cleanKey.startsWith('0x')) cleanKey = cleanKey.slice(2);
            // Remove 04 prefix if present and length is 130
            if (cleanKey.length === 130 && cleanKey.startsWith('04')) {
                 cleanKey = cleanKey.slice(2);       
            }

            if (cleanKey.length !== 128) {
                 setStatus("Invalid Public Key length. Expected uncompressed key (start with 04).", "error");
                 return; 
            }

            const x = "0x" + cleanKey.slice(0, 64);
            const y = "0x" + cleanKey.slice(64);

            setStatus("Registering user...", "info");

            // ABI for registerPublicKey
            const abi = [
                "function registerPublicKey((bytes32,bytes32) publicKey) payable"
            ];
            
            // Use browser provider
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(tokenAddr, abi, signer);
            
            const tx = await contract.registerPublicKey([x, y], {
                value: ethers.parseEther(amount),
                gasLimit: 500000
            });
            
            setStatus(`Registration sent! Hash: ${tx.hash}`, 'success');

        } catch (e) {
            console.error(e);
            setStatus("Error: " + e.message, "error");
        }
    });
}
