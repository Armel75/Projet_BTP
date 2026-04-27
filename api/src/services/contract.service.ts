import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class ContractService {
  // ==========================
  // CONTRACTS
  // ==========================

  static async createContract(data: {
    project_id: number;
    supplier_id: number;
    title: string;
    total_amount: number;
    currency?: string;
    status: string;
    start_date?: Date;
    end_date?: Date;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.contract.create({
      data: {
        ...data,
        tenant_id: tenantId,
        currency: data.currency || 'EUR'
      }
    });
  }

  static async getContractsByProject(project_id: number) {
    const contracts = await prisma.contract.findMany({
      where: { project_id },
      include: {
        changeOrders: true,
        invoices: true,
        supplier: true
      }
    });

    return contracts.map((c: any) => this.calculateContractTotals(c));
  }

  static async getContractById(id: number) {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        changeOrders: true,
        invoices: {
          include: {
            payments: true
          }
        },
        supplier: true,
        project: true
      }
    });

    if (!contract) return null;
    return this.calculateContractTotals(contract);
  }

  private static calculateContractTotals(contract: any) {
    const approvedChangeAmount = contract.changeOrders
      ?.filter((co: any) => co.status === 'APPROVED')
      .reduce((sum: number, co: any) => sum + Number(co.amount_change), 0) || 0;

    const totalContractAmount = Number(contract.total_amount) + approvedChangeAmount;
    
    const totalInvoiced = contract.invoices
      ?.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0;

    const totalPaid = contract.invoices
      ?.flatMap((inv: any) => inv.payments || [])
      .reduce((sum: number, pay: any) => sum + Number(pay.amount), 0) || 0;

    return {
      ...contract,
      base_amount: Number(contract.total_amount), // Original
      approved_change_amount: approvedChangeAmount,
      revised_total_amount: totalContractAmount,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      remaining_to_invoice: totalContractAmount - totalInvoiced,
      remaining_to_pay: totalInvoiced - totalPaid
    };
  }

  // ==========================
  // CHANGE ORDERS
  // ==========================

  static async createChangeOrder(data: {
    contract_id: number;
    title: string;
    description?: string;
    amount_change: number;
    status: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const contract = await prisma.contract.findUnique({ where: { id: data.contract_id } });
    if (!contract) throw new Error("Contract not found");

    return await prisma.changeOrder.create({
      data: {
        ...data,
        project_id: contract.project_id,
        tenant_id: tenantId!
      }
    });
  }

  static async updateChangeOrderStatus(id: number, status: 'APPROVED' | 'REJECTED', userId: number) {
    return await prisma.changeOrder.update({
      where: { id },
      data: { status }
    });
  }

  // ==========================
  // INVOICES
  // ==========================

  static async createInvoice(data: {
    contract_id: number;
    invoice_number: string;
    amount: number;
    due_date?: Date;
    status: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    
    // 1. Validate Contract and limits
    const contract = await this.getContractById(data.contract_id);
    if (!contract) throw new Error("Contract not found");

    if (data.amount > contract.remaining_to_invoice) {
        throw new Error(`Invoice amount (${data.amount}) exceeds remaining contract balance (${contract.remaining_to_invoice})`);
    }

    return await prisma.invoice.create({
      data: {
        ...data,
        project_id: contract.project_id,
        supplier_id: contract.supplier_id,
        tenant_id: tenantId!
      }
    });
  }

  static async getInvoicesByContract(contract_id: number) {
    return await prisma.invoice.findMany({
      where: { contract_id },
      include: {
        payments: true
      }
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

    // 1. Validate Invoice existence
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoice_id },
      include: { payments: true }
    });

    if (!invoice) throw new Error("Invoice not found");

    // 2. Validate Payment Limit
    const totalPaidOnInvoice = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const balanceDue = Number(invoice.amount) - totalPaidOnInvoice;

    if (data.amount > balanceDue) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining invoice balance (${balanceDue})`);
    }

    const payment = await prisma.payment.create({
      data: {
        ...data,
        project_id: invoice.project_id,
        tenant_id: tenantId!
      }
    });

    // Check if invoice is now fully paid
    if (totalPaidOnInvoice + data.amount >= Number(invoice.amount)) {
        await prisma.invoice.update({
            where: { id: data.invoice_id },
            data: { status: 'PAID' }
        });
    } else {
        await prisma.invoice.update({
            where: { id: data.invoice_id },
            data: { status: 'PARTIALLY_PAID' }
        });
    }

    return payment;
  }
}
