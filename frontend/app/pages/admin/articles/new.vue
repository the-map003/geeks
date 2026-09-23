<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'New article · Admin', robots: 'noindex' });
</script>

<template>
  <ArticleEditor />
</template>
