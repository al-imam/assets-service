import cookies from "cookie-parser";
import cors from "cors";
import express from "express";
import { join } from "path";
import { env } from "~/env";
import { ErrorHandler } from "~/lib/http";
import { cleanBodyMiddleware } from "~/middleware/clean.middleware";
import { startImageWorkers } from "~/queue/media.queue";
import { combinedRouter } from "~/routes";
import { ensureFilePathExists } from "~/utils/file";

const app = express();

ensureFilePathExists(join(env.STORAGE_DIRECTORY));
ensureFilePathExists(join(env.TMP_DIRECTORY));

startImageWorkers();

app.use(cors());
app.use(express.json());
app.use(cookies());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "../public")));
app.use(cleanBodyMiddleware);
app.use("/api/v1", combinedRouter);
app.use(ErrorHandler);

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
