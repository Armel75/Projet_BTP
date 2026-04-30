import { FinanceService } from "../services/finance.service.js";
export class FinanceController {
    // Budget Lines
    static async getBudgetLines(req, res) {
        try {
            const projectId = Number(req.query.projectId);
            if (!projectId) {
                res.status(400).json({ error: "projectId query param is required" });
                return;
            }
            const budgetLines = await FinanceService.getBudgetLinesByProject(projectId);
            res.json(budgetLines);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch budget lines" });
        }
    }
    static async getBudgetLine(req, res) {
        try {
            const bl = await FinanceService.getBudgetLineById(Number(req.params.id));
            if (!bl) {
                res.status(404).json({ error: "Budget line not found" });
                return;
            }
            res.json(bl);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch budget line" });
        }
    }
    static async createBudgetLine(req, res) {
        try {
            const userId = req.user?.id;
            const bl = await FinanceService.createBudgetLine({
                ...req.body,
                created_by: userId
            });
            res.status(201).json(bl);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async updateBudgetLine(req, res) {
        try {
            const bl = await FinanceService.updateBudgetLine(Number(req.params.id), req.body);
            res.json(bl);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    // Cost Transactions
    static async createTransaction(req, res) {
        try {
            const userId = req.user?.id;
            const tx = await FinanceService.createCostTransaction({
                ...req.body,
                created_by: userId,
                transaction_date: new Date(req.body.transaction_date || Date.now())
            });
            res.status(201).json(tx);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getTransactions(req, res) {
        try {
            const budgetId = req.query.budgetId ? Number(req.query.budgetId) : undefined;
            const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
            const filters = {};
            if (budgetId)
                filters.budget_id = budgetId;
            if (projectId)
                filters.project_id = projectId;
            const transactions = await FinanceService.getCostTransactions(filters);
            res.json(transactions);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch transactions" });
        }
    }
    static async getTransactionsByBudget(req, res) {
        try {
            const transactions = await FinanceService.getTransactionsByBudgetLine(Number(req.params.id));
            res.json(transactions);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch transactions for budget line" });
        }
    }
}
