import { defineConfig } from 'oxlint';

export default defineConfig({
  options: {
    reportUnusedDisableDirectives: 'error',
    typeAware: true,
    typeCheck: true,
  },
  plugins: ['import', 'oxc', 'typescript', 'unicorn', 'vue'],
  categories: {
    correctness: 'error',
  },
  rules: {},
  env: {
    builtin: true,
  },
});
