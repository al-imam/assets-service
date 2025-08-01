import { Response } from "express";
import { z } from "zod";
import { ZodValidationError } from "~/lib/http";
import { AuthenticatedRequest } from "~/middleware/auth.middleware";
import { bucketService, CreateBucketSchema, UpdateBucketSchema } from "~/services/bucket.service";

const BucketParamsSchema = z.object({
  id: z.string().min(1, "Bucket ID is required"),
});

export class BucketController {
  async createBucket(req: AuthenticatedRequest, res: Response) {
    const validation = CreateBucketSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const bucket = await bucketService.createBucket({
      name: validation.data.name,
      userId: req.user!.id,
    });

    res.status(201).json(bucket);
  }

  async getBuckets(req: AuthenticatedRequest, res: Response) {
    const buckets = await bucketService.getBuckets(req.user!.id);
    res.json(buckets);
  }

  async getBucketById(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const bucket = await bucketService.getBucketById({
      id: paramsValidation.data.id,
      userId: req.user!.id,
    });

    res.json(bucket);
  }

  async updateBucket(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const validation = UpdateBucketSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const bucket = await bucketService.updateBucket({
      id: paramsValidation.data.id,
      name: validation.data.name,
      userId: req.user!.id,
    });

    res.json(bucket);
  }

  async deleteBucket(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = BucketParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const result = await bucketService.deleteBucket({
      id: paramsValidation.data.id,
      userId: req.user!.id,
    });

    res.json(result);
  }
}

export const bucketController = new BucketController();
