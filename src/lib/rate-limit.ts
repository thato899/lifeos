/**
 * A minimal in-memory sliding-window rate limiter for user-scoped endpoints.
 * Defaults to the WebMCP execute endpoint's limit; callers may set a tighter
 * window and call count for more expensive operations such as AI requests.
 *
 * Known limitation, documented here rather than hidden: this state is
 * per-process. On a multi-instance or serverless deployment each instance
 * has its own counter, so the effective limit is (limit × instance count).
 * That's an acceptable tradeoff for a single-instance hackathon deployment;
 * a real multi-instance deployment would move this to Redis.
 */
const WINDOW_MS = 10_000;
const MAX_CALLS_PER_WINDOW = 30;

const callLog = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  windowMs = WINDOW_MS,
  maxCalls = MAX_CALLS_PER_WINDOW,
): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const timestamps = (callLog.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxCalls) {
    const oldest = timestamps[0];
    callLog.set(key, timestamps);
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }

  timestamps.push(now);
  callLog.set(key, timestamps);
  return { allowed: true };
}
