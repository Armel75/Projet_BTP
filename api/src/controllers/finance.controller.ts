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
}
