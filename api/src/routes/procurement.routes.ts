import { Router } from "express";
import { ProcurementController } from "../controllers/procurement.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const procurementRouter = Router();

// Tenders
procurementRouter.get("/tenders",                          authenticateToken, ProcurementController.getTenders);
procurementRouter.post("/tenders",                         authenticateToken, ProcurementController.createTender);
procurementRouter.get("/tenders/:id",                      authenticateToken, ProcurementController.getTender);
procurementRouter.put("/tenders/:id",                      authenticateToken, ProcurementController.updateTender);
procurementRouter.delete("/tenders/:id",                   authenticateToken, ProcurementController.deleteTender);
procurementRouter.post("/tenders/:id/award",               authenticateToken, ProcurementController.awardTender);

// Bids
procurementRouter.post("/tenders/:id/bids",                authenticateToken, ProcurementController.submitBid);
procurementRouter.put("/tenders/:id/bids/:bidId",          authenticateToken, ProcurementController.updateBid);
procurementRouter.delete("/tenders/:id/bids/:bidId",       authenticateToken, ProcurementController.deleteBid);

// Suppliers
procurementRouter.get("/suppliers",                        authenticateToken, ProcurementController.getSuppliers);
procurementRouter.post("/suppliers",                       authenticateToken, ProcurementController.createSupplier);

// Purchase Orders
procurementRouter.get("/purchase-orders",                  authenticateToken, ProcurementController.getPurchaseOrders);
procurementRouter.post("/purchase-orders",                 authenticateToken, ProcurementController.createPOFromBid);

// Deliveries
procurementRouter.get("/deliveries",                       authenticateToken, ProcurementController.getDeliveries);
procurementRouter.post("/deliveries",                      authenticateToken, ProcurementController.createDelivery);

// Goods Receipts
procurementRouter.get("/goods-receipts",                   authenticateToken, ProcurementController.getGoodsReceipts);
procurementRouter.post("/goods-receipts",                  authenticateToken, ProcurementController.createGoodsReceipt);

// Warehouses & Inventory
procurementRouter.get("/warehouses",                       authenticateToken, ProcurementController.getWarehouses);
procurementRouter.post("/warehouses",                      authenticateToken, ProcurementController.createWarehouse);
procurementRouter.post("/warehouses/:id/locations",        authenticateToken, ProcurementController.createWarehouseLocation);
procurementRouter.get("/inventory/balances",               authenticateToken, ProcurementController.getInventoryBalances);

// Sage X3 Sync
procurementRouter.post("/x3/sync/suppliers",               authenticateToken, ProcurementController.syncX3Suppliers);
procurementRouter.post("/x3/sync/items",                   authenticateToken, ProcurementController.syncX3Items);
procurementRouter.post("/x3/sync/purchase-orders",         authenticateToken, ProcurementController.syncX3PurchaseOrders);
procurementRouter.get("/x3/sync/jobs",                     authenticateToken, ProcurementController.getX3SyncJobs);

export default procurementRouter;

