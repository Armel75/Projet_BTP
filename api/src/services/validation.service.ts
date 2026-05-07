import { prisma } from "../config/prisma.js";
import { ContractService } from "./contract.service.js";
import { ControlReportService } from "./control-report.service.js";

type ValidationEntityType = "purchase-order" | "change-order" | "situation-travaux" | "control-report";

type ValidationItem = {
  id: string;
  entityType: ValidationEntityType;
  entityId: number;
  title: string;
  subtitle: string;
  status: string;
  requestedAt: string;
  project?: { id: number; code?: string | null; title?: string | null };
  requester?: { id?: number | null; name: string };
  amount?: number | null;
  currency?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
};

const ENTITY_APPROVE_PERMISSIONS: Record<ValidationEntityType, string[]> = {
  "purchase-order": ["purchase-order:approve"],
  "change-order": ["change-order:approve"],
  "situation-travaux": ["invoice:approve", "budget:update"],
  "control-report": ["control-report:approve"],
};

function hasAnyPermission(userPermissions: string[] | undefined, needed: string[]): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return needed.some((permission) => userPermissions.includes(permission));
}

function fullName(user?: { firstname?: string | null; lastname?: string | null; email?: string | null } | null): string {
  if (!user) return "Utilisateur";
  const name = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
  return name || user.email || "Utilisateur";
}

function appendReason(base: string | null | undefined, reason: string, actorName: string): string {
  const stamped = `[REJET SG/DG ${new Date().toISOString()} - ${actorName}] ${reason}`;
  if (!base || !base.trim()) return stamped;
  return `${base}\n\n${stamped}`;
}

export class ValidationService {
  static async getPendingApprovals(params: {
    tenantId: number;
    userPermissions: string[];
    projectId?: number;
    entityType?: ValidationEntityType;
  }): Promise<{ items: ValidationItem[]; stats: Record<ValidationEntityType, number> }> {
    const { tenantId, userPermissions, projectId, entityType } = params;

    const shouldLoad = (type: ValidationEntityType) => {
      if (entityType && entityType !== type) return false;
      return hasAnyPermission(userPermissions, ENTITY_APPROVE_PERMISSIONS[type]);
    };

    const items: ValidationItem[] = [];
    const stats: Record<ValidationEntityType, number> = {
      "purchase-order": 0,
      "change-order": 0,
      "situation-travaux": 0,
      "control-report": 0,
    };

    if (shouldLoad("purchase-order")) {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          tenant_id: tenantId,
          ...(projectId ? { project_id: projectId } : {}),
          status: { in: ["DRAFT", "SUBMITTED", "PENDING_APPROVAL"] },
        },
        include: {
          project: { select: { id: true, code: true, title: true } },
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstname: true, lastname: true, email: true } },
        },
        orderBy: { created_at: "desc" },
      });

      stats["purchase-order"] = purchaseOrders.length;
      items.push(
        ...purchaseOrders.map((po: typeof purchaseOrders[number]) => ({
          id: `purchase-order:${po.id}`,
          entityType: "purchase-order" as const,
          entityId: po.id,
          title: `Validation Bon de commande #${po.number || po.id}`,
          subtitle: `${po.project?.code || "Projet"} • Fournisseur: ${po.supplier?.name || "-"}`,
          status: po.status,
          requestedAt: po.created_at.toISOString(),
          project: po.project ? { id: po.project.id, code: po.project.code, title: po.project.title } : undefined,
          requester: { id: po.createdBy?.id, name: fullName(po.createdBy) },
          amount: po.total_amount ?? null,
          currency: po.currency ?? null,
          priority: Number(po.total_amount ?? 0) >= 10000000 ? "HIGH" : "MEDIUM",
        }))
      );
    }

    if (shouldLoad("change-order")) {
      const changeOrders = await prisma.changeOrder.findMany({
        where: {
          tenant_id: tenantId,
          ...(projectId ? { project_id: projectId } : {}),
          status: "PENDING_APPROVAL",
        },
        include: {
          project: { select: { id: true, code: true, title: true } },
          contract: { select: { id: true, reference: true } },
          createdBy: { select: { id: true, firstname: true, lastname: true, email: true } },
        },
        orderBy: { created_at: "desc" },
      });

      stats["change-order"] = changeOrders.length;
      items.push(
        ...changeOrders.map((co: typeof changeOrders[number]) => ({
          id: `change-order:${co.id}`,
          entityType: "change-order" as const,
          entityId: co.id,
          title: `Validation Avenant #${co.number}`,
          subtitle: `${co.project?.code || "Projet"} • Contrat: ${co.contract?.reference || "-"}`,
          status: co.status,
          requestedAt: co.created_at.toISOString(),
          project: co.project ? { id: co.project.id, code: co.project.code, title: co.project.title } : undefined,
          requester: { id: co.createdBy?.id, name: fullName(co.createdBy) },
          amount: co.amount ?? null,
          currency: "EUR",
          priority: Number(co.amount ?? 0) >= 5000000 ? "HIGH" : "MEDIUM",
        }))
      );
    }

    if (shouldLoad("situation-travaux")) {
      const situations = await prisma.situationTravaux.findMany({
        where: {
          tenant_id: tenantId,
          ...(projectId ? { project_id: projectId } : {}),
          status: "SUBMITTED",
        },
        include: {
          project: { select: { id: true, code: true, title: true } },
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstname: true, lastname: true, email: true } },
        },
        orderBy: [{ period_end: "desc" }, { id: "desc" }],
      });

      stats["situation-travaux"] = situations.length;
      items.push(
        ...situations.map((sit: typeof situations[number]) => ({
          id: `situation-travaux:${sit.id}`,
          entityType: "situation-travaux" as const,
          entityId: sit.id,
          title: `Validation Situation Travaux #${sit.reference || sit.id}`,
          subtitle: `${sit.project?.code || "Projet"} • Fournisseur: ${sit.supplier?.name || "-"}`,
          status: sit.status,
          requestedAt: sit.created_at.toISOString(),
          project: sit.project ? { id: sit.project.id, code: sit.project.code, title: sit.project.title } : undefined,
          requester: { id: sit.createdBy?.id, name: fullName(sit.createdBy) },
          amount: Number(sit.amount_proposed ?? 0),
          currency: "EUR",
          priority: Number(sit.amount_proposed ?? 0) >= 5000000 ? "HIGH" : "MEDIUM",
        }))
      );
    }

    if (shouldLoad("control-report")) {
      const reports = await prisma.controlReport.findMany({
        where: {
          tenant_id: tenantId,
          is_archived: false,
          ...(projectId ? { project_id: projectId } : {}),
          status: "UNDER_REVIEW",
        },
        include: {
          project: { select: { id: true, code: true, title: true } },
          createdBy: { select: { id: true, firstname: true, lastname: true, email: true } },
        },
        orderBy: { created_at: "desc" },
      });

      stats["control-report"] = reports.length;
      items.push(
        ...reports.map((report: typeof reports[number]) => ({
          id: `control-report:${report.id}`,
          entityType: "control-report" as const,
          entityId: report.id,
          title: report.title || `Validation Rapport de controle #${report.reference}`,
          subtitle: `${report.project?.code || "Projet"} • ${report.type || "QUALITY"}`,
          status: report.status,
          requestedAt: report.created_at.toISOString(),
          project: report.project ? { id: report.project.id, code: report.project.code, title: report.project.title } : undefined,
          requester: { id: report.createdBy?.id, name: fullName(report.createdBy) },
          amount: null,
          currency: null,
          priority: report.severity === "CRITICAL" || report.severity === "HIGH" ? "HIGH" : "MEDIUM",
        }))
      );
    }

    items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    return { items, stats };
  }

  static async approve(params: {
    tenantId: number;
    userId: number;
    userPermissions: string[];
    entityType: ValidationEntityType;
    entityId: number;
  }) {
    const { tenantId, userId, userPermissions, entityType, entityId } = params;

    if (!hasAnyPermission(userPermissions, ENTITY_APPROVE_PERMISSIONS[entityType])) {
      throw new Error("FORBIDDEN");
    }

    if (entityType === "purchase-order") {
      const existing = await prisma.purchaseOrder.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!existing) throw new Error("NOT_FOUND");
      return prisma.purchaseOrder.update({
        where: { id: entityId },
        data: { status: "APPROVED" },
      });
    }

    if (entityType === "change-order") {
      const existing = await prisma.changeOrder.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!existing) throw new Error("NOT_FOUND");
      return ContractService.updateChangeOrderStatus(entityId, "APPROVED", userId);
    }

    if (entityType === "situation-travaux") {
      const existing = await prisma.situationTravaux.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!existing) throw new Error("NOT_FOUND");
      return prisma.situationTravaux.update({
        where: { id: entityId },
        data: {
          status: "APPROVED",
          approved_by: userId,
          approved_at: new Date(),
        },
      });
    }

    if (entityType === "control-report") {
      const existing = await prisma.controlReport.findFirst({ where: { id: entityId, tenant_id: tenantId, is_archived: false }, select: { id: true } });
      if (!existing) throw new Error("NOT_FOUND");
      return ControlReportService.approve(entityId, userId);
    }

    throw new Error("ENTITY_TYPE_UNSUPPORTED");
  }

  static async reject(params: {
    tenantId: number;
    userId: number;
    userPermissions: string[];
    entityType: ValidationEntityType;
    entityId: number;
    reason: string;
    actorName: string;
  }) {
    const { tenantId, userId, userPermissions, entityType, entityId, reason, actorName } = params;

    if (!hasAnyPermission(userPermissions, ENTITY_APPROVE_PERMISSIONS[entityType])) {
      throw new Error("FORBIDDEN");
    }

    if (!reason.trim()) {
      throw new Error("REJECTION_REASON_REQUIRED");
    }

    if (entityType === "purchase-order") {
      const owned = await prisma.purchaseOrder.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!owned) throw new Error("NOT_FOUND");
      const existing = await prisma.purchaseOrder.findUnique({ where: { id: entityId }, select: { notes: true } });
      return prisma.purchaseOrder.update({
        where: { id: entityId },
        data: {
          status: "REJECTED",
          notes: appendReason(existing?.notes ?? null, reason, actorName),
        },
      });
    }

    if (entityType === "change-order") {
      const owned = await prisma.changeOrder.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!owned) throw new Error("NOT_FOUND");
      const existing = await prisma.changeOrder.findUnique({ where: { id: entityId }, select: { reason: true } });
      await prisma.changeOrder.update({
        where: { id: entityId },
        data: {
          reason: appendReason(existing?.reason ?? null, reason, actorName),
        },
      });
      return ContractService.updateChangeOrderStatus(entityId, "REJECTED", userId);
    }

    if (entityType === "situation-travaux") {
      const owned = await prisma.situationTravaux.findFirst({ where: { id: entityId, tenant_id: tenantId }, select: { id: true } });
      if (!owned) throw new Error("NOT_FOUND");
      const existing = await prisma.situationTravaux.findUnique({ where: { id: entityId }, select: { notes: true } });
      return prisma.situationTravaux.update({
        where: { id: entityId },
        data: {
          status: "DRAFT",
          approved_by: null,
          approved_at: null,
          notes: appendReason(existing?.notes ?? null, reason, actorName),
        },
      });
    }

    if (entityType === "control-report") {
      const owned = await prisma.controlReport.findFirst({ where: { id: entityId, tenant_id: tenantId, is_archived: false }, select: { id: true } });
      if (!owned) throw new Error("NOT_FOUND");
      return ControlReportService.reject(entityId, userId, reason);
    }

    throw new Error("ENTITY_TYPE_UNSUPPORTED");
  }
}
