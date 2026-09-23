<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Edit tutorial · Admin', robots: 'noindex' });
const route = useRoute();
</script>

<template>
  <TutorialEditor :id="route.params.id as string" />
</template>
