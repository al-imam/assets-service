import { z } from "zod";
import { db } from "~/db";
import { NotFoundError } from "~/lib/http";

export const CreateAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(255, "Asset name must be less than 255 characters"),
  size: z.number().int().positive("Asset size must be a positive integer"),
  keys: z.string().optional(),
  ref: z.string().min(1, "Asset reference is required"),
  bucketId: z.string().min(1, "Bucket ID is required"),
});

export const AssetPaginationSchema = z.object({
  cursor: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const UpdateAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(255, "Asset name must be less than 255 characters"),
});

export const PublicAsset = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  keys: z.string().nullable(),
  ref: z.string(),
  bucketId: z.string(),
  createdAt: z.coerce.date().transform(date => date.toISOString()),
  updatedAt: z.coerce.date().transform(date => date.toISOString()),
});

export const AssetWithBucket = PublicAsset.extend({
  bucket: z.object({
    id: z.string(),
    name: z.string(),
    userId: z.string(),
    createdAt: z.coerce.date().transform(date => date.toISOString()),
    updatedAt: z.coerce.date().transform(date => date.toISOString()),
  }),
});

export const PaginatedAssetsResponse = z.object({
  data: z.array(AssetWithBucket),
  total: z.number(),
  cursor: z.number(),
  limit: z.number(),
});

export const PaginatedAssetsByBucketResponse = z.object({
  data: z.array(PublicAsset),
  total: z.number(),
  cursor: z.number(),
  limit: z.number(),
});

class AssetService {
  constructor() {}

  async createAsset({
    name,
    size,
    keys,
    ref,
    bucketId,
    userId,
  }: {
    name: string;
    size: number;
    keys?: string;
    ref: string;
    bucketId: string;
    userId: string;
  }) {
    const bucket = await db.bucket.findFirst({ where: { id: bucketId, userId } });
    if (!bucket) throw new NotFoundError("Bucket not found or you don't have permission to access it");

    const asset = await db.asset.create({
      data: { name, size, keys: keys || null, ref, bucketId },
    });

    return PublicAsset.parse(asset);
  }

  async getAssets(userId: string, cursor: number = 1, limit: number = 10) {
    const skip = (cursor - 1) * limit;

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where: { bucket: { userId } },
        include: { bucket: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.asset.count({
        where: { bucket: { userId } },
      }),
    ]);

    return {
      data: assets.map(asset => AssetWithBucket.parse(asset)),
      total,
      cursor,
      limit,
    };
  }

  async getAssetsByBucket({
    bucketId,
    userId,
    cursor = 1,
    limit = 10,
  }: {
    bucketId: string;
    userId: string;
    cursor?: number;
    limit?: number;
  }) {
    const bucket = await db.bucket.findFirst({ where: { id: bucketId, userId } });
    if (!bucket) throw new NotFoundError("Bucket not found or you don't have permission to access it");

    const skip = (cursor - 1) * limit;
    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where: { bucketId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.asset.count({
        where: { bucketId },
      }),
    ]);

    return {
      data: assets.map(asset => PublicAsset.parse(asset)),
      total,
      cursor,
      limit,
    };
  }

  async getAssetById({ id, userId }: { id: string; userId: string }) {
    const asset = await db.asset.findFirst({
      include: { bucket: true },
      where: { id, bucket: { userId } },
    });

    if (!asset) throw new NotFoundError("Asset not found or you don't have permission to access it");
    return AssetWithBucket.parse(asset);
  }

  async updateAsset({ id, name, userId }: { id: string; name: string; userId: string }) {
    const existingAsset = await db.asset.findFirst({
      where: { id, bucket: { userId } },
      include: { bucket: true },
    });

    if (!existingAsset) throw new NotFoundError("Asset not found or you don't have permission to access it");

    const updatedAsset = await db.asset.update({
      where: { id },
      data: { name },
    });

    return PublicAsset.parse(updatedAsset);
  }

  async deleteAsset({ id, userId }: { id: string; userId: string }) {
    const asset = await db.asset.findFirst({
      where: { id, bucket: { userId } },
      include: { bucket: true },
    });

    if (!asset) throw new NotFoundError("Asset not found or you don't have permission to access it");
    const deletedAsset = await db.asset.delete({ where: { id } });
    return PublicAsset.parse(deletedAsset);
  }
}

export const assetService = new AssetService();
