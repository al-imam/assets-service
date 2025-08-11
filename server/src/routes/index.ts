import { Router } from "express";
import { imagesRouter } from "./images.route";
import { publicImagesRouter } from "./public-images.route";

export const combinedRouter = Router();

// Upload and delete endpoints
combinedRouter.use("/images", imagesRouter);

// Public, path-based access
combinedRouter.use("/i", publicImagesRouter);
