import { existsSync, mkdirSync, unlinkSync } from "fs";
import { normalize } from "path";

export function ensureFilePathExists(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return normalize(dir);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\-_.\s]+/g, "")
    .replace(/[-_\s]+/g, "-")
    .replace(/\.(?=.*\.)/g, "-")
    .slice(0, 100);
}

export function getFilename(filePath: string): string {
  return filePath.split("/").at(-1)!;
}

export function deleteFile(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) return false;

    unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}
