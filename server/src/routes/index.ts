import { Router } from "express";
import { serveController } from "~/controllers/serve.controller";
import { authRouter } from "./auth.routes";
import { bucketRouter } from "./bucket.routes";
import { secretRouter } from "./secret.routes";

export const combinedRouter = Router();

combinedRouter.use("/auth", authRouter);
combinedRouter.use("/buckets", bucketRouter);
combinedRouter.use("/secrets", secretRouter);

combinedRouter.get("/assets/signed/:signedUrl", serveController.accessViaSignedUrl.bind(serveController));
combinedRouter.post("/assets/signed-url", serveController.generateSignedUrl.bind(serveController));
