import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './scripts/seo-plugin';

export default defineConfig({
  plugins: [react(), seoPlugin()],
  server: {
    port: 5173
  }
});
