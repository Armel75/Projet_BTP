import { PunchItemService } from '../services/punch-item.service.js';
export class PunchItemController {
    static async create(req, res) {
        try {
            const user = req.user;
            const item = await PunchItemService.createPunchItem({
                ...req.body,
                created_by: user.id,
                due_date: req.body.due_date ? new Date(req.body.due_date) : undefined
            });
            res.status(201).json(item);
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
            const items = await PunchItemService.getPunchItems(filters);
            res.json(items);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const item = await PunchItemService.getPunchItemById(Number(req.params.id));
            if (!item)
                return res.status(404).json({ error: "Punch item not found" });
            res.json(item);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const item = await PunchItemService.updatePunchItem(Number(req.params.id), {
                ...req.body,
                due_date: req.body.due_date ? new Date(req.body.due_date) : undefined,
                resolved_at: req.body.resolved_at ? new Date(req.body.resolved_at) : undefined
            });
            res.json(item);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async delete(req, res) {
        try {
            await PunchItemService.deletePunchItem(Number(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
