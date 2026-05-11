import { Router } from "express";
import { ContractController } from "../controllers/contract.controller.js";
import { authenticateToken, requirePermission } from "../middlewares/auth.middleware.js";

const contractRouter = Router();

// Contracts
contractRouter.get("/", authenticateToken, requirePermission("contract:read"), ContractController.getContracts);
contractRouter.post("/", authenticateToken, requirePermission("contract:create"), ContractController.createContract);
contractRouter.get("/:id", authenticateToken, requirePermission("contract:read"), ContractController.getContract);
contractRouter.put("/:id", authenticateToken, requirePermission("contract:update"), ContractController.updateContract);
contractRouter.delete("/:id", authenticateToken, requirePermission("contract:delete"), ContractController.deleteContract);
contractRouter.patch("/:id/archive", authenticateToken, requirePermission("contract:update"), ContractController.archiveContract);

// Line Items
contractRouter.post("/:id/line-items", authenticateToken, requirePermission("contract:update"), ContractController.createLineItem);
contractRouter.put("/:id/line-items/:itemId", authenticateToken, requirePermission("contract:update"), ContractController.updateLineItem);
contractRouter.delete("/:id/line-items/:itemId", authenticateToken, requirePermission("contract:update"), ContractController.deleteLineItem);

// Change Orders
contractRouter.post("/:id/change-orders", authenticateToken, requirePermission("change-order:create"), ContractController.createChangeOrder);
contractRouter.put("/change-orders/:id", authenticateToken, requirePermission("change-order:update"), ContractController.updateChangeOrder);
contractRouter.delete("/change-orders/:id", authenticateToken, requirePermission("change-order:delete"), ContractController.deleteChangeOrder);
contractRouter.patch("/change-orders/:id/approve", authenticateToken, requirePermission("change-order:approve"), ContractController.approveChangeOrder);
contractRouter.patch("/change-orders/:id/reject", authenticateToken, requirePermission("change-order:approve"), ContractController.rejectChangeOrder);

// Invoices
contractRouter.get("/invoices/all", authenticateToken, requirePermission("invoice:read"), ContractController.getInvoices);
contractRouter.post("/invoices", authenticateToken, requirePermission("invoice:create"), ContractController.createInvoice);

// Payments
contractRouter.post("/payments", authenticateToken, requirePermission("payment:create"), ContractController.createPayment);

export default contractRouter;

