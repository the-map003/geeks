<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Problems · Admin', robots: 'noindex' });
</script>

<template>
  <AdminContentTable resource="problems" title="Problems" subtitle="Coding problems, test cases and editorials." public-path="/problems" :columns="[{ key: 'difficulty', label: 'Difficulty' }, { key: 'tests', label: 'Tests' }, { key: 'submissionCount', label: 'Submissions' }]">
    <template #cell-tests="{ row }">{{ (row._count as { testCases: number } | undefined)?.testCases ?? 0 }}</template>
  </AdminContentTable>
</template>
