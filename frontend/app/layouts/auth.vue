<template>
  <div class="min-h-screen bg-[#f5f5f5] font-sans">
    <!--
      Reference auth screen (auth.geeksforgeeks.org): no header or footer, a #f5f5f5 page under a
      translucent grey overlay, and a 550px modal-style card 70px from the top holding the logo,
      the Sign In / Sign Up tabs and the form.
    -->
    <main class="min-h-screen bg-[rgba(183,179,179,0.4)] px-3 pb-12 pt-[30px] sm:px-6 sm:pt-[70px]">
      <slot />
    </main>
    <ClientOnly><UiToastContainer /></ClientOnly>
  </div>
</template>
