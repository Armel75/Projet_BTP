import { Router } from "express";
import { ProcurementController } from "../controllers/procurement.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const procurementRouter = Router();

// Tenders
procurementRouter.get("/tenders", authenticateToken, ProcurementController.getTenders);
procurementRouter.post("/tenders", authenticateToken, ProcurementController.createTender);
procurementRouter.post("/tenders/:id/bids", authenticateToken, ProcurementController.submitBid);

// Suppliers
procurementRouter.get("/suppliers", authenticateToken, ProcurementController.getSuppliers);
procurementRouter.post("/suppliers", authenticateToken, ProcurementController.createSupplier);

// Purchase Orders
procurementRouter.get("/purchase-orders", authenticateToken, ProcurementController.getPurchaseOrders);
procurementRouter.post("/purchase-orders", authenticateToken, ProcurementController.createPOFromBid);

// Deliveries
procurementRouter.get("/deliveries", authenticateToken, ProcurementController.getDeliveries);
procurementRouter.post("/deliveries", authenticateToken, ProcurementController.createDelivery);

// Goods Receipts
procurementRouter.get("/goods-receipts", authenticateToken, ProcurementController.getGoodsReceipts);
procurementRouter.post("/goods-receipts", authenticateToken, ProcurementController.createGoodsReceipt);

export default procurementRouter;
