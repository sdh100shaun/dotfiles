import { describe, expect, it } from "vitest";
import { AuthyBackupParser } from "../src/AuthyBackupParser.js";
import { InvalidBackupFileError } from "../src/errors.js";

/** Minimal valid token for use in tests */
const VALID_TOKEN = {
  name: "GitHub",
  issuer: "github.com",
  encrypted_seed: "abc123==",
  salt: "deadbeef",
  key_derivation_iterations: 1000,
  digits: 6,
  unique_id: "token-001",
};

describe("AuthyBackupParser", () => {
  const parser = new AuthyBackupParser();

  describe("parseJson()", () => {
    it("parses a full API response object with authenticator_tokens array", () => {
      const json = JSON.stringify({ authenticator_tokens: [VALID_TOKEN] });
      const result = parser.parseJson(json);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("GitHub");
    });

    it("parses a bare array of tokens (mitmproxy script output)", () => {
      const json = JSON.stringify([VALID_TOKEN]);
      const result = parser.parseJson(json);
      expect(result).toHaveLength(1);
    });

    it("parses multiple tokens", () => {
      const tokens = [VALID_TOKEN, { ...VALID_TOKEN, name: "Dropbox", unique_id: "token-002" }];
      const json = JSON.stringify({ authenticator_tokens: tokens });
      const result = parser.parseJson(json);
      expect(result).toHaveLength(2);
    });

    it("throws InvalidBackupFileError for malformed JSON", () => {
      expect(() => parser.parseJson("not json at all")).toThrow(InvalidBackupFileError);
    });

    it("throws InvalidBackupFileError for an empty token array", () => {
      const json = JSON.stringify({ authenticator_tokens: [] });
      expect(() => parser.parseJson(json)).toThrow(InvalidBackupFileError);
    });

    it("throws InvalidBackupFileError when the object has no authenticator_tokens key", () => {
      const json = JSON.stringify({ tokens: [VALID_TOKEN] });
      expect(() => parser.parseJson(json)).toThrow(InvalidBackupFileError);
    });

    it("throws InvalidBackupFileError for a plain string", () => {
      expect(() => parser.parseJson('"just a string"')).toThrow(InvalidBackupFileError);
    });

    it("throws InvalidBackupFileError for a JSON number", () => {
      expect(() => parser.parseJson("42")).toThrow(InvalidBackupFileError);
    });

    it("filters out items that are missing the encrypted_seed field", () => {
      const incomplete = { name: "Bad", salt: "hex" }; // missing encrypted_seed
      const json = JSON.stringify([VALID_TOKEN, incomplete]);
      const result = parser.parseJson(json);
      expect(result).toHaveLength(1); // Only the valid one
    });

    it("throws InvalidBackupFileError when ALL items are missing required fields", () => {
      const json = JSON.stringify([{ name: "Bad" }, { unique_id: "also-bad" }]);
      expect(() => parser.parseJson(json)).toThrow(InvalidBackupFileError);
    });

    it("includes a helpful error message when JSON is malformed", () => {
      expect(() => parser.parseJson("{bad json")).toThrow(/valid JSON/i);
    });

    it("includes a helpful error message when no authenticator_tokens key found", () => {
      const json = JSON.stringify({ wrong: [] });
      expect(() => parser.parseJson(json)).toThrow(/authenticator_tokens/i);
    });
  });

  describe("parseFile()", () => {
    it("throws InvalidBackupFileError if the file does not exist", () => {
      expect(() => parser.parseFile("/tmp/this-file-definitely-does-not-exist.json")).toThrow(
        InvalidBackupFileError,
      );
    });

    it("includes the file path in the error message", () => {
      const path = "/tmp/missing-file.json";
      expect(() => parser.parseFile(path)).toThrow(path);
    });
  });
});
