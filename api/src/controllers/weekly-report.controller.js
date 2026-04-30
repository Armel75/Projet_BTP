import { WeeklyReportService } from '../services/weekly-report.service.js';
export class WeeklyReportController {
    static async generate(req, res) {
        try {
            const user = req.user;
            const report = await WeeklyReportService.generateWeeklyReport({
                ...req.body,
                week_start: new Date(req.body.week_start),
                week_end: new Date(req.body.week_end),
                prepared_by: user.id
            });
            res.status(201).json(report);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async listByProject(req, res) {
        try {
            const projectId = Number(req.params.projectId);
            const reports = await WeeklyReportService.getWeeklyReports(projectId);
            res.json(reports);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const report = await WeeklyReportService.getWeeklyReportById(Number(req.params.id));
            if (!report)
                return res.status(404).json({ error: "Weekly report not found" });
            res.json(report);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const report = await WeeklyReportService.updateWeeklyReport(Number(req.params.id), req.body);
            res.json(report);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
