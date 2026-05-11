import { Request, Response } from 'express';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { MeetingService } from '../services/meeting.service.js';
import { RbacService } from '../services/rbac.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { TenantContext } from '../config/tenant-context.js';

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('fr-FR');
}

async function canReadAllMeetings(req: Request): Promise<boolean> {
  const user = (req as AuthRequest).user;
  if (!user?.id) return false;

  if (Array.isArray(user.permissions) && user.permissions.includes('meeting:read:all')) {
    return true;
  }

  const permissions = await RbacService.getUserPermissions(user.id);
  return permissions.includes('meeting:read:all');
}

type PdfPageLike = {
  setContent: (html: string, opts?: Record<string, unknown>) => Promise<void>;
  pdf: (opts?: Record<string, unknown>) => Promise<Buffer>;
  close: () => Promise<void>;
};

type BrowserLike = {
  newPage: () => Promise<PdfPageLike>;
  close: () => Promise<void>;
};

type PuppeteerLike = {
  launch: (opts?: Record<string, unknown>) => Promise<BrowserLike>;
};

let puppeteerLoader: Promise<PuppeteerLike | null> | null = null;
let logoLoader: Promise<string | null> | null = null;

async function getPuppeteer(): Promise<PuppeteerLike | null> {
  if (!puppeteerLoader) {
    puppeteerLoader = (async () => {
      try {
        const mod = await import('puppeteer');
        const candidate = (mod as any).default ?? mod;
        return candidate && typeof candidate.launch === 'function'
          ? (candidate as PuppeteerLike)
          : null;
      } catch {
        return null;
      }
    })();
  }
  return puppeteerLoader;
}

async function getCompanyLogoDataUrl(): Promise<string | null> {
  if (!logoLoader) {
    logoLoader = (async () => {
      const candidates = [
        path.resolve(process.cwd(), 'assets/branding/logo.png'),
        path.resolve(process.cwd(), '../api/assets/branding/logo.png'),
        new URL('../../assets/branding/logo.png', import.meta.url),
      ].filter(Boolean) as Array<string | URL>;

      for (const candidate of candidates) {
        try {
          const logoBuffer = await readFile(candidate);
          return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch {
          continue;
        }
      }

      return null;
    })();
  }

  return logoLoader;
}

function esc(v?: string | null): string {
  if (!v) return '';
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nl2br(v?: string | null): string {
  return esc(v).replace(/\n/g, '<br/>');
}

function fmtDateTime(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('fr-FR');
}

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function meetingTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    CHANTIER: 'Chantier',
    COORDINATION: 'Coordination',
    SECURITE: 'Securite',
    OPR: 'OPR',
    VISA: 'VISA',
    CODIR: 'CODIR',
    KICK_OFF: 'Kick-off',
  };
  return labels[type ?? ''] ?? (type || '—');
}

function meetingStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    PLANNED: 'Planifiee',
    IN_PROGRESS: 'En cours',
    DONE: 'Tenue',
    CANCELLED: 'Annulee',
  };
  return labels[status ?? ''] ?? (status || '—');
}

function buildMeetingHtml(meeting: any, logoDataUrl?: string | null): string {
  const reference = meeting.reference || `CR-${meeting.id}`;
  const attendees = (meeting.attendees ?? []) as any[];
  const actions = (meeting.actionItems ?? []) as any[];
  const openActions = actions.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length;

  const attendeesRows = attendees.length
    ? attendees
        .map((a, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${esc(a.user ? `${a.user.firstname} ${a.user.lastname}` : a.name || '—')}</td>
            <td>${esc(a.role_title || '—')}</td>
            <td>${esc(a.company || '—')}</td>
            <td>${esc(a.status || '—')}</td>
          </tr>
        `)
        .join('')
    : '<tr><td colspan="5">Aucun participant.</td></tr>';

  const actionsRows = actions.length
    ? actions
        .map((a, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${esc(a.subject || '—')}</td>
            <td>${esc(a.responsible ? `${a.responsible.firstname} ${a.responsible.lastname}` : (a.responsible_name || '—'))}</td>
            <td>${esc(a.glpiTicket ? (a.glpiTicket.ticket_number || `GLPI #${a.glpiTicket.glpi_id}`) : '—')}</td>
            <td>${esc(fmtDate(a.due_date))}</td>
            <td>${esc(a.status || '—')}</td>
            <td>${nl2br(a.comment) || '—'}</td>
          </tr>
        `)
        .join('')
    : '<tr><td colspan="7">Aucun point d\'action.</td></tr>';

  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .head { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
    .brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .logo-wrap { width: 52px; height: 52px; border-radius: 14px; border: 1px solid #dbe5f0; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; flex: 0 0 auto; }
    .logo-wrap img { max-width: 40px; max-height: 40px; display: block; }
    .brand { font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #64748b; font-weight: 800; }
    .brand-name { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .brand-meta { font-size: 11px; color: #475569; margin-top: 4px; }
    .title { margin: 0; font-size: 16px; font-weight: 900; }
    .sub { margin-top: 3px; color: #475569; font-size: 11px; }
    .meta { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card { border: 1px solid #dbe5f0; border-radius: 6px; padding: 6px 8px; }
    .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; }
    .val { font-size: 11px; font-weight: 600; margin-top: 2px; }
    .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .section-title { margin: 10px 0 6px; font-size: 11px; text-transform: uppercase; font-weight: 900; }
    .block { border: 1px solid #dbe5f0; border-radius: 6px; padding: 8px 9px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dbe5f0; padding: 6px 7px; vertical-align: top; }
    th { background: #f8fafc; font-size: 9px; text-transform: uppercase; color: #475569; letter-spacing: .3px; }
    .footer { margin-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #dbe5f0; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="head">
    <div class="brand-row">
      <div class="logo-wrap">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo entreprise" />` : ''}
      </div>
      <div>
        <div class="brand">BTP ERP · Compte-rendu de reunion</div>
        <div class="brand-name">Compte-rendu de reunion</div>
        <div class="brand-meta">Document de suivi, coordination et pilotage de reunion chantier</div>
      </div>
    </div>
    <h1 class="title">Compte-rendu de reunion</h1>
    <div class="sub">Reference ${esc(reference)}</div>
    <div class="meta">
      <div class="card"><div class="lbl">Reunion</div><div class="val">${esc(meeting.title || reference)}</div></div>
      <div class="card"><div class="lbl">Projet</div><div class="val">${esc(meeting.project ? `${meeting.project.code} - ${meeting.project.title}` : '—')}</div></div>
      <div class="card"><div class="lbl">Type</div><div class="val">${esc(meetingTypeLabel(meeting.type))}</div></div>
      <div class="card"><div class="lbl">Statut</div><div class="val">${esc(meetingStatusLabel(meeting.status))}</div></div>
      <div class="card"><div class="lbl">Date / Heure debut</div><div class="val">${esc(fmtDateTime(meeting.date))}</div></div>
      <div class="card"><div class="lbl">Date / Heure fin</div><div class="val">${esc(fmtDateTime(meeting.end_date))}</div></div>
      <div class="card"><div class="lbl">Lieu</div><div class="val">${esc(meeting.location || '—')}</div></div>
      <div class="card"><div class="lbl">Lot</div><div class="val">${esc(meeting.lot ? `Lot ${meeting.lot.lot_number} - ${meeting.lot.name}` : '—')}</div></div>
    </div>
    <div class="kpi">
      <div class="card"><div class="lbl">Participants</div><div class="val">${attendees.length}</div></div>
      <div class="card"><div class="lbl">Actions total</div><div class="val">${actions.length}</div></div>
      <div class="card"><div class="lbl">Actions ouvertes</div><div class="val">${openActions}</div></div>
    </div>
  </div>

  ${meeting.agenda ? `<div class="section-title">Ordre du jour</div><div class="block">${nl2br(meeting.agenda)}</div>` : ''}
  ${meeting.minutes ? `<div class="section-title">Compte-rendu</div><div class="block">${nl2br(meeting.minutes)}</div>` : ''}
  ${meeting.conclusion ? `<div class="section-title">Conclusions</div><div class="block">${nl2br(meeting.conclusion)}</div>` : ''}

  <div class="section-title">Participants</div>
  <table>
    <thead>
      <tr><th style="width: 6%">#</th><th style="width: 28%">Nom</th><th style="width: 20%">Role</th><th style="width: 24%">Entreprise</th><th style="width: 22%">Statut</th></tr>
    </thead>
    <tbody>${attendeesRows}</tbody>
  </table>

  <div class="section-title">Points d'action</div>
  <table>
    <thead>
      <tr><th style="width: 6%">#</th><th style="width: 26%">Sujet</th><th style="width: 18%">Responsable</th><th style="width: 14%">Ticket GLPI</th><th style="width: 12%">Echeance</th><th style="width: 10%">Statut</th><th style="width: 14%">Commentaire</th></tr>
    </thead>
    <tbody>${actionsRows}</tbody>
  </table>

  <div class="footer">
    <span>Reunion #${meeting.id}</span>
    <span>Genere le ${esc(new Date().toLocaleString('fr-FR'))}</span>
  </div>
</body>
</html>`;
}

function buildMeetingCsv(meeting: any): string {
  const attendees = (meeting.attendees ?? []) as any[];
  const actions = (meeting.actionItems ?? []) as any[];
  const lines: string[] = [];

  lines.push(['COMPTE RENDU DE REUNION', meeting.reference || `CR-${meeting.id}`].map(csvCell).join(','));
  lines.push('');
  lines.push(['Champ', 'Valeur'].map(csvCell).join(','));
  lines.push(['Titre', meeting.title].map(csvCell).join(','));
  lines.push(['Reference', meeting.reference || ''].map(csvCell).join(','));
  lines.push(['Projet', meeting.project ? `${meeting.project.code} - ${meeting.project.title}` : ''].map(csvCell).join(','));
  lines.push(['Type', meetingTypeLabel(meeting.type)].map(csvCell).join(','));
  lines.push(['Statut', meetingStatusLabel(meeting.status)].map(csvCell).join(','));
  lines.push(['Date debut', fmtDateTime(meeting.date)].map(csvCell).join(','));
  lines.push(['Date fin', fmtDateTime(meeting.end_date)].map(csvCell).join(','));
  lines.push(['Lieu', meeting.location || ''].map(csvCell).join(','));
  lines.push(['Agenda', (meeting.agenda || '').replace(/\n/g, ' ')].map(csvCell).join(','));
  lines.push(['Compte-rendu', (meeting.minutes || '').replace(/\n/g, ' ')].map(csvCell).join(','));
  lines.push(['Conclusions', (meeting.conclusion || '').replace(/\n/g, ' ')].map(csvCell).join(','));
  lines.push('');
  lines.push(['Participants'].map(csvCell).join(','));
  lines.push(['Nom', 'Role', 'Entreprise', 'Statut'].map(csvCell).join(','));
  attendees.forEach((a) => {
    lines.push([
      a.user ? `${a.user.firstname} ${a.user.lastname}` : (a.name || ''),
      a.role_title || '',
      a.company || '',
      a.status || '',
    ].map(csvCell).join(','));
  });
  lines.push('');
  lines.push(['Points d\'action'].map(csvCell).join(','));
  lines.push(['Sujet', 'Responsable', 'Ticket GLPI', 'Echeance', 'Statut', 'Commentaire'].map(csvCell).join(','));
  actions.forEach((a) => {
    lines.push([
      a.subject || '',
      a.responsible ? `${a.responsible.firstname} ${a.responsible.lastname}` : (a.responsible_name || ''),
      a.glpiTicket ? (a.glpiTicket.ticket_number || `GLPI #${a.glpiTicket.glpi_id}`) : '',
      fmtDate(a.due_date),
      a.status || '',
      (a.comment || '').replace(/\n/g, ' '),
    ].map(csvCell).join(','));
  });

  return lines.join('\r\n');
}

export class MeetingController {

  // ─── MEETINGS ────────────────────────────────────────────────────────────

  // GET /meetings
  static async list(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllMeetings(req);
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.lot_id)     filters.lot_id     = Number(req.query.lot_id);
      if (req.query.type)       filters.type       = req.query.type as string;
      if (req.query.status)     filters.status     = req.query.status as string;
      if (!hasReadAll)          filters.created_by = user.id;

      const meetings = await MeetingService.listMeetings(filters);
      res.json(meetings);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /meetings/:id
  static async getById(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllMeetings(req);
      const meeting = await MeetingService.getMeetingByIdForTenantScoped(
        Number(req.params.id),
        hasReadAll ? undefined : user.id
      );
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      res.json(meeting);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /meetings/:id/pdf
  static async generatePdf(req: Request, res: Response) {
    let browser: BrowserLike | null = null;
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: 'Identifiant invalide.' });
        return;
      }

      const puppeteer = await getPuppeteer();
      if (!puppeteer) {
        res.status(503).json({ error: 'Generation PDF indisponible: moteur PDF non disponible.' });
        return;
      }

      const meeting = await MeetingService.getMeetingByIdForTenant(id);
      if (!meeting) {
        res.status(404).json({ error: 'Reunion introuvable.' });
        return;
      }

      const logoDataUrl = await getCompanyLogoDataUrl();
      const html = buildMeetingHtml(meeting, logoDataUrl);
      const fileName = `${(meeting.reference || `CR-${meeting.id}`).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(process.env.PUPPETEER_EXECUTABLE_PATH && { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }),
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      await page.close();

      const pdfBuffer = Buffer.from(pdfBytes);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Impossible de generer le PDF.' });
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  // GET /meetings/:id/excel
  static async exportExcel(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: 'Identifiant invalide.' });
        return;
      }

      const meeting = await MeetingService.getMeetingByIdForTenant(id);
      if (!meeting) {
        res.status(404).json({ error: 'Reunion introuvable.' });
        return;
      }

      const csv = buildMeetingCsv(meeting);
      const fileName = `${(meeting.reference || `CR-${meeting.id}`).replace(/[^a-zA-Z0-9-_]/g, '_')}.csv`;
      const BOM = '\uFEFF';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(BOM + csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Impossible d'exporter le fichier Excel." });
    }
  }

  // POST /meetings
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;

      const meeting = await MeetingService.createMeeting({
        project_id:            Number(body.project_id),
        lot_id:                body.lot_id             ? Number(body.lot_id)          : undefined,
        title:                 body.title,
        type:                  body.type               ?? 'CHANTIER',
        date:                  new Date(body.date),
        end_date:              body.end_date           ? new Date(body.end_date)      : undefined,
        location:              body.location,
        status:                body.status             ?? 'PLANNED',
        agenda:                body.agenda,
        minutes:               body.minutes,
        conclusion:            body.conclusion,
        next_meeting_date:     body.next_meeting_date  ? new Date(body.next_meeting_date) : undefined,
        next_meeting_location: body.next_meeting_location,
        distribution_list:     body.distribution_list,
        created_by:            user!.id,
      });

      res.status(201).json(meeting);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /meetings/:id
  static async update(req: Request, res: Response) {
    try {
      const body = req.body;
      const data: Record<string, any> = { ...body };
      if (body.lot_id !== undefined) data.lot_id = body.lot_id ? Number(body.lot_id) : null;

      const meeting = await MeetingService.updateMeeting(Number(req.params.id), data);
      res.json(meeting);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /meetings/:id
  static async delete(req: Request, res: Response) {
    try {
      await MeetingService.deleteMeeting(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── ATTENDEES ───────────────────────────────────────────────────────────

  // GET /meetings/:id/attendees
  static async getAttendees(req: Request, res: Response) {
    try {
      const attendees = await MeetingService.getAttendees(Number(req.params.id));
      res.json(attendees);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /meetings/:id/attendees
  static async addAttendee(req: Request, res: Response) {
    try {
      const body = req.body;
      const attendee = await MeetingService.addAttendee({
        meeting_id: Number(req.params.id),
        user_id:    body.user_id    ? Number(body.user_id) : undefined,
        name:       body.name,
        status:     body.status     ?? 'INVITED',
        company:    body.company,
        role_title: body.role_title,
      });
      res.status(201).json(attendee);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /meetings/:id/attendees/:aid
  static async updateAttendee(req: Request, res: Response) {
    try {
      const { status, company, role_title, name } = req.body;
      const attendee = await MeetingService.updateAttendee(Number(req.params.aid), {
        status, company, role_title, name,
      });
      res.json(attendee);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /meetings/:id/attendees/:aid
  static async removeAttendee(req: Request, res: Response) {
    try {
      await MeetingService.removeAttendee(Number(req.params.aid));
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── ACTION ITEMS ────────────────────────────────────────────────────────

  // GET /meetings/:id/action-items
  static async getActionItems(req: Request, res: Response) {
    try {
      const items = await MeetingService.getActionItems(Number(req.params.id));
      res.json(items);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /meetings/:id/action-items
  static async createActionItem(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;

      const tenantId = TenantContext.getTenantId();
      if (!tenantId) return res.status(400).json({ error: 'Tenant session required' });

      const item = await MeetingService.createActionItem({
        meeting_id:       Number(req.params.id),
        tenant_id:        tenantId,
        subject:          body.subject,
        responsible_id:   body.responsible_id   ? Number(body.responsible_id) : undefined,
        responsible_name: body.responsible_name ?? undefined,
        glpi_ticket_id:   body.glpi_ticket_id   ? Number(body.glpi_ticket_id) : undefined,
        due_date:         body.due_date          ? new Date(body.due_date)     : undefined,
        status:           body.status            ?? 'OPEN',
        comment:          body.comment,
        created_by:       user!.id,
      });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /meetings/:id/action-items/:aiid
  static async updateActionItem(req: Request, res: Response) {
    try {
      const body = req.body;
      const item = await MeetingService.updateActionItem(Number(req.params.aiid), {
        subject:          body.subject,
        responsible_id:   body.responsible_id !== undefined
          ? (body.responsible_id ? Number(body.responsible_id) : null)
          : undefined,
        responsible_name: body.responsible_name !== undefined ? (body.responsible_name || null) : undefined,
        glpi_ticket_id:   body.glpi_ticket_id !== undefined
          ? (body.glpi_ticket_id ? Number(body.glpi_ticket_id) : null)
          : undefined,
        due_date:         body.due_date ? new Date(body.due_date) : body.due_date === null ? null : undefined,
        status:           body.status,
        comment:          body.comment,
      });
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /meetings/:id/action-items/:aiid
  static async deleteActionItem(req: Request, res: Response) {
    try {
      await MeetingService.deleteActionItem(Number(req.params.aiid));
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
