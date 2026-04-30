import { InspectionService } from '../services/inspection.service.js';
export class InspectionController {
    static async create(req, res) {
        try {
            const user = req.user;
            const inspection = await InspectionService.createInspection({
                ...req.body,
                created_by: user.id,
                scheduled_date: req.body.scheduled_date ? new Date(req.body.scheduled_date) : undefined
            });
            res.status(201).json(inspection);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async list(req, res) {
        try {
            const filters = {};
            if (req.query.project_id)
                filters.project_id = Number(req.query.project_id);
            if (req.query.status)
                filters.status = req.query.status;
            if (req.query.created_by)
                filters.created_by = Number(req.query.created_by);
            const inspections = await InspectionService.getInspections(filters);
            res.json(inspections);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const inspection = await InspectionService.getInspectionById(Number(req.params.id));
            if (!inspection)
                return res.status(404).json({ error: "Inspection not found" });
            res.json(inspection);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const inspection = await InspectionService.updateInspection(Number(req.params.id), {
                ...req.body,
                completed_date: req.body.completed_date ? new Date(req.body.completed_date) : undefined
            });
            res.json(inspection);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async delete(req, res) {
        try {
            await InspectionService.deleteInspection(Number(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
