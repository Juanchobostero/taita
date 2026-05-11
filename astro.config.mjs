// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import path from 'path';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  env: {
    schema: {
      PUBLIC_SUPABASE_URL:      envField.string({ context: 'client', access: 'public' }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
  },
});