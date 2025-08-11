import { Router } from "express";
import { join } from "path";
import { db } from "~/db";
import { env } from "~/env";
import { BadRequestError, NotFoundError } from "~/lib/http";
import { uploadSingleImage } from "~/middleware/upload.middleware";
import { enqueueIngest } from "~/queue/image.queue";
import { deleteFile } from "~/utils/file";

export const imagesRouter = Router();

/**
 * POST /api/v1/images
 * Multipart form-data:
 *  - file: image
 * Returns:
 *  - { key: "hash/original-name-kebab.ext", path: "/i/hash/original-name-kebab.ext" }
 */
imagesRouter.post("/", uploadSingleImage, async (req, res, next) => {
  try {
    const uploaded = req.file;
    if (!uploaded) throw new BadRequestError("No file uploaded; use field name 'file'.");

    const result = await enqueueIngest({
      tmpFilePath: uploaded.path,
      originalFileName: uploaded.originalname || "image",
    });

    res.status(201).json({
      key: result.key,
      path: `/i/${result.key}`, // relative; caller prepends their domain
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/images/<hash>/<original-name-kebab.ext>
 * Deletes the record and the stored master file.
 */
imagesRouter.delete("/:hash/:filename", async (req, res, next) => {
  try {
    const { hash, filename } = req.params;
    const key = `${hash}/${filename}`;
    if (!key || key.includes("..")) throw new NotFoundError("Image not found");

    // Ensure exists in DB
    const existing = await db.image.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Image not found");

    // Delete file from disk (best-effort)
    const absolutePath = join(env.STORAGE_DIRECTORY, "originals", key);
    deleteFile(absolutePath);

    // Delete DB row
    await db.image.delete({ where: { key } });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
