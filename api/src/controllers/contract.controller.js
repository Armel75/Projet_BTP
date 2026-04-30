import { ContractService } from "../services/contract.service.js";
export class ContractController {
    // Contracts
    static async getContracts(req, res) {
        try {
            const projectId = Number(req.query.projectId);
            if (!projectId) {
                res.status(400).json({ error: "projectId is required" });
                return;
            }
            const contracts = await ContractService.getContractsByProject(projectId);
            res.json(contracts);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch contracts" });
        }
    }
    static async getContract(req, res) {
        try {
            const contract = await ContractService.getContractById(Number(req.params.id));
            if (!contract) {
                res.status(404).json({ error: "Contract not found" });
                return;
            }
            res.json(contract);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch contract" });
        }
    }
    static async createContract(req, res) {
        try {
            const userId = req.user?.id;
            const contract = await ContractService.createContract({
                ...req.body,
                created_by: userId
            });
            res.status(201).json(contract);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    // Change Orders
    static async createChangeOrder(req, res) {
        try {
            const userId = req.user?.id;
            const co = await ContractService.createChangeOrder({
                ...req.body,
                contract_id: Number(req.params.id),
                created_by: userId
            });
            res.status(201).json(co);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async approveChangeOrder(req, res) {
        try {
            const userId = req.user?.id;
            const co = await ContractService.updateChangeOrderStatus(Number(req.params.id), 'APPROVED', userId);
            res.json(co);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async rejectChangeOrder(req, res) {
        try {
            const userId = req.user?.id;
            const co = await ContractService.updateChangeOrderStatus(Number(req.params.id), 'REJECTED', userId);
            res.json(co);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    // Invoices
    static async createInvoice(req, res) {
        try {
            const userId = req.user?.id;
            const invoice = await ContractService.createInvoice({
                ...req.body,
                created_by: userId
            });
            res.status(201).json(invoice);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getInvoices(req, res) {
        try {
            const contractId = req.query.contractId ? Number(req.query.contractId) : undefined;
            const invoices = contractId
                ? await ContractService.getInvoicesByContract(contractId)
                : []; // Or global fetch if needed
            res.json(invoices);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch invoices" });
        }
    }
    // Payments
    static async createPayment(req, res) {
        try {
            const userId = req.user?.id;
            const payment = await ContractService.createPayment({
                ...req.body,
                created_by: userId,
                payment_date: new Date(req.body.payment_date || Date.now())
            });
            res.status(201).json(payment);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
