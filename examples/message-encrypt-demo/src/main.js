import { BITE } from '@skalenetwork/bite';

const sendButton = document.getElementById('sendButton');
const messageInput = document.getElementById('message');
const destinationAddress = document.getElementById('destinationAddress');


// message = '0xdf42aaf30000000000000000000000000000000000000000000000000000000000000001';

let currentAccount = null;
const SCHAIN_ENDPOINT = import.meta.env.VITE_SCHAIN_ENDPOINT;
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL;
const bite = new BITE(SCHAIN_ENDPOINT);
console.log(SCHAIN_ENDPOINT)
// Check MetaMask
if (typeof window.ethereum === 'undefined') {
    alert('MetaMask is not installed!');
}

sendButton.addEventListener('click', async () => {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    currentAccount = accounts[0];
    const recipientAddress = destinationAddress.value !== ""
        ? destinationAddress.value // contract
        : '0x668DaE6e09A8e202014CF302c539df97Be6BEB2f'; // regular wallet

    let message = messageInput.value.trim();
    if (!message) {
        alert('Please enter a message to encrypt.');
        return;
    }

    try {
        const txParams = {
            from: currentAccount,
            to: recipientAddress,
            value: '0x0',
            data: message,
        };

        const encryptedParams = await bite.encryptTransaction(txParams);
        console.log('Encrypted Params: ', encryptedParams);

        // Send transaction via MetaMask
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [encryptedParams],
        });
        console.log('Transaction hash:', txHash);

        // Wait for transaction receipt
        await waitForReceipt(txHash, SCHAIN_ENDPOINT);

        const decryptedData = await bite.getDecryptedTransactionData(txHash);
        const explorerOriginalUrl = `${EXPLORER_URL}/tx/${txHash}`;

        const decryptedQueue = document.getElementById('decryptedQueue');
        const placeholder = document.getElementById('decryptedTxContent');
        if (placeholder) placeholder.remove();

        const item = document.createElement('div');
        item.className = 'pending-item';
        item.innerHTML = `
          <strong>Transaction:</strong> <a href="${explorerOriginalUrl}" target="_blank">${txHash}</a><br>
          <strong>Decrypted data:</strong> <code>${decryptedData}</code>
        `;
        decryptedQueue.appendChild(item);

    } catch (error) {
        console.error(error);
        alert(`Transaction failed: ${error.message}`);
    }
});


let pendingCheckInterval = null;
let hasPending = false;

async function fetchPendingTransactions() {
    try {
        const response = await fetch(SCHAIN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_pendingTransactions',
                params: [],
                id: 1,
            }),
        });

        const data = await response.json();
        const txs = data.result || [];

        const queueElement = document.getElementById('pendingQueue');
        queueElement.innerHTML = '';

        if (txs.length === 0) {
            queueElement.innerHTML = '<div class="pending-item">No pending transactions</div>';
        } else {
            hasPending = true;
            clearInterval(pendingCheckInterval);
            txs.forEach(tx => {
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

async function pauseConsensus(endpoint, pause) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'debug_pauseConsensus',
                params: [pause],
                id: 1,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('RPC Error:', data.error);
            alert(`Failed to pause consensus: ${data.error.message}`);
        } else {
            if (pause) {
                console.log('Consensus paused:', data.result);
            } else {
                console.log('Consensus resumed:', data.result);
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Failed to connect to node.');
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
            } catch (e) {
            }
        }, interval);
    });
}

async function getDecryptedTransactionData(endpoint, transactionHash) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'bite_getDecryptedTransactionData',
            params: [transactionHash],
            id: 1,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
}

setInterval(fetchPendingTransactions, 1000);
fetchPendingTransactions();
