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
  rules: {
    'typescript/consistent-type-imports': 'error',
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
  },
  env: {
    builtin: true,
  },
});
