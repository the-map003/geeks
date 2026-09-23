<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Edit problem · Admin', robots: 'noindex' });
const route = useRoute();
</script>

<template>
  <ProblemEditor :id="route.params.id as string" />
</template>
