import { Request, Response } from "express";
import { ProcurementService } from "../services/procurement.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export class ProcurementController {
  // Tenders
  static async getTenders(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.query.projectId);
      if (!projectId) {
        res.status(400).json({ error: "projectId query param is required" });
        return;
      }
      const tenders = await ProcurementService.getTendersByProject(projectId);
      res.json(tenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenders" });
    }
  }

  static async createTender(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tender = await ProcurementService.createTender({
        ...req.body,
        created_by: userId
      });
      res.status(201).json(tender);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tender" });
    }
  }

  // Bids
  static async submitBid(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const tenderId = Number(req.params.id);
      const bid = await ProcurementService.submitBid({
        ...req.body,
        tender_id: tenderId,
        created_by: userId
      });
      res.status(201).json(bid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Suppliers
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
        received_at: new Date(req.body.received_at || Date.now())
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
}
