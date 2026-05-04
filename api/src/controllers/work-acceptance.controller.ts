import { Request, Response } from 'express';
import { WorkAcceptanceService } from '../services/work-acceptance.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

type PdfPageLike = {
  setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
  pdf: (options?: Record<string, unknown>) => Promise<Buffer>;
  close: () => Promise<void>;
};

type BrowserLike = {
  newPage: () => Promise<PdfPageLike>;
  close: () => Promise<void>;
};

type PuppeteerLike = {
  launch: (options?: Record<string, unknown>) => Promise<BrowserLike>;
};

let puppeteerLoader: Promise<PuppeteerLike | null> | null = null;

async function getPuppeteer(): Promise<PuppeteerLike | null> {
  if (!puppeteerLoader) {
    puppeteerLoader = (async () => {
      try {
        const moduleName = 'puppeteer';
        const mod = await import(moduleName);
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

function fmtDate(input?: string | Date | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

function fmtMoney(input?: number | null): string {
  if (input == null) return '—';
  return `${new Intl.NumberFormat('fr-FR').format(Number(input))} FCFA`;
}

function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    SCHEDULED: 'Planifiee',
    IN_PROGRESS: 'Visite en cours',
    ACCEPTED: 'Receptionnee',
    ACCEPTED_WITH_RESERVES: 'Receptionnee avec reserves',
    REFUSED: 'Refusee',
    WITHDRAWN: 'Retiree',
  };
  return labels[status ?? ''] ?? (status || '—');
}

function typeLabel(type?: string): string {
  if (type === 'FINAL') return 'Reception definitive';
  return 'Reception provisoire';
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

export class WorkAcceptanceController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const wa = await WorkAcceptanceService.createWorkAcceptance({
        ...body,
        project_id:         Number(body.project_id),
        lot_id:             body.lot_id          ? Number(body.lot_id)             : undefined,
        inspector_id:       body.inspector_id    ? Number(body.inspector_id)       : undefined,
        warranty_months:    body.warranty_months ? Number(body.warranty_months)    : undefined,
        amount_accepted:    body.amount_accepted ? Number(body.amount_accepted)    : undefined,
        penalty_amount:     body.penalty_amount  ? Number(body.penalty_amount)     : undefined,
        reserve_count:      body.reserve_count   ? Number(body.reserve_count)      : undefined,
        planned_date:       body.planned_date       ? new Date(body.planned_date)       : undefined,
        inspection_date:    body.inspection_date    ? new Date(body.inspection_date)    : undefined,
        accepted_at:        body.accepted_at        ? new Date(body.accepted_at)        : undefined,
        contra_visit_date:  body.contra_visit_date  ? new Date(body.contra_visit_date)  : undefined,
        warranty_end_date:  body.warranty_end_date  ? new Date(body.warranty_end_date)  : undefined,
        signed_by_owner:      body.signed_by_owner      === true || body.signed_by_owner      === 'true',
        signed_by_contractor: body.signed_by_contractor === true || body.signed_by_contractor === 'true',
        created_by: user!.id,
      });
      res.status(201).json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id)   filters.project_id   = Number(req.query.project_id);
      if (req.query.lot_id)       filters.lot_id        = Number(req.query.lot_id);
      if (req.query.status)       filters.status        = req.query.status as string;
      if (req.query.type)         filters.type          = req.query.type as string;
      if (req.query.inspector_id) filters.inspector_id  = Number(req.query.inspector_id);

      const items = await WorkAcceptanceService.getWorkAcceptances(filters);
      res.json(items);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const wa = await WorkAcceptanceService.getWorkAcceptanceById(Number(req.params.id));
      if (!wa) return res.status(404).json({ error: "Work acceptance not found" });
      res.json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const body = req.body;
      const data: Record<string, any> = { ...body };

      if (body.lot_id        !== undefined) data.lot_id        = body.lot_id        ? Number(body.lot_id)        : null;
      if (body.inspector_id  !== undefined) data.inspector_id  = body.inspector_id  ? Number(body.inspector_id)  : null;
      if (body.warranty_months  !== undefined) data.warranty_months  = body.warranty_months  ? Number(body.warranty_months)  : null;
      if (body.amount_accepted  !== undefined) data.amount_accepted  = body.amount_accepted  ? Number(body.amount_accepted)  : null;
      if (body.penalty_amount   !== undefined) data.penalty_amount   = body.penalty_amount   ? Number(body.penalty_amount)   : null;
      if (body.reserve_count    !== undefined) data.reserve_count    = body.reserve_count    ? Number(body.reserve_count)    : 0;

      if (body.planned_date      !== undefined) data.planned_date      = body.planned_date      ? new Date(body.planned_date)      : null;
      if (body.inspection_date   !== undefined) data.inspection_date   = body.inspection_date   ? new Date(body.inspection_date)   : null;
      if (body.accepted_at       !== undefined) data.accepted_at       = body.accepted_at       ? new Date(body.accepted_at)       : null;
      if (body.contra_visit_date !== undefined) data.contra_visit_date = body.contra_visit_date ? new Date(body.contra_visit_date) : null;
      if (body.warranty_end_date !== undefined) data.warranty_end_date = body.warranty_end_date ? new Date(body.warranty_end_date) : null;

      if (body.signed_by_owner      !== undefined) data.signed_by_owner      = body.signed_by_owner      === true || body.signed_by_owner      === 'true';
      if (body.signed_by_contractor !== undefined) data.signed_by_contractor = body.signed_by_contractor === true || body.signed_by_contractor === 'true';

      const wa = await WorkAcceptanceService.updateWorkAcceptance(Number(req.params.id), data);
      res.json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await WorkAcceptanceService.deleteWorkAcceptance(Number(req.params.id));
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
        res.status(503).json({
          error: 'Generation PDF indisponible: moteur PDF non disponible sur ce serveur.',
        });
        return;
      }

      const wa = await WorkAcceptanceService.getWorkAcceptanceByIdForTenant(id);
      if (!wa) {
        res.status(404).json({ error: 'PV de reception introuvable.' });
        return;
      }

      const fileNameBase = (wa.reference || `PV-${wa.id}`).replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${fileNameBase}.pdf`;

      const html = `
        <!doctype html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <style>
              @page { size: A4; margin: 14mm; }
              body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
              .header { border: 1px solid #cfd8e3; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
              .brand { font-size: 11px; color: #475569; margin-bottom: 2px; }
              .title { font-size: 18px; font-weight: 800; margin: 0; letter-spacing: .2px; }
              .subtitle { font-size: 12px; color: #334155; margin-top: 4px; }
              .meta { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
              .card { border: 1px solid #d6dee8; border-radius: 6px; padding: 8px 10px; }
              .label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #64748b; margin-bottom: 3px; font-weight: 700; }
              .value { font-size: 12px; font-weight: 600; color: #0f172a; }
              .section { margin-top: 10px; }
              .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: .7px; font-weight: 800; margin: 0 0 6px 0; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; }
              td { border: 1px solid #d6dee8; padding: 7px 8px; vertical-align: top; }
              td:first-child { width: 34%; color: #475569; font-size: 11px; font-weight: 700; background: #f8fafc; }
              .block { border: 1px solid #d6dee8; border-radius: 6px; padding: 8px 10px; min-height: 62px; white-space: normal; line-height: 1.45; }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .footer { margin-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #d6dee8; padding-top: 6px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">ERP BTP</div>
              <h1 class="title">Proces-verbal de reception des travaux</h1>
              <div class="subtitle">${escapeHtml(typeLabel(wa.type))}</div>
              <div class="meta">
                <div class="card"><div class="label">Reference</div><div class="value">${escapeHtml(wa.reference || `PV-${wa.id}`)}</div></div>
                <div class="card"><div class="label">Projet</div><div class="value">${escapeHtml(`${wa.project?.code ?? ''} - ${wa.project?.title ?? ''}`.trim() || '—')}</div></div>
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">Informations principales</h3>
              <table>
                <tr><td>Statut</td><td>${escapeHtml(statusLabel(wa.status))}</td></tr>
                <tr><td>Date prevue de visite</td><td>${escapeHtml(fmtDate(wa.planned_date))}</td></tr>
                <tr><td>Date de visite</td><td>${escapeHtml(fmtDate(wa.inspection_date))}</td></tr>
                <tr><td>Date de reception</td><td>${escapeHtml(fmtDate(wa.accepted_at))}</td></tr>
                <tr><td>Lot concerne</td><td>${escapeHtml(wa.lot ? `Lot ${wa.lot.lot_number} - ${wa.lot.name}` : 'Tous les lots')}</td></tr>
                <tr><td>Montant receptionne</td><td>${escapeHtml(fmtMoney(wa.amount_accepted as number | null))}</td></tr>
                <tr><td>Penalites</td><td>${escapeHtml(fmtMoney(wa.penalty_amount as number | null))}</td></tr>
                <tr><td>Nombre de reserves</td><td>${escapeHtml(String(wa.reserve_count ?? 0))}</td></tr>
              </table>
            </div>

            <div class="section">
              <h3 class="section-title">Points de controle et constats</h3>
              <div class="block">${nlToBr(wa.observations) || '—'}</div>
            </div>

            <div class="section">
              <h3 class="section-title">Reserves / non-conformites</h3>
              <div class="block">${nlToBr(wa.reserves_text) || '—'}</div>
            </div>

            <div class="section">
              <h3 class="section-title">Notes complementaires</h3>
              <div class="block">${nlToBr(wa.notes) || '—'}</div>
            </div>

            <div class="section">
              <h3 class="section-title">Avis et signatures</h3>
              <div class="grid-2">
                <div class="card">
                  <div class="label">Maitre d'ouvrage</div>
                  <div class="value">${wa.signed_by_owner ? 'Signe' : 'Non signe'}</div>
                </div>
                <div class="card">
                  <div class="label">Entreprise</div>
                  <div class="value">${wa.signed_by_contractor ? 'Signe' : 'Non signe'}</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <span>PV #${wa.id}</span>
              <span>Genere le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</span>
            </div>
          </body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      await page.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(pdfBuffer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Impossible de generer le PDF.' });
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
