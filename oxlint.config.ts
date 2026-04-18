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
    restriction: 'off',
  },
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-inline-comments': 'off',
    'no-warning-comments': 'off',
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],

    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'import/max-dependencies': 'off',
    'import/no-default-export': 'off',

    // category restriction preferences
    'class-methods-use-this': 'error',
    complexity: 'error',
    'default-case': 'error',
    'explicit-function-return-type': ['error', { allowExpressions: true }],
    'explicit-module-boundary-types': 'error',
    'no-use-before-define': 'error',
    'unicorn/prefer-modern-math-apis': 'error',

    // category style preferences
    'typescript/array-type': ['error', { default: 'array-simple', readonly: 'generic' }],
    'typescript/consistent-type-imports': 'error',
    'typescript/prefer-find': 'error',
    'typescript/prefer-for-of': 'error',
    'typescript/prefer-function-type': 'error',

    // TODO @Shinigami92 2026-04-18: should be enabled later
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
