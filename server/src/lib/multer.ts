import multer from "multer";
import path from "path";
import z from "zod";
import { env } from "~/env";
import { BucketConfigSchema } from "~/services/bucket.service";
import { ensureFilePathExists } from "~/utils/file";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, fieldNameSize: 255, fieldSize: 1024 * 1024 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});

export function createBucketAwareUpload(bucketConfig: z.infer<typeof BucketConfigSchema>) {
  const config = BucketConfigSchema.parse(bucketConfig);

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSize ?? 10 * 1024 * 1024,
      fieldNameSize: 255,
      fieldSize: 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (bucketConfig.allowedFileTypes) {
        if (bucketConfig.allowedFileTypes.length === 0) {
          return cb(new Error("No file uploads allowed for this bucket"));
        }

        const fileExtension = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;

        const isAllowed = bucketConfig.allowedFileTypes.some(allowedType => {
          if (allowedType.startsWith(".")) {
            return fileExtension === allowedType.toLowerCase();
          }

          if (allowedType.includes("/")) {
            if (allowedType.endsWith("/*")) {
              const baseType = allowedType.replace("/*", "");
              return mimeType.startsWith(baseType);
            }

            return mimeType === allowedType;
          }

          return false;
        });

        if (!isAllowed) {
          return cb(new Error(`File type not allowed. Allowed types: ${bucketConfig.allowedFileTypes.join(", ")}`));
        }
      }

      cb(null, true);
    },
  });
}

export function generateStoragePath(
  userId: string,
  bucketId: string,
  keys: string[],
  assetId: string,
  ext: string
): string {
  const filename = [...keys, assetId].join("~") + ext;
  return path.posix.join(userId, bucketId, filename);
}

export function getFullFilePath(relativePath: string): string {
  return path.posix.join(env.STORAGE_DIRECTORY, relativePath);
}

export function ensureStorageDirectory(userId: string, bucketId: string): string {
  const dirPath = path.posix.join(env.STORAGE_DIRECTORY, userId, bucketId);
  return ensureFilePathExists(dirPath);
}
