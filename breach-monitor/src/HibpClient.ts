import { AuthenticationError, RateLimitError } from "./errors.js";
import type { Breach } from "./types.js";

/**
 * HibpClient communicates with the HaveIBeenPwned (HIBP) API.
 *
 * The API tells you which known data breaches an email address has appeared in.
 * A paid API key is required — get one at https://haveibeenpwned.com/API/Key
 *
 * Example usage:
 * ```ts
 * const client = new HibpClient("your-api-key");
 * const breaches = await client.getBreachesForEmail("you@example.com");
 * console.log(breaches.length); // 0 if clean, otherwise a list of breach records
 * ```
 */
export class HibpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://haveibeenpwned.com/api/v3";
    this.userAgent = "breach-monitor-dotfiles/1.0";
  }

  /**
   * Fetches all known data breaches for a given email address.
   *
   * Returns an **empty array** if the email has not appeared in any breach — this is good!
   * Returns an **array of Breach objects** if one or more breaches are found.
   *
   * Throws:
   * - `AuthenticationError` if the API key is invalid or missing
   * - `RateLimitError` if too many requests are being made
   * - `Error` for any other unexpected response
   *
   * @param email - The email address to look up
   * @returns Array of breach records, or empty array if the email is clean
   */
  async getBreachesForEmail(email: string): Promise<Breach[]> {
    // encodeURIComponent handles special characters like + in plus-addressing (e.g. user+tag@mail.com)
    const encoded = encodeURIComponent(email);
    const url = `${this.baseUrl}/breachedaccount/${encoded}?truncateResponse=false`;

    const response = await fetch(url, {
      headers: {
        "hibp-api-key": this.apiKey,
        "User-Agent": this.userAgent,
      },
    });

    // HTTP 404 means the email has NOT appeared in any breach — this is the happy path
    if (response.status === 404) {
      return [];
    }

    if (response.status === 401) {
      throw new AuthenticationError(
        "Invalid API key. Get one at https://haveibeenpwned.com/API/Key",
      );
    }

    if (response.status === 429) {
      throw new RateLimitError(
        "HIBP API rate limit exceeded. Please wait a moment before checking again.",
      );
    }

    if (!response.ok) {
      throw new Error(`Unexpected response from HIBP API: HTTP ${response.status}`);
    }

    return response.json() as Promise<Breach[]>;
  }
}
