import { NextFunction, Response } from "express";
import { BadRequestError, NotFoundError } from "~/lib/http";
import { createBucketAwareUpload } from "~/lib/multer";
import { AuthenticatedRequest } from "~/middleware/auth.middleware";
import { bucketService } from "~/services/bucket.service";

export async function bucketUploadMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const bucketId = req.params.bucketId;
    if (!bucketId) throw new BadRequestError("Bucket ID is required");

    const bucketConfig = await bucketService.getBucketConfig({
      id: bucketId,
      userId: req.user!.id,
    });

    const uploadMiddleware = createBucketAwareUpload(bucketConfig);

    uploadMiddleware.single("file")(req, res, (error: any) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          const maxSizeMB = Math.round((bucketConfig.maxFileSize || 100 * 1024 * 1024) / (1024 * 1024));
          return next(new BadRequestError(`File size exceeds maximum allowed size of ${maxSizeMB}MB`));
        }

        return next(new BadRequestError(error.message));
      }

      next();
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      next(new NotFoundError("Bucket not found or you don't have permission to access it"));
    } else {
      next(error);
    }
  }
}
