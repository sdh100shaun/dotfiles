import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import { DecryptionError } from "./errors.js";
import type { AuthyToken, DecryptedToken } from "./types.js";

/**
 * TokenDecryptor decrypts Authy's AES-256-CBC encrypted TOTP seeds.
 *
 * ## Encryption scheme (reverse-engineered from Authy)
 *
 * - **Cipher**: AES-256-CBC
 * - **Key**: PBKDF2(password, salt, iterations, keylen=32, hash=SHA1)
 * - **IV**: 16 zero bytes (null IV — Authy's design choice)
 * - **Salt encoding**: hex for old desktop tokens, Base64 for iOS tokens
 *   (auto-detected from the salt string characters)
 * - **Ciphertext**: Base64-encoded `encrypted_seed` field from the API
 *
 * The decrypted bytes are the Base32-encoded TOTP secret (e.g. "JBSWY3DPEHPK3PXP").
 *
 * Example usage:
 * ```ts
 * const decryptor = new TokenDecryptor("my-authy-backup-password");
 * const decrypted = decryptor.decryptAll(tokens);
 * ```
 */
export class TokenDecryptor {
  private readonly password: string;

  /**
   * @param password - Your Authy backup password (case-sensitive).
   *                   Set in the Authy app under Settings → Accounts → Backups.
   */
  constructor(password: string) {
    this.password = password;
  }

  /**
   * Decrypts a single Authy token.
   *
   * Throws `DecryptionError` if decryption fails — usually a wrong password.
   *
   * @param token - The encrypted token record from authenticator_tokens.json
   * @returns A decrypted token ready to be converted to an otpauth:// URI
   */
  decryptToken(token: AuthyToken): DecryptedToken {
    const key = this.deriveKey(token.salt, token.key_derivation_iterations);
    const secret = this.decryptSeed(token.encrypted_seed, key);

    // Authy-proprietary tokens ("authy_software") use a 10-second window.
    // Standard authenticator tokens use the universal 30-second window.
    const period = token.account_type === "authy_software" ? 10 : 30;

    return {
      name: token.name,
      issuer: token.issuer ?? token.name,
      secret,
      digits: token.digits ?? 6,
      period,
      algorithm: "SHA1",
    };
  }

  /**
   * Decrypts all tokens in the array.
   * Tokens that fail to decrypt are skipped and logged to stderr.
   *
   * @param tokens - Array of encrypted tokens from the backup file
   * @returns Array of successfully decrypted tokens
   */
  decryptAll(tokens: AuthyToken[]): DecryptedToken[] {
    const results: DecryptedToken[] = [];

    for (const token of tokens) {
      try {
        results.push(this.decryptToken(token));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`  Skipping "${token.name}": ${msg}`);
      }
    }

    return results;
  }

  /**
   * Derives the 32-byte AES key from the backup password using PBKDF2-SHA1.
   *
   * Authy stores the salt as either a hex string (older desktop tokens)
   * or a Base64 string (iOS tokens captured via mitmproxy). This method
   * detects the encoding automatically.
   */
  deriveKey(salt: string, iterations: number): Buffer {
    return pbkdf2Sync(
      Buffer.from(this.password, "utf-8"),
      decodeSalt(salt),
      iterations,
      32,
      "sha1",
    );
  }

  /**
   * Decrypts the AES-256-CBC ciphertext using the derived key and a null IV.
   * Returns the Base32-encoded TOTP secret string.
   */
  decryptSeed(encryptedSeed: string, key: Buffer): string {
    // Authy uses a 16-byte null IV across all tokens.
    // While this is cryptographically weak, each token has its own PBKDF2 salt,
    // so the derived keys (and therefore the effective IVs) are all different.
    const iv = Buffer.alloc(16, 0);

    try {
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      const ciphertext = Buffer.from(encryptedSeed, "base64");
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // The decrypted bytes are the Base32 TOTP secret as a UTF-8 string
      return plaintext.toString("utf-8").trim().toUpperCase();
    } catch (error) {
      throw new DecryptionError(
        `Decryption failed — check your Authy backup password. (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  /**
   * Produces the AES-256-CBC encrypted form of a plaintext seed.
   * Used internally to create test vectors — not needed for normal migration use.
   *
   * @param secret     - Base32 TOTP secret to encrypt
   * @param saltHex    - Hex-encoded salt
   * @param iterations - PBKDF2 iterations
   * @returns Base64-encoded ciphertext (matches the `encrypted_seed` field format)
   */
  encryptSeed(secret: string, saltHex: string, iterations: number): string {
    const key = this.deriveKey(saltHex, iterations);
    const iv = Buffer.alloc(16, 0);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(secret, "utf-8")), cipher.final()]);
    return encrypted.toString("base64");
  }
}

/**
 * Decodes the Authy salt field into a Buffer.
 *
 * Authy uses two different salt encodings depending on where the token
 * was created:
 * - Desktop app tokens: hex-encoded (e.g. "a1b2c3d4...")
 * - iOS app tokens (mitmproxy capture): Base64-encoded
 *
 * This function detects the encoding by checking if the string looks like
 * pure hex (only 0-9 and a-f, even length). If not, it falls back to Base64.
 *
 * @param salt - The raw salt string from the JSON token record
 * @returns Decoded salt bytes
 */
export function decodeSalt(salt: string): Buffer {
  if (/^[0-9a-fA-F]+$/.test(salt) && salt.length % 2 === 0) {
    return Buffer.from(salt, "hex");
  }
  return Buffer.from(salt, "base64");
}
