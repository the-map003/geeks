export type Language = 'PYTHON' | 'JAVASCRIPT' | 'CPP' | 'JAVA';

export type TestStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'INTERNAL_ERROR';

export interface TestInput {
  id: string;
  input: string;
  /** When omitted the test is a "custom input" run and is reported as ACCEPTED if it ran without error. */
  expectedOutput?: string;
}

export interface ExecuteRequest {
  language: Language;
  sourceCode: string;
  tests: TestInput[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface TestResult {
  id: string;
  status: TestStatus;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb: number | null;
}

export interface ExecuteResponse {
  compile: { ok: boolean; output: string };
  results: TestResult[];
  driver: 'local' | 'docker';
}

export interface Driver {
  readonly name: 'local' | 'docker';
  supports(language: Language): boolean;
  execute(req: ExecuteRequest): Promise<ExecuteResponse>;
}

/** Output comparison: trailing whitespace on each line and trailing blank lines are ignored. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
