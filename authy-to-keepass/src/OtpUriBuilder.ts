import type { DecryptedToken } from "./types.js";

/**
 * OtpUriBuilder converts decrypted Authy token data into standard
 * `otpauth://totp/` URIs as defined by the Google Authenticator Key URI format.
 *
 * These URIs are the universal way to represent TOTP secrets — they encode
 * the secret, issuer, algorithm, digits, and period in a single string that
 * any TOTP app (including KeePassXC) can understand.
 *
 * URI format:
 * ```
 * otpauth://totp/{label}?secret={secret}&issuer={issuer}&digits={digits}&period={period}&algorithm={algorithm}
 * ```
 *
 * Example usage:
 * ```ts
 * const builder = new OtpUriBuilder();
 * const uri = builder.buildUri(decryptedToken);
 * // → "otpauth://totp/GitHub%3Auser%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&..."
 * ```
 */
export class OtpUriBuilder {
  /**
   * Builds a single `otpauth://totp/` URI from a decrypted token.
   *
   * The label follows the recommended `issuer:account` format which
   * helps apps display the tokens in a clear, organised way.
   *
   * @param token - A decrypted token (output of TokenDecryptor)
   * @returns A fully-formed otpauth:// URI string
   */
  buildUri(token: DecryptedToken): string {
    // Label: "Issuer:AccountName" — percent-encoded to be URL-safe
    const label = encodeURIComponent(`${token.issuer}:${token.name}`);

    // Build the query parameters
    const params = new URLSearchParams({
      secret: token.secret,
      issuer: token.issuer,
      digits: String(token.digits),
      period: String(token.period),
      algorithm: token.algorithm,
    });

    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Builds `otpauth://totp/` URIs for every token in the array.
   *
   * @param tokens - Array of decrypted tokens
   * @returns Array of otpauth:// URI strings, one per token
   */
  buildAllUris(tokens: DecryptedToken[]): string[] {
    return tokens.map((token) => this.buildUri(token));
  }
}
