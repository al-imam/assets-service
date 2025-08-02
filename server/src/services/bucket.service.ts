import { z } from "zod";
import { db } from "~/db";
import { NotFoundError, UnauthorizedError } from "~/lib/http";

export const BucketConfigSchema = z.preprocess(
  value => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }

    return value;
  },
  z
    .object({
      allowedFileTypes: z.array(z.string()).optional(),
      maxFileSize: z.number().int().positive().optional(),
    })
    .catch({
      allowedFileTypes: undefined,
      maxFileSize: 10 * 1024 * 1024,
    })
);

type BucketConfig = z.infer<typeof BucketConfigSchema>;

export const CreateBucketSchema = z.object({
  name: z.string().min(1, "Bucket name is required").max(100, "Bucket name must be less than 100 characters"),
  config: BucketConfigSchema.optional(),
});

export const UpdateBucketSchema = z.object({
  name: z
    .string()
    .min(1, "Bucket name is required")
    .max(100, "Bucket name must be less than 100 characters")
    .optional(),
  config: BucketConfigSchema.optional(),
});

export const PublicBucket = z.object({
  id: z.string(),
  name: z.string(),
  config: BucketConfigSchema.optional(),
  userId: z.string(),
  createdAt: z.coerce.date().transform(date => date.toISOString()),
  updatedAt: z.coerce.date().transform(date => date.toISOString()),
});

export const BucketWithAssets = PublicBucket.extend({
  assets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      size: z.number(),
      keys: z.string().nullable(),
      ref: z.string(),
      createdAt: z.coerce.date().transform(date => date.toISOString()),
      updatedAt: z.coerce.date().transform(date => date.toISOString()),
    })
  ),
});

class BucketService {
  constructor() {}

  async createBucket({ name, config, userId }: { name: string; config?: BucketConfig; userId: string }) {
    const existingBucket = await db.bucket.findFirst({
      where: { name, userId },
    });

    if (existingBucket) throw new UnauthorizedError("Bucket with this name already exists");

    const bucket = await db.bucket.create({
      data: {
        name,
        config: config ? JSON.stringify(config) : undefined,
        userId,
      },
    });

    return PublicBucket.parse(bucket);
  }

  async getBuckets(userId: string) {
    const buckets = await db.bucket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return buckets.map(bucket => PublicBucket.parse(bucket));
  }

  async getBucketById({ id, userId }: { id: string; userId: string }) {
    const bucket = await db.bucket.findFirst({
      where: { id, userId },
      include: {
        Asset: true,
      },
    });

    if (!bucket) {
      throw new NotFoundError("Bucket not found");
    }

    return BucketWithAssets.parse({
      ...bucket,
      assets: bucket.Asset,
    });
  }

  async updateBucket({
    id,
    name,
    config,
    userId,
  }: {
    id: string;
    name?: string;
    config?: BucketConfig;
    userId: string;
  }) {
    const existingBucket = await db.bucket.findFirst({
      where: { id, userId },
    });

    if (!existingBucket) throw new NotFoundError("Bucket not found");
    const data: { name?: string; config?: string } = {};
    if (name) data.name = name;
    if (config) data.config = JSON.stringify(config);

    const updatedBucket = await db.bucket.update({
      where: { id },
      data: data,
    });

    return PublicBucket.parse(updatedBucket);
  }

  async deleteBucket({ id, userId }: { id: string; userId: string }) {
    const bucket = await db.bucket.findFirst({
      where: { id, userId },
      include: {
        Asset: true,
      },
    });

    if (!bucket) {
      throw new NotFoundError("Bucket not found");
    }

    if (bucket.Asset.length > 0) {
      throw new UnauthorizedError("Cannot delete bucket with assets. Delete all assets first.");
    }

    await db.bucket.delete({
      where: { id },
    });

    return { success: true };
  }

  async getBucketConfig({ id, userId }: { id: string; userId: string }): Promise<BucketConfig> {
    const bucket = await db.bucket.findFirst({
      where: { id, userId },
      select: { config: true },
    });

    if (!bucket) throw new NotFoundError("Bucket not found");
    if (!bucket.config) return BucketConfigSchema.parse({});
    return BucketConfigSchema.parse(JSON.parse(bucket.config));
  }
}

export const bucketService = new BucketService();
