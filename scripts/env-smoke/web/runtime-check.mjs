import { spawn } from 'node:child_process';
import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4173;
const TARGET_URL = `http://${HOST}:${PORT}`;
const ARTIFACT_DIR = new URL('./artifacts/', import.meta.url);
const ARTIFACT_DIR_PATH = fileURLToPath(ARTIFACT_DIR);
const BROWSER_FACTORIES = {
    chromium,
    firefox,
    webkit
};

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

function getBrowsersToRun() {
    const configured = (process.env.SMOKE_BROWSERS || 'chromium,firefox')
        .split(',')
        .map((browser) => browser.trim().toLowerCase())
        .filter(Boolean);

    const unsupported = configured.filter((browser) => !BROWSER_FACTORIES[browser]);
    if (unsupported.length > 0) {
        throw new Error(`Unsupported browser(s): ${unsupported.join(', ')}`);
    }

    return configured;
}

async function runBrowserCheck(browserName, url) {
    const factory = BROWSER_FACTORIES[browserName];
    const browser = await factory.launch({ headless: true });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.body?.innerText.includes('PASS web-smoke'), null, {
            timeout: 60000
        });

        const pageText = await page.textContent('body');
        if (!pageText || !pageText.includes('PASS web-smoke')) {
            throw new Error('PASS marker was not found in page content');
        }

        return { browserName, status: 'passed' };
    } finally {
        await browser.close();
    }
}

async function runBrowserCheckWithRetry(browserName, url, retries = 1) {
    const failureFileBase = path.join(ARTIFACT_DIR_PATH, `web-runtime-${browserName}`);
    let attempt = 0;
    let lastError;

    while (attempt <= retries) {
        attempt += 1;
        try {
            await runBrowserCheck(browserName, url);
            console.log(`PASS web-runtime:${browserName} (attempt ${attempt})`);
            return;
        } catch (error) {
            lastError = error;
            const details = String(error?.stack ?? error);
            await fs.writeFile(`${failureFileBase}-attempt-${attempt}.log`, details, 'utf8');
            console.error(`FAIL web-runtime:${browserName} (attempt ${attempt})`);

            if (attempt <= retries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }

    throw new Error(`Browser smoke failed for ${browserName}: ${String(lastError?.message ?? lastError)}`);
}

async function main() {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const cwd = fileURLToPath(new URL('.', import.meta.url));
    const browsersToRun = getBrowsersToRun();

    await fs.mkdir(ARTIFACT_DIR_PATH, { recursive: true });

    await runCommandAndWait(npmCmd, ['run', 'build'], { cwd });

    const server = runCommand(
        npmCmd,
        ['run', 'preview', '--', '--host', HOST, '--port', String(PORT), '--strictPort'],
        { cwd }
    );

    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));

    try {
        await waitForServer(TARGET_URL);

        for (const browserName of browsersToRun) {
            await runBrowserCheckWithRetry(browserName, TARGET_URL, 1);
        }

        console.log('PASS web-runtime');
    } finally {
        await stopProcess(server);
    }
}

main().catch((error) => {
    console.error('FAIL web-runtime');
    console.error(error);
    process.exit(1);
});
