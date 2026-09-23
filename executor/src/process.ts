import { spawn } from 'node:child_process';
import { config } from './config.js';

export interface RunOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  input?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export interface RunOutcome {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  runtimeMs: number;
  spawnError?: string;
}

/** Spawns a process with stdin input, a hard timeout and bounded output capture. */
export function runProcess(opts: RunOptions): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const limit = config.MAX_OUTPUT_BYTES;

    let child;
    try {
      child = spawn(opts.cmd, opts.args, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      return resolve({ stdout: '', stderr: '', exitCode: null, signal: null, timedOut: false, runtimeMs: 0, spawnError: String(err) });
    }

    const finish = (outcome: Omit<RunOutcome, 'runtimeMs'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const runtimeMs = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({ ...outcome, runtimeMs: Math.round(runtimeMs) });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      // On Windows SIGKILL maps to TerminateProcess; child trees may need taskkill.
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).on('error', () => undefined);
      }
    }, opts.timeoutMs);

    child.stdout.on('data', (d: Buffer) => {
      if (stdout.length < limit) stdout += d.toString('utf8').slice(0, limit - stdout.length);
    });
    child.stderr.on('data', (d: Buffer) => {
      if (stderr.length < limit) stderr += d.toString('utf8').slice(0, limit - stderr.length);
    });
    child.on('error', (err) => finish({ stdout, stderr, exitCode: null, signal: null, timedOut, spawnError: err.message }));
    child.on('close', (code, signal) => finish({ stdout, stderr, exitCode: code, signal, timedOut }));

    if (opts.input !== undefined) {
      child.stdin.on('error', () => undefined);
      child.stdin.end(opts.input);
    } else {
      child.stdin.end();
    }
  });
}
