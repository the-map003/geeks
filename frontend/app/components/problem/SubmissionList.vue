<script setup lang="ts">
import { ChevronDown, ListChecks } from 'lucide-vue-next';
import type { Paginated, Submission } from '~/types/api';
import { LANGUAGE_LABEL, formatDateTime } from '~/utils/format';

const props = withDefaults(defineProps<{ problemSlug?: string; showProblem?: boolean; pageSize?: number; filters?: Record<string, string | undefined> }>(), {
  showProblem: false,
  pageSize: 10,
  filters: () => ({}),
});
const emit = defineEmits<{ 'load-code': [submission: Submission] }>();

const api = useApi();
const auth = useAuthStore();
const route = useRoute();

const page = ref(1);
const items = ref<Submission[]>([]);
const total = ref(0);
const totalPages = ref(1);
const status = ref<'pending' | 'success' | 'error'>('pending');
const errorMessage = ref('');
const expanded = ref<string | null>(null);
const details = ref<Record<string, Submission>>({});

async function load() {
  if (!auth.isAuthenticated) {
    status.value = 'success';
    return;
  }
  status.value = 'pending';
  try {
    const res = await api.get<Paginated<Submission>>('/submissions', { problem: props.problemSlug, page: page.value, pageSize: props.pageSize, ...props.filters });
    items.value = res.items;
    total.value = res.total;
    totalPages.value = res.totalPages;
    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = isApiError(err) ? err.message : 'Failed to load submissions';
  }
}

async function toggle(s: Submission) {
  if (expanded.value === s.id) {
    expanded.value = null;
    return;
  }
  expanded.value = s.id;
  if (!details.value[s.id]) {
    try {
      const res = await api.get<{ submission: Submission }>(`/submissions/${s.id}`);
      details.value[s.id] = res.submission;
    } catch {
      /* shown as loading */
    }
  }
}

onMounted(load);
watch([page, () => props.filters, () => auth.isAuthenticated], load, { deep: true });
defineExpose({ reload: () => { page.value = 1; load(); } });
</script>

<template>
  <div>
    <ClientOnly>
      <UiEmptyState v-if="!auth.isAuthenticated" title="Sign in to see your submissions" description="Your submission history is private to your account." compact :icon="ListChecks">
        <UiButton :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" size="sm">Sign in</UiButton>
      </UiEmptyState>
      <template v-else>
        <div v-if="status === 'pending' && !items.length" class="space-y-2"><UiSkeleton v-for="i in 4" :key="i" variant="row" /></div>
        <UiErrorState v-else-if="status === 'error'" :message="errorMessage" compact @retry="load" />
        <UiEmptyState v-else-if="!items.length" title="No submissions yet" description="Submit a solution and it will appear here." compact :icon="ListChecks" />
        <div v-else class="overflow-hidden rounded-lg border border-line">
          <div class="hidden grid-cols-[1fr_150px_120px_90px_32px] gap-3 bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid" :class="showProblem ? '' : ''">
            <span>{{ showProblem ? 'Problem / Status' : 'Status' }}</span><span>Submitted</span><span>Language</span><span>Runtime</span><span />
          </div>
          <div v-for="s in items" :key="s.id" class="border-t border-line first:border-t-0">
            <button type="button" class="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-muted sm:grid-cols-[1fr_150px_120px_90px_32px] sm:gap-3" @click="toggle(s)">
              <span class="min-w-0">
                <NuxtLink v-if="showProblem" :to="`/problems/${s.problem.slug}`" class="block truncate text-sm font-medium text-ink hover:text-brand-700" @click.stop>{{ s.problem.title }}</NuxtLink>
                <span class="mt-0.5 inline-flex items-center gap-2"><StatusBadge :status="s.status" size="xs" /><span class="text-xs text-ink-muted">{{ s.passedCount }}/{{ s.totalCount }}</span></span>
              </span>
              <span class="hidden text-sm text-ink-muted sm:block">{{ formatDateTime(s.createdAt) }}</span>
              <span class="hidden text-sm text-ink-muted sm:block">{{ LANGUAGE_LABEL[s.language] }}</span>
              <span class="hidden text-sm text-ink-muted sm:block">{{ s.runtimeMs != null ? `${s.runtimeMs} ms` : '—' }}</span>
              <ChevronDown class="h-4 w-4 text-ink-muted transition-transform" :class="expanded === s.id ? 'rotate-180' : ''" />
            </button>
            <div v-if="expanded === s.id" class="border-t border-line bg-surface-muted p-3">
              <div v-if="!details[s.id]" class="py-4"><UiSpinner label="Loading submission…" /></div>
              <div v-else class="space-y-3">
                <div class="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span>{{ LANGUAGE_LABEL[s.language] }}</span><span>·</span><span>{{ formatDateTime(s.createdAt) }}</span>
                  <span v-if="details[s.id]!.memoryKb">· {{ Math.round(details[s.id]!.memoryKb! / 1024) }} MB</span>
                  <UiButton size="xs" variant="secondary" class="ml-auto" @click="emit('load-code', details[s.id]!)">Load into editor</UiButton>
                </div>
                <div v-if="details[s.id]!.compileOutput" class="rounded-md border border-purple-200 bg-purple-50 p-2"><pre class="whitespace-pre-wrap font-mono text-[12px] text-purple-900">{{ details[s.id]!.compileOutput }}</pre></div>
                <div v-if="details[s.id]!.errorMessage && !details[s.id]!.compileOutput" class="rounded-md border border-red-200 bg-red-50 p-2"><pre class="whitespace-pre-wrap font-mono text-[12px] text-red-800">{{ details[s.id]!.errorMessage }}</pre></div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(r, i) in details[s.id]!.testResults" :key="r.id" class="rounded px-2 py-0.5 text-[11px] font-semibold" :class="r.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" :title="r.status">{{ i + 1 }}</span>
                </div>
                <pre class="max-h-72 overflow-auto rounded-md bg-[#0f172a] p-3 font-mono text-[12.5px] leading-relaxed text-gray-100">{{ details[s.id]!.sourceCode }}</pre>
              </div>
            </div>
          </div>
        </div>
        <UiPagination v-if="totalPages > 1" v-model:page="page" :total-pages="totalPages" :total="total" :page-size="pageSize" class="mt-4" />
      </template>
    </ClientOnly>
  </div>
</template>
