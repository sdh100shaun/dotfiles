import { describe, expect, it } from "vitest";
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

describe("OtpUriBuilder", () => {
  const builder = new OtpUriBuilder();

  describe("buildUri()", () => {
    it("returns a string starting with otpauth://totp/", () => {
      const uri = builder.buildUri(makeToken());
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
    });

    it("includes the secret in the query string", () => {
      const uri = builder.buildUri(makeToken({ secret: "JBSWY3DPEHPK3PXP" }));
      expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    });

    it("includes the issuer in the query string", () => {
      const uri = builder.buildUri(makeToken({ issuer: "GitHub" }));
      expect(uri).toContain("issuer=GitHub");
    });

    it("includes the number of digits in the query string", () => {
      const uri = builder.buildUri(makeToken({ digits: 8 }));
      expect(uri).toContain("digits=8");
    });

    it("includes the period in the query string", () => {
      const uri = builder.buildUri(makeToken({ period: 10 }));
      expect(uri).toContain("period=10");
    });

    it("includes the algorithm in the query string", () => {
      const uri = builder.buildUri(makeToken({ algorithm: "SHA1" }));
      expect(uri).toContain("algorithm=SHA1");
    });

    it("encodes the label as issuer:name", () => {
      const uri = builder.buildUri(makeToken({ issuer: "GitHub", name: "user@example.com" }));
      // The label should be percent-encoded
      expect(uri).toContain(encodeURIComponent("GitHub:user@example.com"));
    });

    it("percent-encodes special characters in the label", () => {
      const uri = builder.buildUri(makeToken({ name: "user+tag@example.com", issuer: "Service" }));
      // + in the name should be encoded in the label
      expect(uri).not.toContain("user+tag"); // raw + should be encoded
    });

    it("produces a parseable URL", () => {
      const uri = builder.buildUri(makeToken());
      // Should not throw when parsed
      expect(() => new URL(uri)).not.toThrow();
    });

    it("works with 7-digit Authy-software tokens (10s period)", () => {
      const uri = builder.buildUri(makeToken({ digits: 7, period: 10 }));
      expect(uri).toContain("digits=7");
      expect(uri).toContain("period=10");
    });
  });

  describe("buildAllUris()", () => {
    it("returns one URI per token", () => {
      const tokens = [makeToken({ name: "a" }), makeToken({ name: "b" }), makeToken({ name: "c" })];
      const uris = builder.buildAllUris(tokens);
      expect(uris).toHaveLength(3);
    });

    it("returns an empty array for an empty input", () => {
      expect(builder.buildAllUris([])).toEqual([]);
    });

    it("each URI in the result starts with otpauth://totp/", () => {
      const tokens = [makeToken(), makeToken({ name: "other" })];
      const uris = builder.buildAllUris(tokens);
      for (const uri of uris) {
        expect(uri).toMatch(/^otpauth:\/\/totp\//);
      }
    });

    it("produces different URIs for tokens with different names", () => {
      const uris = builder.buildAllUris([makeToken({ name: "alice" }), makeToken({ name: "bob" })]);
      expect(uris[0]).not.toBe(uris[1]);
    });
  });
});
