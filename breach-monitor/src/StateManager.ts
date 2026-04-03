import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Breach } from "./types.js";

/**
 * StateManager keeps track of which data breaches have already been seen for each email.
 *
 * This is what allows breach-monitor to only alert you about *new* breaches —
 * not ones it has already told you about in a previous run.
 *
 * State is stored as JSON files inside a directory you provide (usually
 * ~/.local/share/breach-monitor/). Each file is named after a SHA-256 hash
 * of the email address, so the actual email never appears in the filename.
 *
 * Example usage:
 * ```ts
 * const state = new StateManager("/home/you/.local/share/breach-monitor");
 * const seen = state.loadSeenBreaches("you@example.com"); // [] on first run
 * const newOnes = state.findNewBreaches("you@example.com", latestBreaches);
 * state.saveBreaches("you@example.com", latestBreaches);
 * ```
 */
export class StateManager {
  /** The directory where per-email breach state files are stored */
  private readonly stateDirectory: string;

  constructor(stateDirectory: string) {
    this.stateDirectory = stateDirectory;
  }

  /**
   * Returns the file path used to store breach state for a given email.
   *
   * The email is hashed with SHA-256 so the raw address doesn't appear in
   * the filename — this gives you a small amount of extra privacy.
   *
   * @param email - The email address whose state file path you want
   */
  getStateFilePath(email: string): string {
    const hash = createHash("sha256").update(email).digest("hex");
    return path.join(this.stateDirectory, `${hash}.json`);
  }

  /**
   * Loads the list of breaches that have already been seen for this email.
   *
   * Returns an empty array if this email has never been checked before,
   * or if its state file has been cleared.
   *
   * @param email - The email address to look up stored state for
   */
  loadSeenBreaches(email: string): Breach[] {
    const filePath = this.getStateFilePath(email);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = fs.readFileSync(filePath, "utf-8");

    try {
      return JSON.parse(raw) as Breach[];
    } catch (error) {
      // If the state file is corrupted or contains invalid JSON, treat it as empty.
      // This avoids crashing the whole check run due to a bad state file.
      console.warn(
        `Warning: Could not parse breach state file at ${filePath}. ` +
          "Treating as empty state. " +
          (error instanceof Error ? error.message : String(error)),
      );
      return [];
    }
  }

  /**
   * Saves the current list of breaches for an email to disk.
   *
   * The next time we check this email, we compare against this saved list
   * to figure out which breaches are new.
   *
   * The file is written with mode 0o600 so only the file owner can read it.
   *
   * @param email    - The email address whose breach list to save
   * @param breaches - The full, up-to-date list of breaches from the API
   */
  saveBreaches(email: string, breaches: Breach[]): void {
    // Make sure the state directory exists before we try to write to it
    fs.mkdirSync(this.stateDirectory, { recursive: true });

    const filePath = this.getStateFilePath(email);
    fs.writeFileSync(filePath, JSON.stringify(breaches, null, 2), {
      mode: 0o600, // Owner read/write only
    });

    // Ensure permissions are correctly tightened even if the file already existed
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Best-effort permission hardening; ignore errors (e.g., unsupported platforms)
    }
  }

  /**
   * Removes the stored breach state for an email address.
   *
   * This is called when an email shows zero breaches in the latest API response,
   * meaning the slate is clean and there is nothing left to track.
   *
   * Does nothing if no state file exists yet.
   *
   * @param email - The email address whose state to clear
   */
  clearBreaches(email: string): void {
    const filePath = this.getStateFilePath(email);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Compares the latest breach list from the API against what was seen last time.
   * Returns only the breaches that are genuinely new since the last check.
   *
   * If this email has never been checked before, everything is considered new.
   *
   * @param email           - The email address being checked
   * @param currentBreaches - The full breach list just returned by the API
   * @returns Only the breaches that weren't in the previous saved state
   */
  findNewBreaches(email: string, currentBreaches: Breach[]): Breach[] {
    const previousBreaches = this.loadSeenBreaches(email);

    // Build a Set of previously-seen breach names for fast lookup
    const seenNames = new Set(previousBreaches.map((breach) => breach.Name));

    return currentBreaches.filter((breach) => !seenNames.has(breach.Name));
  }
}
