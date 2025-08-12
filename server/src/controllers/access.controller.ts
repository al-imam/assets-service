import { Request, Response } from "express";
import { z } from "zod";
import { ZodValidationError } from "~/lib/http";
import { sign } from "~/lib/jwt";

const TokenRequestSchema = z.object({
  expiresIn: z
    .string()
    .regex(/^\d+[smhdy]$/, "expiresIn must be a valid duration")
    .default("1y"),
});

export const permissions = ["read", "write", "delete"] as const;
export type Permissions = (typeof permissions)[number];

export async function createAccessToken(req: Request, res: Response) {
  const result = TokenRequestSchema.safeParse(req.body);
  if (!result.success) throw new ZodValidationError(result.error);

  const token = await sign(["write", "read"], { expiresIn: result.data.expiresIn });

  res.json({
    token,
    expiresIn: result.data.expiresIn,
    permissions: ["write", "read"],
  });
}
