// Small fetch helpers shared by the scholarly API clients:
// a timeout, a tiny in-memory cache, and a concurrency limiter.

const USER_AGENT = 'ResearchFlow/0.2 (academic research assistant)';
const DEFAULT_TIMEOUT_MS = 15000;

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 500;

export class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = (status) => status === 429 || status >= 500;

// Retry rate limits, server errors and timeouts a couple of times with backoff.
async function request(url, opts = {}, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await requestOnce(url, opts);
    } catch (err) {
      const retryable = err instanceof UpstreamError ? RETRYABLE(err.status) : err.name !== 'SyntaxError';
      if (!retryable || attempt >= attempts) throw err;
      await sleep(Math.min(err.retryAfterMs ?? 700 * attempt, 5000));
    }
  }
}

async function requestOnce(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new UpstreamError(`${new URL(url).host} responded ${res.status}`, res.status);
      const retryAfter = Number(res.headers.get('retry-after'));
      if (retryAfter > 0) err.retryAfterMs = retryAfter * 1000;
      throw err;
    }
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new UpstreamError(`${new URL(url).host} timed out`, 504);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

export function getJson(url, opts) {
  return cached(url, async () => (await request(url, opts)).json());
}

export function getText(url, opts) {
  return cached(url, async () => (await request(url, opts)).text());
}

// Run `fn` over `items` with at most `limit` calls in flight.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
