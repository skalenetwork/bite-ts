import { spawn } from 'node:child_process';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4173;
const TARGET_URL = `http://${HOST}:${PORT}`;

function runCommand(command, args, options = {}) {
    return spawn(command, args, {
        stdio: 'pipe',
        ...options
    });
}

async function waitForServer(url, timeoutMs = 60000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            // Ignore until server is up.
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for server at ${url}`);
}

async function main() {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const server = runCommand(npmCmd, ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
        cwd: new URL('.', import.meta.url)
    });

    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));

    let browser;

    try {
        await waitForServer(TARGET_URL);

        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.body?.innerText.includes('PASS web-smoke'), null, {
            timeout: 60000
        });

        const pageText = await page.textContent('body');
        if (!pageText || !pageText.includes('PASS web-smoke')) {
            throw new Error('PASS marker was not found in page content');
        }

        console.log('PASS web-runtime');
    } finally {
        if (browser) {
            await browser.close();
        }

        server.kill('SIGTERM');
    }
}

main().catch((error) => {
    console.error('FAIL web-runtime');
    console.error(error);
    process.exit(1);
});
