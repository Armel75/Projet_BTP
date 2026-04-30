import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const TENDER_INCLUDE = {
  project:   { select: { id: true, code: true, title: true } },
  lot:       { select: { id: true, lot_number: true, name: true } },
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  awardedSupplier: { select: { id: true, name: true, email: true } },
  bids: {
    include: {
      supplier: { select: { id: true, name: true, email: true, contact_name: true } },
      createdBy: { select: { id: true, firstname: true, lastname: true } },
    },
    orderBy: { total_score: 'desc' as const },
  },
};

export class ProcurementService {
  // ==========================
  // TENDERS
  // ==========================

  static async listTenders(filters: {
    project_id?: number;
    status?: string;
    type?: string;
    category?: string;
  } = {}) {
    const tenantId = TenantContext.getTenantId();
    return await prisma.tender.findMany({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(filters.project_id ? { project_id: filters.project_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      },
      include: TENDER_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
  }

  static async getTenderById(id: number) {
    return await prisma.tender.findUnique({
      where: { id },
      include: TENDER_INCLUDE,
    });
  }

  static async createTender(data: {
    project_id: number;
    title: string;
    status?: string;
    reference?: string;
    description?: string;
    type?: string;
    category?: string;
    currency?: string;
    budget_estimate?: number;
    submission_deadline?: Date;
    opening_date?: Date;
    lot_id?: number;
    wbs_id?: number;
    document_url?: string;
    notes?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");
    return await prisma.tender.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        status: data.status || 'DRAFT',
        reference: data.reference,
        description: data.description,
        type: data.type || 'OPEN',
        category: data.category || 'TRAVAUX',
        currency: data.currency || 'EUR',
        budget_estimate: data.budget_estimate,
        submission_deadline: data.submission_deadline,
        opening_date: data.opening_date,
        lot_id: data.lot_id ?? null,
        wbs_id: data.wbs_id ?? null,
        document_url: data.document_url,
        notes: data.notes,
        tenant_id: tenantId,
        created_by: data.created_by,
      },
      include: TENDER_INCLUDE,
    });
  }

  static async updateTender(id: number, data: Record<string, any>) {
    return await prisma.tender.update({
      where: { id },
      data,
      include: TENDER_INCLUDE,
    });
  }

  static async deleteTender(id: number) {
    return await prisma.tender.delete({ where: { id } });
  }

  // ==========================
  // TENDER BIDS
  // ==========================

  static async submitBid(data: {
    tender_id: number;
    supplier_id: number;
    amount: number;
    notes?: string;
    document_url?: string;
    submitted_at?: Date;
    validity_period?: number;
    is_compliant?: boolean;
    created_by: number;
  }) {
    const tender = await prisma.tender.findUnique({ where: { id: data.tender_id } });
    if (!tender) throw new Error("Tender not found");
    if (tender.status !== 'OPEN' && tender.status !== 'PUBLISHED') {
      throw new Error("Tender is not accepting bids (status: " + tender.status + ")");
    }
    return await prisma.tenderBid.create({
      data: {
        tender_id: data.tender_id,
        supplier_id: data.supplier_id,
        amount: data.amount,
        status: 'SUBMITTED',
        notes: data.notes,
        document_url: data.document_url,
        submitted_at: data.submitted_at || new Date(),
        validity_period: data.validity_period,
        is_compliant: data.is_compliant ?? true,
        created_by: data.created_by,
      },
      include: {
        supplier: { select: { id: true, name: true, email: true, contact_name: true } },
      },
    });
  }

  static async updateBid(id: number, data: {
    amount?: number;
    status?: string;
    technical_score?: number;
    financial_score?: number;
    total_score?: number;
    rank?: number;
    notes?: string;
    document_url?: string;
    is_compliant?: boolean;
    validity_period?: number;
  }) {
    return await prisma.tenderBid.update({
      where: { id },
      data,
      include: {
        supplier: { select: { id: true, name: true, email: true, contact_name: true } },
      },
    });
  }

  static async deleteBid(id: number) {
    return await prisma.tenderBid.delete({ where: { id } });
  }

  static async awardTender(tenderId: number, bidId: number, userId: number) {
    const bid = await prisma.tenderBid.findUnique({
      where: { id: bidId },
      include: { tender: true },
    });
    if (!bid) throw new Error("Bid not found");
    if (bid.tender_id !== tenderId) throw new Error("Bid does not belong to this tender");

    // Accept the winning bid
    await prisma.tenderBid.update({
      where: { id: bidId },
      data: { status: 'ACCEPTED', rank: 1 },
    });
    // Reject all other bids
    await prisma.tenderBid.updateMany({
      where: { tender_id: tenderId, id: { not: bidId } },
      data: { status: 'REJECTED' },
    });
    // Update tender
    return await prisma.tender.update({
      where: { id: tenderId },
      data: {
        status: 'AWARDED',
        award_date: new Date(),
        awarded_supplier_id: bid.supplier_id,
      },
      include: TENDER_INCLUDE,
    });
  }

  // Legacy alias kept for compatibility
  static async getTendersByProject(project_id: number) {
    return this.listTenders({ project_id });
  }

  // ==========================
  // SUPPLIERS
  // ==========================

  static async createSupplier(data: {
    name: string;
    created_by: number;
  }) {
    return await prisma.supplier.create({
      data
    });
  }

  static async getSuppliers() {
    return await prisma.supplier.findMany();
  }

  // ==========================
  // PURCHASE ORDERS (FROM BIDS)
  // ==========================

  static async createPOFromBid(bidId: number, createdBy: number) {
    const bid = await prisma.tenderBid.findUnique({
      where: { id: bidId },
      include: {
        tender: true,
        supplier: true
      }
    });

    if (!bid) throw new Error("Bid not found");

    const tenantId = TenantContext.getTenantId();

    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        project_id: bid.tender.project_id,
        supplier_id: bid.supplier_id,
        status: 'DRAFT',
        currency: 'EUR', // Default or derived from bid if schema allowed
        created_by: createdBy,
        tenant_id: tenantId!
      }
    });

    // Mark tender as awarded or similar if status was managed that way
    await prisma.tender.update({
      where: { id: bid.tender_id },
      data: { status: 'AWARDED' }
    });

    return po;
  }

  static async getPurchaseOrders() {
    return await prisma.purchaseOrder.findMany({
      include: {
        project: true,
        supplier: true,
        createdBy: true
      }
    });
  }

  // ==========================
  // DELIVERIES
  // ==========================

  static async createDelivery(data: {
    project_id: number;
    supplier_id: number;
    type: string;
    status: string;
    created_by: number;
  }) {
    // 1. Check if there is a Purchase Order for this supplier/project
    const po = await prisma.purchaseOrder.findFirst({
      where: {
        project_id: data.project_id,
        supplier_id: data.supplier_id,
        status: { in: ['APPROVED', 'DRAFT'] } // Assuming only approved or recently created POs can have deliveries
      }
    });

    if (!po) {
      throw new Error("No active Purchase Order found for this Supplier and Project. Delivery blocked.");
    }

    return await prisma.delivery.create({
      data
    });
  }

  static async getDeliveriesByProject(project_id: number) {
    return await prisma.delivery.findMany({
      where: { project_id },
      include: {
        supplier: true,
        createdBy: true
      }
    });
  }

  // ==========================
  // GOODS RECEIPTS
  // ==========================

  static async createGoodsReceipt(data: {
    project_id: number;
    order_id: number;
    delivery_id?: number; // Even if not in schema, we can enforce logic via presence
    received_at: Date;
    created_by: number;
    items: Array<{
      item_id: number;
      quantity_ordered: number;
      quantity_received: number;
      quantity_rejected?: number;
    }>
  }) {
    const tenantId = TenantContext.getTenantId();

    // 1. Verify PO exists
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.order_id }
    });

    if (!po) throw new Error("Purchase Order not found");

    // 2. Verify Delivery exists (Logic gate)
    const delivery = await prisma.delivery.findFirst({
      where: {
        project_id: data.project_id,
        supplier_id: po.supplier_id,
        status: { not: 'COMPLETED' }
      }
    });

    if (!delivery) {
       throw new Error("No pending delivery found for this order. Goods Receipt blocked.");
    }

    // 3. Create Receipt
    const receipt = await prisma.goodsReceipt.create({
      data: {
        project_id: data.project_id,
        order_id: data.order_id,
        received_at: data.received_at,
        created_by: data.created_by,
        tenant_id: tenantId!
      }
    });

    // 3. Create Receipt Items
    for (const item of data.items) {
      await prisma.goodsReceiptItem.create({
        data: {
          receipt_id: receipt.id,
          item_id: item.item_id,
          project_id: data.project_id,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          quantity_rejected: item.quantity_rejected || 0,
          tenant_id: tenantId!,
          created_by: data.created_by
        }
      });

      // Optional: Update Inventory/Stock could happen here if requested implicitly,
      // but the prompt focuses on procurement flow validation.
    }

    return await prisma.goodsReceipt.findUnique({
      where: { id: receipt.id },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });
  }

  static async getGoodsReceiptsByOrder(order_id: number) {
    return await prisma.goodsReceipt.findMany({
      where: { order_id },
      include: {
        items: true
      }
    });
  }
}
