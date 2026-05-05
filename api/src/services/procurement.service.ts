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
  documents: {
    where: { is_archived: false },
    select: {
      id: true,
      name: true,
      file_url: true,
      file_name: true,
      file_size: true,
      file_type: true,
      category: true,
    },
    orderBy: { created_at: 'asc' as const },
  },
};

export class ProcurementService {
  private static async postInboundStock(params: {
    tenantId: number;
    projectId: number;
    warehouseId: number;
    locationId: number;
    itemId: number;
    qty: number;
    unitCost: number;
    sourceType: string;
    sourceId: string;
    createdBy: number;
  }) {
    if (params.qty <= 0) return;

    const item = await prisma.inventoryItem.findUnique({ where: { id: params.itemId } });
    const costMethod = (item?.costing_method || "CMUP").toUpperCase() === "FIFO" ? "FIFO" : "CMUP";

    const balance = await prisma.inventoryBalance.findUnique({
      where: {
        tenant_id_project_id_warehouse_id_location_id_item_id: {
          tenant_id: params.tenantId,
          project_id: params.projectId,
          warehouse_id: params.warehouseId,
          location_id: params.locationId,
          item_id: params.itemId,
        },
      },
    });

    const previousQty = balance?.qty_on_hand || 0;
    const newQty = previousQty + params.qty;
    const previousStockValue = balance?.total_stock_value || 0;
    const inboundValue = params.qty * params.unitCost;
    const newStockValue = previousStockValue + inboundValue;

    let averageUnitCost = balance?.average_unit_cost || 0;
    if (costMethod === "CMUP") {
      averageUnitCost = newQty > 0 ? newStockValue / newQty : 0;
    }

    const updatedBalance = await prisma.inventoryBalance.upsert({
      where: {
        tenant_id_project_id_warehouse_id_location_id_item_id: {
          tenant_id: params.tenantId,
          project_id: params.projectId,
          warehouse_id: params.warehouseId,
          location_id: params.locationId,
          item_id: params.itemId,
        },
      },
      create: {
        tenant_id: params.tenantId,
        project_id: params.projectId,
        warehouse_id: params.warehouseId,
        location_id: params.locationId,
        item_id: params.itemId,
        qty_on_hand: params.qty,
        qty_available: params.qty,
        qty_reserved: 0,
        qty_in_transit: 0,
        last_unit_cost: params.unitCost,
        average_unit_cost: costMethod === "CMUP" ? averageUnitCost : params.unitCost,
        total_stock_value: inboundValue,
      },
      update: {
        qty_on_hand: newQty,
        qty_available: (balance?.qty_available || 0) + params.qty,
        last_unit_cost: params.unitCost,
        average_unit_cost: costMethod === "CMUP" ? averageUnitCost : (balance?.average_unit_cost || params.unitCost),
        total_stock_value: newStockValue,
      },
    });

    if (costMethod === "FIFO") {
      await prisma.inventoryValuationLayer.create({
        data: {
          tenant_id: params.tenantId,
          project_id: params.projectId,
          warehouse_id: params.warehouseId,
          location_id: params.locationId,
          item_id: params.itemId,
          source_type: params.sourceType,
          source_id: params.sourceId,
          received_qty: params.qty,
          remaining_qty: params.qty,
          unit_cost: params.unitCost,
          received_at: new Date(),
        },
      });
    }

    await prisma.inventoryCostSnapshot.upsert({
      where: {
        tenant_id_project_id_warehouse_id_location_id_item_id_cost_method: {
          tenant_id: params.tenantId,
          project_id: params.projectId,
          warehouse_id: params.warehouseId,
          location_id: params.locationId,
          item_id: params.itemId,
          cost_method: costMethod,
        },
      },
      create: {
        tenant_id: params.tenantId,
        project_id: params.projectId,
        warehouse_id: params.warehouseId,
        location_id: params.locationId,
        item_id: params.itemId,
        cost_method: costMethod,
        current_unit_cost: costMethod === "CMUP" ? averageUnitCost : params.unitCost,
        total_qty: updatedBalance.qty_on_hand,
        stock_value: updatedBalance.total_stock_value,
        calculated_at: new Date(),
      },
      update: {
        current_unit_cost: costMethod === "CMUP" ? averageUnitCost : params.unitCost,
        total_qty: updatedBalance.qty_on_hand,
        stock_value: updatedBalance.total_stock_value,
        calculated_at: new Date(),
      },
    });

    await prisma.stockMovement.create({
      data: {
        project_id: params.projectId,
        item_id: params.itemId,
        warehouse_id: params.warehouseId,
        location_id: params.locationId,
        type: "IN",
        quantity: params.qty,
        unit_cost: params.unitCost,
        total_cost: inboundValue,
        cost_method: costMethod,
        balance_after: updatedBalance.qty_on_hand,
        source_type: params.sourceType,
        source_id: params.sourceId,
        created_by: params.createdBy,
      },
    });
  }

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
    document_ids?: number[];
    notes?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");
    const tender = await prisma.tender.create({
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
        notes: data.notes,
        tenant_id: tenantId,
        created_by: data.created_by,
      },
      include: TENDER_INCLUDE,
    });

    if (data.document_ids && data.document_ids.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: data.document_ids } },
        data: { tender_id: tender.id },
      });
      return await prisma.tender.findUnique({ where: { id: tender.id }, include: TENDER_INCLUDE });
    }

    return tender;
  }

  static async updateTender(id: number, data: Record<string, any>) {
    const { document_ids, ...updateData } = data;

    await prisma.tender.update({
      where: { id },
      data: updateData,
    });

    if (Array.isArray(document_ids)) {
      // Détacher les anciens documents de cet AO
      await prisma.document.updateMany({
        where: { tender_id: id },
        data: { tender_id: null },
      });
      // Rattacher les nouveaux
      if ((document_ids as number[]).length > 0) {
        await prisma.document.updateMany({
          where: { id: { in: document_ids as number[] } },
          data: { tender_id: id },
        });
      }
    }

    return await prisma.tender.findUnique({ where: { id }, include: TENDER_INCLUDE });
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
    document_id?: number;
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
        document_id: data.document_id,
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
    document_id?: number | null;
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
        createdBy: true,
        lines: {
          include: {
            item: true,
          },
          orderBy: { line_no: 'asc' },
        }
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
    warehouse_id?: number;
    location_id?: number;
    received_at: Date;
    created_by: number;
    items: Array<{
      item_id: number;
      quantity_ordered: number;
      quantity_received: number;
      quantity_rejected?: number;
      unit_cost?: number;
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

    let warehouseId = data.warehouse_id;
    let locationId = data.location_id;

    if (!warehouseId) {
      const defaultWarehouse = await prisma.warehouse.findFirst({
        where: {
          tenant_id: tenantId!,
          project_id: data.project_id,
          is_active: true,
        },
        orderBy: { id: 'asc' },
      });
      warehouseId = defaultWarehouse?.id;
    }

    if (warehouseId && !locationId) {
      const defaultLocation = await prisma.warehouseLocation.findFirst({
        where: {
          tenant_id: tenantId!,
          warehouse_id: warehouseId,
          is_active: true,
        },
        orderBy: { id: 'asc' },
      });
      locationId = defaultLocation?.id;
    }

    if (!warehouseId || !locationId) {
      throw new Error("Warehouse and location are required to post inventory");
    }

    // 3. Create Receipt
    const receipt = await prisma.goodsReceipt.create({
      data: {
        project_id: data.project_id,
        order_id: data.order_id,
        warehouse_id: warehouseId,
        location_id: locationId,
        status: 'POSTED',
        number: `GR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
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
          unit_cost: item.unit_cost || 0,
          total_cost: (item.quantity_received - (item.quantity_rejected || 0)) * (item.unit_cost || 0),
          tenant_id: tenantId!,
          created_by: data.created_by
        }
      });

      const netQty = item.quantity_received - (item.quantity_rejected || 0);
      const unitCost = item.unit_cost || 0;

      await this.postInboundStock({
        tenantId: tenantId!,
        projectId: data.project_id,
        warehouseId,
        locationId,
        itemId: item.item_id,
        qty: netQty,
        unitCost,
        sourceType: 'GOODS_RECEIPT',
        sourceId: String(receipt.id),
        createdBy: data.created_by,
      });
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
        items: {
          include: {
            item: true,
          },
        },
        warehouse: true,
        location: true,
      }
    });
  }

  static async createWarehouse(data: {
    project_id?: number;
    code: string;
    name: string;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.warehouse.create({
      data: {
        tenant_id: tenantId,
        project_id: data.project_id,
        code: data.code,
        name: data.name,
      },
    });
  }

  static async listWarehouses(projectId?: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.warehouse.findMany({
      where: {
        tenant_id: tenantId,
        ...(projectId ? { project_id: projectId } : {}),
      },
      include: {
        locations: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  static async createWarehouseLocation(warehouseId: number, data: { code: string; name: string; parent_id?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.warehouseLocation.create({
      data: {
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        code: data.code,
        name: data.name,
        parent_id: data.parent_id,
      },
    });
  }

  static async getInventoryBalances(filters: { project_id?: number; warehouse_id?: number; location_id?: number; item_id?: number; }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return prisma.inventoryBalance.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters.project_id ? { project_id: filters.project_id } : {}),
        ...(filters.warehouse_id ? { warehouse_id: filters.warehouse_id } : {}),
        ...(filters.location_id ? { location_id: filters.location_id } : {}),
        ...(filters.item_id ? { item_id: filters.item_id } : {}),
      },
      include: {
        project: { select: { id: true, code: true, title: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, code: true, name: true, unit: true, costing_method: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
  }
}
