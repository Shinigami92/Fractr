import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Fractr/' : undefined,
  plugins: [tailwindcss(), vue()],
  build: {
    target: 'esnext',
  },
}));
