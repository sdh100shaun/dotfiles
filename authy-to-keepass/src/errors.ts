/**
 * Thrown when AES-256-CBC decryption fails.
 *
 * The most common cause is a wrong Authy backup password.
 * Check the password and try again — it is case-sensitive.
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

/**
 * Thrown when the input JSON file is not a valid Authy backup.
 *
 * The file must contain an `authenticator_tokens` array.
 * Make sure you captured it from the Authy iOS app via mitmproxy.
 */
export class InvalidBackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBackupFileError";
  }
}
