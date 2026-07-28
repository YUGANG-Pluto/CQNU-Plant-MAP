const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  requestAnimationFrame: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  FileReader: 'readonly',
  DOMParser: 'readonly',
  L: 'readonly'
};

const nodeGlobals = {
  __dirname: 'readonly',
  module: 'readonly',
  require: 'readonly',
  process: 'readonly',
  Buffer: 'readonly'
};

module.exports = [
  {
    ignores: ['dist/**', 'main-dist/**', 'renderer-dist/**', 'node_modules/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...browserGlobals,
        ...nodeGlobals
      }
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          vars: 'local',
          args: 'after-used',
          ignoreRestSiblings: true
        }
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-var': 'error',
      'prefer-const': 'warn'
    }
  }
];
