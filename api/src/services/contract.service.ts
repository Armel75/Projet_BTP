import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const CONTRACT_INCLUDE = {
  supplier:  { select: { id: true, name: true, email: true, contact_name: true, phone: true } },
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

export class ContractService {
  // ==========================
  // CONTRACTS
  // ==========================

  static async list(filters: { project_id?: number; status?: string; type?: string } = {}) {
    const tenantId = TenantContext.getTenantId();
    const contracts = await prisma.contract.findMany({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(filters.project_id ? { project_id: filters.project_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      include: CONTRACT_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return contracts.map((c: any) => ContractService.calculateContractTotals(c));
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
    document_url?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");
    return await prisma.contract.create({
      data: {
        project_id: data.project_id,
        supplier_id: data.supplier_id,
        title: data.title,
        reference: data.reference || '',
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
        document_url: data.document_url,
        tenant_id: tenantId,
        created_by: data.created_by,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  static async getContractsByProject(project_id: number) {
    const contracts = await prisma.contract.findMany({
      where: { project_id },
      include: CONTRACT_INCLUDE,
    });
    return contracts.map((c: any) => ContractService.calculateContractTotals(c));
  }

  static async getContractById(id: number) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) return null;
    return ContractService.calculateContractTotals(contract);
  }

  static async updateContract(id: number, data: Record<string, any>) {
    const updated = await prisma.contract.update({
      where: { id },
      data,
      include: CONTRACT_INCLUDE,
    });
    return ContractService.calculateContractTotals(updated);
  }

  static async deleteContract(id: number) {
    return await prisma.contract.delete({ where: { id } });
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
    return await prisma.changeOrder.update({
      where: { id },
      data: {
        status,
        ...(status === 'APPROVED' ? { approved_at: new Date() } : {}),
      },
    });
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
