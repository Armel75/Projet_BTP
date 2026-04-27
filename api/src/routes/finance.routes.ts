import { Router } from "express";
import { FinanceController } from "../controllers/finance.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const financeRouter = Router();

// Budget Lines
financeRouter.get("/budget-lines", authenticateToken, FinanceController.getBudgetLines);
financeRouter.post("/budget-lines", authenticateToken, FinanceController.createBudgetLine);
financeRouter.get("/budget-lines/:id", authenticateToken, FinanceController.getBudgetLine);
financeRouter.put("/budget-lines/:id", authenticateToken, FinanceController.updateBudgetLine);
financeRouter.get("/budget-lines/:id/transactions", authenticateToken, FinanceController.getTransactionsByBudget);

// Cost Transactions
financeRouter.get("/transactions", authenticateToken, FinanceController.getTransactions);
financeRouter.post("/transactions", authenticateToken, FinanceController.createTransaction);

export default financeRouter;
