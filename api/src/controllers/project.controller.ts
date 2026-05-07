import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProjectManagementService } from "../services/project-management.service.js";
import { buildProjectWhere, getProjectAccessFilter } from "../utils/projectFilterUtils.js";
import { prisma } from "../config/prisma.js";

type PdfPageLike = {
  setContent: (html: string, opts?: Record<string, unknown>) => Promise<void>;
  pdf: (opts?: Record<string, unknown>) => Promise<Uint8Array>;
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

// ─── Helper ────────────────────────────────────────────────────────────────────

function parseId(param: string, res: Response): number | null {
  const id = parseInt(param, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'ID invalide.' }); return null; }
  return id;
}

/** Converts a date-only string "YYYY-MM-DD" to a full ISO-8601 datetime. */
function toDateTime(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.includes('T')) return s;
  return `${s}T00:00:00.000Z`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function formatDateFr(input?: string | Date | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR');
}

function esc(value?: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value?: number | null, currency?: string | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number(value).toLocaleString('fr-FR')} ${currency || ''}`.trim();
}

function line(label: string, value?: unknown): string {
  const rendered = value === null || value === undefined || value === '' ? '—' : esc(value);
  return `<div class="kv"><div class="k">${esc(label)}</div><div class="v">${rendered}</div></div>`;
}

function buildProjectsPdfHtml(projects: any[]): string {
  const cards = projects.map((project) => {
    const lots = Array.isArray(project.lots) ? project.lots : [];
    const budgetLines = Array.isArray(project.budgetLines) ? project.budgetLines : [];
    const workflowRequirements = Array.isArray(project.workflow?.requirements) ? project.workflow.requirements : [];

    const lotRows = lots.length
      ? lots.map((lot: any) => `
          <tr>
            <td>${esc(lot.lot_number || '—')}</td>
            <td>${esc(lot.name || '—')}</td>
            <td>${esc(lot.trade_code || '—')}</td>
            <td>${esc(lot.status || '—')}</td>
            <td>${money(lot.budget_allocated, project.currency)}</td>
            <td>${lot.progress != null ? `${esc(lot.progress)}%` : '—'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="6">Aucun lot structuré.</td></tr>';

    const budgetRows = budgetLines.length
      ? budgetLines.map((lineItem: any) => `
          <tr>
            <td>${esc(lineItem.category || '—')}</td>
            <td>${esc(lineItem.supplier?.name || '—')}</td>
            <td>${money(lineItem.planned, lineItem.currency || project.currency)}</td>
            <td>${money(lineItem.actual, lineItem.currency || project.currency)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">Aucune ligne budgétaire.</td></tr>';

    const workflowRows = workflowRequirements.length
      ? workflowRequirements.map((req: any) => `
          <tr>
            <td>${esc(req.label || req.code || '—')}</td>
            <td class="${req.satisfied ? 'ok' : 'ko'}">${req.satisfied ? 'Oui' : 'Non'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2">Aucune exigence de workflow calculée.</td></tr>';

    return `
      <section class="project-card">
        <div class="top">
          <div>
            <div class="code">${esc(project.code || `PROJET-${project.id}`)}</div>
            <h2>${esc(project.title || 'Projet sans titre')}</h2>
            <p class="sub">${esc(project.location || 'Localisation non renseignée')}</p>
          </div>
          <div class="badges">
            <span class="badge">${esc(project.status || '—')}</span>
            <span class="badge phase">${esc(project.phase || '—')}</span>
          </div>
        </div>

        <div class="grid two">
          <div class="panel">
            <h3>Identification</h3>
            ${line('Code', project.code)}
            ${line('Titre', project.title)}
            ${line('Statut', project.status)}
            ${line('Phase', project.phase)}
            ${line('Projet ERP', project.erp_project_id)}
            ${line('Type de batiment', project.building_type)}
            ${line('Archive', project.is_archived ? 'Oui' : 'Non')}
          </div>
          <div class="panel">
            <h3>Planification</h3>
            ${line('Date debut', formatDateFr(project.start_date) || '—')}
            ${line('Date fin', formatDateFr(project.end_date) || '—')}
            ${line('Localisation', project.location)}
            ${line('Adresse', project.street_address)}
            ${line('Ville', project.city)}
            ${line('Pays', project.country)}
            ${line('Code postal', project.postal_code)}
          </div>
        </div>

        <div class="grid two">
          <div class="panel">
            <h3>Client et gouvernance</h3>
            ${line('Client', project.client_name)}
            ${line('Contact client', project.client_contact_name)}
            ${line('Telephone client', project.client_phone)}
            ${line('Chef de projet', project.projectManager ? `${project.projectManager.firstname} ${project.projectManager.lastname}` : '—')}
            ${line('Responsable HSE', project.hseResponsible ? `${project.hseResponsible.firstname} ${project.hseResponsible.lastname}` : '—')}
            ${line('Cree par', project.createdBy ? `${project.createdBy.firstname} ${project.createdBy.lastname}` : '—')}
            ${line('Document principal', project.document?.name)}
          </div>
          <div class="panel">
            <h3>Budget et conformite</h3>
            ${line('Budget initial', money(project.budget_initial, project.currency))}
            ${line('Budget approuve', money(project.budget_approved, project.currency))}
            ${line('Budget engage', money(project.budget_committed, project.currency))}
            ${line('Budget contingence', money(project.contingency_budget, project.currency))}
            ${line('Devise', project.currency)}
            ${line('Type de permis', project.permit_type)}
            ${line('Numero permis', project.permit_number)}
            ${line('Classification risque', project.risk_classification)}
          </div>
        </div>

        <div class="stats">
          <div class="stat"><span>${esc(project._count?.lots ?? 0)}</span><small>Lots</small></div>
          <div class="stat"><span>${esc(project._count?.tasks ?? 0)}</span><small>Taches</small></div>
          <div class="stat"><span>${esc(project._count?.incidents ?? 0)}</span><small>Incidents</small></div>
          <div class="stat"><span>${esc(project._count?.contracts ?? 0)}</span><small>Contrats</small></div>
          <div class="stat"><span>${esc(project._count?.invoices ?? 0)}</span><small>Factures</small></div>
        </div>

        <div class="panel">
          <h3>Lots</h3>
          <table>
            <thead>
              <tr><th>Numero</th><th>Nom</th><th>Corps d'etat</th><th>Statut</th><th>Budget</th><th>Avancement</th></tr>
            </thead>
            <tbody>${lotRows}</tbody>
          </table>
        </div>

        <div class="panel">
          <h3>Lignes budgetaires</h3>
          <table>
            <thead>
              <tr><th>Categorie</th><th>Fournisseur</th><th>Prevu</th><th>Reel</th></tr>
            </thead>
            <tbody>${budgetRows}</tbody>
          </table>
        </div>

        <div class="panel">
          <h3>Workflow</h3>
          <div class="grid two compact">
            ${line('Phase courante', project.workflow?.currentPhase || project.phase || '—')}
            ${line('Phase suivante', project.workflow?.nextPhase || '—')}
          </div>
          <table>
            <thead>
              <tr><th>Exigence</th><th>Satisfaite</th></tr>
            </thead>
            <tbody>${workflowRows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');

  return `
    <!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
        .report-head { border: 1px solid #d9e2ec; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
        .report-head h1 { margin: 0; font-size: 22px; font-weight: 900; }
        .report-head p { margin: 6px 0 0; color: #51606f; }
        .project-card { border: 1px solid #d9e2ec; border-radius: 12px; padding: 14px; margin-bottom: 16px; page-break-inside: avoid; }
        .top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
        .code { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 900; }
        h2 { margin: 8px 0 4px; font-size: 18px; }
        .sub { margin: 0; color: #51606f; }
        .badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .badge { border: 1px solid #cbd5e1; border-radius: 999px; padding: 5px 10px; font-size: 10px; font-weight: 800; }
        .badge.phase { background: #f8fafc; }
        .grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .grid.two.compact { margin-bottom: 8px; }
        .panel { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
        .panel h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; }
        .kv { display: grid; grid-template-columns: 145px 1fr; gap: 8px; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
        .kv:last-child { border-bottom: none; }
        .k { color: #64748b; font-weight: 700; }
        .v { font-weight: 600; }
        .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
        .stat { border: 1px solid #d9e2ec; border-radius: 8px; padding: 8px; text-align: center; }
        .stat span { display: block; font-size: 18px; font-weight: 900; }
        .stat small { color: #64748b; text-transform: uppercase; font-weight: 800; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #dbe5f0; padding: 6px 7px; vertical-align: top; }
        th { background: #f8fafc; font-size: 9px; text-transform: uppercase; color: #475569; letter-spacing: .3px; }
        .ok { color: #047857; font-weight: 800; }
        .ko { color: #b91c1c; font-weight: 800; }
        .footer { margin-top: 8px; font-size: 9px; color: #64748b; text-align: right; }
      </style>
    </head>
    <body>
      <div class="report-head">
        <h1>Portefeuille des projets</h1>
        <p>${projects.length} projet${projects.length > 1 ? 's' : ''} exporte${projects.length > 1 ? 's' : ''} avec leurs informations detaillees.</p>
      </div>
      ${cards || '<p>Aucun projet a exporter.</p>'}
      <div class="footer">Genere le ${esc(new Date().toLocaleString('fr-FR'))}</div>
    </body>
    </html>
  `;
}

// ─── ProjectController ─────────────────────────────────────────────────────────

export class ProjectController {

  // ─── Projects ──────────────────────────────────────────────────────────────

  static async listProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant_id = req.user?.tenant_id;
      const page  = Math.max(1, parseInt(String(req.query.page  ?? 1), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)));
      const result = await ProjectManagementService.listProjects(tenant_id, page, limit);
      res.json(result);
    } catch (error) {
      console.error('[ProjectController.listProjects]', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des projets.' });
    }
  }

  /**
   * Endpoint pour requêtes filtrées de projets
   * POST /projects/query
   * Body: { logic: 'AND'|'OR', filters: [{ field, op, value }, ...] }
   */
  static async queryProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant_id = req.user?.tenant_id;
      const { logic = 'AND', filters = [] } = req.body;
      const page  = Math.max(1, parseInt(String(req.query.page  ?? 1), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10)));

      // Construire la clause WHERE
      const accessFilter = getProjectAccessFilter(req.user);
      const where = buildProjectWhere(logic, filters, tenant_id, accessFilter);

      // Récupérer les données
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            phase: true,
            client_name: true,
            location: true,
            city: true,
            start_date: true,
            end_date: true,
            budget_initial: true,
            budget_committed: true,
            currency: true,
            is_archived: true,
            createdBy: {
              select: { id: true, firstname: true, lastname: true }
            },
            projectManager: {
              select: { id: true, firstname: true, lastname: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        data: projects,
        total,
        page,
        limit,
      });
    } catch (error) {
      console.error('[ProjectController.queryProjects]', error);
      res.status(500).json({ error: 'Erreur lors du filtrage des projets.' });
    }
  }

  static async exportProjectsExcel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant_id = req.user?.tenant_id;
      const result = await ProjectManagementService.listProjects(tenant_id, 1, 100000);
      const projects = result.data ?? [];

      const header = [
        'Code', 'Titre', 'Statut', 'Phase', 'Localisation',
        'Date debut', 'Date fin', 'Budget initial', 'Devise',
        'Client', 'Ville', 'Pays', 'Lots', 'Taches', 'SDT', 'Lignes budget',
      ];

      const rows: unknown[][] = projects.map((p: any) => [
        p.code,
        p.title,
        p.status,
        p.phase,
        p.location,
        formatDateFr(p.start_date),
        formatDateFr(p.end_date),
        p.budget_initial ?? 0,
        p.currency,
        p.client_name,
        p.city,
        p.country,
        p._count?.lots ?? 0,
        p._count?.tasks ?? 0,
        p._count?.wbs ?? 0,
        p._count?.budgetLines ?? 0,
      ]);

      const csvLines = [header.map(csvCell).join(',')];
      for (const row of rows) {
        csvLines.push(row.map(csvCell).join(','));
      }
      const csv = csvLines.join('\r\n');

      const BOM = '\uFEFF';
      const fileName = `projets-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(BOM + csv);
    } catch (error) {
      console.error('[ProjectController.exportProjectsExcel]', error);
      res.status(500).json({ error: 'Erreur lors de l’export des projets.' });
    }
  }

  static async exportProjectsPdf(req: AuthRequest, res: Response): Promise<void> {
    let browser: BrowserLike | null = null;
    try {
      const tenant_id = req.user?.tenant_id;
      const result = await ProjectManagementService.listProjects(tenant_id, 1, 100000);
      const summaries = result.data ?? [];
      const projects = await Promise.all(
        summaries.map((project: any) => ProjectManagementService.getProjectById(project.id, tenant_id))
      );
      const detailedProjects = projects.filter(Boolean);

      const puppeteer = await getPuppeteer();
      if (!puppeteer) {
        res.status(503).json({ error: 'Generation PDF indisponible: moteur PDF non disponible.' });
        return;
      }

      const html = buildProjectsPdfHtml(detailedProjects);
      const fileName = `projets-${new Date().toISOString().slice(0, 10)}.pdf`;

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
        margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
      await page.close();

      const pdfBuffer = Buffer.from(pdfBytes);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error('[ProjectController.exportProjectsPdf]', error);
      res.status(500).json({ error: 'Erreur lors de l’export PDF des projets.' });
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  static async getProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      const project = await ProjectManagementService.getProjectById(id, req.user?.tenant_id);
      if (!project) { res.status(404).json({ error: 'Projet introuvable.' }); return; }
      res.json(project);
    } catch (error) {
      console.error('[ProjectController.getProject]', error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  }

  static async getProjectPhaseTransitions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const projectId = parseId(req.params.projectId, res); if (projectId === null) return;
      const transitions = await ProjectManagementService.getProjectPhaseTransitions(projectId, req.user?.tenant_id);
      res.json(transitions);
    } catch (error: any) {
      console.error('[ProjectController.getProjectPhaseTransitions]', error);
      if (error.message?.includes('introuvable')) res.status(404).json({ error: error.message });
      else res.status(500).json({ error: error.message || 'Erreur lors de la récupération de l’historique des transitions.' });
    }
  }

  static async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, status, start_date, end_date, budget_initial,
              currency, location, doc_name, doc_category, doc_description } = req.body;

      if (!title?.trim())    { res.status(400).json({ error: 'Le titre est requis.' }); return; }
      if (!location?.trim()) { res.status(400).json({ error: 'La localisation est requise.' }); return; }
      if (!currency?.trim()) { res.status(400).json({ error: 'La devise est requise.' }); return; }
      if (budget_initial === undefined || isNaN(Number(budget_initial))) {
        res.status(400).json({ error: 'Le budget initial est requis (nombre).' }); return;
      }
      if (!doc_name?.trim()) { res.status(400).json({ error: 'Le nom du document principal est requis.' }); return; }

      const project = await ProjectManagementService.createProject({
        title:          title.trim(),
        status:         status ?? 'PLANNING',
        tenant_id:      req.user!.tenant_id,
        created_by:     req.user!.id,
        start_date:     start_date  || null,
        end_date:       end_date    || null,
        budget_initial: Number(budget_initial),
        currency:       currency.trim().toUpperCase(),
        location:       location.trim(),
        client_name: req.body.client_name || null,
        client_contact_name: req.body.client_contact_name || null,
        client_phone: req.body.client_phone || null,
        street_address: req.body.street_address || null,
        postal_code: req.body.postal_code || null,
        city: req.body.city || null,
        country: req.body.country || null,
        latitude: req.body.latitude !== undefined && req.body.latitude !== null && req.body.latitude !== '' ? Number(req.body.latitude) : null,
        longitude: req.body.longitude !== undefined && req.body.longitude !== null && req.body.longitude !== '' ? Number(req.body.longitude) : null,
        budget_approved: req.body.budget_approved !== undefined && req.body.budget_approved !== null && req.body.budget_approved !== '' ? Number(req.body.budget_approved) : null,
        budget_committed: req.body.budget_committed !== undefined && req.body.budget_committed !== null && req.body.budget_committed !== '' ? Number(req.body.budget_committed) : null,
        contingency_budget: req.body.contingency_budget !== undefined && req.body.contingency_budget !== null && req.body.contingency_budget !== '' ? Number(req.body.contingency_budget) : null,
        permit_number: req.body.permit_number || null,
        permit_type: req.body.permit_type || null,
        risk_classification: req.body.risk_classification || null,
        building_type: req.body.building_type || null,
        erp_project_id: req.body.erp_project_id || null,
        is_archived: req.body.is_archived === true,
        doc_name:       doc_name.trim(),
        doc_category:   doc_category ?? 'PLAN',
        doc_description: doc_description || null,
      });

      res.status(201).json(project);
    } catch (error: any) {
      console.error('[ProjectController.createProject]', error);
      if (error.message?.includes('existe déjà')) res.status(409).json({ error: error.message });
      else res.status(500).json({ error: error.message || 'Erreur lors de la création du projet.' });
    }
  }

  static async updateProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      const body: Record<string, any> = { ...req.body };
      const numericFields = [
        'budget_initial', 'latitude', 'longitude', 'budget_approved', 'budget_committed', 'contingency_budget'
      ];
      for (const f of numericFields) {
        if (body[f] !== undefined && body[f] !== null && body[f] !== '') body[f] = Number(body[f]);
      }
      if (body.is_archived !== undefined) body.is_archived = body.is_archived === true || body.is_archived === 'true';
      const project = await ProjectManagementService.updateProject(id, body, req.user?.tenant_id, req.user?.id);
      res.json(project);
    } catch (error: any) {
      console.error('[ProjectController.updateProject]', error);
      if (error.message?.includes('introuvable')) res.status(404).json({ error: error.message });
      else if (error.message?.includes('Impossible')) res.status(409).json({ error: error.message });
      else res.status(500).json({ error: error.message || 'Erreur serveur.' });
    }
  }

  static async deleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      const result = await ProjectManagementService.deleteProject(id, req.user?.tenant_id);
      res.json(result);
    } catch (error: any) {
      console.error('[ProjectController.deleteProject]', error);
      if (error.message?.includes('introuvable')) res.status(404).json({ error: error.message });
      else if (error.message?.includes('Impossible')) res.status(409).json({ error: error.message });
      else res.status(500).json({ error: error.message || 'Erreur serveur.' });
    }
  }

  // ─── WBS ───────────────────────────────────────────────────────────────────

  static async getWBSTree(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getWBSTree(Number(req.params.projectId)));
    } catch (error) { res.status(500).json({ error: 'Erreur WBS.' }); }
  }

  static async createWBSNode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { project_id, parent_id, code, name } = req.body;
      if (!code?.trim() || !name?.trim()) { res.status(400).json({ error: 'Code et nom requis.' }); return; }
      if (!project_id) { res.status(400).json({ error: 'project_id requis.' }); return; }
      const node = await ProjectManagementService.createWBSNode({
        project_id: Number(project_id), parent_id: parent_id ? Number(parent_id) : null,
        tenant_id: req.user!.tenant_id, code: code.trim(), name: name.trim(),
      });
      res.status(201).json(node);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erreur création WBS.' });
    }
  }

  static async updateWBSNode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      res.json(await ProjectManagementService.updateWBSNode(id, req.body, req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async deleteWBSNode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      await ProjectManagementService.deleteWBSNode(id, req.user!.tenant_id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  static async listAllTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getAllTasksForTenant(req.user!.tenant_id));
    } catch (error) { res.status(500).json({ error: 'Erreur tâches.' }); }
  }

  static async getTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getTasksByProject(Number(req.params.projectId)));
    } catch (error) { res.status(500).json({ error: 'Erreur tâches.' }); }
  }

  static async createTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { project_id, lot_id, wbs_id, title, description, status = 'TODO', priority = 'MEDIUM', progress = 0, planned_start, planned_end } = req.body;
      if (!title?.trim())  { res.status(400).json({ error: 'Titre requis.' }); return; }
      if (!project_id)     { res.status(400).json({ error: 'project_id requis.' }); return; }
      if (!lot_id)         { res.status(400).json({ error: 'lot_id requis.' }); return; }
      const task = await ProjectManagementService.createTask({
        project_id: Number(project_id), lot_id: Number(lot_id), wbs_id: wbs_id ? Number(wbs_id) : null,
        title: title.trim(), description: description?.trim() || null, status, priority, progress: Number(progress),
        tenant_id: req.user!.tenant_id, created_by: req.user!.id,
        planned_start: planned_start || null, planned_end: planned_end || null,
      });
      res.status(201).json(task);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      const data: Record<string, any> = { ...req.body };
      if (data.lot_id !== undefined) {
        if (!data.lot_id) { res.status(400).json({ error: 'lot_id requis.' }); return; }
        data.lot_id = Number(data.lot_id);
      }
      if (data.wbs_id !== undefined) data.wbs_id = data.wbs_id ? Number(data.wbs_id) : null;
      if (data.progress !== undefined) data.progress = Number(data.progress);
      res.json(await ProjectManagementService.updateTask(id, data, req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async deleteTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      await ProjectManagementService.deleteTask(id, req.user!.tenant_id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  // ─── Lots ──────────────────────────────────────────────────────────────────

  static async getLots(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getLotsByProject(Number(req.params.projectId)));
    } catch (error) { res.status(500).json({ error: 'Erreur lots.' }); }
  }

  static async createLot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { project_id, name, description, lot_number, trade_code, status, budget_allocated, start_date, end_date, responsible_id, contractor_id, contract_id } = req.body;
      if (!name?.trim())       { res.status(400).json({ error: 'Nom requis.' }); return; }
      if (!project_id)         { res.status(400).json({ error: 'project_id requis.' }); return; }
      if (!trade_code?.trim()) { res.status(400).json({ error: 'trade_code requis.' }); return; }
      const lot = await ProjectManagementService.createProjectLot({
        project_id:       Number(project_id),
        name:             name.trim(),
        lot_number:       lot_number?.trim() || undefined,
        trade_code:       trade_code.trim(),
        description:      description || null,
        tenant_id:        req.user!.tenant_id,
        status:           status || undefined,
        budget_allocated: budget_allocated != null ? Number(budget_allocated) : undefined,
        start_date:       toDateTime(start_date),
        end_date:         toDateTime(end_date),
        responsible_id:   responsible_id != null ? Number(responsible_id) : undefined,
        contractor_id:    contractor_id  != null ? Number(contractor_id)  : undefined,
        contract_id:      contract_id    != null ? Number(contract_id)    : undefined,
      });
      res.status(201).json(lot);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async updateLot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      const body = { ...req.body };
      if (body.lot_number !== undefined) delete body.lot_number;
      if (body.start_date !== undefined) body.start_date = toDateTime(body.start_date);
      if (body.end_date   !== undefined) body.end_date   = toDateTime(body.end_date);
      res.json(await ProjectManagementService.updateProjectLot(id, body, req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async deleteLot(req: AuthRequest, res: Response): Promise<void> {
    try {
      await ProjectManagementService.deleteProjectLot(Number(req.params.id), req.user!.tenant_id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ error: error.message || 'Erreur suppression lot.' }); }
  }

  // ─── Budget Lines ──────────────────────────────────────────────────────────

  static async getBudgetLines(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getBudgetLinesByProject(Number(req.params.projectId)));
    } catch (error) { res.status(500).json({ error: 'Erreur lignes budgétaires.' }); }
  }

  static async createBudgetLine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { project_id, wbs_id, category, planned, currency, supplier_id } = req.body;
      if (!category?.trim()) { res.status(400).json({ error: 'Catégorie requise.' }); return; }
      if (!project_id)       { res.status(400).json({ error: 'project_id requis.' }); return; }
      if (planned === undefined || isNaN(Number(planned))) {
        res.status(400).json({ error: 'Montant planifié requis.' }); return;
      }
      const line = await ProjectManagementService.createBudgetLine({
        project_id:  Number(project_id), wbs_id: wbs_id ? Number(wbs_id) : null,
        category:    category.trim(), planned: Number(planned),
        currency:    (currency ?? 'EUR').toUpperCase(), tenant_id: req.user!.tenant_id,
        supplier_id: supplier_id ? Number(supplier_id) : null, actual: 0,
      });
      res.status(201).json(line);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async updateBudgetLine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      res.json(await ProjectManagementService.updateBudgetLine(id, req.body, req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async deleteBudgetLine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      await ProjectManagementService.deleteBudgetLine(id, req.user!.tenant_id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  // ─── Dependencies ──────────────────────────────────────────────────────────

  static async createDependency(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { taskId, dependsOnId } = req.body;
      res.status(201).json(await ProjectManagementService.createTaskDependency(Number(taskId), Number(dependsOnId), req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  // ─── Helpers (selects formulaires) ─────────────────────────────────────────

  static async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getUsersByTenant(req.user!.tenant_id));
    } catch (error) { res.status(500).json({ error: 'Erreur.' }); }
  }

  static async getSuppliers(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getSuppliersByTenant(req.user!.tenant_id));
    } catch (error) { res.status(500).json({ error: 'Erreur.' }); }
  }

  static async getTradeCategories(_req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getTradeCategories());
    } catch (error) { res.status(500).json({ error: 'Erreur.' }); }
  }

  static async getWBSForProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await ProjectManagementService.getWBSByProject(Number(req.params.projectId)));
    } catch (error) { res.status(500).json({ error: 'Erreur.' }); }
  }
}
