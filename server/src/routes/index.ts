import { Router } from "express";
import { mediaRouter } from "~/routes/media.route";

export const combinedRouter = Router();
combinedRouter.use("/m", mediaRouter);
