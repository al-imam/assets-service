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

    PORT: PortSchema.default(8000),
  })
  .transform(env => ({
    ...env,

    IS_DEV: env.NODE_ENV === "development",
  }));

export const env = envSchema.parse(process.env);
