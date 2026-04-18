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
    'max-lines-per-function': 'off',
    'max-lines': 'off',
    'no-inline-comments': 'off',
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],

    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'import/max-dependencies': 'off',

    'typescript/consistent-type-imports': 'error',
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
