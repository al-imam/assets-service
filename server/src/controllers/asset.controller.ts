import { Response } from "express";
import { z } from "zod";
import { ZodValidationError } from "~/lib/http";
import { AuthenticatedRequest } from "~/middleware/auth.moddleware";
import { assetService, CreateAssetSchema, UpdateAssetSchema } from "~/services/asset.service";

const AssetParamsSchema = z.object({
  id: z.string().min(1, "Asset ID is required"),
});

const BucketParamsSchema = z.object({
  id: z.string().min(1, "Bucket ID is required"),
});

const PaginationSchema = z.object({
  cursor: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
});

export class AssetController {
  async createAsset(req: AuthenticatedRequest, res: Response) {
    const validation = CreateAssetSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const asset = await assetService.createAsset({
      name: validation.data.name,
      size: validation.data.size,
      keys: validation.data.keys,
      ref: validation.data.ref,
      bucketId: validation.data.bucketId,
      userId: req.user!.id,
    });

    res.status(201).json(asset);
  }

  async getAssets(req: AuthenticatedRequest, res: Response) {
    const { cursor, limit } = PaginationSchema.parse(req.query);
    const assets = await assetService.getAssets(req.user!.id, cursor, limit);
    res.json(assets);
  }

  async getAssetsByBucket(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);
    const { cursor, limit } = PaginationSchema.parse(req.query);

    const assets = await assetService.getAssetsByBucket({
      bucketId: paramsValidation.data.id,
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
    });

    res.json(asset);
  }

  async deleteAsset(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = AssetParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const result = await assetService.deleteAsset({
      id: paramsValidation.data.id,
      userId: req.user!.id,
    });

    res.json(result);
  }
}

export const assetController = new AssetController();
