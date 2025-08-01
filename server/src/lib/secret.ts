import crypto from "crypto";
import { env } from "~/env";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.MASTER_SECRET_KEY).digest();

export function encrypt(secret: string): string {
  const iv = crypto.createHash("md5").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return cipher.update(secret, "utf8", "base64") + cipher.final("base64");
}

export function decrypt(encrypted: string, originalSecret: string): string {
  const iv = crypto.createHash("md5").update(originalSecret).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return decipher.update(encrypted, "base64", "utf8") + decipher.final("utf8");
}
