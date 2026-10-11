import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Web Bluetooth only works in a secure context: https:// or http://localhost.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: 'localhost' },
});
