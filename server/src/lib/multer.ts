import multer from "multer";
import path from "path";
import { env } from "~/env";
import { ensureFilePathExists } from "~/utils/file";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, fieldNameSize: 255, fieldSize: 1024 * 1024 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});

export function generateStoragePath(userId: string, bucketId: string, keys: string[], assetId: string): string {
  const filename = [...keys, assetId].join("~");
  return path.posix.join(userId, bucketId, filename);
}

export function getFullFilePath(relativePath: string): string {
  return path.posix.join(env.STORAGE_DIRECTORY, relativePath);
}

export function ensureStorageDirectory(userId: string, bucketId: string): string {
  const dirPath = path.posix.join(env.STORAGE_DIRECTORY, userId, bucketId);
  return ensureFilePathExists(dirPath);
}
