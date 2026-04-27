import { Request, Response } from "express";
import { ContractService } from "../services/contract.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export class ContractController {
  // Contracts
  static async getContracts(req: Request, res: Response): Promise<void> {
    try {
      const projectId = Number(req.query.projectId);
      if (!projectId) {
        res.status(400).json({ error: "projectId is required" });
        return;
      }
      const contracts = await ContractService.getContractsByProject(projectId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  }

  static async getContract(req: Request, res: Response): Promise<void> {
    try {
      const contract = await ContractService.getContractById(Number(req.params.id));
      if (!contract) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  }

  static async createContract(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const contract = await ContractService.createContract({
        ...req.body,
        created_by: userId!
      });
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Change Orders
  static async createChangeOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const co = await ContractService.createChangeOrder({
        ...req.body,
        contract_id: Number(req.params.id),
        created_by: userId!
      });
      res.status(201).json(co);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async approveChangeOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const co = await ContractService.updateChangeOrderStatus(Number(req.params.id), 'APPROVED', userId!);
      res.json(co);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async rejectChangeOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const co = await ContractService.updateChangeOrderStatus(Number(req.params.id), 'REJECTED', userId!);
      res.json(co);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Invoices
  static async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const invoice = await ContractService.createInvoice({
        ...req.body,
        created_by: userId!
      });
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const contractId = req.query.contractId ? Number(req.query.contractId) : undefined;
      const invoices = contractId 
        ? await ContractService.getInvoicesByContract(contractId)
        : []; // Or global fetch if needed
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }

  // Payments
  static async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const payment = await ContractService.createPayment({
        ...req.body,
        created_by: userId!,
        payment_date: new Date(req.body.payment_date || Date.now())
      });
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
