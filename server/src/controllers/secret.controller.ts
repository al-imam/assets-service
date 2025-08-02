import { Response } from "express";
import { z } from "zod";
import { ZodValidationError } from "~/lib/http";
import { AuthenticatedRequest } from "~/middleware/auth.middleware";
import { CreateSecretSchema, GenerateReadTokenSchema, secretService } from "~/services/secret.service";

const SecretParamsSchema = z.object({
  id: z.ulid().min(1, "Secret ID is required"),
});

const VerifyReadTokenSchema = z.object({
  readToken: z.jwt(),
});

export class SecretController {
  async createSecret(req: AuthenticatedRequest, res: Response) {
    const validation = CreateSecretSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const secret = await secretService.createSecret({
      secret: validation.data.secret,
      expiresAt: validation.data.expiresAt,
      validationUri: validation.data.validationUri,
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

  async generateReadToken(req: AuthenticatedRequest, res: Response) {
    const result = GenerateReadTokenSchema.safeParse(req.body);
    if (!result.success) throw new ZodValidationError(result.error);
    const readToken = await secretService.generateReadToken(result.data);
    res.json(readToken);
  }

  async verifyReadToken(req: AuthenticatedRequest, res: Response) {
    const bodyValidation = VerifyReadTokenSchema.safeParse(req.body);
    if (!bodyValidation.success) throw new ZodValidationError(bodyValidation.error);
    const result = await secretService.verifyReadToken(bodyValidation.data.readToken);
    res.json(result);
  }
}

export const secretController = new SecretController();
