import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/html-self-closing': 'off',
    // Optional props are typed with `?:`; an explicit `undefined` default adds nothing.
    'vue/require-default-prop': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
  },
});
