import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ValidationService } from "../services/validation.service.js";

const ENTITY_TYPES = ["purchase-order", "change-order", "situation-travaux", "control-report"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPES.includes(value as EntityType);
}

export class ValidationController {
  static async listPending(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const userPermissions = req.user?.permissions ?? [];
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const entityTypeRaw = (req.query.entityType as string | undefined)?.trim();
      const entityType = entityTypeRaw && isEntityType(entityTypeRaw) ? entityTypeRaw : undefined;

      if (!tenantId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (projectId !== undefined && (!Number.isFinite(projectId) || projectId <= 0)) {
        res.status(400).json({ error: "projectId invalide." });
        return;
      }

      const data = await ValidationService.getPendingApprovals({
        tenantId,
        userPermissions,
        projectId,
        entityType,
      });

      res.json(data);
    } catch (error: any) {
      console.error("[ValidationController.listPending]", error);
      res.status(500).json({ error: error?.message || "Erreur lors du chargement des validations." });
    }
  }

  static async approve(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id;
      const userPermissions = req.user?.permissions ?? [];
      const entityType = req.params.entityType;
      const entityId = Number(req.params.id);

      if (!tenantId || !userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!isEntityType(entityType)) {
        res.status(400).json({ error: "entityType invalide." });
        return;
      }
      if (!Number.isFinite(entityId) || entityId <= 0) {
        res.status(400).json({ error: "Identifiant invalide." });
        return;
      }

      const result = await ValidationService.approve({
        tenantId,
        userId,
        userPermissions,
        entityType,
        entityId,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[ValidationController.approve]", error);
      if (error?.message === "FORBIDDEN") {
        res.status(403).json({ error: "Permission insuffisante." });
        return;
      }
      if (error?.message === "NOT_FOUND") {
        res.status(404).json({ error: "Demande introuvable." });
        return;
      }
      if (error?.code === "P2025") {
        res.status(404).json({ error: "Demande introuvable." });
        return;
      }
      res.status(400).json({ error: error?.message || "Impossible d'approuver cette demande." });
    }
  }

  static async reject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id;
      const userPermissions = req.user?.permissions ?? [];
      const entityType = req.params.entityType;
      const entityId = Number(req.params.id);
      const reason = String(req.body?.reason ?? "").trim();
      const actorName = `${req.user?.firstname ?? ""} ${req.user?.lastname ?? ""}`.trim() || req.user?.email || "Utilisateur";

      if (!tenantId || !userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!isEntityType(entityType)) {
        res.status(400).json({ error: "entityType invalide." });
        return;
      }
      if (!Number.isFinite(entityId) || entityId <= 0) {
        res.status(400).json({ error: "Identifiant invalide." });
        return;
      }
      if (!reason) {
        res.status(400).json({ error: "Le motif de rejet est requis." });
        return;
      }

      const result = await ValidationService.reject({
        tenantId,
        userId,
        userPermissions,
        entityType,
        entityId,
        reason,
        actorName,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[ValidationController.reject]", error);
      if (error?.message === "FORBIDDEN") {
        res.status(403).json({ error: "Permission insuffisante." });
        return;
      }
      if (error?.message === "NOT_FOUND") {
        res.status(404).json({ error: "Demande introuvable." });
        return;
      }
      if (error?.message === "REJECTION_REASON_REQUIRED") {
        res.status(400).json({ error: "Le motif de rejet est requis." });
        return;
      }
      if (error?.code === "P2025") {
        res.status(404).json({ error: "Demande introuvable." });
        return;
      }
      res.status(400).json({ error: error?.message || "Impossible de rejeter cette demande." });
    }
  }
}
