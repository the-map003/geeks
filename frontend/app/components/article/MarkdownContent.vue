<script setup lang="ts">
import { LANG_LABELS, renderMarkdown } from '~/utils/markdown';

const props = withDefaults(defineProps<{ source: string; compact?: boolean }>(), { compact: false });
const emit = defineEmits<{ toc: [items: ReturnType<typeof renderMarkdown>['toc']] }>();

const rendered = computed(() => renderMarkdown(props.source));
watch(rendered, (r) => emit('toc', r.toc), { immediate: true });

const root = ref<HTMLElement | null>(null);

/** Progressive enhancement: group consecutive code blocks inside `::: tabs` into a tab strip and wire copy buttons. */
function enhance() {
  const el = root.value;
  if (!el) return;

  el.querySelectorAll<HTMLElement>('[data-code-tabs]:not([data-enhanced])').forEach((group) => {
    group.setAttribute('data-enhanced', 'true');
    const blocks = Array.from(group.querySelectorAll<HTMLElement>(':scope > .code-block'));
    if (blocks.length < 2) return;
    const bar = document.createElement('div');
    bar.className = 'code-tabs__bar';
    bar.setAttribute('role', 'tablist');
    const preferred = localStorage.getItem('gfg:codeLang');
    let activeIdx = Math.max(0, blocks.findIndex((b) => b.dataset.lang === preferred));
    const buttons: HTMLButtonElement[] = [];

    const activate = (i: number) => {
      activeIdx = i;
      blocks.forEach((b, k) => b.classList.toggle('is-active', k === i));
      buttons.forEach((btn, k) => {
        btn.classList.toggle('is-active', k === i);
        btn.setAttribute('aria-selected', String(k === i));
      });
      const lang = blocks[i]?.dataset.lang;
      if (lang && lang !== 'output') {
        try {
          localStorage.setItem('gfg:codeLang', lang);
        } catch {
          /* ignore */
        }
      }
    };

    blocks.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-tabs__tab';
      btn.setAttribute('role', 'tab');
      btn.textContent = b.dataset.label || LANG_LABELS[b.dataset.lang ?? ''] || b.dataset.lang || 'Code';
      btn.addEventListener('click', () => activate(i));
      buttons.push(btn);
      bar.appendChild(btn);
      b.querySelector('.code-block__lang')?.classList.add('sr-only');
    });
    group.prepend(bar);
    activate(activeIdx);
  });

  el.querySelectorAll<HTMLButtonElement>('[data-copy]:not([data-enhanced])').forEach((btn) => {
    btn.setAttribute('data-enhanced', 'true');
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code-block')?.querySelector('code')?.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy'), 1500);
      } catch {
        btn.textContent = 'Failed';
        setTimeout(() => (btn.textContent = 'Copy'), 1500);
      }
    });
  });
}

onMounted(enhance);
watch(() => rendered.value.html, () => nextTick(enhance));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- content is rendered from Markdown with raw HTML disabled -->
  <div ref="root" class="prose-gfg" :class="compact ? 'prose-gfg--compact' : ''" v-html="rendered.html" />
</template>
