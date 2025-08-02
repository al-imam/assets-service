import { existsSync, mkdirSync, unlinkSync } from "fs";
import { extname, normalize } from "path";

export function ensureFilePathExists(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return normalize(dir);
}

export function sanitizeFilename(filename: string): string {
  const ext = extname(filename);
  const nameWithoutExt = filename.slice(0, -ext.length);

  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 100);

  return `${sanitized}${ext.toLowerCase()}`;
}

export function deleteFile(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
    return false;
  }
}

export function removeExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}
