import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncKey(): Buffer {
  const secret = process.env.AI_KEY_ENC_SECRET;
  if (!secret) {
    throw new Error("AI_KEY_ENC_SECRET is not set. Add a 32-byte base64 value to .env.");
  }
  const buf = Buffer.from(secret, "base64");
  if (buf.length !== 32) {
    throw new Error(`AI_KEY_ENC_SECRET must be 32 bytes (got ${buf.length}). Generate with: openssl rand -base64 32`);
  }
  return buf;
}

export function encryptKey(plaintext: string): string {
  const key = getEncKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv || tag || ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptKey(ciphertext: string): string {
  const key = getEncKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
