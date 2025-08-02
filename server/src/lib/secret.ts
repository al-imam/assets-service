import crypto from "crypto";
import { env } from "~/env";

const ALGO = "aes-256-ctr";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.MASTER_SECRET_KEY).digest();
const ENCRYPTION_IV = crypto.createHash("md5").update(env.MASTER_SECRET_KEY).digest();

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

function deriveIV(secret: string) {
  return crypto.createHash("md5").update(secret).digest();
}

export function encrypt(raw: string, masterSecret?: string): string {
  const key = masterSecret ? deriveKey(masterSecret) : ENCRYPTION_KEY;
  const iv = masterSecret ? deriveIV(masterSecret) : ENCRYPTION_IV;
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

export function decrypt(encryptedValue: string, masterSecret?: string): string {
  const key = masterSecret ? deriveKey(masterSecret) : ENCRYPTION_KEY;
  const iv = masterSecret ? deriveIV(masterSecret) : ENCRYPTION_IV;
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
