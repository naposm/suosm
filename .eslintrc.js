module.exports = {
  env: {
    browser: true,
    es6: false,
    jquery: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 11
  },
  rules: {
    semi: [2, 'always']
  }
}
