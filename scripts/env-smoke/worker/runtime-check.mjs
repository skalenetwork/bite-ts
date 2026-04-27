import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 8788;
const TARGET_URL = `http://${HOST}:${PORT}`;

async function waitForWorker(url, timeoutMs = 60000) {
    const start = Date.now();
    let lastResponse = '';

    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            lastResponse = text;
            const json = JSON.parse(text);

            if (response.ok && json.ok === true && json.result === 'PASS worker-smoke') {
                return;
            }

            if (json.ok === false && typeof json.error === 'string' && json.error.length > 0) {
                throw new Error(`Worker returned runtime error: ${json.error}`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Worker returned runtime error:')) {
                throw error;
            }

            // Ignore until worker is up and returns valid JSON.
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for healthy worker response at ${url}. Last response: ${lastResponse}`);
}

async function main() {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const worker = spawn(npmCmd, ['run', 'dev'], {
        cwd: fileURLToPath(new URL('.', import.meta.url)),
        stdio: 'pipe'
    });

    worker.stdout.on('data', (chunk) => process.stdout.write(chunk));
    worker.stderr.on('data', (chunk) => process.stderr.write(chunk));

    try {
        await waitForWorker(TARGET_URL);
        console.log('PASS worker-runtime');
    } finally {
        worker.kill('SIGTERM');
    }
}

main().catch((error) => {
    console.error('FAIL worker-runtime');
    console.error(error);
    process.exit(1);
});
