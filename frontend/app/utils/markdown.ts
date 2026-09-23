import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import container from 'markdown-it-container';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import java from 'highlight.js/lib/languages/java';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import yaml from 'highlight.js/lib/languages/yaml';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', c);
hljs.registerLanguage('java', java);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('plaintext', plaintext);

const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  'c++': 'cpp',
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  html: 'xml',
  vue: 'xml',
  yml: 'yaml',
  text: 'plaintext',
  txt: 'plaintext',
  output: 'plaintext',
};

export const LANG_LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  sql: 'SQL',
  bash: 'Shell',
  json: 'JSON',
  xml: 'HTML',
  css: 'CSS',
  yaml: 'YAML',
  plaintext: 'Text',
  output: 'Output',
};

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createRenderer() {
  // html: false — raw HTML in content is escaped, never executed. Links with javascript: are rejected by markdown-it.
  const md = new MarkdownIt({ html: false, linkify: false, typographer: true, breaks: false });

  md.use(anchor, {
    level: [2, 3],
    slugify: slugifyHeading,
    permalink: anchor.permalink.headerLink({ safariReaderFix: true, class: 'heading-anchor' }),
  });

  md.use(container, 'tabs', {
    render(tokens: { nesting: number }[], idx: number) {
      return tokens[idx]!.nesting === 1 ? '<div class="code-tabs" data-code-tabs>\n' : '</div>\n';
    },
  });

  md.use(container, 'note', {
    render(tokens: { nesting: number; info: string }[], idx: number) {
      const token = tokens[idx]!;
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^note\s*/i, '') || 'Note';
        return `<div class="callout callout-note"><p class="callout-title">${escapeHtml(title)}</p>\n`;
      }
      return '</div>\n';
    },
  });

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]!;
    const rawLang = (token.info || '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    const isOutput = rawLang === 'output';
    const lang = ALIASES[rawLang] ?? rawLang;
    const supported = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const code = token.content.replace(/\n$/, '');
    let highlighted: string;
    try {
      highlighted = isOutput ? escapeHtml(code) : hljs.highlight(code, { language: supported, ignoreIllegals: true }).value;
    } catch {
      highlighted = escapeHtml(code);
    }
    const label = isOutput ? 'Output' : LANG_LABELS[supported] ?? supported;
    const langKey = isOutput ? 'output' : supported;
    return (
      `<div class="code-block${isOutput ? ' code-block--output' : ''}" data-lang="${langKey}" data-label="${escapeHtml(label)}">` +
      `<div class="code-block__header"><span class="code-block__lang">${escapeHtml(label)}</span>` +
      (isOutput ? '' : '<button type="button" class="code-block__copy" data-copy aria-label="Copy code">Copy</button>') +
      `</div><pre><code class="hljs language-${langKey}">${highlighted}</code></pre></div>\n`
    );
  };

  // Open external links in a new tab.
  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, i, options, _env, self) => self.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, self) => {
    const href = String(tokens[i]!.attrGet('href') ?? '');
    if (/^https?:\/\//i.test(href)) {
      tokens[i]!.attrSet('target', '_blank');
      tokens[i]!.attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, i, options, env, self);
  };

  // Lazy-load images.
  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, i, options, env, self) => {
    tokens[i]!.attrSet('loading', 'lazy');
    return defaultImage(tokens, i, options, env, self);
  };

  return md;
}

let renderer: ReturnType<typeof createRenderer> | null = null;

export function renderMarkdown(source: string): RenderedMarkdown {
  renderer ??= createRenderer();
  const tokens = renderer.parse(source ?? '', {});
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3')) {
      const inline = tokens[i + 1];
      const children = (inline?.children ?? []) as Array<{ type: string; content: string }>;
      const text = children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('');
      let id = slugifyHeading(text);
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n > 0) id = `${id}-${n}`;
      toc.push({ id, text, level: t.tag === 'h2' ? 2 : 3 });
    }
  }
  const html = renderer.renderer.render(tokens, renderer.options, {});
  return { html, toc };
}

/** Plain-text excerpt for meta descriptions. */
export function markdownToText(source: string, max = 160): string {
  const text = (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/:::[^\n]*/g, ' ')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
