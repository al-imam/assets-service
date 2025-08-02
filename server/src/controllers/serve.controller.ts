import { Request, Response } from "express";
import { ZodValidationError } from "~/lib/http";
import { getFullFilePath } from "~/lib/multer";
import { assetService, GenerateSignedUrlSchema } from "~/services/asset.service";

export class ServeController {
  async generateSignedUrl(req: Request, res: Response) {
    const validation = GenerateSignedUrlSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const signedUrl = await assetService.generateSignedUrl(validation.data);
    res.json(signedUrl);
  }

  async accessViaSignedUrl(req: Request, res: Response) {
    const asset = await assetService.verifySignedUrl(req.params.signedUrl);
    const fullFilePath = getFullFilePath(asset.ref);

    res.setHeader("Content-Disposition", `inline; filename="${asset.name}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.sendFile(fullFilePath);
  }
}

export const serveController = new ServeController();
