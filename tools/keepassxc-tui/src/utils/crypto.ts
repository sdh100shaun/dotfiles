import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import type { KeyPair } from '../types';

export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

export function generateNonce(): Uint8Array {
  return nacl.randomBytes(24);
}

export function generateClientId(): string {
  const bytes = nacl.randomBytes(24);
  return encodeBase64(bytes);
}

export function generateRequestId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function encrypt(
  message: string,
  nonce: Uint8Array,
  serverPublicKey: Uint8Array,
  clientSecretKey: Uint8Array
): string {
  const messageBytes = new TextEncoder().encode(message);
  const encrypted = nacl.box(messageBytes, nonce, serverPublicKey, clientSecretKey);
  return encodeBase64(encrypted);
}

export function decrypt(
  encryptedMessage: string,
  nonce: Uint8Array,
  serverPublicKey: Uint8Array,
  clientSecretKey: Uint8Array
): string {
  const messageBytes = decodeBase64(encryptedMessage);
  const decrypted = nacl.box.open(messageBytes, nonce, serverPublicKey, clientSecretKey);

  if (!decrypted) {
    throw new Error('Failed to decrypt message');
  }

  return new TextDecoder().decode(decrypted);
}

export function incrementNonce(nonce: Uint8Array): Uint8Array {
  const newNonce = new Uint8Array(nonce);

  // Increment as little-endian number
  for (let i = 0; i < newNonce.length; i++) {
    newNonce[i]++;
    if (newNonce[i] !== 0) break;
  }

  return newNonce;
}

export function publicKeyToBase64(keyPair: KeyPair): string {
  return encodeBase64(keyPair.publicKey);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return decodeBase64(base64);
}

export { encodeBase64, decodeBase64 };
