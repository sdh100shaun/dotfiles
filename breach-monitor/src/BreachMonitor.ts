import type { HibpClient } from "./HibpClient.js";
import type { Notifier } from "./Notifier.js";
import type { StateManager } from "./StateManager.js";
import type { BreachMonitorOptions, CheckResult } from "./types.js";

/**
 * BreachMonitor is the main class that ties everything together.
 *
 * It coordinates three helper classes to perform a breach check:
 * 1. **HibpClient** — fetches the latest breach data from the API
 * 2. **StateManager** — remembers which breaches have already been seen
 * 3. **Notifier** — sends an alert when new breaches are discovered
 *
 * Example usage:
 * ```ts
 * const client   = new HibpClient("your-api-key");
 * const state    = new StateManager("/home/you/.local/share/breach-monitor");
 * const notifier = new Notifier();
 * const monitor  = new BreachMonitor(client, state, notifier);
 *
 * // Check a single email
 * const result = await monitor.checkEmail("you@example.com");
 * console.log(result.newBreaches.length); // Number of brand-new breaches found
 *
 * // Check several emails at once (automatically paced to respect the API rate limit)
 * const results = await monitor.checkAll(["you@example.com", "work@example.com"]);
 * ```
 */
export class BreachMonitor {
  private readonly client: HibpClient;
  private readonly state: StateManager;
  private readonly notifier: Notifier;

  /**
   * How long to wait between API requests when checking multiple emails (milliseconds).
   * Defaults to 1500ms to stay inside HIBP's rate limit for personal API keys.
   */
  private readonly requestDelayMs: number;

  /**
   * @param client   - The HIBP API client for fetching breach data
   * @param state    - The state manager for tracking previously seen breaches
   * @param notifier - The notifier for sending alerts
   * @param options  - Optional settings (e.g. override the delay between requests)
   */
  constructor(
    client: HibpClient,
    state: StateManager,
    notifier: Notifier,
    options: BreachMonitorOptions = {},
  ) {
    this.client = client;
    this.state = state;
    this.notifier = notifier;
    this.requestDelayMs = options.requestDelayMs ?? 1500;
  }

  /**
   * Checks a single email address for new data breaches.
   *
   * What happens:
   * - If the email is completely clean → clears any old stored state
   * - If there are new breaches since last check → sends an alert and saves the new state
   * - If all breaches were already known → logs a reassuring message, does nothing else
   *
   * @param email - The email address to check
   * @returns A CheckResult with the email, any new breaches, and the total breach count
   */
  async checkEmail(email: string): Promise<CheckResult> {
    console.log(`Checking: ${email}`);

    const currentBreaches = await this.client.getBreachesForEmail(email);

    // No breaches at all — great news! Clear any stale state we might have stored
    if (currentBreaches.length === 0) {
      console.log(`  Clean — no breaches found for ${email}`);
      this.state.clearBreaches(email);
      return { email, newBreaches: [], totalBreaches: 0 };
    }

    // Compare the latest API results against what we saw last time
    const newBreaches = this.state.findNewBreaches(email, currentBreaches);

    if (newBreaches.length > 0) {
      // Build a readable list: "Adobe Data Breach, LinkedIn"
      const breachTitles = newBreaches.map((b) => b.Title).join(", ");
      const message = `${newBreaches.length} new breach(es) for ${email}: ${breachTitles}`;

      this.notifier.send("Data Breach Alert", message);

      // Save the full updated list so the next run knows what's already been seen
      this.state.saveBreaches(email, currentBreaches);
    } else {
      console.log(`  No new breaches for ${email} (${currentBreaches.length} already tracked)`);
    }

    return {
      email,
      newBreaches,
      totalBreaches: currentBreaches.length,
    };
  }

  /**
   * Checks multiple email addresses for new breaches, one at a time.
   *
   * A short delay is added between each request to respect the HIBP API rate limit.
   * The delay is configurable via the `requestDelayMs` option in the constructor.
   *
   * @param emails - The list of email addresses to check
   * @returns An array of CheckResult objects, one per email
   */
  async checkAll(emails: string[]): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    for (let i = 0; i < emails.length; i++) {
      const result = await this.checkEmail(emails[i]);
      results.push(result);

      // Add a delay between requests (but not after the very last one)
      const isLastEmail = i === emails.length - 1;
      if (!isLastEmail && this.requestDelayMs > 0) {
        await this.sleep(this.requestDelayMs);
      }
    }

    return results;
  }

  /** Pauses execution for the given number of milliseconds */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
