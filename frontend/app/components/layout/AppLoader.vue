<script setup lang="ts">
/**
 * Reference loading screen (`.defaultLoaderContainer`): a fixed, full-viewport panel in the page
 * colour with the green mark centred and blinking (`blinker .8s ease-in-out infinite`).
 * It is server-rendered visible, so it shows from the first paint until the app has mounted, and it
 * comes back for client-side navigations that take longer than a moment (the reference shows it when
 * moving between its apps, e.g. home -> Courses).
 */
const nuxtApp = useNuxtApp();
const { isLoading } = useLoadingIndicator();

const mounted = ref(false);
const slowNavigation = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

nuxtApp.hook('app:mounted', () => {
  // Let the first frame paint, then fade the boot screen away.
  requestAnimationFrame(() => (mounted.value = true));
});

watch(isLoading, (loading) => {
  if (timer) clearTimeout(timer);
  if (loading) {
    // Only cover the page for navigations that are noticeably slow, so quick hops do not flash.
    timer = setTimeout(() => (slowNavigation.value = true), 180);
  } else {
    slowNavigation.value = false;
  }
});

onBeforeUnmount(() => timer && clearTimeout(timer));

const visible = computed(() => !mounted.value || slowNavigation.value);
</script>

<template>
  <Transition leave-active-class="transition-opacity duration-300 ease-out" leave-to-class="opacity-0">
    <div v-if="visible" class="fixed inset-0 z-[999999] bg-page" role="status" aria-live="polite" aria-label="Loading">
      <div class="flex h-screen w-screen items-center justify-center motion-safe:animate-[gfg-blinker_0.8s_ease-in-out_infinite]">
        <svg viewBox="0 0 59.077 29.539" class="h-[39px] w-[76.5px]" aria-hidden="true">
          <path
            d="M193.664,1471.966H169.257a9.748,9.748,0,0,1,17.129-5.146l3.55-3.57a14.77,14.77,0,0,0-25.724,8.716h-.085a14.77,14.77,0,0,0-25.724-8.716l3.55,3.57a9.748,9.748,0,0,1,17.129,5.146H134.674q-.043.565-.044,1.141a14.771,14.771,0,0,0,29.149,3.383h.778a14.769,14.769,0,0,0,29.149-3.383Q193.708,1472.531,193.664,1471.966ZM149.4,1482.855a9.749,9.749,0,0,1-9.151-6.385h18.3A9.75,9.75,0,0,1,149.4,1482.855Zm29.538,0a9.75,9.75,0,0,1-9.152-6.385h18.3A9.75,9.75,0,0,1,178.939,1482.855Z"
            transform="translate(-134.631 -1458.338)"
            fill="#2f8d46"
          />
        </svg>
      </div>
    </div>
  </Transition>
</template>
