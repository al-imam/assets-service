import sharp, { Sharp } from "sharp";
import { z } from "zod";
import { env } from "~/env";

sharp.cache(false); // honor "no caching for now"

export type OutputFormat = "jpeg" | "png" | "webp" | "avif";

export const TransformQuerySchema = z
  .object({
    width: z.coerce.number().int().min(1).max(env.MAX_IMAGE_DIMENSION).optional(),
    height: z.coerce.number().int().min(1).max(env.MAX_IMAGE_DIMENSION).optional(),
    fit: z.enum(["cover", "contain", "fill", "inside", "outside"]).default("cover"),
    quality: z.coerce.number().int().min(1).max(100).optional(),
    format: z.enum(["jpeg", "png", "webp", "avif", "auto"]).optional(),
    maxKilobytes: z.coerce.number().int().min(1).max(50000).optional(),
  })
  .refine(obj => (obj.width || obj.height ? (obj.width ?? 0) * (obj.height ?? 0) <= env.MAX_PIXEL_COUNT : true), {
    message: "Requested pixel count too large",
    path: ["width", "height"],
  });

export type TransformQuery = z.infer<typeof TransformQuerySchema>;

export function normalizeFormatFromSharp(format: string | undefined): OutputFormat {
  switch ((format || "").toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "jpeg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "avif":
      return "avif";
    default:
      return "jpeg";
  }
}

export function normalizeExtension(format: OutputFormat): string {
  return format === "jpeg" ? ".jpg" : `.${format}`;
}

export function encodeImageByFormat(instance: Sharp, format: OutputFormat, quality?: number) {
  switch (format) {
    case "jpeg":
      return instance.jpeg({ quality: quality ?? 85, mozjpeg: true, progressive: true, chromaSubsampling: "4:2:0" });
    case "png":
      return instance.png({ compressionLevel: 9, palette: true });
    case "webp":
      return instance.webp({ quality: quality ?? 82 });
    case "avif":
      return instance.avif({ quality: quality ?? 50 });
  }
}

export type PipelinePhase = "ingest" | "serve";

export interface PluginContext {
  phase: PipelinePhase;
  sharpInstance: Sharp;
  options: TransformQuery;
  outputFormat: OutputFormat;
}

export type ImagePlugin = (ctx: PluginContext) => void | Promise<void>;

// Plugins (ordered)
export const autoRotatePlugin: ImagePlugin = ({ sharpInstance }) => {
  sharpInstance.rotate();
};

export const resizePlugin: ImagePlugin = ({ sharpInstance, options }) => {
  const { width, height, fit } = options;
  if (width || height) {
    sharpInstance.resize({
      width,
      height,
      fit: fit ?? "cover",
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    });
  }
};

export const encodePlugin: ImagePlugin = ({ sharpInstance, outputFormat, options }) => {
  encodeImageByFormat(sharpInstance, outputFormat, options.quality);
};

export async function buildPipeline(
  inputFilePath: string,
  options: TransformQuery,
  outputFormat: OutputFormat,
  phase: PipelinePhase
): Promise<Sharp> {
  const sharpInstance = sharp(inputFilePath, { failOnError: true });
  const context: PluginContext = { phase, sharpInstance, options, outputFormat };

  const plugins: ImagePlugin[] =
    phase === "ingest"
      ? [autoRotatePlugin, encodePlugin] // keep ingest fast and deterministic
      : [autoRotatePlugin, resizePlugin, encodePlugin]; // allow size/quality transforms

  for (const plugin of plugins) {
    await plugin(context);
  }
  return context.sharpInstance;
}

// Size targeting with binary search on quality (lossy formats). Returns buffer and the quality used.
export async function encodeToTargetKilobytes(
  createSharp: () => Promise<Sharp>,
  format: OutputFormat,
  targetKilobytes: number,
  qualityHint?: number
): Promise<{ buffer: Buffer; format: OutputFormat; qualityUsed: number }> {
  if (format === "png") {
    const sharp = await createSharp();
    const buffer = await encodeImageByFormat(sharp, "png").toBuffer();
    return { buffer, format: "png", qualityUsed: 100 };
  }

  let low = 1;
  let high = qualityHint ?? 85;
  let best: { buffer: Buffer; quality: number } | null = null;

  for (let i = 0; i < 7 && low <= high; i++) {
    const current = Math.floor((low + high) / 2);
    const sharp = await createSharp();
    const buffer = await encodeImageByFormat(sharp, format, current).toBuffer();
    const kilobytes = Math.ceil(buffer.length / 1024);
    if (kilobytes <= targetKilobytes) {
      best = { buffer, quality: current };
      low = current + 1;
    } else {
      high = current - 1;
    }
  }

  if (best) return { buffer: best.buffer, format, qualityUsed: best.quality };
  const sharp = await createSharp();
  const buffer = await encodeImageByFormat(sharp, format, low).toBuffer();
  return { buffer, format, qualityUsed: low };
}
