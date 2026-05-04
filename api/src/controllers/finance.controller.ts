import { Request, Response } from "express";
import { FinanceService } from "../services/finance.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export class FinanceController {
  // Budget Lines
  static async getBudgetLines(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.query.projectId);
      if (!projectId) {
        res.status(400).json({ error: "projectId query param is required" });
        return;
      }
      const budgetLines = await FinanceService.getBudgetLinesByProject(projectId);
      res.json(budgetLines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget lines" });
    }
  }

  static async getBudgetLine(req: Request, res: Response): Promise<void> {
    try {
      const bl = await FinanceService.getBudgetLineById(Number(req.params.id));
      if (!bl) {
        res.status(404).json({ error: "Budget line not found" });
        return;
      }
      res.json(bl);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget line" });
    }
  }

  static async createBudgetLine(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const bl = await FinanceService.createBudgetLine({
        ...req.body,
        created_by: userId!
      });
      res.status(201).json(bl);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateBudgetLine(req: Request, res: Response): Promise<void> {
    try {
      const bl = await FinanceService.updateBudgetLine(Number(req.params.id), req.body);
      res.json(bl);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Cost Transactions
  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tx = await FinanceService.createCostTransaction({
        ...req.body,
        created_by: userId!,
        transaction_date: new Date(req.body.transaction_date || Date.now())
      });
      res.status(201).json(tx);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = req.query.budgetId ? Number(req.query.budgetId) : undefined;
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      
      const filters: any = {};
      if (budgetId) filters.budget_id = budgetId;
      if (projectId) filters.project_id = projectId;

      const transactions = await FinanceService.getCostTransactions(filters);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  }

  static async getTransactionsByBudget(req: Request, res: Response): Promise<void> {
    try {
      const transactions = await FinanceService.getTransactionsByBudgetLine(Number(req.params.id));
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions for budget line" });
    }
  }

  // Situations de travaux
  static async getSituationsTravaux(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const contractId = req.query.contractId ? Number(req.query.contractId) : undefined;
      const purchaseOrderId = req.query.purchaseOrderId ? Number(req.query.purchaseOrderId) : undefined;
      const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const filters: any = {};
      if (projectId) filters.project_id = projectId;
      if (contractId) filters.contract_id = contractId;
      if (purchaseOrderId) filters.purchase_order_id = purchaseOrderId;
      if (supplierId) filters.supplier_id = supplierId;
      if (status) filters.status = status;

      const situations = await FinanceService.getSituationsTravaux(filters);
      res.json(situations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch situations travaux" });
    }
  }

  static async getSituationTravaux(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid situation id" });
        return;
      }

      const situation = await FinanceService.getSituationTravauxById(id);
      if (!situation) {
        res.status(404).json({ error: "Situation travaux not found" });
        return;
      }

      res.json(situation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch situation travaux" });
    }
  }

  static async createSituationTravaux(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const payload: any = {
        ...req.body,
        created_by: userId,
      };

      if (payload.status === 'APPROVED') {
        payload.approved_by = payload.approved_by ?? userId;
        payload.approved_at = payload.approved_at ?? new Date();
      }

      const created = await FinanceService.createSituationTravaux(payload);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create situation travaux" });
    }
  }

  static async updateSituationTravaux(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid situation id" });
        return;
      }

      const userId = (req as AuthRequest).user?.id;
      const payload: any = {
        ...req.body,
      };

      if (payload.status === 'APPROVED') {
        payload.approved_by = payload.approved_by ?? userId;
        payload.approved_at = payload.approved_at ?? new Date();
      }

      const updated = await FinanceService.updateSituationTravaux(id, payload);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update situation travaux" });
    }
  }
}
