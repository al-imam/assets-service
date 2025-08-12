import { Router } from "express";
import { extname, join } from "path";
import { createAccessToken } from "~/controllers/access.controller";
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
import { authorize } from "~/middleware/access.middleware";
import { uploadSingleImage } from "~/middleware/upload.middleware";
import { enqueueIngest } from "~/queue/media.queue";
import { deleteFile, getFilename } from "~/utils/file";

export const mediaRouter = Router();

mediaRouter.post("/issue-access", createAccessToken);

mediaRouter.post("/", authorize("write"), uploadSingleImage.single("file"), async (req, res) => {
  if (!req.file) throw new BadRequestError("File not provided");
  if (!req.file.path || !req.file.originalname) throw new BadRequestError("Invalid file");

  const result = await enqueueIngest({ filePath: req.file.path, fileName: req.file.originalname });

  res.status(201).json({ key: result.key, url: `m/${result.key}` });
});

mediaRouter.delete("/:hash/:filename", authorize("delete"), async (req, res) => {
  const hash = req.params.hash;

  if (!hash) throw new NotFoundError("Image not found");
  const record = await db.image.findFirst({ where: { key: { startsWith: hash + "/" } } });
  if (!record) throw new NotFoundError("Image not found");

  const [dbHash, dbFilename] = record.key.split("/");
  const absolutePath = join(env.STORAGE_DIRECTORY, `${dbHash}.${dbFilename}`);

  deleteFile(absolutePath);
  await db.image.delete({ where: { key: record.key } });

  res.status(204).end();
});

mediaRouter.get("/:hash/:filename", async (req, res, next) => {
  const hash = req.params.hash;
  if (!hash) throw new NotFoundError("Image not found");

  const record = await db.image.findFirst({ where: { key: { startsWith: hash + "/" } } });
  if (!record) throw new NotFoundError("Image not found");

  const result = TransformQuerySchema.safeParse(req.query);
  if (!result.success) throw new ZodValidationError(result.error);
  const query = result.data;

  const [dbHash, dbFilename] = record.key.split("/");
  const absolutePath = join(env.STORAGE_DIRECTORY, `${dbHash}.${dbFilename}`);

  const sourceFormat = normalizeFormatFromSharp(extname(record.key).replace(".", ""));
  const outputFormat = query.format && query.format !== "auto" ? (query.format as OutputFormat) : sourceFormat;

  const createSharp = async () => await buildPipeline(absolutePath, query, outputFormat, "serve");

  if (query.kb) {
    const { buffer, format, qualityUsed } = await encodeToTargetKilobytes(
      createSharp,
      outputFormat,
      query.kb,
      query.quality
    );

    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Quality", String(qualityUsed));
    res.setHeader("Content-Disposition", `inline; filename="${getFilename(record.key)}"`);

    return res.end(buffer);
  }

  const sharpInstance = await createSharp();

  res.setHeader("Content-Type", `image/${outputFormat}`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${getFilename(record.key)}"`);

  const stream = sharpInstance.on("error", next);
  stream.pipe(res);
});
