import crypto from "crypto";
import { SESSION_SECRET } from "./secret";

const algorithm = "aes-256-cbc";
const key = crypto.createHash("md5").update(SESSION_SECRET).digest("hex");

/**
 * Encrypt base64 data.
 * @param b64Content Base64 data
 * @returns encrypted `${base64IV},${base64EncryptedValue}`
 */
export function encrypt(b64Content: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const contentBuffer = Buffer.from(b64Content, "base64");
  let encrypted = cipher.update(contentBuffer, undefined, "base64");
  encrypted += cipher.final("base64");
  const ivB64 = iv.toString("base64");
  return `${ivB64},${encrypted}`;
}


/**
 * Decrypt data to base64.
 * @param encryptedGroup `${base64IV},${base64EncryptedValue}`
 * @returns Base64 plain data
 */
export function decrypt(encryptedGroup: string): string {
  const group = encryptedGroup.split(",");
  if (group.length !== 2) {
    throw new Error(`Invalid data to decrypt: ${encryptedGroup}`);
  }
  const ivB64 = group[0], encryptedB64 = group[1];
  const
    encrypted = Buffer.from(encryptedB64, "base64"),
    iv = Buffer.from(ivB64, "base64");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("base64");
}