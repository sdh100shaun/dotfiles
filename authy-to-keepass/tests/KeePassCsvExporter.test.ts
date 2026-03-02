import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KeePassCsvExporter } from "../src/KeePassCsvExporter.js";
import { OtpUriBuilder } from "../src/OtpUriBuilder.js";
import type { DecryptedToken } from "../src/types.js";

/** Creates a minimal DecryptedToken for use in tests */
function makeToken(overrides: Partial<DecryptedToken> = {}): DecryptedToken {
  return {
    name: "user@example.com",
    issuer: "GitHub",
    secret: "JBSWY3DPEHPK3PXP",
    digits: 6,
    period: 30,
    algorithm: "SHA1",
    ...overrides,
  };
}

describe("KeePassCsvExporter", () => {
  const builder = new OtpUriBuilder();
  const exporter = new KeePassCsvExporter(builder);

  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "keepass-csv-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("buildRows()", () => {
    it("returns one row per token", () => {
      const rows = exporter.buildRows([makeToken(), makeToken({ name: "other@example.com" })]);
      expect(rows).toHaveLength(2);
    });

    it("sets Title to the token's issuer", () => {
      const rows = exporter.buildRows([makeToken({ issuer: "GitHub" })]);
      expect(rows[0].Title).toBe("GitHub");
    });

    it("sets Username to the token's name", () => {
      const rows = exporter.buildRows([makeToken({ name: "user@example.com" })]);
      expect(rows[0].Username).toBe("user@example.com");
    });

    it("sets Password to an empty string", () => {
      const rows = exporter.buildRows([makeToken()]);
      expect(rows[0].Password).toBe("");
    });

    it("sets URL to an empty string", () => {
      const rows = exporter.buildRows([makeToken()]);
      expect(rows[0].URL).toBe("");
    });

    it("includes today's date in the Notes field", () => {
      const rows = exporter.buildRows([makeToken()]);
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      expect(rows[0].Notes).toContain(today);
    });

    it("sets TOTP to a valid otpauth:// URI", () => {
      const rows = exporter.buildRows([makeToken()]);
      expect(rows[0].TOTP).toMatch(/^otpauth:\/\/totp\//);
    });

    it("returns an empty array for an empty input", () => {
      expect(exporter.buildRows([])).toEqual([]);
    });
  });

  describe("toCsvString()", () => {
    it("starts with the correct header row", () => {
      const csv = exporter.toCsvString([]);
      expect(csv.startsWith('"Title","Username","Password","URL","Notes","TOTP"')).toBe(true);
    });

    it("produces one data row per input row", () => {
      const rows = exporter.buildRows([makeToken(), makeToken({ name: "b" })]);
      const csv = exporter.toCsvString(rows);
      const lines = csv.trim().split("\n");
      expect(lines).toHaveLength(3); // 1 header + 2 data
    });

    it("wraps all fields in double-quotes", () => {
      const csv = exporter.toCsvString(exporter.buildRows([makeToken()]));
      const dataLine = csv.split("\n")[1];
      // Every field should be wrapped in quotes
      expect(dataLine.startsWith('"')).toBe(true);
    });

    it("escapes double-quotes inside field values as double double-quotes", () => {
      const token = makeToken({ issuer: 'Service "Pro"' });
      const csv = exporter.toCsvString(exporter.buildRows([token]));
      expect(csv).toContain('Service ""Pro""');
    });

    it("ends with a trailing newline", () => {
      const csv = exporter.toCsvString([]);
      expect(csv.endsWith("\n")).toBe(true);
    });
  });

  describe("exportToCsvFile()", () => {
    it("creates the output file", () => {
      const outputPath = path.join(tmpDir, "test-export.csv");
      exporter.exportToCsvFile([makeToken()], outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("writes valid CSV content to disk", () => {
      const outputPath = path.join(tmpDir, "test-export.csv");
      exporter.exportToCsvFile([makeToken()], outputPath);
      const content = fs.readFileSync(outputPath, "utf-8");
      expect(content).toContain("Title");
      expect(content).toContain("TOTP");
      expect(content).toContain("otpauth://");
    });

    it("writes the file with restricted permissions (0o600)", () => {
      const outputPath = path.join(tmpDir, "test-export.csv");
      exporter.exportToCsvFile([makeToken()], outputPath);
      const stat = fs.statSync(outputPath);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    it("can export multiple tokens", () => {
      const outputPath = path.join(tmpDir, "multi-export.csv");
      const tokens = [makeToken({ name: "a" }), makeToken({ name: "b" }), makeToken({ name: "c" })];
      exporter.exportToCsvFile(tokens, outputPath);
      const content = fs.readFileSync(outputPath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(4); // 1 header + 3 tokens
    });
  });

  describe("exportToUriFile()", () => {
    it("creates the output file", () => {
      const outputPath = path.join(tmpDir, "test-uris.txt");
      exporter.exportToUriFile([makeToken()], outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("writes one otpauth:// URI per line", () => {
      const outputPath = path.join(tmpDir, "test-uris.txt");
      exporter.exportToUriFile([makeToken(), makeToken({ name: "other" })], outputPath);
      const content = fs.readFileSync(outputPath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
      for (const line of lines) {
        expect(line).toMatch(/^otpauth:\/\/totp\//);
      }
    });

    it("writes the file with restricted permissions (0o600)", () => {
      const outputPath = path.join(tmpDir, "test-uris.txt");
      exporter.exportToUriFile([makeToken()], outputPath);
      const stat = fs.statSync(outputPath);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    it("ends with a trailing newline", () => {
      const outputPath = path.join(tmpDir, "test-uris.txt");
      exporter.exportToUriFile([makeToken()], outputPath);
      const content = fs.readFileSync(outputPath, "utf-8");
      expect(content.endsWith("\n")).toBe(true);
    });
  });
});
