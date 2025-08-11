import { Router } from "express";
import { basename, extname, join } from "path";
import { db } from "~/db";
import { env } from "~/env";
import {
  TransformQuerySchema,
  buildPipeline,
  encodeToTargetKilobytes,
  normalizeExtension,
  normalizeFormatFromSharp,
  type OutputFormat,
} from "~/image/pipeline";
import { BadRequestError, NotFoundError } from "~/lib/http";

export const publicImagesRouter = Router();

// GET /i/<hash>/<original-name-kebab.ext>?width=&height=&fit=&quality=&format=&maxKilobytes=
publicImagesRouter.get("/:hash/:filename", async (req, res, next) => {
  try {
    const { hash, filename } = req.params;
    const key = `${hash}/${filename}`;
    if (!key || key.includes("..")) throw new NotFoundError("Image not found");

    const record = await db.image.findUnique({ where: { key } });
    if (!record) throw new NotFoundError("Image not found");

    const absolutePath = join(env.STORAGE_DIRECTORY, "originals", key);

    const parsed = TransformQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.message, "INVALID_QUERY");
    const query = parsed.data;

    // Choose output format: default keep source
    const sourceFormat: OutputFormat = normalizeFormatFromSharp(extname(key).replace(".", ""));
    const outputFormat: OutputFormat =
      query.format && query.format !== "auto" ? (query.format as OutputFormat) : sourceFormat;

    const createSharp = async () => await buildPipeline(absolutePath, query, outputFormat, "serve");

    // If maxKilobytes is present, buffer once to size-target
    if (query.maxKilobytes) {
      const { buffer, format, qualityUsed } = await encodeToTargetKilobytes(
        createSharp,
        outputFormat,
        query.maxKilobytes,
        query.quality
      );
      const outputExtension = normalizeExtension(format);

      res.setHeader("Content-Type", `image/${format}`);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Quality", String(qualityUsed));
      res.setHeader("Content-Disposition", `inline; filename="${basename(key, extname(key))}${outputExtension}"`);
      res.end(buffer);
      return;
    }

    // Otherwise, stream the transformed image (no caching)
    const sharpInstance = await createSharp();
    const outputExtension = normalizeExtension(outputFormat);

    res.setHeader("Content-Type", `image/${outputFormat}`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="${basename(key, extname(key))}${outputExtension}"`);

    const stream = sharpInstance.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});
