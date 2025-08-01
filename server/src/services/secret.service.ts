import { z } from "zod";
import { db } from "~/db";
import { NotFoundError, UnauthorizedError } from "~/lib/http";
import { encrypt } from "~/lib/secret";

export const CreateSecretSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  expiresAt: z.iso.datetime().optional(),
});

export const UpdateSecretSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  expiresAt: z.iso.datetime().optional(),
});

export const PublicSecret = z.object({
  id: z.string(),
  secret: z.string(),
  expiresAt: z.coerce
    .date()
    .nullable()
    .transform(date => date?.toISOString() || null),
  userId: z.string(),
  createdAt: z.coerce.date().transform(date => date.toISOString()),
  updatedAt: z.coerce.date().transform(date => date.toISOString()),
});

class SecretService {
  constructor() {}

  async createSecret({ secret, expiresAt, userId }: { secret: string; expiresAt?: string; userId: string }) {
    const secretData = await db.secret.create({
      data: { secret: encrypt(secret), expiresAt: expiresAt ? new Date(expiresAt) : null, userId },
    });

    return PublicSecret.parse(secretData);
  }

  async getSecrets(userId: string) {
    const secrets = await db.secret.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return secrets.map(secret => PublicSecret.parse(secret));
  }

  async getSecretById({ id, userId }: { id: string; userId: string }) {
    const secret = await db.secret.findFirst({ where: { id, userId } });
    if (!secret) throw new NotFoundError("Secret not found");

    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    return PublicSecret.parse(secret);
  }

  async deleteSecret({ id, userId }: { id: string; userId: string }) {
    const secret = await db.secret.findFirst({ where: { id, userId } });
    if (!secret) throw new NotFoundError("Secret not found");
    await db.secret.delete({ where: { id } });
    return { success: true };
  }

  async deleteExpiredSecrets(userId: string) {
    const now = new Date();
    const deletedSecrets = await db.secret.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: now,
        },
      },
    });

    return {
      success: true,
      deletedCount: deletedSecrets.count,
    };
  }
}

export const secretService = new SecretService();
