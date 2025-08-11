import { JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import { renameSync } from "fs";
import IORedis from "ioredis";
import { dirname, join } from "path";
import sharp from "sharp";
import { db } from "~/db";
import { env } from "~/env";
import { buildPipeline, normalizeExtension, normalizeFormatFromSharp, type OutputFormat } from "~/image/pipeline";
import { deleteFile, ensureFilePathExists, fileExists, toKebabCaseBaseName } from "~/utils/file";
import { sha256File } from "~/utils/hash-file";

export type IngestJobData = {
  tmpFilePath: string;
  originalFileName: string;
};

export type IngestJobResult = {
  key: string; // "hash/original-name-kebab.ext"
};

const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const ingestQueue = new Queue<IngestJobData>("image-ingest", { connection: redis });
const ingestEvents = new QueueEvents("image-ingest", { connection: redis });

export function startImageWorkers() {
  // Worker to perform ingest processing (preprocess/encode, hash, move, DB write)
  new Worker<IngestJobData>(
    "image-ingest",
    async job => {
      const { tmpFilePath, originalFileName } = job.data;

      // Probe format and decide container
      const metadata = await sharp(tmpFilePath, { failOnError: true }).metadata();
      const sourceFormat: OutputFormat = normalizeFormatFromSharp(metadata.format);
      const extension = normalizeExtension(sourceFormat);

      // Build pipeline for ingest (auto-rotate, encode)
      const pipeline = await buildPipeline(tmpFilePath, { fit: "cover" }, sourceFormat, "ingest");

      // Write to a temporary master file first
      const tempMasterPath = `${tmpFilePath}.master`;
      await pipeline.toFile(tempMasterPath);

      // Compute content hash of the master for stable addressing
      const contentHash = await sha256File(tempMasterPath);

      // Create final key: "<hash>/<original-name-kebab>.<ext>"
      const kebabBase = toKebabCaseBaseName(originalFileName) || "image";
      const relativeKey = `${contentHash}/${kebabBase}${extension}`;
      const finalAbsolutePath = join(env.STORAGE_DIRECTORY, "originals", relativeKey);

      // Ensure destination directory
      ensureFilePathExists(dirname(finalAbsolutePath));

      // If already exists, drop temp; otherwise move atomically
      if (!fileExists(finalAbsolutePath)) {
        renameSync(tempMasterPath, finalAbsolutePath);
      } else {
        deleteFile(tempMasterPath);
      }

      // Minimal DB persistence (only key)
      try {
        await db.image.create({ data: { key: relativeKey } });
      } catch {
        // Ignore if already exists (idempotent)
      }

      // Clean original tmp
      deleteFile(tmpFilePath);

      return { key: relativeKey } as IngestJobResult;
    },
    { connection: redis, concurrency: env.QUEUE_CONCURRENCY }
  );

  ingestEvents.on("failed", ({ jobId, failedReason }) => {
    console.error("Ingest job failed:", jobId, failedReason);
  });
}

export async function enqueueIngest(data: IngestJobData, options?: JobsOptions) {
  const job = await ingestQueue.add("ingest", data, {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 2,
    ...options,
  });
  const result = (await job.waitUntilFinished(ingestEvents)) as IngestJobResult;
  return result;
}
