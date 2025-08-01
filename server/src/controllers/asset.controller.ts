import { Response } from "express";
import { existsSync } from "fs";
import { z } from "zod";
import { BadRequestError, NotFoundError, ZodValidationError } from "~/lib/http";
import { getFullFilePath } from "~/lib/multer";
import { AuthenticatedRequest } from "~/middleware/auth.middleware";
import { assetService, UpdateAssetSchema } from "~/services/asset.service";

const AssetParamsSchema = z.object({
  bucketId: z.string().min(1, "Bucket ID is required"),
  id: z.string().min(1, "Asset ID is required"),
});

const BucketParamsSchema = z.object({
  bucketId: z.string().min(1, "Bucket ID is required"),
});

const PaginationSchema = z.object({
  cursor: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
});

export class AssetController {
  async createAsset(req: AuthenticatedRequest, res: Response) {
    if (!req.file) throw new BadRequestError("No file uploaded");

    const keys = String(req.body.keys)
      .split("~")
      .map(key => key.trim());

    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const asset = await assetService.createAsset({
      file: req.file,
      bucketId: paramsValidation.data.bucketId,
      userId: req.user!.id,
      keys,
    });

    res.status(201).json(asset);
  }

  async getAssetsByBucket(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);
    const { cursor, limit } = PaginationSchema.parse(req.query);

    const assets = await assetService.getAssetsByBucket({
      bucketId: paramsValidation.data.bucketId,
      userId: req.user!.id,
      cursor,
      limit,
    });

    res.json(assets);
  }

  async getAssetById(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = AssetParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const asset = await assetService.getAssetById({
      id: paramsValidation.data.id,
      userId: req.user!.id,
      bucketId: paramsValidation.data.bucketId,
    });

    res.json(asset);
  }

  async updateAsset(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = AssetParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const validation = UpdateAssetSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const asset = await assetService.updateAsset({
      id: paramsValidation.data.id,
      name: validation.data.name,
      userId: req.user!.id,
      bucketId: paramsValidation.data.bucketId,
    });

    res.json(asset);
  }

  async deleteAsset(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = AssetParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const result = await assetService.deleteAsset({
      id: paramsValidation.data.id,
      userId: req.user!.id,
      bucketId: paramsValidation.data.bucketId,
    });

    res.json(result);
  }

  async downloadAsset(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = AssetParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const asset = await assetService.getAssetById({
      id: paramsValidation.data.id,
      userId: req.user!.id,
      bucketId: paramsValidation.data.bucketId,
    });

    const fullFilePath = getFullFilePath(asset.ref);
    if (!existsSync(fullFilePath)) throw new NotFoundError("File not found on disk");

    res.setHeader("Content-Disposition", `attachment; filename="${asset.name}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    res.sendFile(fullFilePath);
  }
}

export const assetController = new AssetController();
