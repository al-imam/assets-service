import { Router } from "express";
import { serveController } from "~/controllers/serve.controller";
import { SecretMiddleware } from "~/middleware/auth.middleware";

export const assetRouter = Router();

assetRouter.get("/:assetId", serveController.accessorViaReadToken.bind(serveController));
assetRouter.post("/", SecretMiddleware, serveController.createAsset.bind(serveController));

assetRouter.get("/signed/:signedUrl", serveController.accessViaSignedUrl.bind(serveController));
assetRouter.post("/signed-url", serveController.generateSignedUrl.bind(serveController));
