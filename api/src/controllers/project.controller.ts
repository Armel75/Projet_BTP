import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProjectManagementService } from "../services/project-management.service.js";

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
      const project = await ProjectManagementService.updateProject(id, req.body, req.user?.tenant_id);
      res.json(project);
    } catch (error: any) {
      console.error('[ProjectController.updateProject]', error);
      if (error.message?.includes('introuvable')) res.status(404).json({ error: error.message });
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
      const { project_id, wbs_id, title, status = 'TODO', progress = 0, planned_start, planned_end } = req.body;
      if (!title?.trim())  { res.status(400).json({ error: 'Titre requis.' }); return; }
      if (!project_id)     { res.status(400).json({ error: 'project_id requis.' }); return; }
      const task = await ProjectManagementService.createTask({
        project_id: Number(project_id), wbs_id: wbs_id ? Number(wbs_id) : null,
        title: title.trim(), status, progress: Number(progress),
        tenant_id: req.user!.tenant_id, created_by: req.user!.id,
        planned_start: planned_start || null, planned_end: planned_end || null,
      });
      res.status(201).json(task);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, res); if (id === null) return;
      res.json(await ProjectManagementService.updateTask(id, req.body));
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
      if (!lot_number?.trim()) { res.status(400).json({ error: 'lot_number requis.' }); return; }
      if (!trade_code?.trim()) { res.status(400).json({ error: 'trade_code requis.' }); return; }
      const lot = await ProjectManagementService.createProjectLot({
        project_id:       Number(project_id),
        name:             name.trim(),
        lot_number:       lot_number.trim(),
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
      if (body.start_date !== undefined) body.start_date = toDateTime(body.start_date);
      if (body.end_date   !== undefined) body.end_date   = toDateTime(body.end_date);
      res.json(await ProjectManagementService.updateProjectLot(id, body, req.user!.tenant_id));
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  }

  static async deleteLot(req: AuthRequest, res: Response): Promise<void> {
    try {
      await ProjectManagementService.deleteProjectLot(Number(req.params.id));
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Erreur suppression lot.' }); }
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
      res.status(201).json(await ProjectManagementService.createTaskDependency(Number(taskId), Number(dependsOnId)));
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
