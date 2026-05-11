import { Router } from "express";
import { FinanceController } from "../controllers/finance.controller.js";
import { authenticateToken, requirePermission } from "../middlewares/auth.middleware.js";

const financeRouter = Router();

// Budget Lines
financeRouter.get("/budget-lines", authenticateToken, requirePermission("budget:read"), FinanceController.getBudgetLines);
financeRouter.post("/budget-lines", authenticateToken, requirePermission("budget:create"), FinanceController.createBudgetLine);
financeRouter.get("/budget-lines/:id", authenticateToken, requirePermission("budget:read"), FinanceController.getBudgetLine);
financeRouter.put("/budget-lines/:id", authenticateToken, requirePermission("budget:update"), FinanceController.updateBudgetLine);
financeRouter.get("/budget-lines/:id/transactions", authenticateToken, requirePermission("budget:read"), FinanceController.getTransactionsByBudget);

// Cost Transactions
financeRouter.get("/transactions", authenticateToken, requirePermission("budget:read"), FinanceController.getTransactions);
financeRouter.post("/transactions", authenticateToken, requirePermission("budget:update"), FinanceController.createTransaction);

// Situations Travaux
financeRouter.get("/situations-travaux", authenticateToken, requirePermission("situation-travaux:read"), FinanceController.getSituationsTravaux);
financeRouter.get("/situations-travaux/:id", authenticateToken, requirePermission("situation-travaux:read"), FinanceController.getSituationTravaux);
financeRouter.post("/situations-travaux", authenticateToken, requirePermission("situation-travaux:create"), FinanceController.createSituationTravaux);
financeRouter.put("/situations-travaux/:id", authenticateToken, requirePermission("situation-travaux:update"), FinanceController.updateSituationTravaux);

export default financeRouter;
