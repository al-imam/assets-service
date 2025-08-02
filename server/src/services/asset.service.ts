import { writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { db } from "~/db";
import { env } from "~/env";
import { NotFoundError, UnauthorizedError } from "~/lib/http";
import { safeDecode, safeVerify, sign } from "~/lib/jwt";
import { ensureStorageDirectory, generateStoragePath, getFullFilePath } from "~/lib/multer";
import { decrypt, encrypt } from "~/lib/secret";
import { ulid } from "~/lib/uuid";
import { deleteFile, sanitizeFilename } from "~/utils/file";

export const AssetPaginationSchema = z.object({
  cursor: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const UpdateAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(255, "Asset name must be less than 255 characters"),
});

export const GenerateSignedUrlSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  bucketId: z.string().min(1, "Bucket ID is required"),
  secret: z.string().min(1, "Secret is required"),
  expireInMinutes: z.number().int().min(1).max(1440).default(60),
});

export const SignedUrlPayloadSchema = z.object({ assetId: z.string(), secretId: z.string() });

export const EncryptedSignedUrlSchema = z.preprocess(data => {
  if (typeof data === "string") {
    return JSON.parse(decrypt(data, env.MASTER_SECRET_KEY));
  }

  return data;
}, SignedUrlPayloadSchema);

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
    file,
    bucketId,
    userId,
    keys = [],
  }: {
    file: Express.Multer.File;
    bucketId: string;
    userId: string;
    keys: string[] | null;
  }) {
    const bucket = await db.bucket.findFirst({ where: { id: bucketId, userId } });
    if (!bucket) throw new NotFoundError("Bucket not found or you don't have permission to access it");

    const assetId = ulid();
    const sanitizedName = sanitizeFilename(file.originalname);
    const sizeInKB = Math.ceil(file.size / 1024);
    const relativePath = generateStoragePath(userId, bucketId, keys, assetId, path.extname(sanitizedName));
    ensureStorageDirectory(userId, bucketId);
    const fullFilePath = getFullFilePath(relativePath);

    try {
      writeFileSync(fullFilePath, file.buffer);

      const asset = await db.asset.create({
        data: {
          id: assetId,
          name: sanitizedName,
          size: sizeInKB,
          keys: keys ? keys.join("~") : null,
          ref: relativePath,
          bucketId,
        },
      });

      return PublicAsset.parse(asset);
    } catch (error) {
      deleteFile(fullFilePath);
      throw error;
    }
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

  async getAssetById({ id, userId, bucketId }: { id: string; userId: string; bucketId: string }) {
    const asset = await db.asset.findFirst({
      include: { bucket: true },
      where: {
        id,
        bucketId,
        bucket: { userId },
      },
    });

    if (!asset) throw new NotFoundError("Asset not found or you don't have permission to access it");
    return AssetWithBucket.parse(asset);
  }

  async updateAsset({ id, name, userId, bucketId }: { id: string; name: string; userId: string; bucketId: string }) {
    const existingAsset = await db.asset.findFirst({
      where: { id, bucketId, bucket: { userId } },
      include: { bucket: true },
    });

    if (!existingAsset) throw new NotFoundError("Asset not found or you don't have permission to access it");
    const updatedAsset = await db.asset.update({ where: { id }, data: { name } });
    return PublicAsset.parse(updatedAsset);
  }

  async deleteAsset({ id, userId, bucketId }: { id: string; userId: string; bucketId: string }) {
    const asset = await db.asset.findFirst({
      where: { id, bucketId, bucket: { userId } },
      include: { bucket: true },
    });

    if (!asset) throw new NotFoundError("Asset not found or you don't have permission to access it");

    const fullFilePath = getFullFilePath(asset.ref);
    deleteFile(fullFilePath);

    const deletedAsset = await db.asset.delete({ where: { id } });
    return PublicAsset.parse(deletedAsset);
  }

  async generateSignedUrl({
    assetId,
    bucketId,
    secret: inputSecret,
    expireInMinutes = 60,
  }: z.infer<typeof GenerateSignedUrlSchema>) {
    const secret = await db.secret.findFirst({
      where: { secret: encrypt(inputSecret) },
      include: { user: true },
    });

    if (!secret) throw new NotFoundError("Invalid secret");
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    const bucket = await db.bucket.findFirst({ where: { id: bucketId, userId: secret.userId } });
    if (!bucket) throw new NotFoundError("Bucket not found or access denied");
    const asset = await db.asset.findFirst({ where: { id: assetId, bucketId } });
    if (!asset) throw new NotFoundError("Asset not found in the specified bucket");

    const expiresAt = new Date(Date.now() + expireInMinutes * 60 * 1000);
    const encryptedPayload = encrypt(JSON.stringify({ assetId, secretId: secret.id }), env.MASTER_SECRET_KEY);

    const signedToken = await sign(encryptedPayload, {
      expiresIn: `${expireInMinutes}m`,
      secret: decrypt(secret.secret, env.MASTER_SECRET_KEY),
    });

    return {
      signedUrl: `/assets/signed/${signedToken}`,
      expiresAt: expiresAt.toISOString(),
      asset: PublicAsset.parse(asset),
    };
  }

  async verifySignedUrl(token: string) {
    const [payload, decodeError] = safeDecode<string>(token);
    if (decodeError) throw new UnauthorizedError("Invalid or expired signed URL");

    const validation = EncryptedSignedUrlSchema.safeParse(payload);
    if (!validation.success) throw new UnauthorizedError("Invalid signed URL payload");

    const secretRecord = await db.secret.findFirst({
      where: { id: validation.data.secretId },
      include: { user: true },
    });

    if (!secretRecord) throw new NotFoundError("Secret not found or has been revoked");
    if (secretRecord.expiresAt && secretRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    const [, verifyError] = await safeVerify<string>(token, {
      secret: decrypt(secretRecord.secret),
    });

    if (verifyError) throw new UnauthorizedError("Invalid signed URL signature");

    const asset = await db.asset.findFirst({
      where: { id: validation.data.assetId },
      include: { bucket: true },
    });

    if (!asset) throw new NotFoundError("Asset not found or has been deleted");

    return AssetWithBucket.parse(asset);
  }
}

export const assetService = new AssetService();
