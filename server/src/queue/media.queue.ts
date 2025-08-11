import { JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import { existsSync, renameSync } from "fs";
import IORedis from "ioredis";
import { dirname, join } from "path";
import sharp from "sharp";
import { db } from "~/db";
import { env } from "~/env";
import { buildPipeline, normalizeFormatFromSharp } from "~/image/pipeline";
import { deleteFile, ensureFilePathExists, sanitizeFilename } from "~/utils/file";
import { sha256File } from "~/utils/hash";

export type IngestJobData = {
  tmpFilePath: string;
  originalFileName: string;
};

export type IngestJobResult = {
  key: string;
};

const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const ingestQueue = new Queue<IngestJobData>("image-ingest", { connection: redis });
const ingestEvents = new QueueEvents("image-ingest", { connection: redis });

export function startImageWorkers() {
  new Worker<IngestJobData>(
    "image-ingest",
    async job => {
      const metadata = await sharp(job.data.tmpFilePath, { failOnError: true }).metadata();
      const sourceFormat = normalizeFormatFromSharp(metadata.format);

      const pipeline = await buildPipeline(job.data.tmpFilePath, { fit: "cover" }, sourceFormat, "ingest");

      const tempMasterPath = `${job.data.tmpFilePath}.master`;
      await pipeline.toFile(tempMasterPath);

      const contentHash = await sha256File(tempMasterPath);

      const kebabBase = sanitizeFilename(job.data.originalFileName);
      const relativeKey = `${contentHash}/${kebabBase}`;
      const finalAbsolutePath = join(env.STORAGE_DIRECTORY, relativeKey);

      ensureFilePathExists(dirname(finalAbsolutePath));

      if (!existsSync(finalAbsolutePath)) {
        renameSync(tempMasterPath, finalAbsolutePath);
      } else {
        deleteFile(tempMasterPath);
      }

      try {
        await db.image.create({ data: { key: relativeKey } });
      } catch {
        /**/
      }

      deleteFile(job.data.tmpFilePath);

      return { key: relativeKey };
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

  return (await job.waitUntilFinished(ingestEvents)) as IngestJobResult;
}
