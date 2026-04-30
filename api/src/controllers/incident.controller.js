import { IncidentService } from '../services/incident.service.js';
export class IncidentController {
    static async create(req, res) {
        try {
            const user = req.user;
            const incident = await IncidentService.createIncident({
                ...req.body,
                created_by: user.id
            });
            res.status(201).json(incident);
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
            if (req.query.severity)
                filters.severity = req.query.severity;
            if (req.query.type)
                filters.type = req.query.type;
            const incidents = await IncidentService.getIncidents(filters);
            res.json(incidents);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const incident = await IncidentService.getIncidentById(Number(req.params.id));
            if (!incident)
                return res.status(404).json({ error: "Incident not found" });
            res.json(incident);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async update(req, res) {
        try {
            const incident = await IncidentService.updateIncident(Number(req.params.id), {
                ...req.body,
                resolved_at: req.body.resolved_at ? new Date(req.body.resolved_at) : undefined
            });
            res.json(incident);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    static async delete(req, res) {
        try {
            await IncidentService.deleteIncident(Number(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
