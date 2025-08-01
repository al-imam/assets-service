import { Router } from "express";
import { assetRouter } from "./asset.routes";
import { authRouter } from "./auth.routes";
import { bucketRouter } from "./bucket.routes";
import { secretRouter } from "./secret.routes";

export const combinedRouter = Router();

combinedRouter.use("/auth", authRouter);
combinedRouter.use("/buckets", bucketRouter);
combinedRouter.use("/secrets", secretRouter);
combinedRouter.use("/assets", assetRouter);
