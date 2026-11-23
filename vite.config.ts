import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: process.env.GH_PAGES ? '/su-crystal-journal-en/' : '/', plugins: [react()], server: { port: 5175, strictPort: true } });
