import { existsSync, mkdirSync, unlinkSync } from "fs";
import { normalize } from "path";

export function ensureFilePathExists(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return normalize(dir);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]|(?=\..*\.)/gi, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 100);
}

export function getFilename(filePath: string): string {
  return filePath.split("/").at(-1)!;
}

export function deleteFile(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
