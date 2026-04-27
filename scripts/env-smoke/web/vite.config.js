import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [wasm(), topLevelAwait()],
    resolve: {
        alias: {
            '@skalenetwork/t-encrypt': fileURLToPath(new URL('./src/t-encrypt-shim.js', import.meta.url))
        }
    },
    server: {
        host: '127.0.0.1',
        port: 4173
    }
});
