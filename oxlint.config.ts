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
    nursery: 'error',
  },
  rules: {
    'typescript/consistent-type-imports': 'error',
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
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
