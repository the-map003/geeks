import express from 'express';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import { LocalDriver } from './drivers/local.js';
import { DockerDriver } from './drivers/docker.js';
import type { Driver, ExecuteRequest } from './types.js';

const languageSchema = z.enum(['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA']);
const executeSchema = z.object({
  language: languageSchema,
  sourceCode: z.string().max(config.MAX_SOURCE_BYTES),
  tests: z.array(z.object({ id: z.string().min(1).max(64), input: z.string().max(200_000), expectedOutput: z.string().max(200_000).optional() })).min(1).max(100),
  timeLimitMs: z.number().int().min(100).max(20_000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(1024).default(256),
});

function selectDriver(): Driver {
  if (config.EXECUTOR_DRIVER === 'local') {
    if (!config.EXECUTOR_ALLOW_LOCAL) {
      console.error('EXECUTOR_DRIVER=local requires EXECUTOR_ALLOW_LOCAL=true. The local driver is NOT sandboxed and is for development only.');
      process.exit(1);
    }
    console.warn('WARNING: using the LOCAL executor driver. Submissions run on this machine without isolation. Development only.');
    return new LocalDriver();
  }
  return new DockerDriver();
}

const driver = selectDriver();

/** Simple semaphore limiting concurrent executions. */
class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private readonly max: number) {}
  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    await new Promise<void>((res) => this.queue.push(res));
    this.active++;
    return () => this.release();
  }
  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
  get pending() {
    return this.queue.length;
  }
}
const semaphore = new Semaphore(config.MAX_CONCURRENT_RUNS);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    driver: driver.name,
    languages: (['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'] as const).filter((l) => driver.supports(l)),
    queued: semaphore.pending,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  if (req.headers['x-executor-key'] !== config.EXECUTOR_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.post('/execute', async (req, res) => {
  const parsed = executeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
    return;
  }
  const body = parsed.data as ExecuteRequest;
  if (!driver.supports(body.language)) {
    res.status(422).json({ error: `Language ${body.language} is not available on this executor (${driver.name} driver)` });
    return;
  }
  const release = await semaphore.acquire();
  try {
    const result = await driver.execute(body);
    res.json(result);
  } catch (err) {
    console.error('Execution failed', err);
    res.status(500).json({ error: 'Execution failed' });
  } finally {
    release();
  }
});

async function main() {
  await mkdir(resolve(config.WORK_DIR), { recursive: true });
  app.listen(config.PORT, config.HOST, () => {
    console.log(`Executor (${driver.name} driver) listening on http://${config.HOST}:${config.PORT}`);
  });
}

void main();
