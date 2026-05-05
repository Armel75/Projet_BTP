import { Request, Response } from 'express';
import { IncidentService } from '../services/incident.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

// ── Puppeteer (dynamic — même pattern que work-acceptance) ────────────────────
type PdfPageLike = {
  setContent: (html: string, opts?: Record<string, unknown>) => Promise<void>;
  pdf: (opts?: Record<string, unknown>) => Promise<Buffer>;
  close: () => Promise<void>;
};
type BrowserLike = { newPage: () => Promise<PdfPageLike>; close: () => Promise<void>; };
type PuppeteerLike = { launch: (opts?: Record<string, unknown>) => Promise<BrowserLike>; };

let _puppeteerLoader: Promise<PuppeteerLike | null> | null = null;
async function getPuppeteer(): Promise<PuppeteerLike | null> {
  if (!_puppeteerLoader) {
    _puppeteerLoader = (async () => {
      try {
        const mod = await import('puppeteer');
        const c = (mod as any).default ?? mod;
        return c && typeof c.launch === 'function' ? (c as PuppeteerLike) : null;
      } catch { return null; }
    })();
  }
  return _puppeteerLoader;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-FR');
}
function fmtMoney(n?: number | null): string {
  if (n == null) return '—';
  return `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA`;
}
function esc(v?: string | null): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function nl2br(v?: string | null): string { return esc(v).replace(/\n/g, '<br/>'); }

const TYPE_LABELS: Record<string, string> = {
  SAFETY: 'Sécurité', QUALITY: 'Qualité', DELAY: 'Délai',
  TECHNICAL: 'Technique', ENVIRONMENTAL: 'Environnement',
};
const SEV_LABELS: Record<string, string> = {
  LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Élevé', CRITICAL: 'Critique',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouvert', IN_PROGRESS: 'En cours', RESOLVED: 'Résolu', CLOSED: 'Clôturé',
};

function buildIncidentHtml(inc: any): string {
  const refNum = `INC-${String(inc.id).padStart(4, '0')}`;
  const title  = esc(inc.title || inc.description?.substring(0, 80) || refNum);
  const assignedTo = inc.assignedTo
    ? esc(`${inc.assignedTo.firstname} ${inc.assignedTo.lastname}`)
    : '—';
  const createdBy = inc.createdBy
    ? esc(`${inc.createdBy.firstname} ${inc.createdBy.lastname}`)
    : '—';
  const project = inc.project
    ? esc(`${inc.project.code} — ${inc.project.title}`)
    : '—';
  const lot = inc.lot ? esc(`Lot ${inc.lot.lot_number} — ${inc.lot.name}`) : '—';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.5px; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 14px; }
    .company-block { font-size: 10px; color: #475569; text-align: right; line-height: 1.6; }
    .company-name  { font-size: 13px; font-weight: 900; color: #0f172a; }
    .doc-title     { font-size: 15px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .4px; color: #1d4ed8; margin-bottom: 2px; }
    .doc-ref       { font-size: 11px; font-weight: 700; color: #0f172a; }

    /* Table grille */
    table.grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.grid td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    table.grid td.lbl { width: 22%; background: #f1f5f9; font-weight: 700; font-size: 10.5px; color: #475569; }
    table.grid td.val { font-size: 11px; font-weight: 600; color: #0f172a; }

    /* Sections */
    .section { margin-bottom: 12px; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .6px; color: #1d4ed8; border-bottom: 1.5px solid #bfdbfe;
      padding-bottom: 3px; margin-bottom: 6px; }
    .text-block { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px;
      background: #f8fafc; min-height: 40px; font-size: 11px; line-height: 1.5;
      white-space: pre-wrap; word-break: break-word; }
    .text-block.orange { background: #fffbeb; border-color: #fcd34d; }
    .text-block.blue   { background: #eff6ff; border-color: #bfdbfe; }

    /* Severity badge inline */
    .sev { display: inline-block; padding: 1px 8px; border-radius: 12px; font-weight: 800; font-size: 10px; }
    .sev-LOW      { background: #f1f5f9; color: #64748b; }
    .sev-MEDIUM   { background: #fef3c7; color: #b45309; }
    .sev-HIGH     { background: #ffedd5; color: #c2410c; }
    .sev-CRITICAL { background: #fee2e2; color: #b91c1c; }

    /* Signature zone */
    .sig-row { display: flex; gap: 8px; margin-top: 8px; }
    .sig-cell { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px;
      text-align: center; }
    .sig-label { font-size: 9px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .5px; color: #64748b; margin-bottom: 22px; }
    .sig-line  { border-top: 1px solid #94a3b8; padding-top: 4px;
      font-size: 9px; color: #94a3b8; }

    /* Footer */
    .footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 5px;
      display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }

    /* Note réglementaire */
    .note { font-size: 9.5px; color: #dc2626; font-style: italic; margin-bottom: 10px; }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="page-header">
    <div>
      <div class="doc-title">Fiche de Déclaration d'Incident</div>
      <div class="doc-ref">${refNum}</div>
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
      <td class="val">${project}</td>
      <td class="lbl">Lot / Zone</td>
      <td class="val">${lot}</td>
    </tr>
    <tr>
      <td class="lbl">Date de l'incident</td>
      <td class="val">${fmtDate(inc.incident_date)}</td>
      <td class="lbl">Date de résolution</td>
      <td class="val">${fmtDate(inc.resolved_at)}</td>
    </tr>
    <tr>
      <td class="lbl">Responsable assigné</td>
      <td class="val">${assignedTo}</td>
      <td class="lbl">Déclaré par</td>
      <td class="val">${createdBy}</td>
    </tr>
    <tr>
      <td class="lbl">Statut</td>
      <td class="val">${esc(STATUS_LABELS[inc.status] ?? inc.status)}</td>
      <td class="lbl">Priorité / Sévérité</td>
      <td class="val"><span class="sev sev-${inc.severity}">${esc(SEV_LABELS[inc.severity] ?? inc.severity)}</span></td>
    </tr>
    <tr>
      <td class="lbl">Catégorie incident</td>
      <td class="val">${esc(TYPE_LABELS[inc.type] ?? inc.type)}</td>
      <td class="lbl">Processus impacté</td>
      <td class="val">${inc.task ? esc(inc.task.title) : '—'}</td>
    </tr>
    <tr>
      <td class="lbl">Localisation chantier</td>
      <td class="val" colspan="3">${esc(inc.location)}</td>
    </tr>
    <tr>
      <td class="lbl">Impact financier</td>
      <td class="val">${fmtMoney(inc.cost_impact)}</td>
      <td class="lbl">Impact planning</td>
      <td class="val">${inc.delay_impact_days != null ? `${inc.delay_impact_days} jour(s)` : '—'}</td>
    </tr>
  </table>

  <p class="note">NB : Les incidents critiques ou à impact financier doivent être signés par le responsable HSE et le chef de projet.</p>

  <!-- Description -->
  <div class="section">
    <div class="section-title">Déclaration de l'incident (Description)</div>
    <div class="text-block">${nl2br(inc.description)}</div>
  </div>

  <!-- Causes racines -->
  <div class="section">
    <div class="section-title">Analyse des causes racines (REX / Prévention)</div>
    <div class="text-block orange">${nl2br(inc.root_cause) || '—'}</div>
  </div>

  <!-- Action corrective -->
  <div class="section">
    <div class="section-title">Action corrective mise en place</div>
    <div class="text-block blue">${nl2br(inc.corrective_action) || '—'}</div>
  </div>

  <!-- Signatures -->
  <div class="section">
    <div class="section-title">Visas et signatures</div>
    <div class="sig-row">
      <div class="sig-cell"><div class="sig-label">Visa Constatateur</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Visa Responsable Sce/Site</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Visa REX</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Visa REXA</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Visa Resp. RH</div><div class="sig-line">Signature</div></div>
      <div class="sig-cell"><div class="sig-label">Visa RACI</div><div class="sig-line">Signature</div></div>
    </div>
  </div>

  <div class="footer">
    <span>Fiche incident #${inc.id} — ${refNum}</span>
    <span>Généré le ${esc(new Date().toLocaleString('fr-FR'))}</span>
  </div>

</body>
</html>`;
}

function buildIncidentExcelCsv(inc: any): string {
  const refNum = `INC-${String(inc.id).padStart(4, '0')}`;
  const lines: string[] = [
    `"FICHE D'INCIDENT","${refNum}"`,
    '',
    '"Champ","Valeur"',
    `"Référence","${refNum}"`,
    `"Titre","${(inc.title ?? '').replace(/"/g, '""')}"`,
    `"Projet","${inc.project ? `${inc.project.code} — ${inc.project.title}` : ''}".replace(/"/g, '""')`,
    `"Lot","${inc.lot ? `Lot ${inc.lot.lot_number} — ${inc.lot.name}` : ''}"`,
    `"Type","${TYPE_LABELS[inc.type] ?? inc.type}"`,
    `"Sévérité","${SEV_LABELS[inc.severity] ?? inc.severity}"`,
    `"Statut","${STATUS_LABELS[inc.status] ?? inc.status}"`,
    `"Date incident","${inc.incident_date ? new Date(inc.incident_date).toLocaleDateString('fr-FR') : ''}"`,
    `"Date résolution","${inc.resolved_at ? new Date(inc.resolved_at).toLocaleDateString('fr-FR') : ''}"`,
    `"Localisation","${(inc.location ?? '').replace(/"/g, '""')}"`,
    `"Responsable assigné","${inc.assignedTo ? `${inc.assignedTo.firstname} ${inc.assignedTo.lastname}` : ''}"`,
    `"Déclaré par","${inc.createdBy ? `${inc.createdBy.firstname} ${inc.createdBy.lastname}` : ''}"`,
    `"Impact financier (FCFA)","${inc.cost_impact ?? ''}"`,
    `"Impact planning (jours)","${inc.delay_impact_days ?? ''}"`,
    `"Description","${(inc.description ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"Causes racines","${(inc.root_cause ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"Action corrective","${(inc.corrective_action ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"Créé le","${new Date(inc.created_at).toLocaleString('fr-FR')}"`,
  ];
  return lines.join('\r\n');
}

export class IncidentController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const incident = await IncidentService.createIncident({
        ...body,
        project_id:       Number(body.project_id),
        task_id:          body.task_id          ? Number(body.task_id)          : undefined,
        lot_id:           body.lot_id           ? Number(body.lot_id)           : undefined,
        assigned_to_id:   body.assigned_to_id   ? Number(body.assigned_to_id)   : undefined,
        cost_impact:      body.cost_impact      ? Number(body.cost_impact)      : undefined,
        delay_impact_days: body.delay_impact_days ? Number(body.delay_impact_days) : undefined,
        incident_date:    body.incident_date    ? new Date(body.incident_date)  : undefined,
        created_by:       user!.id
      });
      res.status(201).json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.status)     filters.status     = req.query.status as string;
      if (req.query.severity)   filters.severity   = req.query.severity as string;
      if (req.query.type)       filters.type       = req.query.type as string;

      const incidents = await IncidentService.getIncidents(filters);
      res.json(incidents);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const incident = await IncidentService.getIncidentById(Number(req.params.id));
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const body = req.body;
      const data: Record<string, any> = { ...body };
      if (body.resolved_at)     data.resolved_at     = new Date(body.resolved_at);
      if (body.incident_date)   data.incident_date   = new Date(body.incident_date);
      if (body.assigned_to_id !== undefined) data.assigned_to_id = body.assigned_to_id ? Number(body.assigned_to_id) : null;
      if (body.cost_impact      !== undefined) data.cost_impact      = body.cost_impact      ? Number(body.cost_impact)      : null;
      if (body.delay_impact_days !== undefined) data.delay_impact_days = body.delay_impact_days ? Number(body.delay_impact_days) : null;

      const incident = await IncidentService.updateIncident(Number(req.params.id), data);
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const archived = await IncidentService.archiveIncident(Number(req.params.id));
      res.json(archived);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
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
        res.status(503).json({ error: 'Génération PDF indisponible sur ce serveur.' });
        return;
      }

      const inc = await IncidentService.getIncidentByIdForTenant(id);
      if (!inc) {
        res.status(404).json({ error: 'Incident introuvable.' });
        return;
      }

      const html     = buildIncidentHtml(inc);
      const refNum   = `INC-${String(inc.id).padStart(4, '0')}`;
      const fileName = `${refNum}.pdf`;

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
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Impossible de générer le PDF.' });
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  // ── Excel (CSV) ────────────────────────────────────────────────────────────
  static async exportExcel(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: 'Identifiant invalide.' });
        return;
      }

      const inc = await IncidentService.getIncidentByIdForTenant(id);
      if (!inc) {
        res.status(404).json({ error: 'Incident introuvable.' });
        return;
      }

      const refNum   = `INC-${String(inc.id).padStart(4, '0')}`;
      const fileName = `${refNum}.csv`;
      const csv      = buildIncidentExcelCsv(inc);

      // UTF-8 BOM pour compatibilité Excel
      const BOM = '\uFEFF';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(BOM + csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Impossible d'exporter." });
    }
  }
}
