import axios from "axios";
import { z } from "zod";
import { db } from "~/db";
import { env } from "~/env";
import { compare, hash } from "~/lib/hash";
import { NotFoundError, UnauthorizedError, ZodValidationError } from "~/lib/http";
import { safeVerify, sign } from "~/lib/jwt";
import { randCode } from "~/utils/math";
import { wrap } from "~/utils/promise";

export const OPT_CODE_LENGTH = 6;
export const SECRET_IDS = { SIGNUP: "SIGNUP", FORGOT_PASSWORD: "FORGOT_PASSWORD" };

export const AuthSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const AuthSignupSchema = AuthSchema.extend({ name: z.string() });

export const GoogleUserSchema = z.object({
  email: z.email("Please enter a valid email address"),
  name: z.string(),
});

export const PasswordChangeSchema = AuthSchema.extend({ origin: z.string() });

export const PublicUser = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.coerce.date().transform(date => date.toISOString()),
  updatedAt: z.coerce.date().transform(date => date.toISOString()),
});

export type GoogleData = { email: string; name: string; avatar: string };

function createCodeSecret(id: string, code: string) {
  return `@OTP@${id}@${code}`;
}

class AuthService {
  constructor() {}

  async sendCodeViaEmail(code: string) {
    console.log(`verification code -> ${code}`);
  }

  async signin({ email, password }: { email: string; password: string }) {
    const user = await db.user.findFirst({ where: { email } });

    if (!user?.password) throw new NotFoundError("Email Not Found");

    if (!compare(password, user.password)) {
      throw new UnauthorizedError("Incorrect Email or Password");
    }

    const publicUser = PublicUser.parse(user);

    return {
      auth: await sign(publicUser, { expiresIn: "30d" }),
      user: publicUser,
    };
  }

  async confirmSignup({ auth, code }: { auth: string; code: string }) {
    const [decode, error] = await safeVerify(auth, {
      secret: createCodeSecret(SECRET_IDS.SIGNUP, code),
    });

    if (error) throw new UnauthorizedError("Invalid Verification Code");
    const validation = AuthSignupSchema.safeParse(decode);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const user = await db.user.create({
      data: {
        email: validation.data.email,
        password: hash(validation.data.password),
        name: validation.data.name,
      },
    });

    const publicUser = PublicUser.parse(user);

    return {
      auth: await sign(publicUser, { expiresIn: "30d" }),
      user: publicUser,
    };
  }

  async createSignupToken({ email, name, password }: z.infer<typeof AuthSignupSchema>) {
    const existedUser = await db.user.findFirst({ where: { email: email } });
    if (existedUser) throw new UnauthorizedError("Email Already Exists");

    const code = randCode(OPT_CODE_LENGTH);
    await this.sendCodeViaEmail(code);

    return sign(
      { name, email, password },
      {
        expiresIn: "5min",
        secret: createCodeSecret(SECRET_IDS.SIGNUP, code),
      }
    );
  }

  async createPasswordChangeToken({ email, password }: z.infer<typeof PasswordChangeSchema>) {
    const user = await db.user.findFirst({ where: { email } });
    if (!user) throw new NotFoundError("Email Not Found");

    const code = randCode(OPT_CODE_LENGTH);
    await this.sendCodeViaEmail(code);

    return sign(
      { email, password },
      {
        expiresIn: "5min",
        secret: createCodeSecret(SECRET_IDS.FORGOT_PASSWORD, code),
      }
    );
  }

  async confirmPasswordChange({ auth, code }: { auth: string; code: string }) {
    const [decode, error] = await safeVerify(auth, {
      secret: createCodeSecret(SECRET_IDS.FORGOT_PASSWORD, code),
    });

    if (error) throw new UnauthorizedError("Invalid Verification Code");
    const validation = AuthSchema.safeParse(decode);
    if (!validation.success) throw new ZodValidationError(validation.error);

    const user = await db.user.findFirst({ where: { email: validation.data.email } });
    if (!user) throw new NotFoundError("Email Not Found");
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { password: hash(validation.data.password) },
    });

    const publicUser = PublicUser.parse(updatedUser);

    return {
      auth: await sign(publicUser, { expiresIn: "30d" }),
      user: publicUser,
    };
  }

  async extractGoogleUserInfo({ auth }: { auth: string }) {
    const searchParams = new URLSearchParams();

    searchParams.append("code", auth);
    searchParams.append("grant_type", "authorization_code");

    searchParams.append("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    searchParams.append("client_secret", env.GOOGLE_OAUTH_SECRET);
    searchParams.append("redirect_uri", env.GOOGLE_OAUTH_CALLBACK_URL);

    const authTokenRes = await axios.post("https://oauth2.googleapis.com/token?" + searchParams.toString());

    const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `${authTokenRes.data.token_type} ${authTokenRes.data.access_token}`,
      },
    });

    return {
      name: userInfoRes.data.name as string,
      email: userInfoRes.data.email as string,
      avatar: userInfoRes.data.picture as string,
    };
  }

  async confirmGoogleSignin({ auth }: { auth: string }) {
    const [googleUser, error] = await wrap(this.extractGoogleUserInfo({ auth }));

    if (error) throw new UnauthorizedError("Invalid Google Auth");
    const validation = GoogleUserSchema.safeParse(googleUser);
    if (!validation.success) throw new ZodValidationError(validation.error);

    let user = await db.user.findFirst({
      where: { email: validation.data.email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: validation.data.email,
          name: validation.data.name,
          password: null,
        },
      });
    }

    const publicUser = PublicUser.parse(user);

    return {
      auth: await sign(publicUser, { expiresIn: "30d" }),
      user: publicUser,
    };
  }
}

export const authService = new AuthService();

export async function getCurrentUser(auth?: string) {
  if (!auth) return null;
  const [value, error] = await safeVerify(auth);
  if (error) return null;
  return PublicUser.parse(value);
}
