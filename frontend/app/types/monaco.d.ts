// Monaco 0.56 ships types next to each ESM file; these module declarations cover the
// subpaths used by CodeEditor.client.vue (resolved through the package "./*" export).
declare module 'monaco-editor/editor/editor.api' {
  export * from 'monaco-editor';
}
declare module 'monaco-editor/editor/editor.worker?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
declare module 'monaco-editor/languages/definitions/python/register' {
  const _: unknown;
  export default _;
}
declare module 'monaco-editor/languages/definitions/javascript/register' {
  const _: unknown;
  export default _;
}
declare module 'monaco-editor/languages/definitions/cpp/register' {
  const _: unknown;
  export default _;
}
declare module 'monaco-editor/languages/definitions/java/register' {
  const _: unknown;
  export default _;
}
