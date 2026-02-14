// Simple in-memory sliding window rate limiter
const requests: number[] = [];

const RPM_LIMIT = 5; // max requests per minute (Gemini free tier is ~15, stay under)
const WINDOW_MS = 60_000; // 1 minute

export function checkRateLimit(): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();

  // Remove entries older than the window
  while (requests.length > 0 && requests[0] < now - WINDOW_MS) {
    requests.shift();
  }

  if (requests.length >= RPM_LIMIT) {
    const oldestInWindow = requests[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    return { allowed: false, retryAfterMs };
  }

  requests.push(now);
  return { allowed: true, retryAfterMs: 0 };
}
