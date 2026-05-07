import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const CONTRACT_INCLUDE = {
  supplier:  { select: { id: true, name: true, email: true, contact_name: true, phone: true } },
  document:  { select: { id: true, name: true, file_url: true, file_name: true, file_size: true } },
  project:   { select: { id: true, code: true, title: true } },
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  approvedBy: { select: { id: true, firstname: true, lastname: true } },
  lots:      { select: { id: true, lot_number: true, name: true } },
  line_items: {
    orderBy: { order_index: 'asc' as const },
    include: {
      lot: { select: { id: true, lot_number: true, name: true } },
    },
  },
  change_orders: { orderBy: { created_at: 'desc' as const } },
  invoices: {
    include: { payments: true },
    orderBy: { created_at: 'desc' as const },
  },
};

const CONTRACT_DOCUMENT_SELECT = {
  id: true,
  name: true,
  file_url: true,
  file_name: true,
  file_size: true,
} as const;

export class ContractService {
  private static async syncContractDocuments(contract: { id: number; project_id: number; reference: string; document_id?: number | null }, documentIds?: number[]) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId || !documentIds?.length) return;

    const uniqueDocumentIds = Array.from(new Set(documentIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (!uniqueDocumentIds.length) return;

    await prisma.document.updateMany({
      where: {
        id: { in: uniqueDocumentIds },
        tenant_id: tenantId,
        project_id: contract.project_id,
      },
      data: {
        reference: contract.reference,
        category: 'CONTRACT',
      },
    });
  }

  private static async hydrateContractDocuments(contract: any) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId || !contract) {
      return contract;
    }

    const linkedDocs = contract.reference
      ? await prisma.document.findMany({
          where: {
            tenant_id: tenantId,
            project_id: contract.project_id,
            category: 'CONTRACT',
            reference: contract.reference,
          },
          select: CONTRACT_DOCUMENT_SELECT,
          orderBy: { created_at: 'asc' },
        })
      : [];

    const docs = [...linkedDocs];
    if (contract.document && !docs.some((doc: any) => doc.id === contract.document.id)) {
      docs.unshift(contract.document);
    }

    return {
      ...contract,
      documents: docs,
    };
  }

  // ==========================
  // CONTRACTS
  // ==========================

  private static async generateContractReference(tenantId: number, date = new Date()) {
    const year = date.getFullYear();
    const prefix = `C-${year}-`;
    const existingReferences = await prisma.contract.findMany({
      where: {
        tenant_id: tenantId,
        reference: {
          startsWith: prefix,
        },
      },
      select: { reference: true },
    });

    const maxSequence = existingReferences.reduce((max: number, contract: { reference: string }) => {
      const match = contract.reference.match(new RegExp(`^${prefix}(\\d+)$`));
      if (!match) return max;
      const value = Number(match[1]);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    return `${prefix}${String(maxSequence + 1).padStart(3, '0')}`;
  }

  static async list(filters: { project_id?: number; status?: string; type?: string; is_archived?: boolean } = {}) {
    const tenantId = TenantContext.getTenantId();
    const contracts = await prisma.contract.findMany({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(filters.project_id ? { project_id: filters.project_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        is_archived: filters.is_archived ?? false,
      },
      include: CONTRACT_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return Promise.all(contracts.map(async (contract: any) => ContractService.calculateContractTotals(await ContractService.hydrateContractDocuments(contract))));
  }

  static async createContract(data: {
    project_id: number;
    supplier_id: number;
    title: string;
    reference?: string;
    description?: string;
    category?: string;
    type?: string;
    amount?: number;
    currency?: string;
    status?: string;
    start_date?: Date;
    end_date?: Date;
    signed_at?: Date;
    executed_at?: Date;
    retention_pct?: number;
    advance_payment_pct?: number;
    advance_payment_amount?: number;
    price_revision_index?: string;
    payment_terms?: number;
    document_id?: number;
    document_ids?: number[];
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");
    const reference = data.reference?.trim() || await this.generateContractReference(tenantId);
    const contract = await prisma.contract.create({
      data: {
        project_id: data.project_id,
        supplier_id: data.supplier_id,
        title: data.title,
        reference,
        description: data.description,
        category: data.category,
        type: data.type || 'SUBCONTRACT',
        amount: data.amount || 0,
        currency: data.currency || 'EUR',
        status: data.status || 'DRAFT',
        start_date: data.start_date,
        end_date: data.end_date,
        signed_at: data.signed_at,
        executed_at: data.executed_at,
        retention_pct: data.retention_pct,
        advance_payment_pct: data.advance_payment_pct,
        advance_payment_amount: data.advance_payment_amount,
        price_revision_index: data.price_revision_index,
        payment_terms: data.payment_terms,
        document_id: data.document_id,
        tenant_id: tenantId,
        created_by: data.created_by,
      },
      include: CONTRACT_INCLUDE,
    });

    await this.syncContractDocuments(contract, data.document_ids ?? (data.document_id ? [data.document_id] : []));

    return await this.getContractById(contract.id);
  }

  static async getContractsByProject(project_id: number) {
    const contracts = await prisma.contract.findMany({
      where: { project_id },
      include: CONTRACT_INCLUDE,
    });
    return Promise.all(contracts.map(async (contract: any) => ContractService.calculateContractTotals(await ContractService.hydrateContractDocuments(contract))));
  }

  static async getContractById(id: number) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) return null;
    return ContractService.calculateContractTotals(await ContractService.hydrateContractDocuments(contract));
  }

  static async updateContract(id: number, data: Record<string, any>) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const existing = await prisma.contract.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, is_archived: true },
    });

    if (!existing) {
      throw new Error("Contract not found");
    }

    if (existing.is_archived) {
      throw new Error("Modification impossible: ce contrat est archive.");
    }

    const { document_ids, ...contractData } = data;
    const updated = await prisma.contract.update({
      where: { id },
      data: contractData,
      include: CONTRACT_INCLUDE,
    });
    await this.syncContractDocuments(updated, Array.isArray(document_ids) ? document_ids : undefined);
    return ContractService.calculateContractTotals(await ContractService.hydrateContractDocuments(updated));
  }

  static async deleteContract(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const result = await prisma.contract.updateMany({
      where: { id, tenant_id: tenantId, is_archived: false },
      data: {
        is_archived: true,
        archived_at: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("Contract not found");
    }

    return await this.getContractById(id);
  }

  static async restoreContract(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const result = await prisma.contract.updateMany({
      where: { id, tenant_id: tenantId, is_archived: true },
      data: {
        is_archived: false,
        archived_at: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Contract not found");
    }

    return await this.getContractById(id);
  }

  private static calculateContractTotals(contract: any) {
    const baseAmount = Number(contract.amount) || 0;

    const approvedChangeAmount = (contract.change_orders || [])
      .filter((co: any) => co.status === 'APPROVED')
      .reduce((sum: number, co: any) => sum + Number(co.amount), 0);

    const revisedTotal = baseAmount + approvedChangeAmount;

    const totalInvoiced = (contract.invoices || [])
      .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

    const totalPaid = (contract.invoices || [])
      .flatMap((inv: any) => inv.payments || [])
      .reduce((sum: number, pay: any) => sum + Number(pay.amount), 0);

    const lineItemsTotal = (contract.line_items || [])
      .reduce((sum: number, li: any) => sum + Number(li.total_price), 0);

    return {
      ...contract,
      base_amount: baseAmount,
      line_items_total: lineItemsTotal,
      approved_change_amount: approvedChangeAmount,
      revised_total_amount: revisedTotal,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      remaining_to_invoice: revisedTotal - totalInvoiced,
      remaining_to_pay: totalInvoiced - totalPaid,
      billing_progress_pct: revisedTotal > 0 ? Math.min(100, (totalInvoiced / revisedTotal) * 100) : 0,
    };
  }

  // ==========================
  // LINE ITEMS
  // ==========================

  static async createLineItem(contract_id: number, data: {
    description: string;
    category?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price?: number;
    lot_id?: number;
    wbs_id?: number;
    order_index?: number;
    status?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const contract = await prisma.contract.findUnique({ where: { id: contract_id } });
    if (!contract) throw new Error("Contract not found");
    return await prisma.contractLineItem.create({
      data: {
        contract_id,
        tenant_id: tenantId!,
        description: data.description,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        unit_price: data.unit_price,
        total_price: data.total_price ?? (data.quantity * data.unit_price),
        lot_id: data.lot_id ?? null,
        wbs_id: data.wbs_id ?? null,
        order_index: data.order_index ?? 0,
        status: data.status ?? 'PENDING_APPROVAL',
        created_by: data.created_by,
      },
      include: {
        lot: { select: { id: true, lot_number: true, name: true } },
      },
    });
  }

  static async updateLineItem(id: number, data: Record<string, any>) {
    return await prisma.contractLineItem.update({
      where: { id },
      data,
      include: {
        lot: { select: { id: true, lot_number: true, name: true } },
      },
    });
  }

  static async deleteLineItem(id: number) {
    return await prisma.contractLineItem.delete({ where: { id } });
  }

  // ==========================
  // CHANGE ORDERS
  // ==========================

  static async createChangeOrder(data: {
    contract_id: number;
    title: string;
    description?: string;
    amount: number;
    reason?: string;
    impact_days?: number;
    number?: string;
    status?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const contract = await prisma.contract.findUnique({ where: { id: data.contract_id } });
    if (!contract) throw new Error("Contract not found");
    return await prisma.changeOrder.create({
      data: {
        contract_id: data.contract_id,
        project_id: contract.project_id,
        tenant_id: tenantId!,
        title: data.title,
        description: data.description || '',
        amount: data.amount,
        reason: data.reason,
        impact_days: data.impact_days,
        number: data.number || `AV-${Date.now()}`,
        status: data.status || 'PENDING_APPROVAL',
        created_by: data.created_by,
      },
    });
  }

  static async updateChangeOrderStatus(id: number, status: 'APPROVED' | 'REJECTED', userId: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const existing = await prisma.changeOrder.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, status: true },
    });

    if (!existing) throw new Error("Change order not found");
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new Error("Modification impossible: cet avenant est deja finalise.");
    }

    return await prisma.changeOrder.update({
      where: { id },
      data: {
        status,
        approved_at: status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  static async updateChangeOrder(id: number, data: {
    title?: string;
    description?: string;
    amount?: number;
    reason?: string | null;
    impact_days?: number | null;
    number?: string;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const existing = await prisma.changeOrder.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, status: true },
    });

    if (!existing) throw new Error("Change order not found");
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new Error("Modification impossible: cet avenant est deja finalise.");
    }

    return await prisma.changeOrder.update({
      where: { id },
      data,
    });
  }

  static async deleteChangeOrder(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const existing = await prisma.changeOrder.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, status: true },
    });

    if (!existing) throw new Error("Change order not found");
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new Error("Suppression impossible: cet avenant est deja finalise.");
    }

    return await prisma.changeOrder.delete({ where: { id } });
  }

  // ==========================
  // INVOICES
  // ==========================

  static async createInvoice(data: {
    contract_id: number;
    number: string;
    amount: number;
    invoice_date?: Date;
    due_date?: Date;
    status?: string;
    lot_id?: number;
    retention?: number;
    payment_status?: string;
    payment_tracking_status?: string;
    supplier_invoice_number?: string;
    tax_amount?: number;
    tax_rate?: number;
    invoice_status_code?: string;
    invoice_line_items?: string;
    export_format_url?: string;
    dispute_reason?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const contract = await prisma.contract.findUnique({ where: { id: data.contract_id } });
    if (!contract) throw new Error("Contract not found");
    return await prisma.invoice.create({
      data: {
        contract_id: data.contract_id,
        project_id: contract.project_id,
        tenant_id: tenantId!,
        number: data.number,
        amount: data.amount,
        invoice_date: data.invoice_date || new Date(),
        due_date: data.due_date,
        status: data.status || 'DRAFT',
        lot_id: data.lot_id ?? null,
        retention: data.retention,
        payment_status: data.payment_status,
        payment_tracking_status: data.payment_tracking_status,
        supplier_invoice_number: data.supplier_invoice_number,
        tax_amount: data.tax_amount,
        tax_rate: data.tax_rate,
        invoice_status_code: data.invoice_status_code,
        invoice_line_items: data.invoice_line_items,
        export_format_url: data.export_format_url,
        dispute_reason: data.dispute_reason,
        created_by: data.created_by,
      },
    });
  }

  static async getInvoicesByContract(contract_id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return await prisma.invoice.findMany({
      where: { contract_id, tenant_id: tenantId },
      include: {
        payments: true,
        contract: { select: { id: true, reference: true, title: true } },
        project: { select: { id: true, code: true, title: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getAllInvoices() {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return await prisma.invoice.findMany({
      where: { tenant_id: tenantId },
      include: {
        payments: true,
        contract: { select: { id: true, reference: true, title: true } },
        project: { select: { id: true, code: true, title: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ==========================
  // PAYMENTS
  // ==========================

  static async createPayment(data: {
    invoice_id: number;
    amount: number;
    payment_date: Date;
    payment_method: string;
    reference?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoice_id },
      include: { payments: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    const totalPaidOnInvoice = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const balanceDue = Number(invoice.amount) - totalPaidOnInvoice;
    if (data.amount > balanceDue) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining invoice balance (${balanceDue})`);
    }

    const payment = await prisma.payment.create({
      data: {
        invoice_id: data.invoice_id,
        tenant_id: tenantId!,
        amount: data.amount,
        date: data.payment_date,
        method: data.payment_method,
        created_by: data.created_by,
      },
    });

    const newTotal = totalPaidOnInvoice + data.amount;
    await prisma.invoice.update({
      where: { id: data.invoice_id },
      data: {
        status: newTotal >= Number(invoice.amount) ? 'PAID' : 'SUBMITTED',
        payment_status: newTotal >= Number(invoice.amount) ? 'PAID' : 'PARTIAL',
        payment_tracking_status: newTotal >= Number(invoice.amount) ? 'PAID' : 'PARTIAL',
      },
    });

    return payment;
  }
}
