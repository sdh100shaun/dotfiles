#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
/**
 * breach-monitor CLI entry point.
 *
 * This file wires up the CLI commands using the `commander` library,
 * creates the class instances, and routes each command to the right handler.
 *
 * Commands:
 *   breach-monitor setup         — Run the interactive first-time setup wizard
 *   breach-monitor check         — Check all emails from your config for breaches
 *   breach-monitor check <email> — Check one or more specific email addresses
 *   breach-monitor list          — Show all stored breach state from previous checks
 *   breach-monitor install-cron  — Add a daily cron job to run checks automatically
 */
import * as readline from "node:readline";
import { Command } from "commander";
import { BreachMonitor } from "./BreachMonitor.js";
import { ConfigManager } from "./ConfigManager.js";
import { HibpClient } from "./HibpClient.js";
import { Notifier } from "./Notifier.js";
import { StateManager } from "./StateManager.js";

// ─── Default paths ────────────────────────────────────────────────────────────

/** Where the config JSON file lives (respects the XDG Base Directory spec) */
const CONFIG_PATH = path.join(
  process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
  "breach-monitor",
  "config.json",
);

/** Where per-email breach state files are stored */
const STATE_DIR = path.join(
  process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"),
  "breach-monitor",
);

/** Log file written to when running under cron */
const LOG_FILE = path.join(STATE_DIR, "breach-monitor.log");

// ─── Factory helpers ──────────────────────────────────────────────────────────

/** Creates a fully wired-up BreachMonitor instance */
function createBreachMonitor(apiKey: string): BreachMonitor {
  return new BreachMonitor(new HibpClient(apiKey), new StateManager(STATE_DIR), new Notifier());
}

// ─── Setup wizard ─────────────────────────────────────────────────────────────

/**
 * Walks the user through first-time setup:
 * prompts for an API key and a list of emails to monitor, then saves the config.
 */
async function runSetupWizard(configManager: ConfigManager): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string) =>
    new Promise<string>((resolve) => rl.question(question, resolve));

  console.log("\n=== Breach Monitor — First-time Setup ===\n");
  console.log("You need a HaveIBeenPwned API key to use this tool.");
  console.log("Get one at: https://haveibeenpwned.com/API/Key\n");

  const apiKey = (await ask("Paste your HIBP API key: ")).trim();
  if (!apiKey) {
    console.error("No API key provided. Setup aborted.");
    rl.close();
    process.exit(1);
  }

  const emails: string[] = [];
  console.log("\nEnter the email addresses to monitor (press Enter with a blank line to finish):");
  while (true) {
    const email = (await ask("  Email: ")).trim();
    if (!email) break;
    emails.push(email);
  }

  if (emails.length === 0) {
    console.error("No email addresses provided. Setup aborted.");
    rl.close();
    process.exit(1);
  }

  configManager.save({ apiKey, emails });
  rl.close();

  console.log(`\nConfig saved to: ${CONFIG_PATH}`);
  console.log("Run 'breach-monitor check' to look for breaches now.");
}

// ─── Cron installer ───────────────────────────────────────────────────────────

/** Adds a daily 09:00 cron job that runs `breach-monitor check` */
function installCronJob(scriptPath: string): void {
  const cronLine = `0 9 * * * ${scriptPath} check >> ${LOG_FILE} 2>&1`;

  try {
    const existing = execSync("crontab -l 2>/dev/null || true", { encoding: "utf-8" });
    if (existing.includes(scriptPath)) {
      console.log("Cron job is already installed (runs daily at 09:00).");
      return;
    }
    execSync(`(crontab -l 2>/dev/null; echo "${cronLine}") | crontab -`);
    console.log("Cron job installed — breach-monitor will run daily at 09:00.");
    console.log(`Logs: ${LOG_FILE}`);
  } catch (error) {
    console.error("Failed to install cron job:", error);
    process.exit(1);
  }
}

// ─── List state ───────────────────────────────────────────────────────────────

/** Prints all breach records stored in the local state directory */
function listStoredState(): void {
  if (!fs.existsSync(STATE_DIR)) {
    console.log("No breach state found. Run 'breach-monitor check' first.");
    return;
  }

  const stateFiles = fs.readdirSync(STATE_DIR).filter((f) => f.endsWith(".json"));

  if (stateFiles.length === 0) {
    console.log("No breach state found. Either no breaches exist or checks haven't run yet.");
    return;
  }

  for (const file of stateFiles) {
    const raw = fs.readFileSync(path.join(STATE_DIR, file), "utf-8");
    const breaches = JSON.parse(raw) as Array<{
      Title: string;
      BreachDate: string;
      Domain: string;
    }>;
    console.log(`\n--- ${file} ---`);
    for (const breach of breaches) {
      console.log(`  ${breach.Title} (${breach.BreachDate}) — ${breach.Domain}`);
    }
  }
}

// ─── CLI setup ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("breach-monitor")
  .description("Monitor email addresses for dark web data breach exposure")
  .version("1.0.0");

// --- setup ---
program
  .command("setup")
  .description("Run the interactive first-time setup wizard")
  .action(async () => {
    await runSetupWizard(new ConfigManager(CONFIG_PATH));
  });

// --- check ---
program
  .command("check [emails...]")
  .description("Check email addresses for new data breaches")
  .option("-k, --key <key>", "HIBP API key (overrides the saved config)")
  .action(async (cliEmails: string[], opts: { key?: string }) => {
    const configManager = new ConfigManager(CONFIG_PATH);
    const config = configManager.load();

    // Resolve the API key from: CLI flag → environment variable → saved config
    const apiKey = opts.key ?? process.env.HIBP_API_KEY ?? config?.apiKey;
    if (!apiKey) {
      console.error("No API key found. Run 'breach-monitor setup' first.");
      process.exit(1);
    }

    // Resolve the email list from: CLI args → saved config
    const emails = cliEmails.length > 0 ? cliEmails : (config?.emails ?? []);
    if (emails.length === 0) {
      console.error(
        "No emails to check. Pass email(s) as arguments or run 'breach-monitor setup'.",
      );
      process.exit(1);
    }

    const monitor = createBreachMonitor(apiKey);
    await monitor.checkAll(emails);
  });

// --- list ---
program
  .command("list")
  .description("Show all tracked breaches stored in the local state cache")
  .action(() => {
    listStoredState();
  });

// --- install-cron ---
program
  .command("install-cron")
  .description("Install a daily cron job to automatically check for new breaches at 09:00")
  .action(() => {
    installCronJob(process.argv[1]);
  });

program.parse();
