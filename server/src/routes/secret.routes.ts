import { Router } from "express";
import { secretController } from "~/controllers/secret.controller";
import { AuthMiddleware, SecretMiddleware } from "~/middleware/auth.middleware";

export const secretRouter = Router();

secretRouter.post("/", AuthMiddleware, secretController.createSecret.bind(secretController));
secretRouter.get("/", AuthMiddleware, secretController.getSecrets.bind(secretController));
secretRouter.get("/:id", AuthMiddleware, secretController.getSecretById.bind(secretController));
secretRouter.delete("/:id", AuthMiddleware, secretController.deleteSecret.bind(secretController));
secretRouter.delete("/expired/cleanup", AuthMiddleware, secretController.deleteExpiredSecrets.bind(secretController));

secretRouter.post("/issue/read-token", SecretMiddleware, secretController.generateReadToken.bind(secretController));
secretRouter.post("/verify-read-token", secretController.verifyReadToken.bind(secretController));
