import { createCipheriv, pbkdf2Sync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TokenDecryptor, decodeSalt } from "../src/TokenDecryptor.js";
import { DecryptionError } from "../src/errors.js";
import type { AuthyToken } from "../src/types.js";

// ─── Test vector helpers ───────────────────────────────────────────────────────
// We generate test vectors using the same crypto operations in reverse,
// so we know exactly what the decrypted output should be.

const PASSWORD = "test-backup-password";
const SALT_HEX = "deadbeefcafebabe0102030405060708";
const SALT_BASE64 = Buffer.from("saltsaltsaltsalt").toString("base64");
const ITERATIONS = 1000;
const SECRET = "JBSWY3DPEHPK3PXP"; // A valid Base32 TOTP secret

/** Encrypts a plaintext string using the same AES-256-CBC + PBKDF2 scheme Authy uses */
function encryptTestVector(
  plaintext: string,
  saltHex: string,
  iterations: number,
  password: string,
): string {
  const key = pbkdf2Sync(
    Buffer.from(password, "utf-8"),
    Buffer.from(saltHex, "hex"),
    iterations,
    32,
    "sha1",
  );
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf-8")), cipher.final()]);
  return encrypted.toString("base64");
}

/** The pre-computed encrypted form of SECRET with our test parameters */
const ENCRYPTED_SECRET = encryptTestVector(SECRET, SALT_HEX, ITERATIONS, PASSWORD);

/** A minimal valid AuthyToken using our test vector */
function makeToken(overrides: Partial<AuthyToken> = {}): AuthyToken {
  return {
    name: "GitHub",
    issuer: "github.com",
    encrypted_seed: ENCRYPTED_SECRET,
    salt: SALT_HEX,
    key_derivation_iterations: ITERATIONS,
    digits: 6,
    unique_id: "test-001",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("decodeSalt()", () => {
  it("decodes a hex-encoded salt", () => {
    const result = decodeSalt("deadbeef");
    expect(result).toEqual(Buffer.from("deadbeef", "hex"));
  });

  it("decodes a Base64-encoded salt", () => {
    const b64 = Buffer.from("some salt bytes").toString("base64");
    const result = decodeSalt(b64);
    expect(result).toEqual(Buffer.from("some salt bytes"));
  });

  it("returns a Buffer in both cases", () => {
    expect(decodeSalt("abcd1234")).toBeInstanceOf(Buffer);
    expect(decodeSalt(SALT_BASE64)).toBeInstanceOf(Buffer);
  });

  it("treats ambiguous short hex strings as hex", () => {
    // "cafe" is valid both as hex and as 4 ascii chars
    // Our heuristic (all hex chars + even length) picks hex
    const result = decodeSalt("cafe");
    expect(result).toEqual(Buffer.from([0xca, 0xfe]));
  });

  it("falls back to Base64 when the string contains non-hex characters", () => {
    // "+" and "=" are Base64 but not hex
    const b64 = "abc+d==";
    expect(() => decodeSalt(b64)).not.toThrow();
  });
});

describe("TokenDecryptor", () => {
  describe("decryptToken()", () => {
    it("successfully decrypts a token and returns the correct secret", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken());
      expect(result.secret).toBe(SECRET);
    });

    it("sets name from the token's name field", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken({ name: "user@example.com" }));
      expect(result.name).toBe("user@example.com");
    });

    it("sets issuer from the token's issuer field when present", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken({ issuer: "GitHub" }));
      expect(result.issuer).toBe("GitHub");
    });

    it("falls back to name as issuer when issuer field is absent", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const token = makeToken({ issuer: undefined });
      const result = decryptor.decryptToken(token);
      expect(result.issuer).toBe(token.name);
    });

    it("preserves the digits count from the token", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken({ digits: 8 }));
      expect(result.digits).toBe(8);
    });

    it("defaults to 6 digits when digits field is missing", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      // @ts-expect-error — testing missing field
      const result = decryptor.decryptToken(makeToken({ digits: undefined }));
      expect(result.digits).toBe(6);
    });

    it("uses a 30-second period for standard tokens", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken({ account_type: "totp" }));
      expect(result.period).toBe(30);
    });

    it("uses a 10-second period for authy_software tokens", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken({ account_type: "authy_software" }));
      expect(result.period).toBe(10);
    });

    it("always sets algorithm to SHA1", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const result = decryptor.decryptToken(makeToken());
      expect(result.algorithm).toBe("SHA1");
    });

    it("throws DecryptionError when the password is wrong", () => {
      const decryptor = new TokenDecryptor("wrong-password");
      expect(() => decryptor.decryptToken(makeToken())).toThrow(DecryptionError);
    });

    it("includes a helpful message in DecryptionError about checking the password", () => {
      const decryptor = new TokenDecryptor("bad-password");
      expect(() => decryptor.decryptToken(makeToken())).toThrow(/backup password/i);
    });
  });

  describe("decryptAll()", () => {
    it("decrypts all tokens when password is correct", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const tokens = [makeToken({ name: "A" }), makeToken({ name: "B" })];
      const results = decryptor.decryptAll(tokens);
      expect(results).toHaveLength(2);
    });

    it("skips tokens that fail to decrypt and logs to stderr", () => {
      const decryptor = new TokenDecryptor("wrong-password");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const results = decryptor.decryptAll([makeToken()]);
      expect(results).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns an empty array when all tokens fail", () => {
      const decryptor = new TokenDecryptor("totally-wrong");
      const results = decryptor.decryptAll([makeToken()]);
      expect(results).toHaveLength(0);
    });

    it("returns an empty array for an empty input", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      expect(decryptor.decryptAll([])).toEqual([]);
    });
  });

  describe("encryptSeed() / decryptSeed() round-trip", () => {
    it("decrypts data that was encrypted with encryptSeed()", () => {
      const decryptor = new TokenDecryptor(PASSWORD);
      const encrypted = decryptor.encryptSeed("TESTSECRET", SALT_HEX, ITERATIONS);
      const key = decryptor.deriveKey(SALT_HEX, ITERATIONS);
      const decrypted = decryptor.decryptSeed(encrypted, key);
      expect(decrypted).toBe("TESTSECRET");
    });
  });
});

// vi needs to be in scope for the spy inside decryptAll
import { vi } from "vitest";
