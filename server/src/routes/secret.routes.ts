import { Router } from "express";
import { secretController } from "~/controllers/secret.controller";
import { AuthMiddleware } from "~/middleware/auth.middleware";

export const secretRouter = Router();

secretRouter.use(AuthMiddleware);

secretRouter.post("/", secretController.createSecret.bind(secretController));
secretRouter.get("/", secretController.getSecrets.bind(secretController));
secretRouter.get("/:id", secretController.getSecretById.bind(secretController));
secretRouter.delete("/:id", secretController.deleteSecret.bind(secretController));
secretRouter.delete("/expired/cleanup", secretController.deleteExpiredSecrets.bind(secretController));

secretRouter.post("/verify-read-token", secretController.verifyReadToken.bind(secretController));
secretRouter.post("/issue-authorization", secretController.generateReadToken.bind(secretController));
