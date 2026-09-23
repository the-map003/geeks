<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Tutorials · Admin', robots: 'noindex' });
</script>

<template>
  <AdminContentTable resource="tutorials" title="Tutorials" subtitle="Chapter-based learning paths." public-path="/tutorials" :columns="[{ key: 'lessons', label: 'Lessons' }]">
    <template #cell-lessons="{ row }">{{ (row._count as { lessons: number } | undefined)?.lessons ?? 0 }}</template>
  </AdminContentTable>
</template>
