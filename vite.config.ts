import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// WGSL sources are concatenated into compiled GPU pipelines that are cached at
// runtime. ?raw imports don't propagate HMR through that pipeline cache, so any
// .wgsl change forces a full reload — URL state restores camera/fractal/etc.
function wgslFullReload(): Plugin {
  return {
    name: 'wgsl-full-reload',
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.wgsl')) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Fractr/' : undefined,
  plugins: [tailwindcss(), vue(), wgslFullReload(), basicSsl()],
  define: {
    __COMMIT_SHA__: JSON.stringify(mode === 'production' ? getCommitSha() : 'dev'),
  },
  build: {
    target: 'esnext',
  },
}));
