import { Router } from "express";
import { assetController } from "~/controllers/asset.controller";
import { bucketController } from "~/controllers/bucket.controller";
import { AuthMiddleware } from "~/middleware/auth.moddleware";

export const bucketRouter = Router();

bucketRouter.use(AuthMiddleware);

bucketRouter.post("/", bucketController.createBucket.bind(bucketController));
bucketRouter.get("/", bucketController.getBuckets.bind(bucketController));
bucketRouter.get("/:id", bucketController.getBucketById.bind(bucketController));
bucketRouter.get("/:id/assets", assetController.getAssetsByBucket.bind(assetController));
bucketRouter.put("/:id", bucketController.updateBucket.bind(bucketController));
bucketRouter.delete("/:id", bucketController.deleteBucket.bind(bucketController));
