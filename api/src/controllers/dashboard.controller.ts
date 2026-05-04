import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { RbacService } from "../services/rbac.service.js";
import { DashboardService } from "../services/dashboard.service.js";

function parseProjectIds(raw: unknown): number[] {
  if (!raw) return [];
  const source = String(raw).trim();
  if (!source) return [];

  return source
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

function parseWindowDays(raw: unknown): number {
  const n = Number(raw ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(7, Math.min(180, Math.trunc(n)));
}

export class DashboardController {
  static async getOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const permissions = Array.isArray(req.user?.permissions)
        ? req.user.permissions as string[]
        : await RbacService.getUserPermissions(userId);

      const payload = await DashboardService.buildOverview({
        userId,
        permissions,
        windowDays: parseWindowDays(req.query.windowDays),
        requestedProjectIds: parseProjectIds(req.query.projectIds),
      });

      res.json(payload);
    } catch (error) {
      console.error("[DashboardController.getOverview]", error);
      res.status(500).json({ error: "Erreur lors du chargement du dashboard." });
    }
  }
}
