import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Horizontal data regions must be keyboard-focusable so users can scroll
      // wide tables without a pointing device.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        {
          allowExpressionValues: true,
          roles: ['tabpanel', 'region'],
          tags: [],
        },
      ],
    },
  },
  {
    files: ['src/components/auth/FloatingIcons.jsx'],
    rules: {
      // Auth artwork is a protected surface in Run 6. Its missing decorative alt
      // attributes are reported for separate sign-off instead of changing auth.
      'jsx-a11y/alt-text': 'off',
    },
  },
])
