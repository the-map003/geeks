/**
 * DOCKER DRIVER — production.
 *
 * Every run happens in a throw-away container with no network, a memory/CPU/PID cap, a read-only
 * root filesystem and the submission mounted read-only. Compilation (C++/Java) happens once in a
 * separate container; the produced binary/classes are then mounted for each test.
 */
import { mkdtemp, rm, writeFile, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from '../config.js';
import { runProcess } from '../process.js';
import { outputsMatch, type Driver, type ExecuteRequest, type ExecuteResponse, type Language, type TestResult } from '../types.js';

const images: Record<Language, string> = {
  PYTHON: config.DOCKER_IMAGE_PYTHON,
  JAVASCRIPT: config.DOCKER_IMAGE_JAVASCRIPT,
  CPP: config.DOCKER_IMAGE_CPP,
  JAVA: config.DOCKER_IMAGE_JAVA,
};

const sourceFile: Record<Language, string> = { PYTHON: 'main.py', JAVASCRIPT: 'main.cjs', CPP: 'main.cpp', JAVA: 'Main.java' };

const compileCommand: Partial<Record<Language, string>> = {
  CPP: 'g++ -O2 -std=c++17 -o /work/out/main /work/main.cpp',
  JAVA: 'javac -d /work/out /work/Main.java',
};

const runCommand: Record<Language, string> = {
  PYTHON: 'python3 -X utf8 /work/main.py',
  JAVASCRIPT: 'node --stack-size=4096 /work/main.cjs',
  CPP: '/work/out/main',
  JAVA: 'java -Xmx{MEM}m -cp /work/out Main',
};

export class DockerDriver implements Driver {
  readonly name = 'docker' as const;

  supports(): boolean {
    return true;
  }

  async execute(req: ExecuteRequest): Promise<ExecuteResponse> {
    const dir = await mkdtemp(join(resolve(config.WORK_DIR), 'run-'));
    const outDir = join(dir, 'out');
    try {
      await writeFile(join(dir, sourceFile[req.language]), req.sourceCode, 'utf8');
      await chmod(dir, 0o755).catch(() => undefined);

      const compile = compileCommand[req.language];
      if (compile) {
        await runProcess({ cmd: 'mkdir', args: ['-p', outDir], timeoutMs: 5000 });
        const c = await runProcess({
          cmd: config.DOCKER_BIN,
          args: [...this.baseArgs(req.memoryLimitMb + 256, false), '-v', `${dir}:/work`, images[req.language], 'sh', '-c', compile],
          timeoutMs: 60_000,
        });
        const ok = !c.spawnError && !c.timedOut && c.exitCode === 0;
        if (!ok) {
          const output = c.spawnError ?? (c.timedOut ? 'Compilation timed out' : c.stderr || c.stdout);
          return {
            driver: this.name,
            compile: { ok: false, output },
            results: req.tests.map((t) => ({ id: t.id, status: 'COMPILE_ERROR', stdout: '', stderr: output, runtimeMs: 0, memoryKb: null })),
          };
        }
      }

      const results: TestResult[] = [];
      const timeoutSec = Math.max(1, Math.ceil(req.timeLimitMs / 1000));
      const cmd = runCommand[req.language].replace('{MEM}', String(req.memoryLimitMb));
      for (const test of req.tests) {
        const outcome = await runProcess({
          cmd: config.DOCKER_BIN,
          args: [
            ...this.baseArgs(req.memoryLimitMb, true),
            '-v',
            `${dir}:/work:ro`,
            images[req.language],
            'sh',
            '-c',
            `timeout -s KILL ${timeoutSec} ${cmd}`,
          ],
          input: test.input,
          // Container start-up overhead is excluded from the user's time limit by adding slack here;
          // the in-container `timeout` enforces the real limit.
          timeoutMs: req.timeLimitMs + 15_000,
        });

        let status: TestResult['status'];
        if (outcome.spawnError) status = 'INTERNAL_ERROR';
        else if (outcome.timedOut || outcome.exitCode === 137) status = outcome.exitCode === 137 && !outcome.timedOut ? 'MEMORY_LIMIT_EXCEEDED' : 'TIME_LIMIT_EXCEEDED';
        else if (outcome.exitCode !== 0) status = 'RUNTIME_ERROR';
        else if (test.expectedOutput === undefined || outputsMatch(outcome.stdout, test.expectedOutput)) status = 'ACCEPTED';
        else status = 'WRONG_ANSWER';

        // `timeout -s KILL` exits with 137 both for our kill and for OOM kills; distinguish by runtime.
        if (outcome.exitCode === 137 && outcome.runtimeMs >= req.timeLimitMs) status = 'TIME_LIMIT_EXCEEDED';

        results.push({ id: test.id, status, stdout: outcome.stdout, stderr: outcome.spawnError ?? outcome.stderr, runtimeMs: outcome.runtimeMs, memoryKb: null });
      }
      return { driver: this.name, compile: { ok: true, output: '' }, results };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private baseArgs(memoryMb: number, readOnly: boolean): string[] {
    return [
      'run',
      '--rm',
      '-i',
      '--network',
      'none',
      '--memory',
      `${memoryMb}m`,
      '--memory-swap',
      `${memoryMb}m`,
      '--cpus',
      '1',
      '--pids-limit',
      '64',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      ...(readOnly ? ['--read-only', '--tmpfs', '/tmp:rw,size=64m'] : []),
      '--user',
      '65534:65534',
      '-w',
      '/work',
    ];
  }
}
