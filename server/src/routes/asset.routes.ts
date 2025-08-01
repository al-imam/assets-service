import { Router } from "express";
import { assetController } from "~/controllers/asset.controller";
import { upload } from "~/lib/multer";

export const assetRouter = Router();

assetRouter.post("/", upload.single("file"), assetController.createAsset.bind(assetController));
assetRouter.get("/", assetController.getAssetsByBucket.bind(assetController));
assetRouter.get("/:id", assetController.getAssetById.bind(assetController));
assetRouter.get("/:id/download", assetController.downloadAsset.bind(assetController));
assetRouter.patch("/:id", assetController.updateAsset.bind(assetController));
assetRouter.delete("/:id", assetController.deleteAsset.bind(assetController));
