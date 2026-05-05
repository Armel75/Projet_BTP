import { Request, Response } from "express";
import { ProcurementService } from "../services/procurement.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProcurementX3SyncService } from "../services/procurement-x3-sync.service.js";

export class ProcurementController {
  // ==========================
  // TENDERS
  // ==========================

  static async getTenders(req: Request, res: Response): Promise<void> {
    try {
      const tenders = await ProcurementService.listTenders({
        project_id: req.query.projectId ? Number(req.query.projectId) : undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        category: req.query.category as string | undefined,
      });
      res.json(tenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenders" });
    }
  }

  static async getTender(req: Request, res: Response): Promise<void> {
    try {
      const tender = await ProcurementService.getTenderById(Number(req.params.id));
      if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
      res.json(tender);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tender" });
    }
  }

  static async createTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const b = req.body;
      const tender = await ProcurementService.createTender({
        project_id: Number(b.project_id),
        title: b.title,
        status: b.status,
        reference: b.reference,
        description: b.description,
        type: b.type,
        category: b.category,
        currency: b.currency,
        budget_estimate: b.budget_estimate ? Number(b.budget_estimate) : undefined,
        submission_deadline: b.submission_deadline ? new Date(b.submission_deadline) : undefined,
        opening_date: b.opening_date ? new Date(b.opening_date) : undefined,
        lot_id: b.lot_id ? Number(b.lot_id) : undefined,
        wbs_id: b.wbs_id ? Number(b.wbs_id) : undefined,
        document_ids: Array.isArray(b.document_ids)
          ? b.document_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
          : undefined,
        notes: b.notes,
        created_by: userId!,
      });
      res.status(201).json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateTender(req: Request, res: Response): Promise<void> {
    try {
      const b = req.body;
      const data: Record<string, any> = {};
      if (b.title !== undefined)               data.title = b.title;
      if (b.reference !== undefined)           data.reference = b.reference;
      if (b.description !== undefined)         data.description = b.description;
      if (b.type !== undefined)                data.type = b.type;
      if (b.category !== undefined)            data.category = b.category;
      if (b.status !== undefined)              data.status = b.status;
      if (b.currency !== undefined)            data.currency = b.currency;
      if (b.budget_estimate !== undefined)     data.budget_estimate = b.budget_estimate ? Number(b.budget_estimate) : null;
      if (b.submission_deadline !== undefined) data.submission_deadline = b.submission_deadline ? new Date(b.submission_deadline) : null;
      if (b.opening_date !== undefined)        data.opening_date = b.opening_date ? new Date(b.opening_date) : null;
      if (b.award_date !== undefined)          data.award_date = b.award_date ? new Date(b.award_date) : null;
      if (b.lot_id !== undefined)              data.lot_id = b.lot_id ? Number(b.lot_id) : null;
      if (b.document_ids !== undefined)        data.document_ids = Array.isArray(b.document_ids)
        ? b.document_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
      if (b.notes !== undefined)               data.notes = b.notes || null;
      const tender = await ProcurementService.updateTender(Number(req.params.id), data);
      res.json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteTender(req: Request, res: Response): Promise<void> {
    try {
      await ProcurementService.deleteTender(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ==========================
  // BIDS
  // ==========================

  static async submitBid(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const b = req.body;
      const bid = await ProcurementService.submitBid({
        tender_id: Number(req.params.id),
        supplier_id: Number(b.supplier_id),
        amount: Number(b.amount),
        notes: b.notes,
        document_id: b.document_id ? Number(b.document_id) : undefined,
        submitted_at: b.submitted_at ? new Date(b.submitted_at) : undefined,
        validity_period: b.validity_period ? Number(b.validity_period) : undefined,
        is_compliant: b.is_compliant !== undefined ? Boolean(b.is_compliant) : true,
        created_by: userId!,
      });
      res.status(201).json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateBid(req: Request, res: Response): Promise<void> {
    try {
      const b = req.body;
      const bid = await ProcurementService.updateBid(Number(req.params.bidId), {
        amount: b.amount !== undefined ? Number(b.amount) : undefined,
        status: b.status,
        technical_score: b.technical_score !== undefined ? Number(b.technical_score) : undefined,
        financial_score: b.financial_score !== undefined ? Number(b.financial_score) : undefined,
        total_score: b.total_score !== undefined ? Number(b.total_score) : undefined,
        rank: b.rank !== undefined ? Number(b.rank) : undefined,
        notes: b.notes,
        document_id: b.document_id !== undefined ? (b.document_id ? Number(b.document_id) : null) : undefined,
        is_compliant: b.is_compliant !== undefined ? Boolean(b.is_compliant) : undefined,
        validity_period: b.validity_period !== undefined ? Number(b.validity_period) : undefined,
      });
      res.json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteBid(req: Request, res: Response): Promise<void> {
    try {
      await ProcurementService.deleteBid(Number(req.params.bidId));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async awardTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tender = await ProcurementService.awardTender(
        Number(req.params.id),
        Number(req.body.bid_id),
        userId!,
      );
      res.json(tender);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const suppliers = await ProcurementService.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  }

  static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const supplier = await ProcurementService.createSupplier({
        ...req.body,
        created_by: userId
      });
      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to create supplier" });
    }
  }

  // Purchase Orders
  static async getPurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
      const pos = await ProcurementService.getPurchaseOrders();
      res.json(pos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  }

  static async createPOFromBid(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { bidId } = req.body;
      const po = await ProcurementService.createPOFromBid(bidId, userId!);
      res.status(201).json(po);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Deliveries
  static async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.query.projectId);
      if (!projectId) {
        res.status(400).json({ error: "projectId query param is required" });
        return;
      }
      const deliveries = await ProcurementService.getDeliveriesByProject(projectId);
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  }

  static async createDelivery(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const delivery = await ProcurementService.createDelivery({
        ...req.body,
        created_by: userId
      });
      res.status(201).json(delivery);
    } catch (error) {
      res.status(500).json({ error: "Failed to create delivery" });
    }
  }

  // Goods Receipts
  static async createGoodsReceipt(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const receipt = await ProcurementService.createGoodsReceipt({
        ...req.body,
        created_by: userId,
        warehouse_id: req.body.warehouse_id ? Number(req.body.warehouse_id) : undefined,
        location_id: req.body.location_id ? Number(req.body.location_id) : undefined,
        received_at: new Date(req.body.received_at || Date.now()),
        items: Array.isArray(req.body.items)
          ? req.body.items.map((item: any) => ({
              item_id: Number(item.item_id),
              quantity_ordered: Number(item.quantity_ordered),
              quantity_received: Number(item.quantity_received),
              quantity_rejected: item.quantity_rejected !== undefined ? Number(item.quantity_rejected) : 0,
              unit_cost: item.unit_cost !== undefined ? Number(item.unit_cost) : 0,
            }))
          : [],
      });
      res.status(201).json(receipt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getGoodsReceipts(req: Request, res: Response): Promise<void> {
    try {
      const orderId = Number(req.query.orderId);
      if (!orderId) {
        res.status(400).json({ error: "orderId query param is required" });
        return;
      }
      const receipts = await ProcurementService.getGoodsReceiptsByOrder(orderId);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goods receipts" });
    }
  }

  static async createWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const b = req.body;
      const warehouse = await ProcurementService.createWarehouse({
        project_id: b.project_id ? Number(b.project_id) : undefined,
        code: String(b.code || "").trim(),
        name: String(b.name || "").trim(),
      });
      res.status(201).json(warehouse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const warehouses = await ProcurementService.listWarehouses(projectId);
      res.json(warehouses);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createWarehouseLocation(req: Request, res: Response): Promise<void> {
    try {
      const warehouseId = Number(req.params.id);
      const b = req.body;
      const location = await ProcurementService.createWarehouseLocation(warehouseId, {
        code: String(b.code || "").trim(),
        name: String(b.name || "").trim(),
        parent_id: b.parent_id ? Number(b.parent_id) : undefined,
      });
      res.status(201).json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getInventoryBalances(req: Request, res: Response): Promise<void> {
    try {
      const balances = await ProcurementService.getInventoryBalances({
        project_id: req.query.projectId ? Number(req.query.projectId) : undefined,
        warehouse_id: req.query.warehouseId ? Number(req.query.warehouseId) : undefined,
        location_id: req.query.locationId ? Number(req.query.locationId) : undefined,
        item_id: req.query.itemId ? Number(req.query.itemId) : undefined,
      });
      res.json(balances);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3Suppliers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncSuppliersFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3Items(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncItemsFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async syncX3PurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const result = await ProcurementX3SyncService.syncPurchaseOrdersFromX3({
        createdBy: userId,
        batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
        maxBatches: req.body.maxBatches ? Number(req.body.maxBatches) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getX3SyncJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await ProcurementX3SyncService.getSyncJobs({
        entityName: req.query.entityName ? String(req.query.entityName) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(jobs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
