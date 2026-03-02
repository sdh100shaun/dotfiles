#!/usr/bin/env node
/**
 * authy-to-keepass CLI
 *
 * Decrypts Authy backup tokens and exports them to a KeePassXC-compatible CSV.
 *
 * ## Pre-requisite: capture authenticator_tokens.json via mitmproxy
 *
 *   1. Install mitmproxy: https://mitmproxy.org/
 *   2. Run: mitmweb --allow-hosts "api.authy.com"
 *   3. On iOS: Settings → Wi-Fi → (network) → Configure Proxy → Manual
 *      Enter your computer's IP and port 8080
 *   4. Visit http://mitm.it on iOS, install the cert, trust it in:
 *      Settings → General → About → Certificate Trust Settings
 *   5. Open the Authy app and log out, then log back in.
 *   6. In mitmweb, find the response containing "authenticator_tokens"
 *      and save the response body as authenticator_tokens.json
 *
 * ## Commands
 *
 *   authy-to-keepass decrypt <file>         Decrypt tokens and print URIs to stdout
 *   authy-to-keepass export <file>          Export to KeePassXC CSV (--output flag)
 *   authy-to-keepass export <file> --uris   Export as plain otpauth:// URI list instead
 */
import * as readline from "node:readline";
import { Command } from "commander";
import { AuthyBackupParser } from "./AuthyBackupParser.js";
import { KeePassCsvExporter } from "./KeePassCsvExporter.js";
import { OtpUriBuilder } from "./OtpUriBuilder.js";
import { TokenDecryptor } from "./TokenDecryptor.js";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Prompts for the Authy backup password without echoing the input */
async function promptPassword(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    // Hide input if the terminal supports it
    process.stdout.write("Authy backup password: ");
    process.stdin.setRawMode?.(true);

    let password = "";

    process.stdin.on("data", (char: Buffer) => {
      const str = char.toString();
      if (str === "\r" || str === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdout.write("\n");
        rl.close();
        resolve(password);
      } else if (str === "\u0003") {
        // Ctrl-C
        process.exit(1);
      } else if (str === "\u007f") {
        // Backspace
        password = password.slice(0, -1);
      } else {
        password += str;
      }
    });
  });
}

/** Parses a token file and decrypts with the given password. */
async function loadAndDecrypt(filePath: string, password?: string) {
  const parser = new AuthyBackupParser();
  const tokens = parser.parseFile(filePath);
  console.log(`Found ${tokens.length} encrypted token(s).`);

  const pwd = password ?? (await promptPassword());
  if (!pwd) {
    console.error("No password provided.");
    process.exit(1);
  }

  const decryptor = new TokenDecryptor(pwd);
  const decrypted = decryptor.decryptAll(tokens);

  if (decrypted.length === 0) {
    console.error("No tokens were successfully decrypted. Check your backup password.");
    process.exit(1);
  }

  console.log(`Successfully decrypted ${decrypted.length} token(s).`);
  return decrypted;
}

// ─── CLI definition ───────────────────────────────────────────────────────────

const program = new Command();

program
  .name("authy-to-keepass")
  .description("Decrypt Authy backup tokens and export to KeePassXC-compatible CSV")
  .version("1.0.0");

// ── decrypt ──────────────────────────────────────────────────────────────────
program
  .command("decrypt <file>")
  .description("Decrypt tokens and print otpauth:// URIs to stdout")
  .option("-p, --password <password>", "Authy backup password (prefer interactive prompt)")
  .action(async (file: string, opts: { password?: string }) => {
    const decrypted = await loadAndDecrypt(file, opts.password);
    const builder = new OtpUriBuilder();

    console.log("\notpauth:// URIs:\n");
    for (const token of decrypted) {
      console.log(`  ${token.issuer} — ${token.name}`);
      console.log(`  ${builder.buildUri(token)}\n`);
    }

    console.log(
      "⚠️  These URIs contain your unencrypted TOTP secrets. " +
        "Do not share them or save them unencrypted.",
    );
  });

// ── export ────────────────────────────────────────────────────────────────────
program
  .command("export <file>")
  .description("Export decrypted tokens to a file for KeePassXC import")
  .option("-p, --password <password>", "Authy backup password (prefer interactive prompt)")
  .option("-o, --output <path>", "Output file path", "authy-import.csv")
  .option("--uris", "Export as plain otpauth:// URI list instead of CSV")
  .action(async (file: string, opts: { password?: string; output: string; uris?: boolean }) => {
    const decrypted = await loadAndDecrypt(file, opts.password);
    const builder = new OtpUriBuilder();
    const exporter = new KeePassCsvExporter(builder);

    if (opts.uris) {
      exporter.exportToUriFile(decrypted, opts.output);
      console.log(`\nURI list written to: ${opts.output}`);
    } else {
      exporter.exportToCsvFile(decrypted, opts.output);
      console.log(`\nCSV file written to: ${opts.output}`);
      console.log("\nTo import into KeePassXC:");
      console.log("  1. Database → Import → CSV File");
      console.log(`  2. Select: ${opts.output}`);
      console.log("  3. In the column mapping dialog, map 'TOTP' → OTP (TOTP)");
      console.log("  4. Complete the import, verify codes match, then delete the CSV");
    }

    console.log(
      "\n⚠️  The output file contains your unencrypted TOTP secrets. " +
        "Delete it once the import is complete.",
    );
  });

program.parse();
