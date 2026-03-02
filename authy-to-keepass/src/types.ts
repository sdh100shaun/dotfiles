/**
 * A single encrypted token record as returned by the Authy API
 * (captured from the authenticator_tokens.json response via mitmproxy).
 *
 * These are standard TOTP tokens — the ones you added to Authy by scanning
 * a QR code or entering a key from a website's 2FA setup page.
 */
export interface AuthyToken {
  /** Human-readable account label (e.g. "GitHub", "user@example.com") */
  name: string;

  /** Service name or domain (e.g. "github.com") — may be absent on older tokens */
  issuer?: string;

  /** AES-256-CBC encrypted TOTP secret, Base64-encoded */
  encrypted_seed: string;

  /**
   * Salt used for PBKDF2 key derivation.
   * May be hex-encoded (older desktop tokens) or Base64-encoded (iOS app tokens).
   * TokenDecryptor handles both formats automatically.
   */
  salt: string;

  /**
   * Number of PBKDF2 iterations for key derivation.
   * Older tokens: 1,000.  iOS-captured tokens: 100,000.
   */
  key_derivation_iterations: number;

  /** Number of OTP digits — usually 6, occasionally 7 or 8 */
  digits: number;

  /**
   * Token category.
   * "totp" or "authenticator" = standard TOTP (30s period)
   * "authy_software" = Authy-proprietary token (may use 10s period / 7 digits)
   */
  account_type?: string;

  /** Unique identifier for this token in Authy's system */
  unique_id: string;

  /** Timestamp of the last backup password change — informational only */
  password_timestamp?: number;

  /**
   * Per-token IV for AES encryption.
   * Null in most Authy tokens — when null a 16-byte zero IV is used.
   * Preserved here for completeness but not currently used.
   */
  unique_iv?: string | null;
}

/**
 * The top-level structure of the authenticator_tokens.json file
 * captured by mitmproxy from the Authy iOS app.
 */
export interface AuthyBackup {
  /** Array of encrypted TOTP token records */
  authenticator_tokens: AuthyToken[];
}

/**
 * A decrypted token ready to be converted into an otpauth:// URI.
 * Produced by TokenDecryptor after AES-256-CBC decryption.
 */
export interface DecryptedToken {
  /** Account label (e.g. "user@example.com") */
  name: string;

  /** Issuer / service name (e.g. "GitHub") */
  issuer: string;

  /** The Base32-encoded TOTP secret — the actual credential */
  secret: string;

  /** OTP code length (typically 6) */
  digits: number;

  /** Token rotation period in seconds (typically 30) */
  period: number;

  /** HMAC algorithm — always SHA1 for Authy tokens */
  algorithm: string;
}

/**
 * One row in the CSV file exported for KeePassXC import.
 * Maps directly to KeePassXC's expected CSV column names.
 */
export interface KeePassCsvRow {
  Title: string;
  Username: string;
  Password: string;
  URL: string;
  Notes: string;
  /** Full otpauth://totp/ URI — KeePassXC maps this to the TOTP field */
  TOTP: string;
}
