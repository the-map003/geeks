declare module 'markdown-it-container' {
  import type MarkdownIt from 'markdown-it';

  interface ContainerOptions {
    validate?: (params: string) => boolean;
    render?: (tokens: Array<{ nesting: number; info: string }>, idx: number) => string;
    marker?: string;
  }

  const container: (md: MarkdownIt, name: string, options?: ContainerOptions) => void;
  export default container;
}
