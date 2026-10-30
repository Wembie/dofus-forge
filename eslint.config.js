import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Only the 2 classic hook rules, not react-hooks v7's full "React Compiler"
      // ruleset (static-components/refs/etc) — those flag long-standing, safe
      // patterns already throughout this codebase (e.g. a component-scoped
      // sub-component closing over props) as hard errors.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React Router route modules export these next to the component; its
      // Vite plugin handles their hot reload.
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true,
        allowExportNames: ['loader', 'clientLoader', 'action', 'clientAction', 'links', 'meta', 'headers', 'handle', 'shouldRevalidate', 'ErrorBoundary', 'HydrateFallback', 'Layout'],
      }],
      // Pattern used throughout the codebase for intentionally-unused params/destructures
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
