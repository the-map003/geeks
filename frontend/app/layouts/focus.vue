<template>
  <div class="flex h-screen flex-col bg-surface">
    <AppHeader />
    <main class="min-h-0 flex-1">
      <slot />
    </main>
    <ClientOnly>
      <MobileDrawer />
      <UiToastContainer />
    </ClientOnly>
  </div>
</template>
