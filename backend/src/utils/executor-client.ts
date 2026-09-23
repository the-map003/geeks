import type { Language, SubmissionStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from './errors.js';
import { logger } from './logger.js';

export interface ExecutorTest {
  id: string;
  input: string;
  expectedOutput?: string;
}

export interface ExecutorTestResult {
  id: string;
  status: Exclude<SubmissionStatus, 'PENDING' | 'RUNNING'>;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb: number | null;
}

export interface ExecutorResponse {
  compile: { ok: boolean; output: string };
  results: ExecutorTestResult[];
  driver: 'local' | 'docker';
}

export interface ExecutorHealth {
  status: string;
  driver: string;
  languages: Language[];
}

let healthCache: { at: number; value: ExecutorHealth | null } | null = null;

export async function executorHealth(): Promise<ExecutorHealth | null> {
  if (healthCache && Date.now() - healthCache.at < 10_000) return healthCache.value;
  try {
    const res = await fetch(`${env.EXECUTOR_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const value = res.ok ? ((await res.json()) as ExecutorHealth) : null;
    healthCache = { at: Date.now(), value };
    return value;
  } catch {
    healthCache = { at: Date.now(), value: null };
    return null;
  }
}

export async function executeCode(input: {
  language: Language;
  sourceCode: string;
  tests: ExecutorTest[];
  timeLimitMs: number;
  memoryLimitMb: number;
}): Promise<ExecutorResponse> {
  let res: Response;
  try {
    res = await fetch(`${env.EXECUTOR_URL}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-executor-key': env.EXECUTOR_KEY },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(Math.min(120_000, input.tests.length * (input.timeLimitMs + 20_000) + 60_000)),
    });
  } catch (err) {
    logger.error({ err }, 'Executor unreachable');
    throw ApiError.serviceUnavailable('The code execution service is currently unavailable. Please try again later.');
  }

  if (res.status === 422) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw ApiError.unprocessable(body.error ?? 'This language is not available on the execution service');
  }
  if (!res.ok) {
    logger.error({ status: res.status }, 'Executor returned an error');
    throw ApiError.serviceUnavailable('The code execution service failed to run your code. Please try again.');
  }
  return (await res.json()) as ExecutorResponse;
}

/** Aggregates per-test statuses into a single verdict (first failure wins in priority order). */
export function aggregateStatus(results: ExecutorTestResult[], compileOk: boolean): Exclude<SubmissionStatus, 'PENDING' | 'RUNNING'> {
  if (!compileOk) return 'COMPILE_ERROR';
  const priority: Array<ExecutorTestResult['status']> = ['INTERNAL_ERROR', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'WRONG_ANSWER'];
  for (const p of priority) if (results.some((r) => r.status === p)) return p;
  return 'ACCEPTED';
}
