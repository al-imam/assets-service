import { Request, Response } from "express";
import { createReadStream } from "fs";
import path from "path";
import z from "zod";
import { db } from "~/db";
import { BadRequestError, NotFoundError, UnauthorizedError, ZodValidationError } from "~/lib/http";
import { getFullFilePath, hasFile } from "~/lib/multer";
import { getSecret, SecretRequest } from "~/middleware/auth.middleware";
import { assetService, GenerateSignedUrlSchema } from "~/services/asset.service";
import { secretService } from "~/services/secret.service";
import { deleteFile, removeExtension } from "~/utils/file";

const ServeCreateAssetSchema = z.object({
  bucketId: z.ulid().min(1, "Bucket ID is required"),
  keys: z
    .string()
    .nullable()
    .transform(val => (val ? val.split("~").map(key => key.trim()) : null)),
});

export class ServeController {
  async generateSignedUrl(req: Request, res: Response) {
    const validation = GenerateSignedUrlSchema.safeParse({
      ...req.body,
      secret: getSecret(req),
    });

    if (!validation.success) throw new ZodValidationError(validation.error);
    const signedUrl = await assetService.generateSignedUrl(validation.data);
    res.json(signedUrl);
  }

  async accessViaSignedUrl(req: Request, res: Response) {
    const asset = await assetService.verifySignedUrl(req.params.signedUrl);
    const fullFilePath = getFullFilePath(asset.ref);

    res.setHeader("Content-Disposition", `inline; filename="${asset.name}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    createReadStream(fullFilePath).pipe(res);
  }

  async createAsset(req: SecretRequest, res: Response) {
    if (!req._secret) throw new UnauthorizedError("Unauthorized access");
    if (!req.file) throw new BadRequestError("No file uploaded");

    const validation = ServeCreateAssetSchema.safeParse({
      ...req.body,
      bucketId: req.params.bucketId,
    });

    if (!validation.success) throw new ZodValidationError(validation.error);

    const asset = await assetService.createAsset({
      file: req.file,
      bucketId: validation.data.bucketId,
      userId: req._secret.user.id,
      keys: validation.data.keys,
    });

    asset.id = asset.id + path.extname(asset.ref);
    res.status(201).json(asset);
  }

  async deleteAsset(req: SecretRequest, res: Response) {
    if (!req._secret) throw new UnauthorizedError("Unauthorized access");

    const assetId = removeExtension(req.params.assetId);
    const bucketId = req.body.bucketId;

    const asset = await db.asset.findFirst({
      where: { id: assetId, bucket: { userId: req._secret.user.id, ...(bucketId ? { id: bucketId } : {}) } },
    });

    if (!asset) throw new NotFoundError("Asset not found");
    const fullFilePath = getFullFilePath(asset.ref);

    if (hasFile(fullFilePath)) deleteFile(fullFilePath);
    const deletedAsset = await db.asset.delete({ where: { id: assetId } });
    res.status(204).json(deletedAsset);
  }

  async accessorViaReadToken(req: Request, res: Response) {
    const assetId = removeExtension(req.params.assetId);

    const asset = await db.asset.findFirst({ where: { id: assetId } });
    if (!asset) throw new NotFoundError("Asset not found");
    const fullFilePath = getFullFilePath(asset.ref);

    if (asset.keys === null) {
      res.setHeader("Content-Disposition", `inline; filename="${asset.name}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      return createReadStream(fullFilePath).pipe(res);
    }

    if (!req.cookies["read-token"]) {
      throw new UnauthorizedError("Read token is required to access this asset");
    }

    const readToken = z.jwt().parse(req.cookies["read-token"]);
    const verified = await secretService.verifyReadToken(readToken);

    if (verified.bucketId !== asset.bucketId) {
      throw new UnauthorizedError("You do not have permission to access this asset");
    }

    const accessKeys = asset.keys ? asset.keys.split("~") : [];

    if (!verified.keys.some(key => accessKeys.includes(key))) {
      throw new UnauthorizedError("You do not have permission to access this asset with the provided keys");
    }

    res.setHeader("Content-Disposition", `inline; filename="${asset.name}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return createReadStream(fullFilePath).pipe(res);
  }
}

export const serveController = new ServeController();
