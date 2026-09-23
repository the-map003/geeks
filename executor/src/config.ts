import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('127.0.0.1'),
  EXECUTOR_KEY: z.string().min(8),
  EXECUTOR_DRIVER: z.enum(['local', 'docker']).default('docker'),
  EXECUTOR_ALLOW_LOCAL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  LOCAL_LANGUAGES: z.string().default('PYTHON,JAVASCRIPT'),
  PYTHON_BIN: z.string().default('python3'),
  NODE_BIN: z.string().default('node'),
  GPP_BIN: z.string().default('g++'),
  JAVAC_BIN: z.string().default('javac'),
  JAVA_BIN: z.string().default('java'),
  DOCKER_BIN: z.string().default('docker'),
  DOCKER_IMAGE_PYTHON: z.string().default('python:3.12-alpine'),
  DOCKER_IMAGE_JAVASCRIPT: z.string().default('node:22-alpine'),
  DOCKER_IMAGE_CPP: z.string().default('gcc:14'),
  DOCKER_IMAGE_JAVA: z.string().default('eclipse-temurin:21-jdk-alpine'),
  MAX_CONCURRENT_RUNS: z.coerce.number().int().positive().default(4),
  WORK_DIR: z.string().default('./tmp'),
  MAX_SOURCE_BYTES: z.coerce.number().int().positive().default(100_000),
  MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(64_000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid executor configuration:\n' + parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}

export const config = {
  ...parsed.data,
  localLanguages: new Set(
    parsed.data.LOCAL_LANGUAGES.split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  ),
};
