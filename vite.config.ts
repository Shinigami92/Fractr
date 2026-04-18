import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import Icons from 'unplugin-icons/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

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
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Vite hook receives mutable context
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.wgsl')) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
      // oxlint-disable-next-line unicorn/no-useless-undefined -- consistent-return requires an explicit value
      return undefined;
    },
  };
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Vite config callback receives mutable env
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Fractr/' : undefined,
  plugins: [
    tailwindcss(),
    vue(),
    Icons({ compiler: 'vue3', scale: 1, defaultClass: 'inline-block' }),
    wgslFullReload(),
    basicSsl(),
  ],
  define: {
    __COMMIT_SHA__: JSON.stringify(mode === 'production' ? getCommitSha() : 'dev'),
  },
  build: {
    target: 'esnext',
  },
}));
