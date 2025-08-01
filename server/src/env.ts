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
    SECRET_KEY: z.string().default("SECRET_JWT_KEY"),
    MASTER_SECRET_KEY: z.string().default("MASTER_SECRET_ENCRYPTION_KEY"),

    ROOT: z.string().default(() => ROOT),
    ROOT_PUBLIC_DIRECTORY: z.string().default(() => normalize(join(ROOT, "PUBLIC"))),

    STORAGE_DIRECTORY: z.string().default(() => normalize(join(ROOT, "STORAGE"))),

    TARGET: z.enum(["seed", "migration", "test", "development", "production"]).optional(),
    PORT: PortSchema.default(8000),

    CLIENT_BASE_URL: z.string().default("http://localhost:3000"),

    GOOGLE_OAUTH_SECRET: z.string(),
    GOOGLE_OAUTH_CLIENT_ID: z.string(),
    GOOGLE_OAUTH_CALLBACK_URL: z.string(),
  })
  .transform(env => ({
    ...env,

    TARGET: env.TARGET ?? env.NODE_ENV,
    IS_DEV: env.NODE_ENV === "development",
  }));

export const env = envSchema.parse(process.env);
