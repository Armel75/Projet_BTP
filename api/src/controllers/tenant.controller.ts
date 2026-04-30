import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../config/prisma.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return null;
  return trimmed;
}

// ─── TenantController ─────────────────────────────────────────────────────────

export class TenantController {
  /**
   * GET /tenants
   * List all tenants with pagination.
   * Restricted to system-level users (GESTIONNAIRE_SYSTEME).
   * tenant_id is intentionally NOT filtered here — this is the admin endpoint.
   */
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page  = Math.max(1, parseInt(String(req.query.page  ?? 1), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)));
      const skip  = (page - 1) * limit;

      const [total, tenants] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.findMany({
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          select: {
            id:         true,
            name:       true,
            created_at: true,
            updated_at: true,
            _count: {
              select: { users: true, projects: true }
            }
          }
        })
      ]);

      res.json({
        data:       tenants,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error("[TenantController.list]", error);
      res.status(500).json({ error: "Erreur lors de la récupération des tenants." });
    }
  }

  /**
   * GET /tenants/:id
   * Get a single tenant by id.
   * A regular user can only see their own tenant.
   */
  static async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

      // Enforce: regular users can only read their own tenant
      const callerTenantId = req.user?.tenant_id;
      if (callerTenantId && callerTenantId !== id) {
        res.status(403).json({ error: "Accès refusé." });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: {
          id:         true,
          name:       true,
          created_at: true,
          updated_at: true,
          _count: { select: { users: true, projects: true } }
        }
      });

      if (!tenant) { res.status(404).json({ error: "Tenant introuvable." }); return; }
      res.json(tenant);
    } catch (error) {
      console.error("[TenantController.getOne]", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
  }

  /**
   * POST /tenants
   * Create a new tenant.
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const name = sanitizeName(req.body?.name);
      if (!name) {
        res.status(400).json({ error: "Le nom est requis (2–100 caractères)." });
        return;
      }

      // Prevent duplicate names
      const existing = await prisma.tenant.findFirst({ where: { name } });
      if (existing) {
        res.status(409).json({ error: `Un tenant nommé "${name}" existe déjà.` });
        return;
      }

      const tenant = await prisma.tenant.create({
        data:   { name },
        select: { id: true, name: true, created_at: true, updated_at: true }
      });

      console.info(`[TenantController.create] Tenant créé: id=${tenant.id} name="${tenant.name}" by user=${req.user?.id}`);
      res.status(201).json(tenant);
    } catch (error) {
      console.error("[TenantController.create]", error);
      res.status(500).json({ error: "Erreur lors de la création du tenant." });
    }
  }

  /**
   * PATCH /tenants/:id
   * Update a tenant's name.
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

      const name = sanitizeName(req.body?.name);
      if (!name) {
        res.status(400).json({ error: "Le nom est requis (2–100 caractères)." });
        return;
      }

      const existing = await prisma.tenant.findUnique({ where: { id } });
      if (!existing) { res.status(404).json({ error: "Tenant introuvable." }); return; }

      // Prevent name collision with another tenant
      const collision = await prisma.tenant.findFirst({ where: { name, id: { not: id } } });
      if (collision) {
        res.status(409).json({ error: `Un autre tenant nommé "${name}" existe déjà.` });
        return;
      }

      const updated = await prisma.tenant.update({
        where:  { id },
        data:   { name },
        select: { id: true, name: true, created_at: true, updated_at: true }
      });

      console.info(`[TenantController.update] Tenant mis à jour: id=${id} name="${name}" by user=${req.user?.id}`);
      res.json(updated);
    } catch (error) {
      console.error("[TenantController.update]", error);
      res.status(500).json({ error: "Erreur lors de la mise à jour du tenant." });
    }
  }

  /**
   * DELETE /tenants/:id
   * Soft delete: not physically supported by current schema (no deleted_at field).
   * We protect the operation by refusing deletion of tenants that still have users or projects.
   * This is the safest production approach without schema migration.
   */
  static async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "ID invalide." }); return; }

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: {
          id:   true,
          name: true,
          _count: { select: { users: true, projects: true } }
        }
      });

      if (!tenant) { res.status(404).json({ error: "Tenant introuvable." }); return; }

      // Guard: refuse deletion if tenant has active users or projects
      if (tenant._count.users > 0 || tenant._count.projects > 0) {
        res.status(409).json({
          error:    "Impossible de supprimer ce tenant : il contient des utilisateurs ou des projets.",
          details:  { users: tenant._count.users, projects: tenant._count.projects }
        });
        return;
      }

      await prisma.tenant.delete({ where: { id } });

      console.info(`[TenantController.remove] Tenant supprimé: id=${id} by user=${req.user?.id}`);
      res.json({ success: true, message: `Tenant "${tenant.name}" supprimé.` });
    } catch (error) {
      console.error("[TenantController.remove]", error);
      res.status(500).json({ error: "Erreur lors de la suppression du tenant." });
    }
  }
}
