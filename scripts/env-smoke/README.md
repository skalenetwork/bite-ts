# bite-ts Environment Smoke Tests

This folder verifies that `@skalenetwork/bite` (with updated `@skalenetwork/t-encrypt`) works in:
- Node.js
- Web (Vite)
- Cloudflare Workers
- Bun
- Deno

All tests use real encryption (not `BITEMockup`).
They call `BITE.encryptTransactionWithCommitteeInfo(...)` with a fixed committee key fixture,
so they do not require RPC endpoints, wallets, or MetaMask.

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- Build bite-ts before running smoke tests

## 1) Build bite-ts

From repo root:

```bash
npm install
npm run build
```

## 2) Node.js smoke tests (ESM + CJS)

From repo root:

```bash
npm run smoke:node
npm run smoke:node:cjs
```

Expected output contains:

```text
PASS node-smoke
PASS node-smoke-cjs
```

## 3) Web smoke test (Vite)

Install web test dependencies:

```bash
npm --prefix scripts/env-smoke/web install
```

Build-only validation:

```bash
npm --prefix scripts/env-smoke/web run build
```

True runtime validation (headless browser in Chromium, Firefox, and WebKit):

```bash
npm --prefix scripts/env-smoke/web exec playwright install chromium firefox webkit
npm --prefix scripts/env-smoke/web run runtime
```

Runtime validation in browser:

```bash
npm --prefix scripts/env-smoke/web run dev
```

Open `http://127.0.0.1:4173` and verify page shows `PASS web-smoke`.

## 4) Cloudflare Worker smoke test

Install worker test dependencies:

```bash
npm --prefix scripts/env-smoke/worker install
```

Build/deploy dry-run validation:

```bash
npm --prefix scripts/env-smoke/worker run deploy:dry
```

Runtime validation locally:

```bash
npm --prefix scripts/env-smoke/worker run dev
curl http://127.0.0.1:8788
```

True runtime validation (automated):

```bash
npm --prefix scripts/env-smoke/worker run runtime
```

Expected JSON contains:

```json
{"ok":true,"result":"PASS worker-smoke"}
```

## 5) Additional runtime checks

### Bun

```bash
npm run smoke:bun
```

Expected output contains:

```text
PASS bun-smoke
```

### Deno

```bash
npm run smoke:deno
```

Expected output contains:

```text
PASS deno-smoke
```

### Deno edge profile

```bash
npm run smoke:edge:deno
```

Expected output contains:

```text
PASS deno-edge-smoke
```

### TypeScript consumer compatibility

```bash
npm --prefix scripts/env-smoke/ts-consumer/nodenext install
npm --prefix scripts/env-smoke/ts-consumer/bundler install
npm run smoke:ts:consumer
```

Expected output contains successful `tsc --noEmit` runs in both fixture projects.

## Notes

- If any smoke test fails after updating `@skalenetwork/t-encrypt`, check module resolution and WASM asset loading first.
- Web runtime stores browser-specific failure logs in `scripts/env-smoke/web/artifacts`.
- For stricter validation, add these smoke steps to CI for PRs that change package versions or build artifacts.
