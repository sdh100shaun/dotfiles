import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigManager } from "../src/ConfigManager.js";
import type { Config } from "../src/types.js";

describe("ConfigManager", () => {
  let tmpDir: string;
  let configPath: string;
  let manager: ConfigManager;

  beforeEach(() => {
    // Create a fresh temporary directory before each test so tests don't interfere
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "breach-config-test-"));
    configPath = path.join(tmpDir, "config.json");
    manager = new ConfigManager(configPath);
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("load()", () => {
    it("returns null when the config file does not exist", () => {
      expect(manager.load()).toBeNull();
    });

    it("loads and parses a valid config file", () => {
      const config: Config = { apiKey: "test-key-123", emails: ["you@example.com"] };
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(manager.load()).toEqual(config);
    });

    it("loads a config with multiple email addresses", () => {
      const config: Config = {
        apiKey: "abc",
        emails: ["a@example.com", "b@example.com", "c@example.com"],
      };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const loaded = manager.load();
      expect(loaded?.emails).toHaveLength(3);
    });

    it("loads a config with an empty emails array", () => {
      const config: Config = { apiKey: "key", emails: [] };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const loaded = manager.load();
      expect(loaded?.emails).toEqual([]);
    });
  });

  describe("save()", () => {
    it("writes a valid config file", () => {
      const config: Config = { apiKey: "my-key", emails: ["me@test.com"] };
      manager.save(config);

      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("saves and reloads the same config", () => {
      const config: Config = { apiKey: "round-trip-key", emails: ["rt@test.com"] };
      manager.save(config);

      expect(manager.load()).toEqual(config);
    });

    it("creates parent directories if they do not exist", () => {
      const nestedPath = path.join(tmpDir, "a", "b", "c", "config.json");
      const nestedManager = new ConfigManager(nestedPath);
      nestedManager.save({ apiKey: "x", emails: [] });

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it("overwrites an existing config file", () => {
      const original: Config = { apiKey: "old-key", emails: ["old@example.com"] };
      manager.save(original);

      const updated: Config = { apiKey: "new-key", emails: ["new@example.com"] };
      manager.save(updated);

      expect(manager.load()).toEqual(updated);
    });

    it("writes the file with restricted permissions (0o600)", () => {
      manager.save({ apiKey: "key", emails: [] });

      const stat = fs.statSync(configPath);
      // On Unix systems the permission mask is 0o777, & 0o777 isolates the permission bits
      const permissions = stat.mode & 0o777;
      expect(permissions).toBe(0o600);
    });
  });
});
