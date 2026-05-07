import { Request, Response } from "express";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ProcurementService } from "../services/procurement.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProcurementX3SyncService } from "../services/procurement-x3-sync.service.js";

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
let logoLoader: Promise<string | null> | null = null;

async function getPuppeteer(): Promise<PuppeteerLike | null> {
  if (!puppeteerLoader) {
    puppeteerLoader = (async () => {
      try {
        const mod = await import("puppeteer");
        const candidate = (mod as any).default ?? mod;
        if (candidate && typeof candidate.launch === "function") {
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

async function getCompanyLogoDataUrl(): Promise<string | null> {
  if (!logoLoader) {
    logoLoader = (async () => {
      const candidates = [
        path.resolve(process.cwd(), "assets/branding/logo.png"),
        path.resolve(process.cwd(), "../api/assets/branding/logo.png"),
        new URL("../../assets/branding/logo.png", import.meta.url),
      ].filter(Boolean) as Array<string | URL>;

      for (const candidate of candidates) {
        try {
          const logoBuffer = await readFile(candidate);
          return `data:image/png;base64,${logoBuffer.toString("base64")}`;
        } catch {
          continue;
        }
      }

      return null;
    })();
  }

  return logoLoader;
}

function esc(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value?: string | null): string {
  return esc(value).replace(/\n/g, "<br/>");
}

function fmtDate(value?: string | Date | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("fr-FR");
}

function fmtMoney(value?: number | null, currency = "EUR"): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

const TENDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publie",
  OPEN: "Ouvert",
  EVALUATION: "Evaluation",
  AWARDED: "Attribue",
  CANCELLED: "Annule",
  CLOSED: "Cloture",
};

const TENDER_TYPE_LABELS: Record<string, string> = {
  OPEN: "Appel d'offres ouvert",
  RESTRICTED: "Appel d'offres restreint",
  NEGOTIATED: "Marche negocie",
};

const TENDER_CATEGORY_LABELS: Record<string, string> = {
  TRAVAUX: "Travaux",
  FOURNITURES: "Fournitures",
  SERVICES: "Services",
  MOE: "Maitrise d'oeuvre",
};

const TENDER_SUBMISSION_MODE_LABELS: Record<string, string> = {
  PLATFORM: "Plateforme securisee",
  EMAIL: "Remise par email",
  PHYSICAL: "Remise physique",
};

const TENDER_EVALUATION_METHOD_LABELS: Record<string, string> = {
  WEIGHTED: "Notation ponderee",
  LOWEST_PRICE: "Prix le plus bas",
  TECHNICAL_FIRST: "Technique puis financier",
};

const TENDER_BID_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Recue",
  EVALUATED: "Evaluee",
  ACCEPTED: "Retenue",
  REJECTED: "Rejetee",
  WITHDRAWN: "Retiree",
};

const TENDER_INVITATION_STATUS_LABELS: Record<string, string> = {
  INVITED: "Invite",
  ACKNOWLEDGED: "Accuse reception",
  RESPONDED: "A repondu",
  DECLINED: "A decline",
};

function buildTenderPdfHtml(tender: any, logoDataUrl?: string | null): string {
  const reference = tender.reference || `AO-${tender.id}`;
  const currency = tender.currency || "EUR";

  const rowsBids = Array.isArray(tender.bids)
    ? tender.bids
        .map((bid: any, idx: number) => {
          const compliance = bid.is_compliant ? "Conforme" : "Non conforme";
          return `
            <tr>
              <td>${idx + 1}</td>
              <td>${esc(bid.supplier?.name || "-")}</td>
              <td style="text-align:right;">${fmtMoney(bid.amount, currency)}</td>
              <td style="text-align:right;">${bid.technical_score != null ? Number(bid.technical_score).toFixed(1) : "-"}</td>
              <td style="text-align:right;">${bid.financial_score != null ? Number(bid.financial_score).toFixed(1) : "-"}</td>
              <td style="text-align:right;">${bid.total_score != null ? Number(bid.total_score).toFixed(1) : "-"}</td>
              <td>${compliance}</td>
              <td>${esc(TENDER_BID_STATUS_LABELS[bid.status] ?? bid.status ?? "-")}</td>
            </tr>
          `;
        })
        .join("")
    : "";

  const rowsInvitations = Array.isArray(tender.invitedSuppliers)
    ? tender.invitedSuppliers
        .map((inv: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${esc(inv.supplier?.name || "-")}</td>
            <td>${esc(inv.contact_email || inv.supplier?.email || "-")}</td>
            <td>${esc(TENDER_INVITATION_STATUS_LABELS[inv.response_status] ?? inv.response_status ?? "-")}</td>
            <td>${fmtDate(inv.invited_at)}</td>
          </tr>
        `)
        .join("")
    : "";

  const rowsDocuments = Array.isArray(tender.documents)
    ? tender.documents
        .map((doc: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${esc(doc.file_name || doc.name || "-")}</td>
            <td>${esc(doc.file_type || "-")}</td>
            <td>${doc.file_size ? `${Math.round(Number(doc.file_size) / 1024)} Ko` : "-"}</td>
          </tr>
        `)
        .join("")
    : "";

  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .cover { border: 1px solid #dbe5f0; border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
    .cover-top { background: linear-gradient(120deg, #0b2545, #1f4f84); color: #fff; padding: 14px 16px; }
    .brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .logo-wrap { width: 46px; height: 46px; border-radius: 12px; border: 1px solid rgba(255,255,255,.45); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.12); overflow: hidden; flex-shrink: 0; }
    .logo-wrap img { max-width: 36px; max-height: 36px; display: block; }
    .brand-meta { min-width: 0; }
    .brand-kicker { font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .9; }
    .brand-subtitle { font-size: 10px; opacity: .9; margin-top: 2px; }
    .kicker { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .9; }
    .title { margin: 6px 0 2px; font-size: 20px; font-weight: 900; line-height: 1.2; }
    .subtitle { font-size: 11px; opacity: .95; }
    .meta { padding: 12px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #f8fafc; }
    .meta-card { border: 1px solid #dbe5f0; border-radius: 7px; background: #fff; padding: 7px 8px; }
    .lbl { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: .05em; }
    .val { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .section { margin-top: 12px; }
    .section-title { margin: 0 0 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: #0b2545; }
    .block { border: 1px solid #dbe5f0; border-radius: 8px; background: #fff; padding: 8px 9px; line-height: 1.45; }
    .weights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .weight { border: 1px solid #dbe5f0; border-radius: 8px; padding: 8px; text-align: center; }
    .weight strong { display: block; font-size: 18px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dbe5f0; padding: 6px 7px; vertical-align: top; }
    th { background: #f1f5f9; font-size: 8px; text-transform: uppercase; letter-spacing: .05em; color: #334155; text-align: left; }
    .foot { margin-top: 12px; border-top: 1px solid #dbe5f0; padding-top: 6px; display: flex; justify-content: space-between; color: #64748b; font-size: 9px; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-top">
      <div class="brand-row">
        <div class="logo-wrap">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" />` : ""}
        </div>
        <div class="brand-meta">
          <div class="brand-kicker">BTP ERP - Dossier d'appel d'offres</div>
          <div class="brand-subtitle">Document premium de consultation et de gouvernance</div>
        </div>
      </div>
      <div class="kicker">Dossier d'appel d'offres</div>
      <h1 class="title">${esc(tender.title || reference)}</h1>
      <div class="subtitle">Reference ${esc(reference)}</div>
    </div>
    <div class="meta">
      <div class="meta-card"><div class="lbl">Projet</div><div class="val">${esc(tender.project ? `${tender.project.code} - ${tender.project.title}` : "-")}</div></div>
      <div class="meta-card"><div class="lbl">Lot</div><div class="val">${esc(tender.lot ? `Lot ${tender.lot.lot_number} - ${tender.lot.name}` : "-")}</div></div>
      <div class="meta-card"><div class="lbl">Statut</div><div class="val">${esc(TENDER_STATUS_LABELS[tender.status] ?? tender.status ?? "-")}</div></div>
      <div class="meta-card"><div class="lbl">Type</div><div class="val">${esc(TENDER_TYPE_LABELS[tender.type] ?? tender.type ?? "-")}</div></div>
      <div class="meta-card"><div class="lbl">Categorie</div><div class="val">${esc(TENDER_CATEGORY_LABELS[tender.category] ?? tender.category ?? "-")}</div></div>
      <div class="meta-card"><div class="lbl">Devise</div><div class="val">${esc(currency)}</div></div>
      <div class="meta-card"><div class="lbl">Budget estime</div><div class="val">${fmtMoney(tender.budget_estimate, currency)}</div></div>
      <div class="meta-card"><div class="lbl">Date limite depot</div><div class="val">${fmtDate(tender.submission_deadline)}</div></div>
      <div class="meta-card"><div class="lbl">Date ouverture</div><div class="val">${fmtDate(tender.opening_date)}</div></div>
      <div class="meta-card"><div class="lbl">Publication</div><div class="val">${fmtDate(tender.publication_date)}</div></div>
      <div class="meta-card"><div class="lbl">Clarifications</div><div class="val">${fmtDate(tender.clarification_deadline)}</div></div>
      <div class="meta-card"><div class="lbl">Date attribution</div><div class="val">${fmtDate(tender.award_date)}</div></div>
      <div class="meta-card"><div class="lbl">Mode de remise</div><div class="val">${esc(TENDER_SUBMISSION_MODE_LABELS[tender.submission_mode] ?? tender.submission_mode ?? "-")}</div></div>
      <div class="meta-card"><div class="lbl">Methode d'evaluation</div><div class="val">${esc(TENDER_EVALUATION_METHOD_LABELS[tender.evaluation_method] ?? tender.evaluation_method ?? "-")}</div></div>
      <div class="meta-card"><div class="lbl">Visite de site</div><div class="val">${fmtDate(tender.site_visit_date)}</div></div>
      <div class="meta-card"><div class="lbl">Lieu visite</div><div class="val">${esc(tender.site_visit_location || "-")}</div></div>
      <div class="meta-card"><div class="lbl">Cree par</div><div class="val">${esc(tender.createdBy ? `${tender.createdBy.firstname} ${tender.createdBy.lastname}` : "-")}</div></div>
    </div>
  </div>

  ${(tender.technical_weight != null || tender.financial_weight != null || tender.commercial_weight != null) ? `
    <section class="section">
      <h2 class="section-title">Ponderation cible</h2>
      <div class="weights">
        <div class="weight"><div class="lbl">Technique</div><strong>${tender.technical_weight ?? 0}%</strong></div>
        <div class="weight"><div class="lbl">Financier</div><strong>${tender.financial_weight ?? 0}%</strong></div>
        <div class="weight"><div class="lbl">Commercial</div><strong>${tender.commercial_weight ?? 0}%</strong></div>
      </div>
    </section>
  ` : ""}

  ${tender.description ? `
    <section class="section">
      <h2 class="section-title">Description</h2>
      <div class="block">${nl2br(tender.description)}</div>
    </section>
  ` : ""}

  ${tender.notes ? `
    <section class="section">
      <h2 class="section-title">Notes</h2>
      <div class="block">${nl2br(tender.notes)}</div>
    </section>
  ` : ""}

  ${tender.award_notes ? `
    <section class="section">
      <h2 class="section-title">Synthese d'attribution</h2>
      <div class="block">${nl2br(tender.award_notes)}</div>
    </section>
  ` : ""}

  <section class="section">
    <h2 class="section-title">Fournisseurs invites</h2>
    <table>
      <thead>
        <tr>
          <th style="width:6%;">#</th>
          <th style="width:34%;">Fournisseur</th>
          <th style="width:26%;">Email</th>
          <th style="width:18%;">Statut</th>
          <th style="width:16%;">Date invitation</th>
        </tr>
      </thead>
      <tbody>
        ${rowsInvitations || '<tr><td colspan="5">Aucun fournisseur invite.</td></tr>'}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2 class="section-title">Offres recues</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%;">#</th>
          <th style="width:22%;">Fournisseur</th>
          <th style="width:15%; text-align:right;">Montant</th>
          <th style="width:10%; text-align:right;">Tech</th>
          <th style="width:10%; text-align:right;">Fin</th>
          <th style="width:10%; text-align:right;">Total</th>
          <th style="width:13%;">Conformite</th>
          <th style="width:15%;">Statut</th>
        </tr>
      </thead>
      <tbody>
        ${rowsBids || '<tr><td colspan="8">Aucune offre recue.</td></tr>'}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2 class="section-title">Documents rattaches</h2>
    <table>
      <thead>
        <tr>
          <th style="width:6%;">#</th>
          <th style="width:58%;">Fichier</th>
          <th style="width:18%;">Type</th>
          <th style="width:18%;">Taille</th>
        </tr>
      </thead>
      <tbody>
        ${rowsDocuments || '<tr><td colspan="4">Aucun document.</td></tr>'}
      </tbody>
    </table>
  </section>

  <div class="foot">
    <span>${esc(reference)}</span>
    <span>Genere le ${esc(new Date().toLocaleString("fr-FR"))}</span>
  </div>
</body>
</html>
  `;
}

export class ProcurementController {
  // ==========================
  // TENDERS
  // ==========================

  static async getTenders(req: Request, res: Response): Promise<void> {
    try {
      const tenders = await ProcurementService.listTenders({
        project_id: req.query.projectId ? Number(req.query.projectId) : undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        category: req.query.category as string | undefined,
      });
      res.json(tenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenders" });
    }
  }

  static async getTender(req: Request, res: Response): Promise<void> {
    try {
      const tender = await ProcurementService.getTenderById(Number(req.params.id));
      if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
      res.json(tender);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tender" });
    }
  }

  static async generateTenderPdf(req: Request, res: Response): Promise<void> {
    let browser: BrowserLike | null = null;
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ error: "Identifiant invalide." });
        return;
      }

      const puppeteer = await getPuppeteer();
      if (!puppeteer) {
        res.status(503).json({ error: "Generation PDF indisponible: moteur PDF non disponible." });
        return;
      }

      const tender = await ProcurementService.getTenderById(id);
      if (!tender) {
        res.status(404).json({ error: "Appel d'offres introuvable." });
        return;
      }

      const logoDataUrl = await getCompanyLogoDataUrl();
      const html = buildTenderPdfHtml(tender, logoDataUrl);
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...(process.env.PUPPETEER_EXECUTABLE_PATH && { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }),
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBytes = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
      });
      const pdfBuffer = Buffer.from(pdfBytes);

      await page.close();
      await browser.close();
      browser = null;

      const filenameBase = String(tender.reference || `AO-${tender.id}`).replace(/[^a-zA-Z0-9-_]/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filenameBase}.pdf\"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[ProcurementController.generateTenderPdf]", error);
      res.status(500).json({ error: "Impossible de generer le PDF de l'appel d'offres." });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore close errors
        }
      }
    }
  }

  static async createTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const b = req.body;
      const tender = await ProcurementService.createTender({
        project_id: Number(b.project_id),
        title: b.title,
        status: b.status,
        reference: b.reference,
        description: b.description,
        type: b.type,
        category: b.category,
        currency: b.currency,
        budget_estimate: b.budget_estimate ? Number(b.budget_estimate) : undefined,
        submission_deadline: b.submission_deadline ? new Date(b.submission_deadline) : undefined,
        opening_date: b.opening_date ? new Date(b.opening_date) : undefined,
        publication_date: b.publication_date ? new Date(b.publication_date) : undefined,
        clarification_deadline: b.clarification_deadline ? new Date(b.clarification_deadline) : undefined,
        site_visit_date: b.site_visit_date ? new Date(b.site_visit_date) : undefined,
        site_visit_location: b.site_visit_location,
        submission_mode: b.submission_mode,
        evaluation_method: b.evaluation_method,
        technical_weight: b.technical_weight !== undefined ? Number(b.technical_weight) : undefined,
        financial_weight: b.financial_weight !== undefined ? Number(b.financial_weight) : undefined,
        commercial_weight: b.commercial_weight !== undefined ? Number(b.commercial_weight) : undefined,
        lot_id: b.lot_id ? Number(b.lot_id) : undefined,
        wbs_id: b.wbs_id ? Number(b.wbs_id) : undefined,
        document_ids: Array.isArray(b.document_ids)
          ? b.document_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
          : undefined,
        invited_supplier_ids: Array.isArray(b.invited_supplier_ids)
          ? b.invited_supplier_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
          : undefined,
        notes: b.notes,
        award_notes: b.award_notes,
        created_by: userId!,
      });
      res.status(201).json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const b = req.body;
      const data: Record<string, any> = {};
      if (b.title !== undefined)               data.title = b.title;
      if (b.reference !== undefined)           data.reference = b.reference;
      if (b.description !== undefined)         data.description = b.description;
      if (b.type !== undefined)                data.type = b.type;
      if (b.category !== undefined)            data.category = b.category;
      if (b.status !== undefined)              data.status = b.status;
      if (b.currency !== undefined)            data.currency = b.currency;
      if (b.budget_estimate !== undefined)     data.budget_estimate = b.budget_estimate ? Number(b.budget_estimate) : null;
      if (b.submission_deadline !== undefined) data.submission_deadline = b.submission_deadline ? new Date(b.submission_deadline) : null;
      if (b.opening_date !== undefined)        data.opening_date = b.opening_date ? new Date(b.opening_date) : null;
      if (b.award_date !== undefined)          data.award_date = b.award_date ? new Date(b.award_date) : null;
      if (b.publication_date !== undefined)    data.publication_date = b.publication_date ? new Date(b.publication_date) : null;
      if (b.clarification_deadline !== undefined) data.clarification_deadline = b.clarification_deadline ? new Date(b.clarification_deadline) : null;
      if (b.site_visit_date !== undefined)     data.site_visit_date = b.site_visit_date ? new Date(b.site_visit_date) : null;
      if (b.site_visit_location !== undefined) data.site_visit_location = b.site_visit_location || null;
      if (b.submission_mode !== undefined)     data.submission_mode = b.submission_mode;
      if (b.evaluation_method !== undefined)   data.evaluation_method = b.evaluation_method;
      if (b.technical_weight !== undefined)    data.technical_weight = b.technical_weight === null || b.technical_weight === '' ? null : Number(b.technical_weight);
      if (b.financial_weight !== undefined)    data.financial_weight = b.financial_weight === null || b.financial_weight === '' ? null : Number(b.financial_weight);
      if (b.commercial_weight !== undefined)   data.commercial_weight = b.commercial_weight === null || b.commercial_weight === '' ? null : Number(b.commercial_weight);
      if (b.lot_id !== undefined)              data.lot_id = b.lot_id ? Number(b.lot_id) : null;
      if (b.document_ids !== undefined)        data.document_ids = Array.isArray(b.document_ids)
        ? b.document_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
      if (b.invited_supplier_ids !== undefined) data.invited_supplier_ids = Array.isArray(b.invited_supplier_ids)
        ? b.invited_supplier_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
      if (b.notes !== undefined)               data.notes = b.notes || null;
      if (b.award_notes !== undefined)         data.award_notes = b.award_notes || null;
      if (userId)                              data.invitation_created_by = userId;
      const tender = await ProcurementService.updateTender(Number(req.params.id), data);
      res.json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteTender(req: Request, res: Response): Promise<void> {
    try {
      await ProcurementService.deleteTender(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ==========================
  // BIDS
  // ==========================

  static async submitBid(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const b = req.body;
      const bid = await ProcurementService.submitBid({
        tender_id: Number(req.params.id),
        supplier_id: Number(b.supplier_id),
        amount: Number(b.amount),
        notes: b.notes,
        document_id: b.document_id ? Number(b.document_id) : undefined,
        submitted_at: b.submitted_at ? new Date(b.submitted_at) : undefined,
        validity_period: b.validity_period ? Number(b.validity_period) : undefined,
        is_compliant: b.is_compliant !== undefined ? Boolean(b.is_compliant) : true,
        created_by: userId!,
      });
      res.status(201).json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateBid(req: Request, res: Response): Promise<void> {
    try {
      const b = req.body;
      const bid = await ProcurementService.updateBid(Number(req.params.bidId), {
        amount: b.amount !== undefined ? Number(b.amount) : undefined,
        status: b.status,
        technical_score: b.technical_score !== undefined ? Number(b.technical_score) : undefined,
        financial_score: b.financial_score !== undefined ? Number(b.financial_score) : undefined,
        total_score: b.total_score !== undefined ? Number(b.total_score) : undefined,
        rank: b.rank !== undefined ? Number(b.rank) : undefined,
        notes: b.notes,
        document_id: b.document_id !== undefined ? (b.document_id ? Number(b.document_id) : null) : undefined,
        is_compliant: b.is_compliant !== undefined ? Boolean(b.is_compliant) : undefined,
        validity_period: b.validity_period !== undefined ? Number(b.validity_period) : undefined,
      });
      res.json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteBid(req: Request, res: Response): Promise<void> {
    try {
      await ProcurementService.deleteBid(Number(req.params.bidId));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async awardTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tender = await ProcurementService.awardTender(
        Number(req.params.id),
        Number(req.body.bid_id),
        userId!,
      );
      res.json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as AuthRequest).user?.tenant_id;
      if (!tenantId) {
        res.status(401).json({ error: "Tenant requis" });
        return;
      }

      const suppliers = await ProcurementService.getSuppliers(tenantId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  }

  static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tenantId = (req as AuthRequest).user?.tenant_id;
      if (!userId || !tenantId) {
        res.status(401).json({ error: "Utilisateur ou tenant invalide" });
        return;
      }

      const supplier = await ProcurementService.createSupplier({
        ...req.body,
        tenant_id: tenantId,
        created_by: userId
      });
      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to create supplier" });
    }
  }

  static async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as AuthRequest).user?.tenant_id;
      const supplierId = Number(req.params.id);
      if (!tenantId) {
        res.status(401).json({ error: "Tenant requis" });
        return;
      }
      if (!Number.isFinite(supplierId) || supplierId <= 0) {
        res.status(400).json({ error: "Identifiant fournisseur invalide" });
        return;
      }

      const supplier = await ProcurementService.updateSupplier(supplierId, tenantId, req.body ?? {});
      res.json(supplier);
    } catch (error: any) {
      if (error?.message === "SUPPLIER_NOT_FOUND") {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
      res.status(500).json({ error: "Failed to update supplier" });
    }
  }

  static async deleteSupplier(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as AuthRequest).user?.tenant_id;
      const supplierId = Number(req.params.id);
      if (!tenantId) {
        res.status(401).json({ error: "Tenant requis" });
        return;
      }
      if (!Number.isFinite(supplierId) || supplierId <= 0) {
        res.status(400).json({ error: "Identifiant fournisseur invalide" });
        return;
      }

      await ProcurementService.deleteSupplier(supplierId, tenantId);
      res.status(204).send();
    } catch (error: any) {
      if (error?.message === "SUPPLIER_NOT_FOUND") {
        res.status(404).json({ error: "Supplier not found" });
        return;
      }
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  }

  // Purchase Orders
  static async getPurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
      const pos = await ProcurementService.getPurchaseOrders();
      res.json(pos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  }

  static async createPOFromBid(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { bidId } = req.body;
      const po = await ProcurementService.createPOFromBid(bidId, userId!);
      res.status(201).json(po);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deliveries
  static async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.query.projectId);
      if (!projectId) {
        res.status(400).json({ error: "projectId query param is required" });
        return;
      }
      const deliveries = await ProcurementService.getDeliveriesByProject(projectId);
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  }

  static async createDelivery(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const delivery = await ProcurementService.createDelivery({
        ...req.body,
        created_by: userId
      });
      res.status(201).json(delivery);
    } catch (error) {
      res.status(500).json({ error: "Failed to create delivery" });
    }
  }

  // Goods Receipts
  static async createGoodsReceipt(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const receipt = await ProcurementService.createGoodsReceipt({
        ...req.body,
        created_by: userId,
        warehouse_id: req.body.warehouse_id ? Number(req.body.warehouse_id) : undefined,
        location_id: req.body.location_id ? Number(req.body.location_id) : undefined,
        received_at: new Date(req.body.received_at || Date.now()),
        items: Array.isArray(req.body.items)
          ? req.body.items.map((item: any) => ({
              item_id: Number(item.item_id),
              quantity_ordered: Number(item.quantity_ordered),
              quantity_received: Number(item.quantity_received),
              quantity_rejected: item.quantity_rejected !== undefined ? Number(item.quantity_rejected) : 0,
              unit_cost: item.unit_cost !== undefined ? Number(item.unit_cost) : 0,
            }))
          : [],
      });
      res.status(201).json(receipt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getGoodsReceipts(req: Request, res: Response): Promise<void> {
    try {
      const orderId = Number(req.query.orderId);
      if (!orderId) {
        res.status(400).json({ error: "orderId query param is required" });
        return;
      }
      const receipts = await ProcurementService.getGoodsReceiptsByOrder(orderId);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goods receipts" });
    }
  }

  static async createWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const b = req.body;
      const warehouse = await ProcurementService.createWarehouse({
        project_id: b.project_id ? Number(b.project_id) : undefined,
        code: String(b.code || "").trim(),
        name: String(b.name || "").trim(),
      });
      res.status(201).json(warehouse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const warehouses = await ProcurementService.listWarehouses(projectId);
      res.json(warehouses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createWarehouseLocation(req: Request, res: Response): Promise<void> {
    try {
      const warehouseId = Number(req.params.id);
      const b = req.body;
      const location = await ProcurementService.createWarehouseLocation(warehouseId, {
        code: String(b.code || "").trim(),
        name: String(b.name || "").trim(),
        parent_id: b.parent_id ? Number(b.parent_id) : undefined,
      });
      res.status(201).json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getInventoryBalances(req: Request, res: Response): Promise<void> {
    try {
      const balances = await ProcurementService.getInventoryBalances({
        project_id: req.query.projectId ? Number(req.query.projectId) : undefined,
        warehouse_id: req.query.warehouseId ? Number(req.query.warehouseId) : undefined,
        location_id: req.query.locationId ? Number(req.query.locationId) : undefined,
        item_id: req.query.itemId ? Number(req.query.itemId) : undefined,
      });
      res.json(balances);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3Suppliers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncSuppliersFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3Items(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncItemsFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3PurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncPurchaseOrdersFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getX3SyncJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await ProcurementX3SyncService.getSyncJobs({
        entityName: req.query.entityName ? String(req.query.entityName) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(jobs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
