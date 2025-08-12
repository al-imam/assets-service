import { JWTHeaderParameters, JWTVerifyOptions, SignJWT, decodeJwt, jwtVerify } from "jose";
import { env } from "~/env";
import { createSecretKey } from "~/utils/crypto";

interface SignOptions {
  headers: JWTHeaderParameters;
  expiresIn: string;
  secret: string;
}

interface VerifyOptions extends JWTVerifyOptions {
  secret?: string;
}

export function sign(payload: unknown, options?: Partial<SignOptions>) {
  return new SignJWT({ payload })
    .setIssuedAt()
    .setProtectedHeader({ alg: "HS256", ...options?.headers })
    .setExpirationTime(options?.expiresIn ?? "30d")
    .sign(createSecretKey(env.JWT_SECRET, options?.secret));
}

export async function verify<T>(jwt: string, options?: VerifyOptions) {
  const parsed = await jwtVerify(jwt, createSecretKey(env.JWT_SECRET, options?.secret), options);
  return parsed.payload.payload as T;
}

export function safeDecode<T = Record<string, unknown>>(jwt: string): [T, null] | [null, Error] {
  try {
    const parsed = decodeJwt<{ payload: T }>(jwt);
    return [parsed.payload, null];
  } catch (error) {
    return [null, error as Error];
  }
}

export async function safeVerify<T = Record<string, unknown>>(
  jwt: string,
  options: VerifyOptions = {}
): Promise<[T, null] | [null, Error]> {
  try {
    const parsed = await verify(jwt, options);
    return [parsed as T, null];
  } catch (error) {
    return [null, error as Error];
  }
}
