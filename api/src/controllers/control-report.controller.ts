import { Request, Response } from 'express';
import fs from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { RbacService } from '../services/rbac.service.js';
import { ControlReportService } from '../services/control-report.service.js';
import { TenantContext } from '../config/tenant-context.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UPLOADS_ROOT } from '../middlewares/upload.middleware.js';

async function canReadAllControlReports(req: Request): Promise<boolean> {
  const user = (req as AuthRequest).user;
  if (!user?.id) return false;

  if (Array.isArray(user.permissions) && user.permissions.includes('control-report:read:all')) {
    return true;
  }

  const permissions = await RbacService.getUserPermissions(user.id);
  return permissions.includes('control-report:read:all');
}

// ── Puppeteer (même pattern que incident.controller) ─────────────────────────
type PdfPageLike = {
  setContent: (html: string, opts?: Record<string, unknown>) => Promise<void>;
  pdf: (opts?: Record<string, unknown>) => Promise<Buffer>;
  close: () => Promise<void>;
};
type BrowserLike = { newPage: () => Promise<PdfPageLike>; close: () => Promise<void>; };
type PuppeteerLike = { launch: (opts?: Record<string, unknown>) => Promise<BrowserLike>; };

let _crPuppeteerLoader: Promise<PuppeteerLike | null> | null = null;
async function getCRPuppeteer(): Promise<PuppeteerLike | null> {
  if (!_crPuppeteerLoader) {
    _crPuppeteerLoader = (async () => {
      try {
        const mod = await import('puppeteer');
        const c = (mod as any).default ?? mod;
        return c && typeof c.launch === 'function' ? (c as PuppeteerLike) : null;
      } catch { return null; }
    })();
  }
  return _crPuppeteerLoader;
}

// ── Logo SOREPCO ──────────────────────────────────────────────────────────────
const CR_LOGO_DATA_URI: string | null = (() => {
  try {
    const logoUrl = new URL('../../assets/branding/logo.png', import.meta.url);
    const logoBuffer = readFileSync(logoUrl);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    return null;
  }
})();

// ── Helpers PDF ───────────────────────────────────────────────────────────────
function crEsc(v?: string | null): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function crNl2br(v?: string | null): string { return crEsc(v).replace(/\n/g, '<br/>'); }
function crFmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR');
}

const CR_TYPE_LABELS: Record<string, string> = {
  QUALITY: 'Qualité', SAFETY: 'Sécurité', COMPLIANCE: 'Conformité', TECHNICAL: 'Technique',
};
const CR_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', OPEN: 'Ouvert', UNDER_REVIEW: 'En révision',
  ACTION_REQUIRED: 'Action requise', RESOLVED: 'Résolu',
  APPROVED: 'Approuvé', REJECTED: 'Rejeté', CLOSED: 'Clôturé',
};
const CR_SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Élevé', CRITICAL: 'Critique',
};
const CR_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible', MEDIUM: 'Normale', HIGH: 'Haute', URGENT: 'Urgente',
};
const CR_ACTION_TYPE_LABELS: Record<string, string> = {
  CORRECTIVE: 'Corrective', PREVENTIVE: 'Préventive', VERIFICATION: 'Vérification',
};
const CR_ACTION_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouverte', IN_PROGRESS: 'En cours', DONE: 'Terminée', CANCELLED: 'Annulée',
};

function buildControlReportHtml(cr: any): string {
  const ref = crEsc(cr.reference ?? `CR-${cr.id}`);
  const title = crEsc(cr.title || cr.comment?.substring(0, 80) || ref);
  const project = cr.project ? crEsc(`${cr.project.code} — ${cr.project.title}`) : '—';
  const lot = cr.lot ? crEsc(`Lot ${cr.lot.lot_number} — ${cr.lot.name}`) : '—';
  const task = cr.task ? crEsc(cr.task.title) : '—';
  const createdBy = cr.createdBy ? crEsc(`${cr.createdBy.firstname} ${cr.createdBy.lastname}`) : '—';
  const approvedBy = cr.approvedBy ? crEsc(`${cr.approvedBy.firstname} ${cr.approvedBy.lastname}`) : '—';

  const sevClass: Record<string, string> = {
    LOW: 'sev-LOW', MEDIUM: 'sev-MEDIUM', HIGH: 'sev-HIGH', CRITICAL: 'sev-CRITICAL',
  };

  const actionsRows = Array.isArray(cr.actions) && cr.actions.length > 0
    ? cr.actions.map((a: any, i: number) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${crEsc(a.subject)}</td>
        <td>${crEsc(CR_ACTION_TYPE_LABELS[a.action_type] ?? a.action_type)}</td>
        <td>${crEsc(a.responsible ? `${a.responsible.firstname} ${a.responsible.lastname}` : a.owner_name || '—')}</td>
        <td style="text-align:center;">${crFmtDate(a.due_date)}</td>
        <td style="text-align:center;">${crEsc(CR_ACTION_STATUS_LABELS[a.status] ?? a.status)}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;font-style:italic;">Aucune action corrective</td></tr>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.5px; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 14px; }
    .brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
    .logo-wrap { width: 44px; height: 44px; border-radius: 10px; border: 1px solid #bfdbfe;
      display: flex; align-items: center; justify-content: center; background: #eff6ff;
      overflow: hidden; flex-shrink: 0; }
    .logo-wrap img { max-width: 34px; max-height: 34px; display: block; object-fit: contain; }
    .company-block { font-size: 10px; color: #475569; text-align: right; line-height: 1.6; }
    .company-name  { font-size: 13px; font-weight: 900; color: #0f172a; }
    .doc-title     { font-size: 15px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .4px; color: #1d4ed8; margin-bottom: 2px; }
    .doc-ref       { font-size: 11px; font-weight: 700; color: #0f172a; }

    table.grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.grid td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    table.grid td.lbl { width: 22%; background: #f1f5f9; font-weight: 700; font-size: 10.5px; color: #475569; }
    table.grid td.val { font-size: 11px; font-weight: 600; color: #0f172a; }

    .section { margin-bottom: 12px; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .6px; color: #1d4ed8; border-bottom: 1.5px solid #bfdbfe;
      padding-bottom: 3px; margin-bottom: 6px; }
    .text-block { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px;
      background: #f8fafc; min-height: 36px; font-size: 11px; line-height: 1.5;
      white-space: pre-wrap; word-break: break-word; }
    .text-block.amber  { background: #fffbeb; border-color: #fcd34d; }
    .text-block.green  { background: #f0fdf4; border-color: #86efac; }
    .text-block.blue   { background: #eff6ff; border-color: #bfdbfe; }

    .sev { display: inline-block; padding: 1px 8px; border-radius: 12px; font-weight: 800; font-size: 10px; }
    .sev-LOW      { background: #f1f5f9; color: #64748b; }
    .sev-MEDIUM   { background: #fef3c7; color: #b45309; }
    .sev-HIGH     { background: #ffedd5; color: #c2410c; }
    .sev-CRITICAL { background: #fee2e2; color: #b91c1c; }

    table.actions-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.actions-table th { background: #1e40af; color: #fff; padding: 5px 7px;
      font-weight: 700; text-align: left; }
    table.actions-table td { border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: top; }
    table.actions-table tr:nth-child(even) td { background: #f8fafc; }

    .sig-row { display: flex; gap: 8px; margin-top: 8px; }
    .sig-cell { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px;
      text-align: center; }
    .sig-label { font-size: 9px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .5px; color: #64748b; margin-bottom: 22px; }
    .sig-line  { border-top: 1px solid #94a3b8; padding-top: 4px;
      font-size: 9px; color: #94a3b8; }

    .footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 5px;
      display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="page-header">
    <div class="header-left">
      <div class="brand-row">
        ${CR_LOGO_DATA_URI ? `<div class="logo-wrap"><img src="${CR_LOGO_DATA_URI}" alt="Logo SOREPCO"/></div>` : ''}
        <div class="doc-title">Rapport de Contrôle</div>
      </div>
      <div class="doc-ref">${ref}</div>
    </div>
    <div class="company-block">
      <div class="company-name">ERP BTP</div>
      Système de gestion de chantier<br/>
      Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

  <!-- Grille d'identification -->
  <table class="grid">
    <tr>
      <td class="lbl">Projet</td>
      <td class="val" colspan="3">${project}</td>
    </tr>
    <tr>
      <td class="lbl">Lot / Zone</td>
      <td class="val">${lot}</td>
      <td class="lbl">Tâche liée</td>
      <td class="val">${task}</td>
    </tr>
    <tr>
      <td class="lbl">Type</td>
      <td class="val">${crEsc(CR_TYPE_LABELS[cr.type] ?? cr.type)}</td>
      <td class="lbl">Statut</td>
      <td class="val">${crEsc(CR_STATUS_LABELS[cr.status] ?? cr.status)}</td>
    </tr>
    <tr>
      <td class="lbl">Sévérité</td>
      <td class="val"><span class="sev ${sevClass[cr.severity] ?? 'sev-MEDIUM'}">${crEsc(CR_SEVERITY_LABELS[cr.severity] ?? cr.severity)}</span></td>
      <td class="lbl">Priorité</td>
      <td class="val">${crEsc(CR_PRIORITY_LABELS[cr.priority] ?? cr.priority)}</td>
    </tr>
    <tr>
      <td class="lbl">Date du rapport</td>
      <td class="val">${crFmtDate(cr.report_date)}</td>
      <td class="lbl">Date d'échéance</td>
      <td class="val">${crFmtDate(cr.due_date)}</td>
    </tr>
    <tr>
      <td class="lbl">Date de résolution</td>
      <td class="val">${crFmtDate(cr.resolved_at)}</td>
      <td class="lbl">Date de clôture</td>
      <td class="val">${crFmtDate(cr.closed_at)}</td>
    </tr>
    <tr>
      <td class="lbl">Localisation</td>
      <td class="val">${crEsc(cr.location)}</td>
      <td class="lbl">Zone / Code</td>
      <td class="val">${crEsc(cr.zone_code)}</td>
    </tr>
    <tr>
      <td class="lbl">Créé par</td>
      <td class="val">${createdBy}</td>
      <td class="lbl">Approuvé par</td>
      <td class="val">${approvedBy}</td>
    </tr>
    ${cr.observed_by_name ? `<tr>
      <td class="lbl">Observateur</td>
      <td class="val">${crEsc(cr.observed_by_name)}</td>
      <td class="lbl">Société observateur</td>
      <td class="val">${crEsc(cr.observed_by_company)}</td>
    </tr>` : ''}
  </table>

  <!-- Titre / Observation -->
  <div class="section">
    <div class="section-title">Titre du rapport</div>
    <div class="text-block">${crNl2br(title)}</div>
  </div>

  <!-- Commentaire / Description -->
  <div class="section">
    <div class="section-title">Observation / Description</div>
    <div class="text-block">${crNl2br(cr.comment) || '—'}</div>
  </div>

  <!-- Cause racine -->
  <div class="section">
    <div class="section-title">Analyse des causes racines</div>
    <div class="text-block amber">${crNl2br(cr.root_cause) || '—'}</div>
  </div>

  <!-- Résumé actions correctives -->
  <div class="section">
    <div class="section-title">Résumé des actions correctives</div>
    <div class="text-block blue">${crNl2br(cr.corrective_action_summary) || '—'}</div>
  </div>

  <!-- Résumé actions préventives -->
  <div class="section">
    <div class="section-title">Résumé des actions préventives</div>
    <div class="text-block green">${crNl2br(cr.preventive_action_summary) || '—'}</div>
  </div>

  <!-- Tableau des actions -->
  <div class="section">
    <div class="section-title">Actions correctives / préventives (${Array.isArray(cr.actions) ? cr.actions.length : 0})</div>
    <table class="actions-table">
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th style="width:30%">Sujet</th>
          <th style="width:14%">Type</th>
          <th style="width:22%">Responsable</th>
          <th style="width:14%;text-align:center">Échéance</th>
          <th style="width:16%;text-align:center">Statut</th>
        </tr>
      </thead>
      <tbody>${actionsRows}</tbody>
    </table>
  </div>

  <!-- Résumé clôture -->
  ${cr.closure_summary ? `<div class="section">
    <div class="section-title">Résumé de clôture</div>
    <div class="text-block">${crNl2br(cr.closure_summary)}</div>
  </div>` : ''}

  <!-- Signatures -->
  <div class="section">
    <div class="section-title">Visas et signatures</div>
    <div class="sig-row">
      <div class="sig-cell"><div class="sig-label">Contrôleur / Inspecteur</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Responsable Qualité</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Chef de chantier</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Maître d'ouvrage</div><div class="sig-line">Signature</div></div>
    </div>
  </div>

  <div class="footer">
    <span>Rapport de contrôle ${ref}</span>
    <span>Pièces jointes : ${Array.isArray(cr.attachments) ? cr.attachments.length : 0} — Actions : ${Array.isArray(cr.actions) ? cr.actions.length : 0}</span>
    <span>Généré le ${new Date().toLocaleString('fr-FR')}</span>
  </div>

</body>
</html>`;
}

export class ControlReportController {
  private static resolveUser(req: Request): { id: number; tenant_id: number } {
    const requestUser = (req as AuthRequest).user;
    if (requestUser?.id && requestUser?.tenant_id) {
      return { id: Number(requestUser.id), tenant_id: Number(requestUser.tenant_id) };
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      throw new Error('Unauthorized');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const userId = Number(decoded?.id);
    const tenantId = Number(decoded?.tenant_id);
    if (!userId || !tenantId) {
      throw new Error('Unauthorized');
    }

    return { id: userId, tenant_id: tenantId };
  }

  private static runWithTenant<T>(req: Request, fn: () => Promise<T>): Promise<T> {
    const user = ControlReportController.resolveUser(req);
    return TenantContext.run(user.tenant_id, fn);
  }

  private static cleanupUploadedFile(file?: Express.Multer.File) {
    if (!file?.filename) return;
    const filePath = path.join(UPLOADS_ROOT, path.basename(file.filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  static async generatePdf(req: Request, res: Response) {
    let browser: BrowserLike | null = null;
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Identifiant invalide.' });
      }

      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllControlReports(req);
      const cr = await ControlReportController.runWithTenant(req, () =>
        ControlReportService.getControlReportByIdForTenantScoped(id, hasReadAll ? undefined : user.id)
      );
      if (!cr) {
        return res.status(404).json({ error: 'Rapport introuvable.' });
      }

      const puppeteer = await getCRPuppeteer();
      if (!puppeteer) {
        return res.status(503).json({ error: 'Génération PDF indisponible sur ce serveur.' });
      }

      const html     = buildControlReportHtml(cr);
      const fileName = `${(cr.reference ?? `CR-${cr.id}`).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;

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
      return res.status(200).send(pdfBuffer);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Impossible de générer le PDF.' });
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllControlReports(req);
      const filters: any = {
        project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
        lot_id: req.query.lot_id ? Number(req.query.lot_id) : undefined,
        task_id: req.query.task_id ? Number(req.query.task_id) : undefined,
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        severity: req.query.severity as string | undefined,
        priority: req.query.priority as string | undefined,
      };
      if (!hasReadAll) filters.created_by = user.id;

      const reports = await ControlReportService.listControlReports(filters);
      res.json(reports);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllControlReports(req);
      const report = await ControlReportService.getControlReportByIdForTenantScoped(
        Number(req.params.id),
        hasReadAll ? undefined : user.id
      );
      if (!report) return res.status(404).json({ error: 'Control report not found' });
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!req.body.project_id) return res.status(400).json({ error: 'project_id is required' });
      if (!req.body.comment) return res.status(400).json({ error: 'comment is required' });

      const report = await ControlReportService.createControlReport({
        ...req.body,
        created_by: user?.id,
      });

      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const report = await ControlReportService.updateControlReport(Number(req.params.id), {
        ...req.body,
        updated_by: user?.id,
      });
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const report = await ControlReportService.approve(Number(req.params.id), user.id);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!req.body.rejected_reason) {
        return res.status(400).json({ error: 'rejected_reason is required for rejection' });
      }

      const report = await ControlReportService.reject(Number(req.params.id), user.id, req.body.rejected_reason);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ControlReportService.deleteControlReport(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listActions(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reportId = Number(req.params.id);
      const hasReadAll = await canReadAllControlReports(req);
      
      const report = await ControlReportController.runWithTenant(req, () =>
        ControlReportService.getControlReportByIdForTenantScoped(reportId, hasReadAll ? undefined : user.id)
      );
      if (!report) {
        return res.status(404).json({ error: 'Rapport introuvable.' });
      }

      const actions = await ControlReportService.listActions(reportId);
      res.json(actions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createAction(req: Request, res: Response) {
    try {
      if (!req.body.subject) return res.status(400).json({ error: 'subject is required' });
      const action = await ControlReportService.createAction(Number(req.params.id), req.body);
      res.status(201).json(action);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateAction(req: Request, res: Response) {
    try {
      const action = await ControlReportService.updateAction(Number(req.params.actionId), req.body);
      res.json(action);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteAction(req: Request, res: Response) {
    try {
      await ControlReportService.deleteAction(Number(req.params.actionId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listAttachments(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reportId = Number(req.params.id);
      const hasReadAll = await canReadAllControlReports(req);
      
      const report = await ControlReportController.runWithTenant(req, () =>
        ControlReportService.getControlReportByIdForTenantScoped(reportId, hasReadAll ? undefined : user.id)
      );
      if (!report) {
        return res.status(404).json({ error: 'Rapport introuvable.' });
      }

      const attachments = await ControlReportService.listAttachments(reportId);
      res.json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createAttachment(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!req.body.url) return res.status(400).json({ error: 'url is required' });
      const attachment = await ControlReportService.createAttachment(Number(req.params.id), {
        ...req.body,
        uploaded_by: user?.id,
      });
      res.status(201).json(attachment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async uploadAttachmentFile(req: Request, res: Response) {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    try {
      const user = ControlReportController.resolveUser(req);
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Fichier(s) requis (field: files).' });
      }

      const sourceRaw = String(req.body?.source ?? '').toUpperCase();
      const reportId = Number(req.params.id);
      const results: any[] = [];
      for (const file of files) {
        const source = sourceRaw === 'PHOTO' || file.mimetype.startsWith('image/') ? 'PHOTO' : 'DOCUMENT';
        const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
        const fileName = files.length === 1 && req.body?.file_name ? req.body.file_name : file.originalname;
        const attachment = await ControlReportController.runWithTenant(req, () =>
          ControlReportService.createAttachment(reportId, {
            url: `/api/v1/control-reports/files/${file.filename}`,
            storage_key: file.filename,
            file_name: fileName,
            file_type: ext || null,
            mime_type: file.mimetype || null,
            file_size_bytes: file.size,
            source,
            caption: req.body?.caption || null,
            uploaded_by: user.id,
          })
        );
        results.push(attachment);
      }

      return res.status(201).json(results);
    } catch (error: any) {
      const files2 = (req as any).files as Express.Multer.File[] | undefined;
      (files2 ?? []).forEach(f => ControlReportController.cleanupUploadedFile(f));
      return res.status(400).json({ error: error.message });
    }
  }

  static async updateAttachment(req: Request, res: Response) {
    try {
      const attachment = await ControlReportService.updateAttachment(Number(req.params.attachmentId), req.body);
      res.json(attachment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteAttachment(req: Request, res: Response) {
    try {
      await ControlReportService.deleteAttachment(Number(req.params.attachmentId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async serveAttachmentFile(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const filename = req.params.filename;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      // Find attachment by storage_key to verify it exists and get parent report
      const attachment = await prisma.controlReportAttachment.findFirst({
        where: { storage_key: filename },
        include: { control_report: true },
      });

      if (!attachment) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (!attachment.control_report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Check user permission to access this report
      const hasReadAll = await canReadAllControlReports(req);
      if (!hasReadAll && attachment.control_report.created_by !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Serve the file
      const filePath = path.join(UPLOADS_ROOT, 'documents', filename);
      res.download(filePath, attachment.file_name || filename);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
