import { NextFunction, Request, Response } from "express";
import z from "zod";
import { UnauthorizedError } from "~/lib/http";
import { authService, PublicUser } from "~/services/auth.service";
import { secretService } from "~/services/secret.service";

const jwtSchema = z.jwt();

function getAuth(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const auth = authHeader.split(" ")[1];
    const parsed = jwtSchema.safeParse(auth);
    if (parsed.success) return parsed.data;
  }

  const auth = req.cookies.auth;
  if (auth) {
    const parsed = jwtSchema.safeParse(auth);
    if (parsed.success) return parsed.data;
  }

  return null;
}

export type AuthenticatedRequest = Request & {
  user?: z.infer<typeof PublicUser>;
};

export async function AuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth) throw new UnauthorizedError("You are not authenticated");
  const user = await authService.getCurrentUser(auth);
  if (!user) throw new UnauthorizedError("You are not authorized");

  req.user = user;
  next();
}

export type SecretRequest = Request & {
  _secret?: Awaited<ReturnType<typeof secretService.verifySecret>> | null;
};

function getSecret(req: Request): string | null {
  const secretHeader = req.headers["x-secret"];

  if (typeof secretHeader === "string") return secretHeader;
  const secretCookie = req.cookies.secret;
  if (typeof secretCookie === "string") return secretCookie;

  return null;
}

export async function SecretMiddleware(req: SecretRequest, res: Response, next: NextFunction) {
  const secret = getSecret(req);

  if (!secret) throw new UnauthorizedError("You are not authenticated");
  const verifiedSecret = await secretService.verifySecret(secret);

  if (!verifiedSecret) throw new UnauthorizedError("You are not authorized");
  req._secret = verifiedSecret;

  next();
}
