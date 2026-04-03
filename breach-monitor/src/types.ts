/**
 * A single data breach record returned by the HaveIBeenPwned API.
 *
 * Each field gives you different information about the breach:
 * - Name / Title: the unique ID and human-readable name of the service that was breached
 * - Domain: the website that was breached (e.g. "adobe.com")
 * - BreachDate: when the breach actually happened
 * - PwnCount: how many accounts were exposed
 * - DataClasses: what types of data were leaked (e.g. ["Passwords", "Email addresses"])
 */
export interface Breach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  ModifiedDate: string;
  PwnCount: number;
  Description: string;
  LogoPath: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
}

/**
 * The application configuration, stored in a JSON file on disk.
 * The file is created with private permissions so your API key stays secure.
 */
export interface Config {
  /** Your HaveIBeenPwned API key — get one at https://haveibeenpwned.com/API/Key */
  apiKey: string;
  /** The email addresses you want breach-monitor to watch */
  emails: string[];
}

/**
 * The result of checking a single email address for new breaches.
 * Returned by BreachMonitor.checkEmail() and BreachMonitor.checkAll().
 */
export interface CheckResult {
  /** The email address that was checked */
  email: string;
  /** Breaches discovered since the last check (may be empty) */
  newBreaches: Breach[];
  /** Total number of breaches the email appears in (including previously seen ones) */
  totalBreaches: number;
}

/**
 * Optional settings you can pass to BreachMonitor to adjust its behaviour.
 */
export interface BreachMonitorOptions {
  /**
   * How long to pause between API requests when checking multiple emails.
   * Defaults to 1500ms to stay within HIBP's rate limit.
   * Set to 0 in tests to avoid slow test runs.
   */
  requestDelayMs?: number;
}
