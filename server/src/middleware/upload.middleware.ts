import multer from "multer";
import { extname } from "path";
import { env } from "~/env";
import { ensureFilePathExists } from "~/utils/file";

ensureFilePathExists(env.TMP_DIRECTORY);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.TMP_DIRECTORY),
  filename: (_req, file, callback) => {
    const extension = (extname(file.originalname) || ".bin").toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, unique);
  },
});

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowedMime = /^image\/(jpeg|png|webp|avif)$/i.test(file.mimetype);
    if (allowedMime) {
      callback(null, true);
    } else {
      callback(new Error("Unsupported image type (jpeg, png, webp, avif only)"));
    }
  },
});
