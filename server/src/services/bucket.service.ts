import { z } from "zod";
import { db } from "~/db";
import { NotFoundError, UnauthorizedError } from "~/lib/http";

export const CreateBucketSchema = z.object({
  name: z.string().min(1, "Bucket name is required").max(100, "Bucket name must be less than 100 characters"),
});

export const UpdateBucketSchema = z.object({
  name: z.string().min(1, "Bucket name is required").max(100, "Bucket name must be less than 100 characters"),
});

export const PublicBucket = z.object({
  id: z.string(),
  name: z.string(),
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

  async createBucket({ name, userId }: { name: string; userId: string }) {
    const existingBucket = await db.bucket.findFirst({
      where: { name, userId },
    });

    if (existingBucket) {
      throw new UnauthorizedError("Bucket with this name already exists");
    }

    const bucket = await db.bucket.create({
      data: {
        name,
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

  async updateBucket({ id, name, userId }: { id: string; name: string; userId: string }) {
    const existingBucket = await db.bucket.findFirst({
      where: { id, userId },
    });

    if (!existingBucket) {
      throw new NotFoundError("Bucket not found");
    }

    const nameConflict = await db.bucket.findFirst({
      where: {
        name,
        userId,
        id: { not: id },
      },
    });

    if (nameConflict) {
      throw new UnauthorizedError("Bucket with this name already exists");
    }

    const updatedBucket = await db.bucket.update({
      where: { id },
      data: { name },
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
}

export const bucketService = new BucketService();
