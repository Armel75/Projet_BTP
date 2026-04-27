import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class ProcurementService {
  // ==========================
  // TENDERS & BIDS
  // ==========================

  static async createTender(data: {
    project_id: number;
    title: string;
    status: string;
    wbs_id?: number;
    created_by: number;
  }) {
    return await prisma.tender.create({
      data: {
        ...data,
      }
    });
  }

  static async getTendersByProject(project_id: number) {
    return await prisma.tender.findMany({
      where: { project_id },
      include: {
        bids: {
          include: {
            supplier: true,
            createdBy: true
          }
        },
        createdBy: true
      }
    });
  }

  static async submitBid(data: {
    tender_id: number;
    supplier_id: number;
    amount: number;
    created_by: number;
  }) {
    // Check if tender exists and is open
    const tender = await prisma.tender.findUnique({
      where: { id: data.tender_id }
    });

    if (!tender) throw new Error("Tender not found");
    if (tender.status !== 'OPEN' && tender.status !== 'PUBLISHED') {
      throw new Error("Tender is not accepting bids (Status: " + tender.status + ")");
    }

    return await prisma.tenderBid.create({
      data
    });
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
