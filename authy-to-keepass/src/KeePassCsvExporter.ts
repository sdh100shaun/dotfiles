import fs from "node:fs";
import type { OtpUriBuilder } from "./OtpUriBuilder.js";
import type { DecryptedToken, KeePassCsvRow } from "./types.js";

/**
 * KeePassCsvExporter generates a CSV file that can be imported directly
 * into KeePassXC via Database → Import → CSV File.
 *
 * ## KeePassXC import steps
 *
 * 1. Run: `authy-to-keepass export tokens.json --output authy-import.csv`
 * 2. In KeePassXC: Database → Import → CSV File → select authy-import.csv
 * 3. In the column-mapping dialog:
 *    - Map "Title"    → Title
 *    - Map "Username" → Username
 *    - Map "TOTP"     → OTP (TOTP)
 *    - Leave Password, URL, Notes as-is or ignore them
 * 4. Review the imported entries and verify TOTP codes match Authy.
 *
 * ## Why CSV and not keepassxc-cli?
 *
 * As of KeePassXC 2.7.x, `keepassxc-cli add/edit` does not support setting
 * TOTP secrets via the command line (GitHub issue #9212). The CSV import
 * via the GUI is the recommended programmatic path.
 *
 * Example usage:
 * ```ts
 * const builder  = new OtpUriBuilder();
 * const exporter = new KeePassCsvExporter(builder);
 * exporter.exportToCsvFile(decryptedTokens, "authy-import.csv");
 * ```
 */
export class KeePassCsvExporter {
  private readonly uriBuilder: OtpUriBuilder;

  /**
   * @param uriBuilder - The OtpUriBuilder used to convert tokens to otpauth:// URIs
   */
  constructor(uriBuilder: OtpUriBuilder) {
    this.uriBuilder = uriBuilder;
  }

  /**
   * Converts an array of decrypted tokens into CSV row objects.
   *
   * Each row has a "TOTP" column containing the full `otpauth://totp/` URI.
   * KeePassXC maps this column to its TOTP / OTP field during import.
   *
   * @param tokens - Array of decrypted tokens to export
   * @returns Array of CSV row objects ready to be serialised
   */
  buildRows(tokens: DecryptedToken[]): KeePassCsvRow[] {
    return tokens.map((token) => ({
      Title: token.issuer,
      Username: token.name,
      Password: "",
      URL: "",
      Notes: `Imported from Authy — ${new Date().toISOString().split("T")[0]}`,
      TOTP: this.uriBuilder.buildUri(token),
    }));
  }

  /**
   * Serialises CSV row objects into a CSV string.
   *
   * Uses RFC 4180 CSV formatting:
   * - First row is the header
   * - All fields are double-quoted
   * - Double quotes inside values are escaped as ""
   *
   * @param rows - Array of CSV row objects
   * @returns The complete CSV content as a string
   */
  toCsvString(rows: KeePassCsvRow[]): string {
    const headers: (keyof KeePassCsvRow)[] = [
      "Title",
      "Username",
      "Password",
      "URL",
      "Notes",
      "TOTP",
    ];

    const headerLine = headers.map(quoteField).join(",");

    const dataLines = rows.map((row) => headers.map((header) => quoteField(row[header])).join(","));

    return `${[headerLine, ...dataLines].join("\n")}\n`;
  }

  /**
   * Writes the CSV file to disk.
   *
   * The file is written with mode 0o600 (owner read/write only) because it
   * contains your unencrypted TOTP secrets — treat it like a password file
   * and delete it once the import into KeePassXC is complete.
   *
   * @param tokens     - Array of decrypted tokens to export
   * @param outputPath - Path where the CSV file should be written
   */
  exportToCsvFile(tokens: DecryptedToken[], outputPath: string): void {
    const rows = this.buildRows(tokens);
    const csv = this.toCsvString(rows);
    fs.writeFileSync(outputPath, csv, { mode: 0o600 });
  }

  /**
   * Writes each `otpauth://` URI to a plain-text file, one per line.
   *
   * This format is useful for importing into other apps (Aegis, Bitwarden,
   * Proton Pass) or for inspecting the secrets manually.
   *
   * ⚠️  This file contains your plaintext TOTP secrets. Delete it after use.
   *
   * @param tokens     - Array of decrypted tokens to export
   * @param outputPath - Path where the URI list should be written
   */
  exportToUriFile(tokens: DecryptedToken[], outputPath: string): void {
    const uris = this.uriBuilder.buildAllUris(tokens);
    fs.writeFileSync(outputPath, `${uris.join("\n")}\n`, { mode: 0o600 });
  }
}

/** Wraps a CSV field in double-quotes and escapes any internal double-quotes. */
function quoteField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
