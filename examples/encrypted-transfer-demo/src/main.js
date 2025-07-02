import { ethers } from 'ethers';
import { BITE } from '@skalenetwork/bite';

const sendButton = document.getElementById('sendButton');
const amountInput = document.getElementById('amount');
const destinationAddress = document.getElementById('destinationAddress');

const SCHAIN_ENDPOINT = import.meta.env.VITE_SCHAIN_ENDPOINT;
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL;
const TRANSFER_CONTRACT_ADDRESS = import.meta.env.VITE_TRANSFER_CONTRACT;
const bite = new BITE(SCHAIN_ENDPOINT);
let currentAccount = null;

if (typeof window.ethereum === 'undefined') {
    alert('MetaMask is not installed!');
}
function encodeTransferData(recipient, amount) {
    const abi = new ethers.Interface([
        'function transfer(address to, uint256 amount)'
    ]);
    return abi.encodeFunctionData('transfer', [recipient, amount]);
}

sendButton.addEventListener('click', async () => {
    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];

        const recipient = destinationAddress.value.trim();
        const amount = amountInput.value.trim();

        if (!recipient || !amount) {
            alert('Please enter both recipient and amount.');
            return;
        }

        const data = encodeTransferData(recipient, amount);

        const txParams = {
            from: currentAccount,
            to: TRANSFER_CONTRACT_ADDRESS,
            value: '0x0',
            data,
        };

        const encryptedParams = await bite.encryptTransaction(txParams);
        console.log('Encrypted Params:', encryptedParams);

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [encryptedParams],
        });

        console.log('Transaction hash:', txHash);
        await waitForReceipt(txHash, SCHAIN_ENDPOINT);

        const decryptedData = await bite.getDecryptedTransactionData(txHash);
        const explorerUrl = `${EXPLORER_URL}/tx/${txHash}`;

        const decryptedQueue = document.getElementById('decryptedQueue');
        const placeholder = document.getElementById('decryptedTxContent');
        if (placeholder) placeholder.remove();

        const item = document.createElement('div');
        item.className =
            'bg-card border border-white/10 p-5 rounded-2xl shadow-md animate-fade-in space-y-3';

        item.innerHTML = `
  <div>
    <strong class="text-accent">Transaction:</strong>
    <a href="${explorerUrl}" target="_blank"
       class="text-blue-400 hover:underline break-words transition duration-200 ease-in-out">
      ${txHash}
    </a>
  </div>
  <div>
    <strong class="text-accent">Decrypted data:</strong>
    <pre class="bg-black/60 border border-white/10 text-white rounded-xl px-4 py-3 text-sm overflow-x-auto whitespace-pre-wrap break-words">
${decryptedData}
    </pre>
  </div>
`;

        decryptedQueue.appendChild(item);


        decryptedQueue.appendChild(item);
    } catch (error) {
        console.error(error);
        alert(`Transaction failed: ${error.message}`);
    }
});

async function fetchPendingTransactions() {
    try {
        const response = await fetch(SCHAIN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_pendingTransactions',
                params: [],
                id: 1,
            }),
        });

        const { result: txs = [] } = await response.json();
        const queueElement = document.getElementById('pendingQueue');
        queueElement.innerHTML = '';

        if (txs.length === 0) {
            queueElement.innerHTML = '<div class="alert alert-secondary">No pending transactions</div>';
        } else {
            txs.forEach((tx) => {
                const item = document.createElement('div');
                item.className = 'pending-item';
                item.innerHTML = `
          <strong>Hash:</strong> <code>${tx.hash}</code><br>
          <strong>From:</strong> <code>${tx.from}</code><br>
          <strong>To:</strong> <code>${tx.to}</code><br>
          <strong>Nonce:</strong> <code>${tx.nonce}</code><br>
          <strong>Data:</strong> <code style="word-break: break-word;">${tx.data}</code>
        `;
                queueElement.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching pending transactions:', error);
    }
}

async function waitForReceipt(txHash, rpcUrl, interval = 1000, timeout = 600000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const timer = setInterval(async () => {
            if (Date.now() - start > timeout) {
                clearInterval(timer);
                return reject(new Error('Timeout waiting for transaction receipt'));
            }

            try {
                const res = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getTransactionReceipt',
                        params: [txHash],
                        id: 1,
                    }),
                });

                const { result } = await res.json();
                if (result) {
                    clearInterval(timer);
                    resolve(result);
                }
            } catch (e) {}
        }, interval);
    });
}

setInterval(fetchPendingTransactions, 1000);
fetchPendingTransactions();