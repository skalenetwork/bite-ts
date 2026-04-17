import { spawn } from 'node:child_process';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4173;
const TARGET_URL = `http://${HOST}:${PORT}`;

function runCommand(command, args, options = {}) {
    return spawn(command, args, {
        stdio: 'pipe',
        detached: process.platform !== 'win32',
        ...options
    });
}

async function runCommandAndWait(command, args, options = {}) {
    const child = runCommand(command, args, options);

    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));

    await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
        });
    });
}

async function stopProcess(child, timeoutMs = 5000) {
    if (!child || child.killed) {
        return;
    }

    await new Promise((resolve) => {
        let settled = false;

        const finish = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };

        child.once('exit', finish);

        if (process.platform !== 'win32' && typeof child.pid === 'number') {
            try {
                process.kill(-child.pid, 'SIGTERM');
            } catch {
                child.kill('SIGTERM');
            }
        } else {
            child.kill('SIGTERM');
        }

        setTimeout(() => {
            if (!settled) {
                if (process.platform !== 'win32' && typeof child.pid === 'number') {
                    try {
                        process.kill(-child.pid, 'SIGKILL');
                        return;
                    } catch {
                        // Fall back to killing only the direct child process.
                    }
                }

                child.kill('SIGKILL');
            }
        }, timeoutMs);
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
    const cwd = new URL('.', import.meta.url);

    await runCommandAndWait(npmCmd, ['run', 'build'], { cwd });

    const server = runCommand(
        npmCmd,
        ['run', 'preview', '--', '--host', HOST, '--port', String(PORT), '--strictPort'],
        { cwd }
    );

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

        await stopProcess(server);
    }
}

main().catch((error) => {
    console.error('FAIL web-runtime');
    console.error(error);
    process.exit(1);
});
