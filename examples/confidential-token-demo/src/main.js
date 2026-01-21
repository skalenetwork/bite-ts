import { encryptTokenTransfer, decryptBalance } from './encryption';

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
    const chainID = document.getElementById('chainID').value;
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
            gas: '0x30d40', // 200,000 gas 
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

