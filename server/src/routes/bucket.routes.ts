import { Router } from "express";
import { bucketController } from "~/controllers/bucket.controller";
import { AuthMiddleware } from "~/middleware/auth.middleware";
import { assetRouter } from "~/routes/asset.routes";

export const bucketRouter = Router();

bucketRouter.use(AuthMiddleware);

bucketRouter.post("/", bucketController.createBucket.bind(bucketController));
bucketRouter.get("/", bucketController.getBuckets.bind(bucketController));
bucketRouter.get("/:id", bucketController.getBucketById.bind(bucketController));
bucketRouter.put("/:id", bucketController.updateBucket.bind(bucketController));
bucketRouter.delete("/:id", bucketController.deleteBucket.bind(bucketController));

bucketRouter.use("/:bucketId/assets", assetRouter);
