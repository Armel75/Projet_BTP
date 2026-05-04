import { Request, Response } from 'express';
import { InspectionService } from '../services/inspection.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

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

async function getPuppeteer(): Promise<PuppeteerLike | null> {
  if (!puppeteerLoader) {
    puppeteerLoader = (async () => {
      try {
        const mod = await import('puppeteer');
        const candidate = (mod as any).default ?? mod;
        if (candidate && typeof candidate.launch === 'function') {
          return candidate as PuppeteerLike;
        }
        return null;
      } catch {
        return null;
      }
    })();
  }

  return puppeteerLoader;
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

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('fr-FR');
}

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  DAILY: 'Quotidienne',
  HOLD_POINT: "Point d'arret",
  WITNESS_POINT: 'Point de temoignage',
  FINAL: 'Reception finale',
};

const INSPECTION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programmee',
  IN_PROGRESS: 'En cours',
  PASSED: 'Validee',
  FAILED: 'Echouee',
};

function buildInspectionHtml(inspection: any): string {
  const fileRef = `INSP-${String(inspection.id).padStart(4, '0')}`;
  const passCount = (inspection.items ?? []).filter((i: any) => i.result === 'PASS').length;
  const failCount = (inspection.items ?? []).filter((i: any) => i.result === 'FAIL').length;
  const ratedItems = (inspection.items ?? []).filter((i: any) => i.result === 'PASS' || i.result === 'FAIL').length;
  const score = ratedItems > 0 ? Math.round((passCount / ratedItems) * 100) : null;

  const rows = (inspection.items ?? [])
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((item: any, idx: number) => {
      const resultLabel = item.result === 'PASS' ? 'Conforme' : item.result === 'FAIL' ? 'Non conforme' : 'Sans objet';
      const resultClass = item.result === 'PASS' ? 'ok' : item.result === 'FAIL' ? 'ko' : 'na';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${esc(item.category || 'General')}</td>
          <td>${esc(item.description)}</td>
          <td class="${resultClass}">${resultLabel}</td>
          <td>${nl2br(item.comment) || '—'}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .header { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
    .title { font-size: 16px; font-weight: 900; margin: 0; letter-spacing: .2px; }
    .sub { margin-top: 2px; color: #475569; font-size: 11px; }
    .meta { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .meta-card { border: 1px solid #dbe5f0; border-radius: 6px; padding: 7px 8px; }
    .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; }
    .val { font-size: 11px; font-weight: 600; margin-top: 2px; }
    .section-title { margin: 10px 0 6px; font-size: 11px; text-transform: uppercase; font-weight: 900; color: #0f172a; }
    .block { border: 1px solid #dbe5f0; border-radius: 6px; padding: 8px 9px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dbe5f0; padding: 6px 7px; vertical-align: top; }
    th { background: #f8fafc; font-size: 9px; text-transform: uppercase; color: #475569; letter-spacing: .3px; }
    td.ok { color: #047857; font-weight: 700; }
    td.ko { color: #b91c1c; font-weight: 700; }
    td.na { color: #64748b; font-weight: 700; }
    .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
    .kpi .meta-card { text-align: center; }
    .footer { margin-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #dbe5f0; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">Rapport d'inspection chantier</h1>
    <div class="sub">Reference ${fileRef}</div>
    <div class="meta">
      <div class="meta-card"><div class="lbl">Inspection</div><div class="val">${esc(inspection.title || fileRef)}</div></div>
      <div class="meta-card"><div class="lbl">Projet</div><div class="val">${esc(inspection.project ? `${inspection.project.code} - ${inspection.project.title}` : '—')}</div></div>
      <div class="meta-card"><div class="lbl">Type</div><div class="val">${esc(INSPECTION_TYPE_LABELS[inspection.type] ?? inspection.type)}</div></div>
      <div class="meta-card"><div class="lbl">Statut</div><div class="val">${esc(INSPECTION_STATUS_LABELS[inspection.status] ?? inspection.status)}</div></div>
      <div class="meta-card"><div class="lbl">Date planifiee</div><div class="val">${fmtDate(inspection.scheduled_date)}</div></div>
      <div class="meta-card"><div class="lbl">Date realisee</div><div class="val">${fmtDate(inspection.completed_date)}</div></div>
      <div class="meta-card"><div class="lbl">Controleur</div><div class="val">${esc(inspection.inspector ? `${inspection.inspector.firstname} ${inspection.inspector.lastname}` : '—')}</div></div>
      <div class="meta-card"><div class="lbl">Lot</div><div class="val">${esc(inspection.lot ? `Lot ${inspection.lot.lot_number} - ${inspection.lot.name}` : '—')}</div></div>
    </div>
    <div class="kpi">
      <div class="meta-card"><div class="lbl">Points controles</div><div class="val">${inspection.items?.length ?? 0}</div></div>
      <div class="meta-card"><div class="lbl">Conformes</div><div class="val">${passCount}</div></div>
      <div class="meta-card"><div class="lbl">Non conformes</div><div class="val">${failCount}</div></div>
      <div class="meta-card"><div class="lbl">Score</div><div class="val">${score == null ? '—' : `${score}%`}</div></div>
    </div>
  </div>

  ${inspection.description ? `
    <div class="section-title">Perimetre et contexte</div>
    <div class="block">${nl2br(inspection.description)}</div>
  ` : ''}

  <div class="section-title">Checklist d'inspection</div>
  <table>
    <thead>
      <tr>
        <th style="width: 6%;">#</th>
        <th style="width: 16%;">Categorie</th>
        <th style="width: 42%;">Point de controle</th>
        <th style="width: 14%;">Resultat</th>
        <th style="width: 22%;">Commentaire</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">Aucun point de controle.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>${fileRef}</span>
    <span>Genere le ${esc(new Date().toLocaleString('fr-FR'))}</span>
  </div>
</body>
</html>
  `;
}

export class InspectionController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const inspection = await InspectionService.createInspection({
        ...req.body,
        project_id:    Number(req.body.project_id),
        lot_id:        req.body.lot_id        ? Number(req.body.lot_id)        : undefined,
        checklist_template_id: req.body.checklist_template_id ? Number(req.body.checklist_template_id) : undefined,
        inspector_id:  req.body.inspector_id  ? Number(req.body.inspector_id)  : undefined,
        scheduled_date: req.body.scheduled_date ? new Date(req.body.scheduled_date) : undefined,
        date_scheduled: req.body.date_scheduled ? new Date(req.body.date_scheduled) : undefined,
        evidence_photos_required: req.body.evidence_photos_required === true || req.body.evidence_photos_required === 'true',
        rework_required: req.body.rework_required === true || req.body.rework_required === 'true',
        created_by: user!.id,
      });
      res.status(201).json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id)   filters.project_id   = Number(req.query.project_id);
      if (req.query.status)       filters.status        = req.query.status as string;
      if (req.query.type)         filters.type          = req.query.type as string;
      if (req.query.approval_workflow_status) filters.approval_workflow_status = req.query.approval_workflow_status as string;
      if (req.query.inspection_result) filters.inspection_result = req.query.inspection_result as string;
      if (req.query.inspector_id) filters.inspector_id  = Number(req.query.inspector_id);
      if (req.query.created_by)   filters.created_by    = Number(req.query.created_by);
      if (req.query.rework_required !== undefined) filters.rework_required = req.query.rework_required === 'true';

      const inspections = await InspectionService.getInspections(filters);
      res.json(inspections);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const inspection = await InspectionService.getInspectionById(Number(req.params.id));
      if (!inspection) return res.status(404).json({ error: "Inspection not found" });
      res.json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const inspection = await InspectionService.updateInspection(Number(req.params.id), {
        ...req.body,
        lot_id:         req.body.lot_id        !== undefined ? (req.body.lot_id        ? Number(req.body.lot_id)       : null) : undefined,
        checklist_template_id: req.body.checklist_template_id !== undefined ? (req.body.checklist_template_id ? Number(req.body.checklist_template_id) : null) : undefined,
        inspector_id:   req.body.inspector_id  !== undefined ? (req.body.inspector_id  ? Number(req.body.inspector_id) : null) : undefined,
        scheduled_date: req.body.scheduled_date ? new Date(req.body.scheduled_date) : undefined,
        date_scheduled: req.body.date_scheduled ? new Date(req.body.date_scheduled) : undefined,
        completed_date: req.body.completed_date ? new Date(req.body.completed_date) : undefined,
        evidence_photos_required: req.body.evidence_photos_required !== undefined ? (req.body.evidence_photos_required === true || req.body.evidence_photos_required === 'true') : undefined,
        rework_required: req.body.rework_required !== undefined ? (req.body.rework_required === true || req.body.rework_required === 'true') : undefined,
      });
      res.json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await InspectionService.deleteInspection(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

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

      const inspection = await InspectionService.getInspectionByIdForTenant(id);
      if (!inspection) {
        res.status(404).json({ error: 'Inspection introuvable.' });
        return;
      }

      const html = buildInspectionHtml(inspection);
      const fileName = `INSP-${String(inspection.id).padStart(4, '0')}.pdf`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      await page.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Impossible de generer le PDF.' });
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
