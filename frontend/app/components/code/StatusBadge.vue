<script setup lang="ts">
import { CheckCircle2, Clock, Loader2, XCircle, AlertTriangle, Cpu, Bug } from 'lucide-vue-next';
import type { SubmissionStatus } from '~/types/api';
import { STATUS_CLASS, STATUS_LABEL } from '~/utils/format';

withDefaults(defineProps<{ status: SubmissionStatus; size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' });

const icons: Record<SubmissionStatus, unknown> = {
  PENDING: Clock,
  RUNNING: Loader2,
  ACCEPTED: CheckCircle2,
  WRONG_ANSWER: XCircle,
  TIME_LIMIT_EXCEEDED: Clock,
  MEMORY_LIMIT_EXCEEDED: Cpu,
  RUNTIME_ERROR: Bug,
  COMPILE_ERROR: AlertTriangle,
  INTERNAL_ERROR: AlertTriangle,
};
const sizeClass = { xs: 'px-1.5 py-0.5 text-[11px] gap-1', sm: 'px-2 py-0.5 text-xs gap-1', md: 'px-2.5 py-1 text-sm gap-1.5' };
</script>

<template>
  <span class="inline-flex items-center rounded-full font-semibold leading-none" :class="[STATUS_CLASS[status], sizeClass[size]]">
    <component :is="icons[status]" class="h-3.5 w-3.5" :class="status === 'RUNNING' ? 'animate-spin' : ''" aria-hidden="true" />
    {{ STATUS_LABEL[status] }}
  </span>
</template>
