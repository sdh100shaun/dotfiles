import fs from "node:fs";
import { InvalidBackupFileError } from "./errors.js";
import type { AuthyBackup, AuthyToken } from "./types.js";

/**
 * AuthyBackupParser reads and validates the authenticator_tokens.json file
 * that you capture from the Authy iOS app using mitmproxy.
 *
 * ## How to capture authenticator_tokens.json
 *
 * 1. Install mitmproxy on your computer and run:
 *    `mitmweb --allow-hosts "api.authy.com"`
 *
 * 2. On your iOS device, go to Settings → Wi-Fi → (your network) →
 *    Configure Proxy → Manual, and enter your computer's IP with port 8080.
 *
 * 3. Visit http://mitm.it on the iOS device and install the mitmproxy
 *    certificate, then trust it in Settings → General → About →
 *    Certificate Trust Settings.
 *
 * 4. Open the Authy app and log out, then log back in. mitmproxy will
 *    capture the API traffic including the encrypted token list.
 *
 * 5. In the mitmweb interface, find the request to api.authy.com that
 *    contains "authenticator_tokens" in the response and save the
 *    response body as authenticator_tokens.json.
 *
 * Example usage:
 * ```ts
 * const parser = new AuthyBackupParser();
 * const tokens = parser.parseFile("/path/to/authenticator_tokens.json");
 * console.log(`Found ${tokens.length} tokens`);
 * ```
 */
export class AuthyBackupParser {
  /**
   * Reads an authenticator_tokens.json file from disk and returns the
   * array of encrypted token records inside it.
   *
   * Throws `InvalidBackupFileError` if the file does not exist,
   * is not valid JSON, or does not contain a token array.
   *
   * @param filePath - Absolute or relative path to the JSON file
   * @returns Array of encrypted AuthyToken records
   */
  parseFile(filePath: string): AuthyToken[] {
    if (!fs.existsSync(filePath)) {
      throw new InvalidBackupFileError(`File not found: ${filePath}`);
    }

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      throw new InvalidBackupFileError(
        `Could not read file: ${filePath} (${error instanceof Error ? error.message : String(error)})`,
      );
    }

    return this.parseJson(raw);
  }

  /**
   * Parses a JSON string (the contents of authenticator_tokens.json)
   * and returns the array of encrypted token records.
   *
   * Accepts two formats:
   * - A full API response: `{ "authenticator_tokens": [...] }`
   * - A bare array: `[...]` (some mitmproxy scripts output this directly)
   *
   * Throws `InvalidBackupFileError` if the JSON is malformed or missing tokens.
   *
   * @param json - Raw JSON string to parse
   * @returns Array of encrypted AuthyToken records
   */
  parseJson(json: string): AuthyToken[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new InvalidBackupFileError(
        "File is not valid JSON. Make sure you saved the raw API response body.",
      );
    }

    // Accept both the full response object and a bare array
    if (Array.isArray(parsed)) {
      return this.validateTokenArray(parsed);
    }

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.authenticator_tokens)) {
        return this.validateTokenArray(obj.authenticator_tokens);
      }
    }

    throw new InvalidBackupFileError(
      'Expected an object with an "authenticator_tokens" array, or a bare token array. ' +
        "Make sure you captured the right API response from mitmproxy.",
    );
  }

  /**
   * Validates that each item in the array looks like an AuthyToken.
   * Filters out any items that are missing the required `encrypted_seed` field.
   */
  private validateTokenArray(items: unknown[]): AuthyToken[] {
    if (items.length === 0) {
      throw new InvalidBackupFileError("The token array is empty — no tokens to decrypt.");
    }

    const valid = items.filter(
      (item): item is AuthyToken =>
        typeof item === "object" && item !== null && "encrypted_seed" in item && "salt" in item,
    );

    if (valid.length === 0) {
      throw new InvalidBackupFileError(
        "None of the items in the token array have the expected fields " +
          '("encrypted_seed", "salt"). Is this the right file?',
      );
    }

    return valid;
  }
}
