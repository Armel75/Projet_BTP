import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';
export class FinanceService {
    // ==========================
    // BUDGET LINES
    // ==========================
    static async createBudgetLine(data) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId)
            throw new Error("Tenant session required");
        return await prisma.budgetLine.create({
            data: {
                ...data,
                tenant_id: tenantId,
                currency: data.currency || 'EUR'
            }
        });
    }
    static async getBudgetLinesByProject(project_id) {
        const budgetLines = await prisma.budgetLine.findMany({
            where: { project_id },
            include: {
                transactions: true
            }
        });
        // Enrich with calculated fields
        return budgetLines.map((bl) => {
            const consumed = bl.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            return {
                ...bl,
                consumed_amount: consumed,
                remaining_amount: Number(bl.planned_amount) - consumed
            };
        });
    }
    static async getBudgetLineById(id) {
        const bl = await prisma.budgetLine.findUnique({
            where: { id },
            include: {
                transactions: true,
                project: true
            }
        });
        if (!bl)
            return null;
        const consumed = bl.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        return {
            ...bl,
            consumed_amount: consumed,
            remaining_amount: Number(bl.planned_amount) - consumed
        };
    }
    static async updateBudgetLine(id, data) {
        return await prisma.budgetLine.update({
            where: { id },
            data
        });
    }
    // ==========================
    // COST TRANSACTIONS
    // ==========================
    static async createCostTransaction(data) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId)
            throw new Error("Tenant session required");
        // 1. Get Budget Line and current consumption
        const budgetLine = await this.getBudgetLineById(data.budget_id);
        if (!budgetLine)
            throw new Error("Budget Line not found");
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
    static async getCostTransactions(filters) {
        return await prisma.costTransaction.findMany({
            where: filters,
            include: {
                budgetLine: true,
                createdBy: true
            },
            orderBy: { transaction_date: 'desc' }
        });
    }
    static async getTransactionsByBudgetLine(budgetId) {
        return await prisma.costTransaction.findMany({
            where: { budget_id: budgetId },
            include: {
                createdBy: true
            },
            orderBy: { transaction_date: 'desc' }
        });
    }
}
