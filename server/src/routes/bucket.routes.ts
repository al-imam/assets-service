import { Router } from "express";
import { assetController } from "~/controllers/asset.controller";
import { bucketController } from "~/controllers/bucket.controller";
import { AuthMiddleware } from "~/middleware/auth.middleware";
import { bucketUploadMiddleware } from "~/middleware/upload.middleware";

export const bucketRouter = Router();

bucketRouter.use(AuthMiddleware);

bucketRouter.post("/", bucketController.createBucket.bind(bucketController));
bucketRouter.get("/", bucketController.getBuckets.bind(bucketController));
bucketRouter.get("/:id", bucketController.getBucketById.bind(bucketController));
bucketRouter.put("/:id", bucketController.updateBucket.bind(bucketController));
bucketRouter.delete("/:id", bucketController.deleteBucket.bind(bucketController));

bucketRouter.post("/:bucketId/assets/", bucketUploadMiddleware, assetController.createAsset.bind(assetController));
bucketRouter.get("/:bucketId/assets/", assetController.getAssetsByBucket.bind(assetController));
bucketRouter.get("/:bucketId/assets/:id", assetController.getAssetById.bind(assetController));
bucketRouter.get("/:bucketId/assets/:id/download", assetController.downloadAsset.bind(assetController));
bucketRouter.patch("/:bucketId/assets/:id", assetController.updateAsset.bind(assetController));
bucketRouter.delete("/:bucketId/assets/:id", assetController.deleteAsset.bind(assetController));
