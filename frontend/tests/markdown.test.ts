import { describe, expect, it } from 'vitest';
import { markdownToText, renderMarkdown, slugifyHeading } from '../app/utils/markdown';

describe('renderMarkdown', () => {
  it('renders headings with anchor ids and returns a table of contents', () => {
    const { html, toc } = renderMarkdown('## Intro\n\ntext\n\n### Details\n\nmore\n\n## Intro');
    expect(toc).toEqual([
      { id: 'intro', text: 'Intro', level: 2 },
      { id: 'details', text: 'Details', level: 3 },
      { id: 'intro-1', text: 'Intro', level: 2 },
    ]);
    expect(html).toContain('id="intro"');
    expect(html).toContain('<h3');
  });

  it('escapes raw HTML instead of executing it', () => {
    const { html } = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    // The img tag must be rendered as escaped text, never as an element with a handler.
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('drops javascript: links', () => {
    const { html } = renderMarkdown('[x](javascript:alert(1))');
    expect(html).not.toContain('href="javascript:');
  });

  it('renders tabbed code groups and highlighted fences', () => {
    const src = '::: tabs\n```python\nprint(1)\n```\n```javascript\nconsole.log(1)\n```\n:::\n\n```output\n1\n```';
    const { html } = renderMarkdown(src);
    expect(html).toContain('data-code-tabs');
    expect(html).toContain('data-lang="python"');
    expect(html).toContain('data-lang="javascript"');
    expect(html).toContain('code-block--output');
    expect(html).toContain('class="hljs language-python"');
    expect(html).toContain('data-copy');
  });

  it('opens external links in a new tab and lazy-loads images', () => {
    const { html } = renderMarkdown('[site](https://example.com) ![alt](https://example.com/a.png)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('loading="lazy"');
  });
});

describe('helpers', () => {
  it('slugifies headings', () => {
    expect(slugifyHeading('Time & Space Complexity!')).toBe('time-space-complexity');
  });
  it('produces plain-text excerpts', () => {
    expect(markdownToText('## Title\n\nSome **bold** text with `code` and [a link](https://x.y).', 60)).toBe('Title Some bold text with code and a link.');
  });
});
