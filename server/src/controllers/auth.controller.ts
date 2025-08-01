import { Request, Response } from "express";
import { z } from "zod";
import { env } from "~/env";
import { BadRequestError, UnauthorizedError, ZodValidationError } from "~/lib/http";
import { calculateTTL } from "~/lib/ttl";
import { joinUrl } from "~/lib/url";
import { AuthSchema, authService, AuthSignupSchema, PasswordChangeSchema } from "~/services/auth.service";

const ConfirmAuthSchema = z.object({
  auth: z.string().min(1, "Authentication token is required"),
  code: z
    .string()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d+$/, "Verification code must contain only numbers"),
});

const ConfirmPasswordChangeSchema = z.object({
  auth: z.string().min(1, "Authentication token is required"),
  code: z
    .string()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d+$/, "Verification code must contain only numbers"),
});

export class AuthController {
  async signin(req: Request, res: Response) {
    const validation = AuthSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const { auth, user } = await authService.signin(validation.data);

    res.cookie("auth", auth, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });

    res.json({ user: user, auth: auth });
  }

  async signup(req: Request, res: Response) {
    const validation = AuthSignupSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const auth = await authService.createSignupToken(validation.data);
    res.json({ auth });
  }

  async signupVerify(req: Request, res: Response) {
    const validation = ConfirmAuthSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const { auth, user } = await authService.confirmSignup(validation.data);

    res.cookie("auth", auth, {
      httpOnly: true,
      maxAge: calculateTTL({ months: 1 }),
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });

    res.json({ user: user, auth: auth });
  }

  async signout(_req: Request, res: Response) {
    res.clearCookie("auth");
    res.json({ success: true });
  }

  async changePassword(req: Request, res: Response) {
    const validation = PasswordChangeSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const auth = await authService.createPasswordChangeToken(validation.data);
    res.json({ auth });
  }

  async changePasswordVerify(req: Request, res: Response) {
    const validation = ConfirmPasswordChangeSchema.safeParse(req.body);
    if (!validation.success) throw new ZodValidationError(validation.error);
    const { auth, user } = await authService.confirmPasswordChange(validation.data);

    res.cookie("auth", auth, {
      httpOnly: true,
      maxAge: calculateTTL({ months: 1 }),
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });

    res.json({
      user: user,
      auth: auth,
    });
  }

  async googleAuth(req: Request, res: Response) {
    const callbackUrl = req.query.callbackUrl as string;

    const params = new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: env.GOOGLE_OAUTH_CALLBACK_URL,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: ["openid", "profile", "email"].join(" "),
    });

    if (callbackUrl) {
      const state = Buffer.from(JSON.stringify({ callbackUrl: callbackUrl })).toString("base64");
      params.append("state", state);
    }

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  async googleCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) throw new BadRequestError("Google Auth Code is required");

    const urls = [env.CLIENT_BASE_URL] as string[];

    if (typeof state === "string") {
      const parsedState = JSON.parse(Buffer.from(state, "base64").toString());

      if (parsedState.callbackUrl) {
        urls.push(parsedState.callbackUrl);
      }
    }

    const { auth } = await authService.confirmGoogleSignin({ auth: code });

    res.cookie("auth", auth, {
      httpOnly: true,
      expires: new Date(Date.now() + calculateTTL({ months: 1 })),
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });

    res.redirect(joinUrl(...(urls as [string])));
  }

  async getCurrentUser(req: Request, res: Response) {
    const auth = req.cookies.auth;
    if (!auth) throw new UnauthorizedError("Authentication token is required");
    const user = await authService.getCurrentUser(auth);
    if (!user) throw new UnauthorizedError("Invalid authentication token");
    res.json(user);
  }
}

export const authController = new AuthController();
