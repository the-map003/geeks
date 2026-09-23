<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'New tutorial · Admin', robots: 'noindex' });
</script>

<template>
  <TutorialEditor />
</template>
