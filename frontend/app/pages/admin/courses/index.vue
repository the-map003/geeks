<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Courses · Admin', robots: 'noindex' });
</script>

<template>
  <AdminContentTable resource="courses" title="Courses" subtitle="Structured programs with modules and lessons." public-path="/courses" :columns="[{ key: 'level', label: 'Level' }, { key: 'enrollmentCount', label: 'Learners' }]" />
</template>
