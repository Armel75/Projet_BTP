import { Request, Response } from "express";
import { AuthService } from '../services/auth.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { sendResetEmail } from '../services/mail.service.js';
import { env } from '../config/env.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.registerUser(req.body, req.ip, req.headers['user-agent']);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Server error during registration." });
      }
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.loginUser(req.body, req.ip, req.headers['user-agent']);
      res.json(result);
    } catch (error: any) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else {
        console.error("Login Error Details:", error);
        res.status(500).json({ error: "Server error during login.", details: String(error) });
      }
    }
  }

  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user && req.user.sessionId) {
        await AuthService.logoutUser(req.user.sessionId);
      }
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout Error:", error);
      res.status(500).json({ error: "Server error during logout." });
    }
  }

  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const result = await AuthService.getCurrentUser(userId);
      res.json(result);
    } catch (error: any) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else res.status(500).json({ error: "Server error." });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "L'email est obligatoire." });
        return;
      }
      const result = await AuthService.forgotPassword(email);
      if (result) {
        const link = `${env.WEB_ORIGIN}/btp/reset-password?token=${result.token}`;
        await sendResetEmail(result.email, link);
      }
      res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    } catch (error: any) {
      console.error("ForgotPassword Error:", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: "Token et nouveau mot de passe obligatoires." });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
        return;
      }
      await AuthService.resetPassword(token, newPassword);
      res.json({ message: "Mot de passe mis à jour." });
    } catch (error: any) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else {
        console.error("ResetPassword Error:", error);
        res.status(500).json({ error: "Erreur serveur." });
      }
    }
  }
}
