import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type * as Api from './server/api';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tuttialcuni-review-api',
      configureServer(server) {
        // L'API è TypeScript che importa core: la carichiamo tramite Vite (SSR), non da Node nativo.
        const dataDir = process.env.DATA_DIR ?? path.join(root, 'data');
        server.middlewares.use(async (req, res, next) => {
          const { createApi } = (await server.ssrLoadModule('/server/api.ts')) as typeof Api;
          return createApi({ dataDir })(req, res, next);
        });
      },
    },
  ],
});
