import { z } from "zod";
import { db } from "~/db";
import { env } from "~/env";
import { NotFoundError, UnauthorizedError } from "~/lib/http";
import { safeDecode, safeVerify, sign } from "~/lib/jwt";
import { decrypt, encrypt } from "~/lib/secret";

export const CreateSecretSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  expiresAt: z.iso.datetime().optional(),
  validationUri: z.url("Invalid validation URI").optional(),
});

export const UpdateSecretSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  expiresAt: z.iso.datetime().optional(),
  validationUri: z.url("Invalid validation URI").optional(),
});

export const GenerateReadTokenSchema = z.object({
  bucketId: z.string().min(1, "Bucket ID is required"),
  keys: z.array(z.string()).min(1, "At least one key is required"),
  secret: z.string().min(1, "Secret ID is required"),
});

export const SecretPayloadSchema = z.object({
  secretId: z.ulid(),
  userId: z.ulid(),
  validationUri: z.url().nullable(),
  expireAt: z.iso.datetime().nullable(),
  permission: z.enum(["read", "write", "delete"]),
  bucketId: z.ulid(),
  keys: z.array(z.string()),
  issuedAt: z.iso.datetime(),
});

export const EncryptedSecretSchema = z.preprocess(data => {
  if (typeof data === "string") {
    return JSON.parse(decrypt(data, env.MASTER_SECRET_KEY));
  }

  return data;
}, SecretPayloadSchema);

export const PublicSecret = z.object({
  id: z.string(),
  secret: z.string(),
  expiresAt: z.coerce
    .date()
    .nullable()
    .transform(date => date?.toISOString() || null),
  validationUri: z.string().nullable(),
  userId: z.string(),
  createdAt: z.coerce.date().transform(date => date.toISOString()),
  updatedAt: z.coerce.date().transform(date => date.toISOString()),
});

class SecretService {
  constructor() {}

  async createSecret({
    secret,
    expiresAt,
    validationUri,
    userId,
  }: {
    secret: string;
    expiresAt?: string;
    validationUri?: string;
    userId: string;
  }) {
    const secretData = await db.secret.create({
      data: {
        secret: encrypt(secret),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        validationUri: validationUri ?? null,
        userId,
      },
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

  async generateReadToken({
    secret: InputSecret,
    bucketId,
    keys,
  }: {
    secret: string;
    bucketId: string;
    keys: string[];
  }) {
    const secret = await db.secret.findFirst({
      where: { secret: encrypt(InputSecret) },
      include: { user: true },
    });

    if (!secret) throw new NotFoundError("Secret not found");
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    const bucket = await db.bucket.findFirst({ where: { id: bucketId, userId: secret.userId } });
    if (!bucket) throw new NotFoundError("Bucket not found");

    const encryptedPayload = encrypt(
      JSON.stringify({
        secretId: secret.id,
        userId: secret.userId,
        validationUri: secret.validationUri,
        expireAt: secret.expiresAt ? secret.expiresAt.toISOString() : null,
        permission: "read",
        bucketId,
        keys,
        issuedAt: new Date().toISOString(),
      })
    );

    return {
      readToken: await sign(encryptedPayload, {
        expiresIn: secret.expiresAt ? Math.floor((secret.expiresAt.getTime() - Date.now()) / 1000) + "s" : "30d",
        secret: decrypt(secret.secret),
      }),
    };
  }

  async verifyReadToken(readToken: string) {
    const [decodeValue, decodeError] = safeDecode<string>(readToken);
    if (decodeError) throw new UnauthorizedError("Invalid read token");

    const values = EncryptedSecretSchema.safeParse(decodeValue);
    if (!values.success) throw new UnauthorizedError("Invalid read token");

    const secret = await db.secret.findFirst({
      where: { id: values.data.secretId, userId: values.data.userId },
      include: { user: true },
    });

    if (!secret) throw new NotFoundError("Secret not found");
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    const [verifyValue, verifyError] = await safeVerify<string>(readToken, {
      secret: decrypt(secret.secret),
    });

    if (verifyError) throw new UnauthorizedError("Invalid read token");
    const bucket = await db.bucket.findFirst({ where: { id: values.data.bucketId, userId: secret.userId } });
    if (!bucket) throw new NotFoundError("Bucket not found");

    return EncryptedSecretSchema.parse(verifyValue);
  }

  async verifySecret(apiSecret: string) {
    const secret = await db.secret.findFirst({
      where: { secret: encrypt(apiSecret) },
      include: { user: true },
    });

    if (!secret) throw new NotFoundError("Secret not found");
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new UnauthorizedError("Secret has expired");
    }

    return secret;
  }
}

export const secretService = new SecretService();
