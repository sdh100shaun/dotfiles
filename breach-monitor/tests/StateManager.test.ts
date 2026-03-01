import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StateManager } from "../src/StateManager.js";
import type { Breach } from "../src/types.js";

/** Creates a minimal Breach for use in tests */
function makeBreach(name: string): Breach {
  return {
    Name: name,
    Title: `${name} Breach`,
    Domain: `${name.toLowerCase()}.com`,
    BreachDate: "2021-01-01",
    AddedDate: "2021-02-01",
    ModifiedDate: "2021-02-01",
    PwnCount: 500000,
    Description: "A test breach",
    LogoPath: "",
    DataClasses: ["Email addresses"],
    IsVerified: true,
    IsFabricated: false,
    IsSensitive: false,
    IsRetired: false,
    IsSpamList: false,
    IsMalware: false,
  };
}

describe("StateManager", () => {
  let tmpDir: string;
  let manager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "breach-state-test-"));
    manager = new StateManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getStateFilePath()", () => {
    it("returns a path inside the state directory", () => {
      const filePath = manager.getStateFilePath("test@example.com");
      expect(filePath).toContain(tmpDir);
    });

    it("returns a path ending in .json", () => {
      const filePath = manager.getStateFilePath("test@example.com");
      expect(filePath).toMatch(/\.json$/);
    });

    it("returns the same path for the same email", () => {
      const path1 = manager.getStateFilePath("same@example.com");
      const path2 = manager.getStateFilePath("same@example.com");
      expect(path1).toBe(path2);
    });

    it("returns different paths for different emails", () => {
      const path1 = manager.getStateFilePath("alice@example.com");
      const path2 = manager.getStateFilePath("bob@example.com");
      expect(path1).not.toBe(path2);
    });

    it("does not include the raw email in the path (uses a hash)", () => {
      const filePath = manager.getStateFilePath("secret@example.com");
      expect(filePath).not.toContain("secret");
      expect(filePath).not.toContain("@");
    });
  });

  describe("loadSeenBreaches()", () => {
    it("returns an empty array when no state file exists for that email", () => {
      const result = manager.loadSeenBreaches("new@example.com");
      expect(result).toEqual([]);
    });

    it("returns the stored breaches after they have been saved", () => {
      const breaches = [makeBreach("Adobe"), makeBreach("LinkedIn")];
      manager.saveBreaches("test@example.com", breaches);

      const loaded = manager.loadSeenBreaches("test@example.com");
      expect(loaded).toHaveLength(2);
      expect(loaded[0].Name).toBe("Adobe");
    });

    it("returns an empty array when the state is cleared", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);
      manager.clearBreaches("test@example.com");

      expect(manager.loadSeenBreaches("test@example.com")).toEqual([]);
    });
  });

  describe("saveBreaches()", () => {
    it("creates the state file on disk", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);

      const filePath = manager.getStateFilePath("test@example.com");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("persists breach data that can be reloaded", () => {
      const breaches = [makeBreach("Dropbox")];
      manager.saveBreaches("test@example.com", breaches);

      const loaded = manager.loadSeenBreaches("test@example.com");
      expect(loaded[0].Name).toBe("Dropbox");
    });

    it("overwrites existing state with the latest breach list", () => {
      manager.saveBreaches("test@example.com", [makeBreach("OldBreach")]);
      manager.saveBreaches("test@example.com", [makeBreach("NewBreach")]);

      const loaded = manager.loadSeenBreaches("test@example.com");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].Name).toBe("NewBreach");
    });

    it("writes the file with restricted permissions (0o600)", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);

      const filePath = manager.getStateFilePath("test@example.com");
      const stat = fs.statSync(filePath);
      const permissions = stat.mode & 0o777;
      expect(permissions).toBe(0o600);
    });

    it("creates the state directory if it does not exist yet", () => {
      const newDir = path.join(tmpDir, "new-subdir");
      const newManager = new StateManager(newDir);

      expect(() => newManager.saveBreaches("test@example.com", [])).not.toThrow();
      expect(fs.existsSync(newDir)).toBe(true);
    });
  });

  describe("clearBreaches()", () => {
    it("removes the state file from disk", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);
      manager.clearBreaches("test@example.com");

      const filePath = manager.getStateFilePath("test@example.com");
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("does not throw if there is no state file to delete", () => {
      expect(() => manager.clearBreaches("never-seen@example.com")).not.toThrow();
    });
  });

  describe("findNewBreaches()", () => {
    it("returns all breaches when the email has no previous state", () => {
      const breaches = [makeBreach("Adobe"), makeBreach("LinkedIn")];
      const newOnes = manager.findNewBreaches("first-run@example.com", breaches);

      expect(newOnes).toHaveLength(2);
    });

    it("returns only breaches not seen in the previous state", () => {
      // Save Adobe as already known
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);

      // Current API response adds LinkedIn as a new one
      const current = [makeBreach("Adobe"), makeBreach("LinkedIn")];
      const newOnes = manager.findNewBreaches("test@example.com", current);

      expect(newOnes).toHaveLength(1);
      expect(newOnes[0].Name).toBe("LinkedIn");
    });

    it("returns an empty array when all current breaches were already known", () => {
      const breaches = [makeBreach("Adobe"), makeBreach("Dropbox")];
      manager.saveBreaches("test@example.com", breaches);

      const newOnes = manager.findNewBreaches("test@example.com", breaches);
      expect(newOnes).toEqual([]);
    });

    it("returns an empty array when the current breach list is empty", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);

      const newOnes = manager.findNewBreaches("test@example.com", []);
      expect(newOnes).toEqual([]);
    });

    it("correctly identifies multiple new breaches", () => {
      manager.saveBreaches("test@example.com", [makeBreach("Adobe")]);

      const current = [makeBreach("Adobe"), makeBreach("LinkedIn"), makeBreach("Dropbox")];
      const newOnes = manager.findNewBreaches("test@example.com", current);

      expect(newOnes).toHaveLength(2);
      const names = newOnes.map((b) => b.Name);
      expect(names).toContain("LinkedIn");
      expect(names).toContain("Dropbox");
    });
  });
});
