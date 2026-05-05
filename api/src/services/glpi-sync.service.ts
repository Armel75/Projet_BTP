import { prisma } from '../config/prisma.js';
import { glpiPool } from '../infrastructure/database/glpi-mysql.js';
import { TenantContext } from '../config/tenant-context.js';

type GlpiUserRow = {
  id: number;
  name: string | null;
  realname: string | null;
  firstname: string | null;
  phone: string | null;
  is_active: number | null;
  is_deleted: number | null;
  date_mod: Date | string | null;
};

type GlpiTicketRow = {
  id: number;
  name: string | null;
  content: string | null;
  status: string | null;
  priority: number | null;
  urgency: number | null;
  impact: number | null;
  date: Date | string | null;
  solvedate: Date | string | null;
  closedate: Date | string | null;
  date_mod: Date | string | null;
};

type SyncResult = {
  success: boolean;
  synced: number;
  message: string;
  code?: string | null;
};

function mapGlpiStatus(glpiStatus: string | null): string {
  if (!glpiStatus) return 'OPEN';

  const statusMap: Record<string, string> = {
    '1': 'OPEN',
    '2': 'IN_PROGRESS',
    '3': 'IN_PROGRESS',
    '4': 'IN_PROGRESS',
    '5': 'RESOLVED',
    '6': 'CLOSED',
  };

  return statusMap[glpiStatus] || 'OPEN';
}

function mapPriority(priority: number | null): string | null {
  if (!priority) return null;
  const priorityMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH',
    6: 'MAJOR',
  };
  return priorityMap[priority] || null;
}

function mapUrgency(urgency: number | null): string | null {
  if (!urgency) return null;
  const urgencyMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH',
  };
  return urgencyMap[urgency] || null;
}

function mapImpact(impact: number | null): string | null {
  if (!impact) return null;
  const impactMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH',
  };
  return impactMap[impact] || null;
}

function isConnectivityError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const code = String(e?.code || '').toUpperCase();
  const message = String(e?.message || '').toLowerCase();
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    message.includes('timeout') ||
    message.includes('connect') ||
    message.includes('connection lost')
  );
}

function resolveTenantId(): number {
  const inContext = TenantContext.getTenantId();
  if (inContext) return inContext;

  const configured = Number(process.env.BOOTSTRAP_TENANT_ID);
  if (Number.isFinite(configured) && configured > 0) return configured;

  return 1;
}

export class GlpiSyncService {
  async getGlpiUsersFromSource(limit = 1000): Promise<GlpiUserRow[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, realname, firstname, phone, is_active, is_deleted, date_mod
         FROM glpi_users
         WHERE is_deleted = 0
         ORDER BY id DESC
         LIMIT ?`,
        [safeLimit]
      );
      return rows as GlpiUserRow[];
    } catch (error) {
      if (isConnectivityError(error)) {
        console.warn('[GLPI] getGlpiUsersFromSource unreachable:', (error as any)?.code || (error as any)?.message);
        return [];
      }
      throw error;
    }
  }

  async getGlpiTicketsFromSource(limit = 1000): Promise<GlpiTicketRow[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, content, status, priority, urgency, impact, date, solvedate, closedate, date_mod
         FROM glpi_tickets
         WHERE is_deleted = 0
         ORDER BY id DESC
         LIMIT ?`,
        [safeLimit]
      );
      return rows as GlpiTicketRow[];
    } catch (error) {
      if (isConnectivityError(error)) {
        console.warn('[GLPI] getGlpiTicketsFromSource unreachable:', (error as any)?.code || (error as any)?.message);
        return [];
      }
      throw error;
    }
  }

  // Important: only creates records that do not exist yet (no update path).
  async syncUsersToLocalDb(limit = 1000): Promise<SyncResult> {
    try {
      const tenantId = resolveTenantId();
      const rows = await this.getGlpiUsersFromSource(limit);

      if (!rows.length) {
        return { success: true, synced: 0, message: 'GLPI inaccessible ou aucun utilisateur disponible' };
      }

      const glpiIds = rows.map((r) => r.id);
      const existing = await (prisma as any).gLPIUser.findMany({
        where: {
          tenant_id: tenantId,
          glpi_id: { in: glpiIds },
        },
        select: { glpi_id: true },
      });
      const existingIds = new Set<number>(existing.map((e: { glpi_id: number }) => e.glpi_id));
      const toCreate = rows.filter((r) => !existingIds.has(r.id));

      if (!toCreate.length) {
        return { success: true, synced: 0, message: 'Aucun nouvel utilisateur GLPI a synchroniser' };
      }

      const now = new Date();
      const created = await (prisma as any).gLPIUser.createMany({
        data: toCreate.map((u) => ({
          tenant_id: tenantId,
          glpi_id: u.id,
          login: u.name || null,
          email: null,
          first_name: u.firstname || null,
          last_name: u.realname || null,
          full_name: [u.firstname || '', u.realname || ''].filter(Boolean).join(' ').trim() || u.name || `GLPI User ${u.id}`,
          phone: u.phone || null,
          department_name: null,
          entity_name: null,
          status: u.is_active === 0 ? 'INACTIVE' : 'ACTIVE',
          is_deleted_in_source: u.is_deleted === 1,
          source_updated_at: u.date_mod ? new Date(u.date_mod) : null,
          last_synced_at: now,
          sync_status: 'SYNCED',
          raw_payload: JSON.stringify(u),
        })),
      });

      return { success: true, synced: created.count, message: `${created.count} utilisateur(s) GLPI synchronise(s)` };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        message: error?.message || 'Erreur inconnue pendant la synchro users GLPI',
        code: error?.code || null,
      };
    }
  }

  // Important: only creates records that do not exist yet (no update path).
  async syncTicketsToLocalDb(limit = 1000): Promise<SyncResult> {
    try {
      const tenantId = resolveTenantId();
      const rows = await this.getGlpiTicketsFromSource(limit);

      if (!rows.length) {
        return { success: true, synced: 0, message: 'GLPI inaccessible ou aucun ticket disponible' };
      }

      const glpiIds = rows.map((r) => r.id);
      const existing = await (prisma as any).ticket.findMany({
        where: {
          tenant_id: tenantId,
          glpi_id: { in: glpiIds },
        },
        select: { glpi_id: true },
      });
      const existingIds = new Set<number>(existing.map((e: { glpi_id: number }) => e.glpi_id));
      const toCreate = rows.filter((r) => !existingIds.has(r.id));

      if (!toCreate.length) {
        return { success: true, synced: 0, message: 'Aucun nouveau ticket GLPI a synchroniser' };
      }

      const now = new Date();
      const created = await (prisma as any).ticket.createMany({
        data: toCreate.map((t) => ({
          tenant_id: tenantId,
          glpi_id: t.id,
          ticket_number: t.name || null,
          title: t.name || `Ticket ${t.id}`,
          description: t.content || null,
          ticket_type: null,
          status: mapGlpiStatus(t.status),
          priority: mapPriority(t.priority),
          urgency: mapUrgency(t.urgency),
          impact: mapImpact(t.impact),
          category_name: null,
          entity_name: null,
          location_name: null,
          opened_at: t.date ? new Date(t.date) : null,
          due_at: null,
          resolved_at: t.solvedate ? new Date(t.solvedate) : null,
          closed_at: t.closedate ? new Date(t.closedate) : null,
          requester_glpi_user_id: null,
          assignee_glpi_user_id: null,
          source_updated_at: t.date_mod ? new Date(t.date_mod) : null,
          last_synced_at: now,
          sync_status: 'SYNCED',
          raw_payload: JSON.stringify(t),
        })),
      });

      return { success: true, synced: created.count, message: `${created.count} ticket(s) GLPI synchronise(s)` };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        message: error?.message || 'Erreur inconnue pendant la synchro tickets GLPI',
        code: error?.code || null,
      };
    }
  }

  async listLocalGlpiUsers(limit = 200) {
    const tenantId = resolveTenantId();
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));

    return (prisma as any).gLPIUser.findMany({
      where: {
        tenant_id: tenantId,
        is_deleted_in_source: false,
      },
      select: {
        id: true,
        glpi_id: true,
        login: true,
        email: true,
        first_name: true,
        last_name: true,
        full_name: true,
        status: true,
      },
      orderBy: [{ full_name: 'asc' }, { login: 'asc' }],
      take: safeLimit,
    });
  }

  async listLocalTickets(limit = 200) {
    const tenantId = resolveTenantId();
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));

    return (prisma as any).ticket.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        glpi_id: true,
        ticket_number: true,
        title: true,
        status: true,
        priority: true,
        opened_at: true,
        resolved_at: true,
        closed_at: true,
      },
      orderBy: { opened_at: 'desc' },
      take: safeLimit,
    });
  }
}
