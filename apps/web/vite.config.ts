import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { swPlugin } from './pwa/plugin';

export default defineConfig({ plugins: [react(), swPlugin()] });
