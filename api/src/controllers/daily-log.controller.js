import { DailyLogService } from '../services/daily-log.service.js';
export class DailyLogController {
    static async create(req, res) {
        try {
            const user = req.user;
            const log = await DailyLogService.createDailyLog({
                ...req.body,
                created_by: user.id,
                date: new Date(req.body.date)
            });
            res.status(201).json(log);
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
            if (req.query.date)
                filters.date = new Date(req.query.date);
            if (req.query.created_by)
                filters.created_by = Number(req.query.created_by);
            const logs = await DailyLogService.getDailyLogs(filters);
            res.json(logs);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const log = await DailyLogService.getDailyLogById(Number(req.params.id));
            if (!log)
                return res.status(404).json({ error: "Daily log not found" });
            res.json(log);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const log = await DailyLogService.updateDailyLog(Number(req.params.id), req.body);
            res.json(log);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async delete(req, res) {
        try {
            await DailyLogService.deleteDailyLog(Number(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
