import cookies from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "~/env";
import { ErrorHandler } from "~/lib/http";
import { cleanBodyMiddleware } from "~/middleware/clean.middleware";
import { combinedRouter } from "~/routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookies());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(env.ROOT_PUBLIC_DIRECTORY));
app.use(cleanBodyMiddleware);
app.use("/api/v1", combinedRouter);
app.use(ErrorHandler);

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
