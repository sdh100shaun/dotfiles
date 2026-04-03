/**
 * Thrown when the HIBP API responds with HTTP 429 (Too Many Requests).
 *
 * The API has a rate limit — if you check too many emails in a short time
 * you'll hit it. The BreachMonitor adds a delay between requests to prevent this.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Thrown when the HIBP API responds with HTTP 401 (Unauthorized).
 *
 * This usually means your API key is missing, wrong, or has expired.
 * Get a key at: https://haveibeenpwned.com/API/Key
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
