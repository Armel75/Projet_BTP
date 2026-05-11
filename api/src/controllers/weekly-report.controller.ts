import { Request, Response } from 'express';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { WeeklyReportService } from '../services/weekly-report.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { RbacService } from '../services/rbac.service.js';

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
        path.resolve(process.cwd(), '../web/public/logo.png'),
        path.resolve(process.cwd(), 'web/public/logo.png'),
        new URL('../../../web/public/logo.png', import.meta.url),
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

function escapeHtml(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nlToBr(value?: string | null): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function fmtDate(input?: string | Date | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

function fmtPct(input?: number | null): string {
  if (input == null || Number.isNaN(Number(input))) return '0%';
  return `${Number(input).toFixed(2)}%`;
}

function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis',
    APPROVED: 'Approuve',
  };
  return labels[status ?? ''] ?? (status || '—');
}

function buildPdfFooterTemplate(generatedAt: string): string {
  return `
    <div style="
      width: 100%;
      font-size: 9px;
      color: #64748b;
      padding: 0 10mm;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #d7deea;
      padding-top: 4px;
    ">
      <span>Edition du ${generatedAt}</span>
      <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `;
}

function buildWeeklyReportHtml(report: any, logoDataUrl?: string | null): string {
  const items = Array.isArray(report.items) ? report.items : [];
  const rows = items.length > 0
    ? items.map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.description || '—')}</td>
          <td>${item.task_id ? `Tache #${item.task_id}` : '—'}</td>
          <td>${fmtPct(item.weekly_progress)}</td>
          <td>${fmtPct(item.cumulative_progress)}</td>
          <td>${nlToBr(item.comment || '—')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="6">Aucun element detaille dans cette revue.</td></tr>';

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
          .header { border: 1px solid #d7deea; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
          .brand-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
          .brand-block { display: flex; align-items: center; gap: 12px; }
          .logo-wrap { width: 52px; height: 52px; border-radius: 14px; border: 1px solid #d7deea; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; }
          .logo-wrap img { max-width: 40px; max-height: 40px; display: block; }
          .brand { font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #64748b; font-weight: 800; }
          .brand-name { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .brand-meta { font-size: 11px; color: #475569; margin-top: 4px; }
          .title-row { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-top: 8px; }
          .title { font-size: 24px; font-weight: 800; margin: 0; }
          .subtitle { font-size: 12px; color: #334155; margin-top: 6px; }
          .status { display: inline-block; margin-top: 10px; padding: 4px 8px; border-radius: 999px; background: #fef3c7; color: #b45309; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .score { min-width: 150px; border: 1px solid #d7deea; border-radius: 10px; padding: 12px; text-align: right; }
          .score-label { font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #64748b; font-weight: 800; }
          .score-value { font-size: 28px; font-weight: 800; color: #0ea5e9; margin-top: 6px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .card { border: 1px solid #d7deea; border-radius: 10px; padding: 12px 14px; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: .7px; color: #64748b; font-weight: 800; margin-bottom: 4px; }
          .value { font-size: 13px; color: #0f172a; }
          .section { margin-top: 18px; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .9px; color: #475569; font-weight: 800; margin-bottom: 8px; }
          .summary { border: 1px solid #e9d5ff; background: #faf5ff; border-radius: 10px; padding: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d7deea; padding: 8px 9px; vertical-align: top; }
          th { background: #f8fafc; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #475569; }
          .footer { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div class="brand-block">
              <div class="logo-wrap">
                ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo entreprise" />` : ''}
              </div>
              <div>
                <div class="brand">BTP ERP · Rapport hebdomadaire</div>
                <div class="brand-name">Revue chantier consolidée</div>
                <div class="brand-meta">Document d'exploitation et de pilotage hebdomadaire</div>
              </div>
            </div>
          </div>
          <div class="title-row">
            <div>
              <h1 class="title">Revue Hebdomadaire</h1>
              <div class="subtitle">Projet: ${escapeHtml(report.project?.title || '—')}</div>
              <div class="subtitle">Semaine du ${fmtDate(report.week_start)} au ${fmtDate(report.week_end)}</div>
              <div class="status">${statusLabel(report.status)}</div>
            </div>
            <div class="score">
              <div class="score-label">Avancement global</div>
              <div class="score-value">${fmtPct(report.overall_progress)}</div>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Prepare par</div>
            <div class="value">${escapeHtml(report.preparedBy ? `${report.preparedBy.firstname || ''} ${report.preparedBy.lastname || ''}`.trim() : '—')}</div>
          </div>
          <div class="card">
            <div class="label">Valide par</div>
            <div class="value">${escapeHtml(report.validatedBy ? `${report.validatedBy.firstname || ''} ${report.validatedBy.lastname || ''}`.trim() : 'En attente de validation')}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Synthese de la direction</div>
          <div class="summary">${nlToBr(report.summary || 'Aucune synthese redigee pour cette periode.')}</div>
        </div>

        <div class="section">
          <div class="section-title">Etat d'avancement des macro-taches</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Tache</th>
                <th>Hebdo</th>
                <th>Cumule</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="footer">
          <div class="card">
            <div class="label">Periode couverte</div>
            <div class="value">${fmtDate(report.week_start)} - ${fmtDate(report.week_end)}</div>
          </div>
          <div class="card">
            <div class="label">Identifiant rapport</div>
            <div class="value">WR-${report.id}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function canReadAllWeeklyReports(req: Request): Promise<boolean> {
  const user = (req as AuthRequest).user;
  if (!user?.id) return false;

  if (Array.isArray(user.permissions) && user.permissions.includes('report:read:all')) {
    return true;
  }

  const permissions = await RbacService.getUserPermissions(user.id);
  return permissions.includes('report:read:all');
}

export class WeeklyReportController {
  static async generate(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const report = await WeeklyReportService.generateWeeklyReport({
        ...req.body,
        week_start: new Date(req.body.week_start),
        week_end: new Date(req.body.week_end),
        prepared_by: user!.id
      });
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listByProject(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = Number(req.params.projectId);
      const hasReadAll = await canReadAllWeeklyReports(req);
      const reports = await WeeklyReportService.getWeeklyReports(projectId, hasReadAll ? undefined : user.id);
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

      const hasReadAll = await canReadAllWeeklyReports(req);
      const report = await WeeklyReportService.getWeeklyReportByIdForTenantScoped(
        Number(req.params.id),
        hasReadAll ? undefined : user.id
      );
      if (!report) return res.status(404).json({ error: "Weekly report not found" });
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const report = await WeeklyReportService.updateWeeklyReport(Number(req.params.id), req.body);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: 'Identifiant invalide.' });
        return;
      }

      const user = (req as AuthRequest).user;
      if (!user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const report = await WeeklyReportService.deleteWeeklyReport(id, {
        reason: req.body.reason,
        deleted_by: user.id
      });

      res.status(200).json({
        message: 'Rapport hebdomadaire supprime avec succes.',
        report
      });
    } catch (error: any) {
      if (error?.message === 'Weekly report not found') {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error?.message === 'Weekly report already deleted' || error?.message === 'Only draft weekly reports can be deleted') {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(400).json({ error: error.message });
    }
  }

  static async generatePdf(req: Request, res: Response) {
    let browser: BrowserLike | null = null;
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: 'Identifiant invalide.' });
        return;
      }

      const hasReadAll = await canReadAllWeeklyReports(req);
      const report = await WeeklyReportService.getWeeklyReportByIdForTenantScoped(
        id,
        hasReadAll ? undefined : user.id
      );
      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      const puppeteer = await getPuppeteer();
      if (!puppeteer) {
        res.status(503).json({ error: 'Generation PDF indisponible: moteur PDF non disponible.' });
        return;
      }
      if (!report) {
        res.status(404).json({ error: 'Rapport hebdomadaire introuvable.' });
        return;
      }

      const fileName = `WR-${report.id}-${new Date(report.week_start).toISOString().slice(0, 10)}.pdf`;
      const generatedAt = new Date().toLocaleString('fr-FR');
      const logoDataUrl = await getCompanyLogoDataUrl();
      const html = buildWeeklyReportHtml(report, logoDataUrl);

      browser = await puppeteer.launch({
        headless: true,
        ...(process.env.PUPPETEER_EXECUTABLE_PATH && { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }),
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: buildPdfFooterTemplate(generatedAt),
        margin: { top: '12mm', right: '10mm', bottom: '18mm', left: '10mm' },
      });
      await page.close();

      const pdfBuffer = Buffer.from(pdfBytes);
      const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
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
