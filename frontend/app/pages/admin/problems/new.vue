<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'New problem · Admin', robots: 'noindex' });
</script>

<template>
  <ProblemEditor />
</template>
