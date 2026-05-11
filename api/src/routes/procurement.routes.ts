import { Router } from "express";
import { ProcurementController } from "../controllers/procurement.controller.js";
import { authenticateToken, requirePermission } from "../middlewares/auth.middleware.js";
import { uploadDocuments } from "../middlewares/upload.middleware.js";
import { prisma } from "../config/prisma.js";

const procurementRouter = Router();

// ── DCE upload (avant les routes :id pour éviter les conflits) ────────────────
procurementRouter.post(
	"/tenders/dce-uploads",
	authenticateToken,
	requirePermission("tender:update"),
	uploadDocuments,
	async (req: any, res: any) => {
		try {
			const files = Array.isArray(req.files) ? req.files : [];
			if (files.length === 0) return res.status(400).json({ error: "Aucun fichier reçu." });

			const userId: number = req.user?.id;
			const tenantId: number = req.user?.tenantId ?? req.user?.tenant_id;
			const projectId: number = Number(req.body?.project_id);

			if (!tenantId) return res.status(401).json({ error: "Tenant requis." });
			if (!projectId) return res.status(400).json({ error: "project_id requis pour l'upload de documents." });

			const createdDocuments = await Promise.all(
				files.map(async (f: any) => {
					const fileUrl = `/uploads/documents/${f.filename}`;
					const ext = (f.originalname?.split(".").pop() ?? "").toLowerCase();
					const fileType = ["pdf", "dwg", "docx", "xlsx", "pptx", "zip", "rar"].includes(ext) ? ext : "other";

					const doc = await prisma.document.create({
						data: {
							name: f.originalname,
							file_url: fileUrl,
							file_name: f.originalname,
							file_size: f.size,
							file_type: fileType,
							category: "SPEC",
							phase: "DCE",
							discipline: "GENERAL",
							status: "APPROVED",
							revision: "A",
							project_id: projectId,
							tenant_id: tenantId,
							created_by: userId ?? null,
						},
					});

					return {
						documentId: doc.id,
						url: fileUrl,
						filename: f.originalname,
						size: f.size,
					};
				})
			);

			res.json({ files: createdDocuments });
		} catch (err: any) {
			console.error("[DCE upload]", err);
			res.status(500).json({ error: err.message ?? "Erreur serveur lors de l'upload." });
		}
	}
);

// Tenders
procurementRouter.get("/tenders",                          authenticateToken, requirePermission("tender:read"),    ProcurementController.getTenders);
procurementRouter.post("/tenders",                         authenticateToken, requirePermission("tender:create"),  ProcurementController.createTender);
procurementRouter.get("/tenders/:id",                      authenticateToken, requirePermission("tender:read"),    ProcurementController.getTender);
procurementRouter.get("/tenders/:id/pdf",                  authenticateToken, requirePermission("tender:read"),    ProcurementController.generateTenderPdf);
procurementRouter.put("/tenders/:id",                      authenticateToken, requirePermission("tender:update"),  ProcurementController.updateTender);
procurementRouter.delete("/tenders/:id",                   authenticateToken, requirePermission("tender:delete"),  ProcurementController.deleteTender);
procurementRouter.post("/tenders/:id/award",               authenticateToken, requirePermission("tender:approve"), ProcurementController.awardTender);

// Bids
procurementRouter.post("/tenders/:id/bids",                authenticateToken, requirePermission("tender:update"), ProcurementController.submitBid);
procurementRouter.put("/tenders/:id/bids/:bidId",          authenticateToken, requirePermission("tender:update"), ProcurementController.updateBid);
procurementRouter.delete("/tenders/:id/bids/:bidId",       authenticateToken, requirePermission("tender:update"), ProcurementController.deleteBid);

// Suppliers
procurementRouter.get("/suppliers",                        authenticateToken, requirePermission("supplier:read"),   ProcurementController.getSuppliers);
procurementRouter.post("/suppliers",                       authenticateToken, requirePermission("supplier:create"), ProcurementController.createSupplier);
procurementRouter.put("/suppliers/:id",                    authenticateToken, requirePermission("supplier:update"), ProcurementController.updateSupplier);
procurementRouter.delete("/suppliers/:id",                 authenticateToken, requirePermission("supplier:delete"), ProcurementController.deleteSupplier);

// Purchase Orders
procurementRouter.get("/purchase-orders",                  authenticateToken, requirePermission("purchase-order:read"),   ProcurementController.getPurchaseOrders);
procurementRouter.post("/purchase-orders",                 authenticateToken, requirePermission("purchase-order:create"), ProcurementController.createPOFromBid);

// Deliveries
procurementRouter.get("/deliveries",                       authenticateToken, requirePermission("delivery:read"),   ProcurementController.getDeliveries);
procurementRouter.post("/deliveries",                      authenticateToken, requirePermission("delivery:create"), ProcurementController.createDelivery);

// Goods Receipts
procurementRouter.get("/goods-receipts",                   authenticateToken, requirePermission("goods-receipt:read"),   ProcurementController.getGoodsReceipts);
procurementRouter.post("/goods-receipts",                  authenticateToken, requirePermission("goods-receipt:create"), ProcurementController.createGoodsReceipt);

// Warehouses & Inventory
procurementRouter.get("/warehouses",                       authenticateToken, requirePermission("warehouse:read"),            ProcurementController.getWarehouses);
procurementRouter.post("/warehouses",                      authenticateToken, requirePermission("warehouse:create"),          ProcurementController.createWarehouse);
procurementRouter.post("/warehouses/:id/locations",        authenticateToken, requirePermission("warehouse-location:create"), ProcurementController.createWarehouseLocation);
procurementRouter.get("/inventory/balances",               authenticateToken, requirePermission("stock:read"),                ProcurementController.getInventoryBalances);

// Sage X3 Sync
procurementRouter.post("/x3/sync/suppliers",               authenticateToken, requirePermission("erp-sync:manage"), ProcurementController.syncX3Suppliers);
procurementRouter.post("/x3/sync/items",                   authenticateToken, requirePermission("erp-sync:manage"), ProcurementController.syncX3Items);
procurementRouter.post("/x3/sync/purchase-orders",         authenticateToken, requirePermission("erp-sync:manage"), ProcurementController.syncX3PurchaseOrders);
procurementRouter.get("/x3/sync/jobs",                     authenticateToken, requirePermission("erp-sync:read"),   ProcurementController.getX3SyncJobs);

export default procurementRouter;

