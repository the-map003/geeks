// Provide the Nuxt auto-imports that the tested components rely on.
import * as vue from 'vue';
import { config } from '@vue/test-utils';

let idCounter = 0;
Object.assign(globalThis, {
  computed: vue.computed,
  ref: vue.ref,
  reactive: vue.reactive,
  watch: vue.watch,
  watchEffect: vue.watchEffect,
  nextTick: vue.nextTick,
  onMounted: vue.onMounted,
  onBeforeUnmount: vue.onBeforeUnmount,
  onUnmounted: vue.onUnmounted,
  defineNuxtComponent: (c: unknown) => c,
  useId: () => `test-id-${++idCounter}`,
});

config.global.stubs = {
  NuxtLink: { props: ['to'], template: '<a :href="typeof to === \'string\' ? to : \'#\'"><slot /></a>' },
  ClientOnly: { template: '<div><slot /></div>' },
  Teleport: true,
};
