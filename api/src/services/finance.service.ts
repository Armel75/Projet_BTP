import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class FinanceService {
  private static normalizeSituationTravaux(row: any) {
    if (!row) return row;

    const toNumber = (value: any) => {
      if (value === null || value === undefined) return 0;
      const casted = Number(value);
      return Number.isNaN(casted) ? 0 : casted;
    };

    return {
      ...row,
      reception_pct: toNumber(row.reception_pct),
      amount_global: toNumber(row.amount_global),
      amount_proposed: toNumber(row.amount_proposed),
      amount_accorded: toNumber(row.amount_accorded),
      cumul_paid_before: toNumber(row.cumul_paid_before),
      amount_paid_current: toNumber(row.amount_paid_current),
      balance_to_pay: toNumber(row.balance_to_pay),
      remaining_to_receive: toNumber(row.remaining_to_receive),
    };
  }

  // ==========================
  // BUDGET LINES
  // ==========================

  static async createBudgetLine(data: {
    project_id: number;
    category: string;
    planned_amount: number;
    currency?: string;
    start_date?: Date;
    end_date?: Date;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.budgetLine.create({
      data: {
        ...data,
        tenant_id: tenantId,
        currency: data.currency || 'EUR'
      }
    });
  }

  static async getBudgetLinesByProject(project_id: number) {
    const budgetLines = await prisma.budgetLine.findMany({
      where: { project_id },
      include: {
        transactions: true
      }
    });

    // Enrich with calculated fields
    return budgetLines.map((bl: any) => {
      const consumed = bl.transactions.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
      return {
        ...bl,
        consumed_amount: consumed,
        remaining_amount: Number(bl.planned_amount) - consumed
      };
    });
  }

  static async getBudgetLineById(id: number) {
    const bl = await prisma.budgetLine.findUnique({
      where: { id },
      include: {
        transactions: true,
        project: true
      }
    });

    if (!bl) return null;

    const consumed = (bl as any).transactions.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
    return {
      ...bl,
      consumed_amount: consumed,
      remaining_amount: Number(bl.planned_amount) - consumed
    };
  }

  static async updateBudgetLine(id: number, data: any) {
    return await prisma.budgetLine.update({
      where: { id },
      data
    });
  }

  // ==========================
  // COST TRANSACTIONS
  // ==========================

  static async createCostTransaction(data: {
    budget_id: number;
    amount: number;
    transaction_date: Date;
    description?: string;
    source_type?: string;
    source_id?: number;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    // 1. Get Budget Line and current consumption
    const budgetLine = await this.getBudgetLineById(data.budget_id);
    if (!budgetLine) throw new Error("Budget Line not found");

    // 2. Financial Control: Check for over-budget
    const newConsumed = budgetLine.consumed_amount + data.amount;
    if (newConsumed > Number(budgetLine.planned_amount)) {
      // In a real ERP, we might log this or allow it with a flag, 
      // but according to the prompt "bloquer si dépassement budget"
      throw new Error(`Budget exceeded for category ${budgetLine.category}. Remaining: ${budgetLine.remaining_amount}, Attempted: ${data.amount}`);
    }

    // 3. Create Transaction
    return await prisma.costTransaction.create({
      data: {
        ...data,
        tenant_id: tenantId,
        project_id: budgetLine.project_id
      }
    });
  }

  static async getCostTransactions(filters: any) {
    return await prisma.costTransaction.findMany({
      where: filters,
      include: {
        budgetLine: true,
        createdBy: true
      },
      orderBy: { transaction_date: 'desc' }
    });
  }

  static async getTransactionsByBudgetLine(budgetId: number) {
    return await prisma.costTransaction.findMany({
      where: { budget_id: budgetId },
      include: {
        createdBy: true
      },
      orderBy: { transaction_date: 'desc' }
    });
  }

  // ==========================
  // SITUATIONS TRAVAUX
  // ==========================

  static async getSituationsTravaux(filters: {
    project_id?: number;
    contract_id?: number;
    purchase_order_id?: number;
    supplier_id?: number;
    status?: string;
  }) {
    const situations = await prisma.situationTravaux.findMany({
      where: filters,
      include: {
        project: {
          select: { id: true, code: true, title: true }
        },
        contract: {
          select: { id: true, reference: true, title: true }
        },
        purchaseOrder: {
          select: { id: true, number: true, title: true }
        },
        supplier: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, firstname: true, lastname: true, email: true }
        },
        approvedBy: {
          select: { id: true, firstname: true, lastname: true, email: true }
        }
      },
      orderBy: [{ period_end: 'desc' }, { id: 'desc' }]
    });

    return situations.map(this.normalizeSituationTravaux);
  }

  static async getSituationTravauxById(id: number) {
    const situation = await prisma.situationTravaux.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, code: true, title: true }
        },
        contract: {
          select: { id: true, reference: true, title: true }
        },
        purchaseOrder: {
          select: { id: true, number: true, title: true }
        },
        supplier: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, firstname: true, lastname: true, email: true }
        },
        approvedBy: {
          select: { id: true, firstname: true, lastname: true, email: true }
        }
      }
    });

    return this.normalizeSituationTravaux(situation);
  }

  static async createSituationTravaux(data: any) {
    const created = await prisma.situationTravaux.create({
      data
    });

    return this.normalizeSituationTravaux(created);
  }

  static async updateSituationTravaux(id: number, data: any) {
    const updated = await prisma.situationTravaux.update({
      where: { id },
      data
    });

    return this.normalizeSituationTravaux(updated);
  }
}
