/**
 * LOCAL DRIVER — DEVELOPMENT ONLY.
 *
 * Runs submissions with interpreters installed on the host machine. It enforces time limits and
 * bounded output but provides NO filesystem, network or memory isolation. It refuses to start
 * unless EXECUTOR_ALLOW_LOCAL=true and must never be used in production; use the docker driver.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config } from '../config.js';
import { runProcess } from '../process.js';
import { outputsMatch, type Driver, type ExecuteRequest, type ExecuteResponse, type Language, type TestResult } from '../types.js';

interface Prepared {
  run: { cmd: string; args: string[] };
  compileOutput: string;
  ok: boolean;
}

// JavaScript is written as .cjs so `require` works regardless of the enclosing package "type".
const sourceFile: Record<Language, string> = { PYTHON: 'main.py', JAVASCRIPT: 'main.cjs', CPP: 'main.cpp', JAVA: 'Main.java' };

export class LocalDriver implements Driver {
  readonly name = 'local' as const;

  supports(language: Language): boolean {
    return config.localLanguages.has(language);
  }

  async execute(req: ExecuteRequest): Promise<ExecuteResponse> {
    const dir = await mkdtemp(join(resolve(config.WORK_DIR), 'run-'));
    try {
      await writeFile(join(dir, sourceFile[req.language]), req.sourceCode, 'utf8');
      const prepared = await this.prepare(req.language, dir);
      if (!prepared.ok) {
        return {
          driver: this.name,
          compile: { ok: false, output: prepared.compileOutput },
          results: req.tests.map((t) => ({ id: t.id, status: 'COMPILE_ERROR', stdout: '', stderr: prepared.compileOutput, runtimeMs: 0, memoryKb: null })),
        };
      }

      const results: TestResult[] = [];
      for (const test of req.tests) {
        const outcome = await runProcess({ cmd: prepared.run.cmd, args: prepared.run.args, cwd: dir, input: test.input, timeoutMs: req.timeLimitMs });
        let status: TestResult['status'];
        if (outcome.spawnError) status = 'INTERNAL_ERROR';
        else if (outcome.timedOut) status = 'TIME_LIMIT_EXCEEDED';
        else if (outcome.exitCode !== 0) status = 'RUNTIME_ERROR';
        else if (test.expectedOutput === undefined || outputsMatch(outcome.stdout, test.expectedOutput)) status = 'ACCEPTED';
        else status = 'WRONG_ANSWER';
        results.push({
          id: test.id,
          status,
          stdout: outcome.stdout,
          stderr: outcome.spawnError ?? outcome.stderr,
          runtimeMs: outcome.runtimeMs,
          memoryKb: null,
        });
      }
      return { driver: this.name, compile: { ok: true, output: prepared.compileOutput }, results };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async prepare(language: Language, dir: string): Promise<Prepared> {
    switch (language) {
      case 'PYTHON':
        return { ok: true, compileOutput: '', run: { cmd: config.PYTHON_BIN, args: ['-X', 'utf8', 'main.py'] } };
      case 'JAVASCRIPT':
        return { ok: true, compileOutput: '', run: { cmd: config.NODE_BIN, args: ['--stack-size=4096', 'main.cjs'] } };
      case 'CPP': {
        const out = await runProcess({ cmd: config.GPP_BIN, args: ['-O2', '-std=c++17', '-o', 'main', 'main.cpp'], cwd: dir, timeoutMs: 20_000 });
        const ok = !out.spawnError && out.exitCode === 0;
        return { ok, compileOutput: out.spawnError ?? out.stderr, run: { cmd: join(dir, process.platform === 'win32' ? 'main.exe' : 'main'), args: [] } };
      }
      case 'JAVA': {
        const out = await runProcess({ cmd: config.JAVAC_BIN, args: ['Main.java'], cwd: dir, timeoutMs: 30_000 });
        const ok = !out.spawnError && out.exitCode === 0;
        return { ok, compileOutput: out.spawnError ?? out.stderr, run: { cmd: config.JAVA_BIN, args: ['-Xmx256m', '-cp', dir, 'Main'] } };
      }
    }
  }
}
