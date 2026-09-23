<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'New course · Admin', robots: 'noindex' });
</script>

<template>
  <CourseEditor />
</template>
