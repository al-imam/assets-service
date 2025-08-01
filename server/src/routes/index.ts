import { Router } from "express";
import { authRouter } from "./auth.routes";

export const combinedRouter = Router();

combinedRouter.use("/auth", authRouter);
