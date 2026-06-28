// Sliding-window in-memory rate limiting.
//
// LIMITATION: On Vercel serverless, each function instance has its own memory.
// State is NOT shared across instances and resets on cold starts.
// For production-grade rate limiting shared across instances, replace this with
// Upstash Redis (@upstash/ratelimit + @upstash/redis) and set UPSTASH_REDIS_REST_URL
// + UPSTASH_REDIS_REST_TOKEN env vars on Vercel.
//
// For a single-user app (personal tool), this in-memory limiter is sufficient.

interface RateLimitEntry {
  timestamps: number[]; // sliding window: list of request timestamps
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const entry = rateLimitStore.get(identifier);

  // Prune timestamps outside the window
  const timestamps = (entry?.timestamps ?? []).filter((t) => t > windowStart);

  const resetTime = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;

  if (timestamps.length >= maxRequests) {
    rateLimitStore.set(identifier, { timestamps });
    return { allowed: false, remaining: 0, resetTime };
  }

  timestamps.push(now);
  rateLimitStore.set(identifier, { timestamps });

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetTime,
  };
}

// Clean up stale entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.timestamps.every((t) => t < now - 24 * 60 * 60 * 1000)) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}
