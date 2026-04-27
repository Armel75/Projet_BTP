import { Router } from "express";
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", authenticateToken, AuthController.logout);
authRouter.get("/me", authenticateToken, AuthController.getMe);

export default authRouter;
