#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.ACCEPTANCE_BASE_URL || 'https://verify.qrv.network';
const RETRY_LIMIT = 3;
const BASE_DELAY_MS = 1500;
const JITTER_MIN_MS = 1000;
const JITTER_MAX_MS = 2500;
const OUTPUT_PATH = 'artifacts/acceptance-live.json';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const nodes = [
  { path: '/', critical: true },
  { path: '/verify/QRV-DEMO-001', critical: true },
  { path: '/help', critical: true },
  { path: '/scan', critical: true },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitterMs = () => Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS;

function parseRetryAfterMs(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) return 0;
  return Math.max(0, retryDate - Date.now());
}

async function requestNode(path) {
  const url = `${BASE_URL}${path}`;
  const attempts = [];

  for (let attempt = 1; attempt <= RETRY_LIMIT + 1; attempt += 1) {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const retryAfterHeader = response.headers.get('retry-after');
      const status = response.status;

      attempts.push({
        attempt,
        startedAt,
        status,
        ok: response.ok,
        retryAfter: retryAfterHeader,
      });

      if (status !== 429 || attempt > RETRY_LIMIT) {
        return {
          path,
          url,
          status,
          ok: response.ok,
          retriesUsed: attempt - 1,
          attempts,
        };
      }

      const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
      const waitMs = retryAfterMs > 0 ? retryAfterMs : BASE_DELAY_MS + jitterMs();
      await sleep(waitMs);
    } catch (error) {
      attempts.push({
        attempt,
        startedAt,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        path,
        url,
        status: null,
        ok: false,
        retriesUsed: attempt - 1,
        attempts,
      };
    }
  }

  return {
    path,
    url,
    status: null,
    ok: false,
    retriesUsed: RETRY_LIMIT,
    attempts,
  };
}

async function main() {
  const results = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (index > 0) {
      await sleep(BASE_DELAY_MS + jitterMs());
    }

    const result = await requestNode(node.path);
    results.push({ ...result, critical: node.critical });
  }

  const criticalFailures = results.filter((result) => result.critical && !result.ok);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: {
      baseDelayMs: BASE_DELAY_MS,
      jitterMs: { min: JITTER_MIN_MS, max: JITTER_MAX_MS },
      retry429Max: RETRY_LIMIT,
      userAgent: USER_AGENT,
    },
    summary: {
      totalNodes: results.length,
      okNodes: results.filter((r) => r.ok).length,
      criticalFailures: criticalFailures.length,
      passed: criticalFailures.length === 0,
    },
    results,
  };

  await mkdir('artifacts', { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${OUTPUT_PATH}`);

  if (criticalFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
