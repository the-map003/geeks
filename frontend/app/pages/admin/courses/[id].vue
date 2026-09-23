<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Edit course · Admin', robots: 'noindex' });
const route = useRoute();
</script>

<template>
  <CourseEditor :id="route.params.id as string" />
</template>
