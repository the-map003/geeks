<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'New quiz · Admin', robots: 'noindex' });
</script>

<template>
  <QuizEditor />
</template>
