import { Request, Response } from "express";
import { AuthService } from '../services/auth.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

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
}
