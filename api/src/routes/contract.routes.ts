import { Router } from "express";
import { ContractController } from "../controllers/contract.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const contractRouter = Router();

// Contracts
contractRouter.get("/", authenticateToken, ContractController.getContracts);
contractRouter.post("/", authenticateToken, ContractController.createContract);
contractRouter.get("/:id", authenticateToken, ContractController.getContract);

// Change Orders
contractRouter.post("/:id/change-orders", authenticateToken, ContractController.createChangeOrder);
contractRouter.patch("/change-orders/:id/approve", authenticateToken, ContractController.approveChangeOrder);
contractRouter.patch("/change-orders/:id/reject", authenticateToken, ContractController.rejectChangeOrder);

// Invoices
contractRouter.get("/invoices/all", authenticateToken, ContractController.getInvoices); // query filtered
contractRouter.post("/invoices", authenticateToken, ContractController.createInvoice);

// Payments
contractRouter.post("/payments", authenticateToken, ContractController.createPayment);

export default contractRouter;
