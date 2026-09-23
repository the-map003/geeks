<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next';
import { LANGUAGE_LABEL, STATUS_LABEL } from '~/utils/format';

definePageMeta({ middleware: 'auth' });
useSeoMeta({ title: 'My submissions', robots: 'noindex' });

const status = ref('');
const language = ref('');
const filters = computed(() => ({ status: status.value || undefined, language: language.value || undefined }));

const statusOptions = [{ value: '', label: 'All verdicts' }, ...Object.entries(STATUS_LABEL).filter(([k]) => !['PENDING', 'RUNNING'].includes(k)).map(([value, label]) => ({ value, label }))];
const languageOptions = [{ value: '', label: 'All languages' }, ...Object.entries(LANGUAGE_LABEL).map(([value, label]) => ({ value, label }))];
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="inline-flex items-center gap-2 text-3xl font-bold tracking-tight text-ink"><ListChecks class="h-7 w-7 text-brand-500" /> My submissions</h1>
        <p class="mt-1 text-ink-muted">Every solution you have submitted to the judge. Expand a row to see the code and per-test results.</p>
      </div>
      <div class="flex gap-2">
        <UiSelect v-model="status" :options="statusOptions" size="sm" class="w-44" />
        <UiSelect v-model="language" :options="languageOptions" size="sm" class="w-44" />
      </div>
    </div>
    <div class="mt-6"><SubmissionList show-problem :page-size="20" :filters="filters" /></div>
  </div>
</template>
