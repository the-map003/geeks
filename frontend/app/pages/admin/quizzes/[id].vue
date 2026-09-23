<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Edit quiz · Admin', robots: 'noindex' });
const route = useRoute();
</script>

<template>
  <QuizEditor :id="route.params.id as string" />
</template>
