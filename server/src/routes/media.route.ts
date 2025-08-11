import { Router } from "express";
import { extname, join } from "path";
import { db } from "~/db";
import { env } from "~/env";
import {
  TransformQuerySchema,
  buildPipeline,
  encodeToTargetKilobytes,
  normalizeFormatFromSharp,
  type OutputFormat,
} from "~/image/pipeline";
import { BadRequestError, NotFoundError, ZodValidationError } from "~/lib/http";
import { uploadSingleImage } from "~/middleware/upload.middleware";
import { enqueueIngest } from "~/queue/media.queue";
import { deleteFile, getFilename } from "~/utils/file";

export const mediaRouter = Router();

mediaRouter.post("/", uploadSingleImage.single("file"), async (req, res) => {
  if (!req.file) throw new BadRequestError("No file uploaded; use field name 'file'.");

  const result = await enqueueIngest({
    tmpFilePath: req.file.path,
    originalFileName: req.file.originalname || "image",
  });

  res.status(201).json({ key: result.key, path: `/m/${result.key}` });
});

mediaRouter.delete("/:hash/:filename", async (req, res) => {
  const key = `${req.params.hash}/${req.params.filename}`;
  if (!key) throw new NotFoundError("Image not found");

  const existing = await db.image.findUnique({ where: { key } });
  if (!existing) throw new NotFoundError("Image not found");

  deleteFile(join(env.STORAGE_DIRECTORY, key));
  await db.image.delete({ where: { key } });

  res.status(204).end();
});

mediaRouter.get("/:hash/:filename", async (req, res, next) => {
  const key = `${req.params.hash}/${req.params.filename}`;
  if (!key) throw new NotFoundError("Image not found");

  const record = await db.image.findUnique({ where: { key } });
  if (!record) throw new NotFoundError("Image not found");

  const result = TransformQuerySchema.safeParse(req.query);
  if (!result.success) throw new ZodValidationError(result.error);
  const query = result.data;

  const sourceFormat = normalizeFormatFromSharp(extname(key).replace(".", ""));
  const outputFormat = query.format && query.format !== "auto" ? (query.format as OutputFormat) : sourceFormat;

  const createSharp = async () => await buildPipeline(join(env.STORAGE_DIRECTORY, key), query, outputFormat, "serve");

  if (query.maxKilobytes) {
    const { buffer, format, qualityUsed } = await encodeToTargetKilobytes(
      createSharp,
      outputFormat,
      query.maxKilobytes,
      query.quality
    );

    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Quality", String(qualityUsed));
    res.setHeader("Content-Disposition", `inline; filename="${getFilename(key)}"`);
    return res.end(buffer);
  }

  const sharpInstance = await createSharp();

  res.setHeader("Content-Type", `image/${outputFormat}`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${getFilename(key)}"`);

  const stream = sharpInstance.on("error", next);
  stream.pipe(res);
});
