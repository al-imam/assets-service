import { NextFunction, Request, Response } from "express";
import { Permissions } from "~/controllers/access.controller";
import { env } from "~/env";
import { UnauthorizedError } from "~/lib/http";
import { safeVerify } from "~/lib/jwt";

export function authorize(...operations: Permissions[]) {
  return async (req: Request, _: Response, next: NextFunction) => {
    const secret = req.headers["x-secret"];
    if (secret && secret === env.SECRET_KEY) return next();

    const accessToken = req.headers["x-media-access-token"] || req.cookies["__media_access_token__"];
    const [payload] = await safeVerify<Permissions[]>(accessToken);
    if (Array.isArray(payload) && operations.every(op => payload.includes(op))) return next();

    throw new UnauthorizedError("Permission denied");
  };
}
