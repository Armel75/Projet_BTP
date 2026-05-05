import { Router } from "express";
import { ProcurementController } from "../controllers/procurement.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { uploadDocuments } from "../middlewares/upload.middleware.js";
import { prisma } from "../config/prisma.js";

const procurementRouter = Router();

// ── DCE upload (avant les routes :id pour éviter les conflits) ────────────────
procurementRouter.post(
	"/tenders/dce-uploads",
	authenticateToken,
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

			// Create a Document record for each uploaded file
			const createdDocuments = await Promise.all(
				files.map(async (f: any, idx: number) => {
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

