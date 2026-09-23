<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Edit article · Admin', robots: 'noindex' });
const route = useRoute();
</script>

<template>
  <ArticleEditor :id="route.params.id as string" />
</template>
