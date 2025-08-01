import { Response } from "express";
import { z } from "zod";
import { ZodValidationError } from "~/lib/http";
import { AuthenticatedRequest } from "~/middleware/auth.middleware";
import { CreateSecretSchema, secretService } from "~/services/secret.service";

const SecretParamsSchema = z.object({
  id: z.string().min(1, "Secret ID is required"),
});

export class SecretController {
  async createSecret(req: AuthenticatedRequest, res: Response) {
    const validation = CreateSecretSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const secret = await secretService.createSecret({
      secret: validation.data.secret,
      expiresAt: validation.data.expiresAt,
      userId: req.user!.id,
    });

    res.status(201).json(secret);
  }

  async getSecrets(req: AuthenticatedRequest, res: Response) {
    const secrets = await secretService.getSecrets(req.user!.id);
    res.json(secrets);
  }

  async getSecretById(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = SecretParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const secret = await secretService.getSecretById({
      id: paramsValidation.data.id,
      userId: req.user!.id,
    });

    res.json(secret);
  }

  async deleteSecret(req: AuthenticatedRequest, res: Response) {
    const paramsValidation = SecretParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) throw new ZodValidationError(paramsValidation.error);

    const result = await secretService.deleteSecret({
      id: paramsValidation.data.id,
      userId: req.user!.id,
    });

    res.json(result);
  }

  async deleteExpiredSecrets(req: AuthenticatedRequest, res: Response) {
    const result = await secretService.deleteExpiredSecrets(req.user!.id);
    res.json(result);
  }
}

export const secretController = new SecretController();
