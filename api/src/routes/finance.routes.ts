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

// Situations Travaux
financeRouter.get("/situations-travaux", authenticateToken, FinanceController.getSituationsTravaux);
financeRouter.get("/situations-travaux/:id", authenticateToken, FinanceController.getSituationTravaux);
financeRouter.post("/situations-travaux", authenticateToken, FinanceController.createSituationTravaux);
financeRouter.put("/situations-travaux/:id", authenticateToken, FinanceController.updateSituationTravaux);

export default financeRouter;
