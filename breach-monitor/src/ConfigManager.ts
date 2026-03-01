import fs from "node:fs";
import path from "node:path";
import type { Config } from "./types.js";

/**
 * ConfigManager is responsible for reading and writing the application configuration.
 *
 * The config is stored as a JSON file at a path you provide (usually inside
 * ~/.config/breach-monitor/). The file is written with restricted permissions
 * (owner-only read/write) so that your API key stays private.
 *
 * Example usage:
 * ```ts
 * const manager = new ConfigManager("/home/you/.config/breach-monitor/config.json");
 * const config = manager.load(); // Returns null if the file doesn't exist yet
 * manager.save({ apiKey: "abc123", emails: ["you@example.com"] });
 * ```
 */
export class ConfigManager {
  /** The full path to the configuration JSON file */
  private readonly configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Loads configuration from disk.
   *
   * Returns `null` if the configuration file does not exist yet.
   * This is the normal state before the user has run `--setup`.
   */
  load(): Config | null {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }

    const raw = fs.readFileSync(this.configPath, "utf-8");
    return JSON.parse(raw) as Config;
  }

  /**
   * Saves configuration to disk.
   *
   * Any parent directories that don't exist yet are created automatically.
   * The file is written with mode 0o600 (owner read/write only).
   */
  save(config: Config): void {
    const directory = path.dirname(this.configPath);
    fs.mkdirSync(directory, { recursive: true });

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
      mode: 0o600, // Only the file owner can read or write this file
    });
  }
}
