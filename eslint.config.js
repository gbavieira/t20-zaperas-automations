export default [
  {
    ignores: ['node_modules/**', 'packs/**', 'dist/**']
  },
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Foundry VTT globals
        game: 'readonly',
        ui: 'readonly',
        canvas: 'readonly',
        CONFIG: 'readonly',
        Actors: 'readonly',
        Items: 'readonly',
        ChatMessage: 'readonly',
        ActiveEffect: 'readonly',
        Token: 'readonly',
        MeasuredTemplate: 'readonly',
        Dialog: 'readonly',
        Hooks: 'readonly',
        foundry: 'readonly',
        renderTemplate: 'readonly',
        Sequence: 'readonly',
        FilePicker: 'readonly',
        TextEditor: 'readonly',
        Roll: 'readonly',
        DocumentSheetV2: 'readonly',
        ApplicationV2: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error'
    }
  }
];
