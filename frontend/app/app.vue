<template>
  <!-- Reference: nprogress bar on route changes (#29D, 3px) plus the blinking-logo loading screen -->
  <NuxtLoadingIndicator color="#2299dd" :height="3" :throttle="120" />
  <AppLoader />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
