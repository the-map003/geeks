<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Quizzes · Admin', robots: 'noindex' });
</script>

<template>
  <AdminContentTable resource="quizzes" title="Quizzes" subtitle="Multiple-choice quizzes scored on the server." public-path="/quizzes" :columns="[{ key: 'difficulty', label: 'Difficulty' }, { key: 'questions', label: 'Questions' }, { key: 'attemptCount', label: 'Attempts' }]">
    <template #cell-questions="{ row }">{{ (row._count as { questions: number } | undefined)?.questions ?? 0 }}</template>
  </AdminContentTable>
</template>
