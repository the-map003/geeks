<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter v-if="!route.meta.hideFooter" />
    <ClientOnly>
      <MobileDrawer />
      <UiToastContainer />
    </ClientOnly>
  </div>
</template>
