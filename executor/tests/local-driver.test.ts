import { describe, expect, it } from 'vitest';

process.env.EXECUTOR_KEY = 'test-key-12345678';
process.env.EXECUTOR_DRIVER = 'local';
process.env.EXECUTOR_ALLOW_LOCAL = 'true';
process.env.LOCAL_LANGUAGES = 'PYTHON,JAVASCRIPT';
process.env.WORK_DIR = './tmp';

const { LocalDriver } = await import('../src/drivers/local.js');
const { mkdir } = await import('node:fs/promises');
await mkdir('./tmp', { recursive: true });

const driver = new LocalDriver();

describe('LocalDriver (JavaScript)', () => {
  it('runs a correct solution against tests', async () => {
    const res = await driver.execute({
      language: 'JAVASCRIPT',
      sourceCode: "const [a,b]=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(a+b);",
      tests: [
        { id: 't1', input: '1 2\n', expectedOutput: '3' },
        { id: 't2', input: '10 -4\n', expectedOutput: '6' },
      ],
      timeLimitMs: 3000,
      memoryLimitMb: 128,
    });
    expect(res.compile.ok).toBe(true);
    expect(res.results.map((r) => r.status)).toEqual(['ACCEPTED', 'ACCEPTED']);
  });

  it('detects wrong answers and runtime errors', async () => {
    const wrong = await driver.execute({
      language: 'JAVASCRIPT',
      sourceCode: 'console.log(42)',
      tests: [{ id: 't1', input: '', expectedOutput: '41' }],
      timeLimitMs: 3000,
      memoryLimitMb: 128,
    });
    expect(wrong.results[0]!.status).toBe('WRONG_ANSWER');

    const crash = await driver.execute({
      language: 'JAVASCRIPT',
      sourceCode: 'throw new Error("boom")',
      tests: [{ id: 't1', input: '', expectedOutput: '' }],
      timeLimitMs: 3000,
      memoryLimitMb: 128,
    });
    expect(crash.results[0]!.status).toBe('RUNTIME_ERROR');
    expect(crash.results[0]!.stderr).toContain('boom');
  });

  it('enforces the time limit', async () => {
    const res = await driver.execute({
      language: 'JAVASCRIPT',
      sourceCode: 'while(true){}',
      tests: [{ id: 't1', input: '', expectedOutput: '' }],
      timeLimitMs: 500,
      memoryLimitMb: 128,
    });
    expect(res.results[0]!.status).toBe('TIME_LIMIT_EXCEEDED');
  }, 15_000);
});
