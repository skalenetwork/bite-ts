import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      // Ensure we can resolve the local package if depending on how it's linked
    }
  }
});
