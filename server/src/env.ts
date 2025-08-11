import "dotenv/config";

import { join, normalize } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."));

const PortSchema = z
  .string()
  .transform(val => parseInt(val, 10))
  .pipe(z.number().int().min(1).max(65535));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    ROOT: z.string().default(() => ROOT),

    STORAGE_DIRECTORY: z.string().default(() => normalize(join(ROOT, "STORAGE"))),
    TMP_DIRECTORY: z.string().default(() => normalize(join(ROOT, "STORAGE", "tmp"))),

    MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(100).default(20),
    MAX_IMAGE_DIMENSION: z.coerce.number().int().min(1).max(10000).default(6000),
    MAX_PIXEL_COUNT: z.coerce.number().int().min(1).default(36000000),

    REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
    QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),

    SECRET_KEY: z.string().default("dev-secret"), // used by existing code

    PORT: PortSchema.default(8000),
  })
  .transform(env => ({
    ...env,
    IS_DEV: env.NODE_ENV === "development",
  }));

export const env = envSchema.parse(process.env);
