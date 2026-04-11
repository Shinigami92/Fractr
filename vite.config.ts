import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Fractr/' : undefined,
  plugins: [tailwindcss(), vue()],
  define: {
    __COMMIT_SHA__: JSON.stringify(mode === 'production' ? getCommitSha() : 'dev'),
  },
  build: {
    target: 'esnext',
  },
}));
