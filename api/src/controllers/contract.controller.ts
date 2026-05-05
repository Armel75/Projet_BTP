import { Request, Response } from "express";
import { ContractService } from "../services/contract.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export class ContractController {
  // ==========================
  // CONTRACTS
  // ==========================

  static async getContracts(req: Request, res: Response): Promise<void> {
    try {
      const contracts = await ContractService.list({
        project_id: req.query.projectId ? Number(req.query.projectId) : undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
      });
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
      const body = req.body;
      const contract = await ContractService.createContract({
        project_id: Number(body.project_id),
        supplier_id: Number(body.supplier_id),
        title: body.title,
        reference: body.reference,
        description: body.description,
        category: body.category,
        type: body.type,
        amount: body.amount ? Number(body.amount) : 0,
        currency: body.currency,
        status: body.status,
        start_date: body.start_date ? new Date(body.start_date) : undefined,
        end_date: body.end_date ? new Date(body.end_date) : undefined,
        signed_at: body.signed_at ? new Date(body.signed_at) : undefined,
        executed_at: body.executed_at ? new Date(body.executed_at) : undefined,
        retention_pct: body.retention_pct ? Number(body.retention_pct) : undefined,
        advance_payment_pct: body.advance_payment_pct ? Number(body.advance_payment_pct) : undefined,
        advance_payment_amount: body.advance_payment_amount ? Number(body.advance_payment_amount) : undefined,
        price_revision_index: body.price_revision_index,
        payment_terms: body.payment_terms ? Number(body.payment_terms) : undefined,
        document_id: body.document_id ? Number(body.document_id) : undefined,
        created_by: userId!,
      });
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateContract(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;
      const data: Record<string, any> = {};
      if (body.title !== undefined)      data.title = body.title;
      if (body.reference !== undefined)  data.reference = body.reference;
      if (body.description !== undefined) data.description = body.description;
      if (body.category !== undefined)   data.category = body.category;
      if (body.type !== undefined)       data.type = body.type;
      if (body.status !== undefined)     data.status = body.status;
      if (body.currency !== undefined)   data.currency = body.currency;
      if (body.amount !== undefined)     data.amount = Number(body.amount);
      if (body.retention_pct !== undefined) data.retention_pct = body.retention_pct ? Number(body.retention_pct) : null;
      if (body.advance_payment_pct !== undefined) data.advance_payment_pct = body.advance_payment_pct ? Number(body.advance_payment_pct) : null;
      if (body.advance_payment_amount !== undefined) data.advance_payment_amount = body.advance_payment_amount ? Number(body.advance_payment_amount) : null;
      if (body.payment_terms !== undefined) data.payment_terms = body.payment_terms ? Number(body.payment_terms) : null;
      if (body.price_revision_index !== undefined) data.price_revision_index = body.price_revision_index || null;
      if (body.document_id !== undefined) data.document_id = body.document_id ? Number(body.document_id) : null;
      if (body.start_date !== undefined) data.start_date = body.start_date ? new Date(body.start_date) : null;
      if (body.end_date !== undefined)   data.end_date = body.end_date ? new Date(body.end_date) : null;
      if (body.signed_at !== undefined)  data.signed_at = body.signed_at ? new Date(body.signed_at) : null;
      if (body.executed_at !== undefined) data.executed_at = body.executed_at ? new Date(body.executed_at) : null;
      if (body.approved_by !== undefined) data.approved_by = body.approved_by ? Number(body.approved_by) : null;
      if (body.approved_at !== undefined) data.approved_at = body.approved_at ? new Date(body.approved_at) : null;
      if (body.terminated_at !== undefined) data.terminated_at = body.terminated_at ? new Date(body.terminated_at) : null;
      if (body.termination_reason !== undefined) data.termination_reason = body.termination_reason || null;
      const contract = await ContractService.updateContract(Number(req.params.id), data);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteContract(req: Request, res: Response): Promise<void> {
    try {
      await ContractService.deleteContract(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ==========================
  // LINE ITEMS
  // ==========================

  static async createLineItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const body = req.body;
      const item = await ContractService.createLineItem(Number(req.params.id), {
        description: body.description,
        category: body.category,
        quantity: Number(body.quantity),
        unit: body.unit,
        unit_price: Number(body.unit_price),
        total_price: body.total_price ? Number(body.total_price) : undefined,
        lot_id: body.lot_id ? Number(body.lot_id) : undefined,
        wbs_id: body.wbs_id ? Number(body.wbs_id) : undefined,
        order_index: body.order_index ? Number(body.order_index) : undefined,
        status: body.status,
        created_by: userId!,
      });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateLineItem(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;
      const data: Record<string, any> = {};
      if (body.description !== undefined) data.description = body.description;
      if (body.category !== undefined)    data.category = body.category;
      if (body.quantity !== undefined)    data.quantity = Number(body.quantity);
      if (body.unit !== undefined)        data.unit = body.unit;
      if (body.unit_price !== undefined)  data.unit_price = Number(body.unit_price);
      if (body.total_price !== undefined) data.total_price = Number(body.total_price);
      if (body.progress_pct !== undefined) data.progress_pct = Number(body.progress_pct);
      if (body.billed_amount !== undefined) data.billed_amount = Number(body.billed_amount);
      if (body.lot_id !== undefined)      data.lot_id = body.lot_id ? Number(body.lot_id) : null;
      if (body.order_index !== undefined) data.order_index = Number(body.order_index);
      if (body.status !== undefined)      data.status = body.status;
      const item = await ContractService.updateLineItem(Number(req.params.itemId), data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteLineItem(req: Request, res: Response): Promise<void> {
    try {
      await ContractService.deleteLineItem(Number(req.params.itemId));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ==========================
  // CHANGE ORDERS
  // ==========================

  static async createChangeOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const co = await ContractService.createChangeOrder({
        ...req.body,
        contract_id: Number(req.params.id),
        amount: Number(req.body.amount || 0),
        impact_days: req.body.impact_days ? Number(req.body.impact_days) : undefined,
        created_by: userId!,
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

  // ==========================
  // INVOICES
  // ==========================

  static async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const body = req.body;
      const invoice = await ContractService.createInvoice({
        contract_id: Number(body.contract_id),
        number: body.number,
        amount: Number(body.amount),
        invoice_date: body.invoice_date ? new Date(body.invoice_date) : undefined,
        due_date: body.due_date ? new Date(body.due_date) : undefined,
        status: body.status,
        lot_id: body.lot_id ? Number(body.lot_id) : undefined,
        retention: body.retention ? Number(body.retention) : undefined,
        payment_status: body.payment_status,
        payment_tracking_status: body.payment_tracking_status,
        supplier_invoice_number: body.supplier_invoice_number,
        tax_amount: body.tax_amount !== undefined && body.tax_amount !== null && body.tax_amount !== '' ? Number(body.tax_amount) : undefined,
        tax_rate: body.tax_rate !== undefined && body.tax_rate !== null && body.tax_rate !== '' ? Number(body.tax_rate) : undefined,
        invoice_status_code: body.invoice_status_code,
        invoice_line_items: body.invoice_line_items,
        export_format_url: body.export_format_url,
        dispute_reason: body.dispute_reason,
        created_by: userId!,
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
        : await ContractService.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }

  // ==========================
  // PAYMENTS
  // ==========================

  static async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.id;
      const payment = await ContractService.createPayment({
        invoice_id: Number(req.body.invoice_id),
        amount: Number(req.body.amount),
        payment_date: new Date(req.body.payment_date || Date.now()),
        payment_method: req.body.payment_method || req.body.method || 'WIRE',
        reference: req.body.reference,
        created_by: userId!,
      });
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

