import { Router } from "express";
import { assetController } from "~/controllers/asset.controller";
import { AuthMiddleware } from "~/middleware/auth.moddleware";

export const assetRouter = Router();

assetRouter.use(AuthMiddleware);

assetRouter.post("/", assetController.createAsset.bind(assetController));
assetRouter.get("/", assetController.getAssets.bind(assetController));
assetRouter.get("/:id", assetController.getAssetById.bind(assetController));
assetRouter.put("/:id", assetController.updateAsset.bind(assetController));
assetRouter.delete("/:id", assetController.deleteAsset.bind(assetController));
