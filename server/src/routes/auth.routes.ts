import { Router } from "express";
import { authController } from "~/controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/sign-in", authController.signin.bind(authController));
authRouter.post("/sign-up", authController.signup.bind(authController));
authRouter.post("/sign-up/verify", authController.signupVerify.bind(authController));
authRouter.post("/sign-out", authController.signout.bind(authController));

authRouter.get("/google", authController.googleAuth.bind(authController));
authRouter.get("/google/callback", authController.googleCallback.bind(authController));

authRouter.post("/password/change", authController.changePassword.bind(authController));
authRouter.post("/password/change/verify", authController.changePasswordVerify.bind(authController));
