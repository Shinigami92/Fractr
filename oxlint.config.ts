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
    suspicious: 'error',
    pedantic: 'error',
    perf: 'error',
  },
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-inline-comments': 'off',
    'no-warning-comments': 'off',
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],

    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'import/max-dependencies': 'off',

    // category style preferences
    'typescript/array-type': ['error', { default: 'array-simple', readonly: 'generic' }],
    'typescript/consistent-type-imports': 'error',
    'typescript/prefer-find': 'error',
    'typescript/prefer-for-of': 'error',
    'typescript/prefer-function-type': 'error',

    // TODO @Shinigami92 2026-04-18: should be enabled later
    'max-lines-per-function': 'off',
    'max-lines': 'off',
  },
  env: {
    builtin: true,
    browser: true,
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    defineSlots: 'readonly',
    defineOptions: 'readonly',
    defineModel: 'readonly',
    withDefaults: 'readonly',
    GPUShaderStage: 'readonly',
    GPUBufferUsage: 'readonly',
    GPUTextureUsage: 'readonly',
    GPUMapMode: 'readonly',
    GPUColorWrite: 'readonly',
  },
  overrides: [
    {
      files: ['scripts/**/*.ts'],
      env: {
        node: true,
      },
    },
  ],
});
