import { Request, Response } from 'express';
import { GlpiSyncService } from '../services/glpi-sync.service.js';

const service = new GlpiSyncService();

export class GlpiController {
  static async getUsers(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 200;
      const users = await service.listLocalGlpiUsers(limit);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Failed to fetch GLPI users' });
    }
  }

  static async getTickets(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 200;
      const tickets = await service.listLocalTickets(limit);
      res.json(tickets);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Failed to fetch GLPI tickets' });
    }
  }

  static async syncUsers(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 1000;
      const result = await service.syncUsersToLocalDb(limit);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'GLPI user sync failed' });
    }
  }

  static async syncTickets(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 1000;
      const result = await service.syncTicketsToLocalDb(limit);
      res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'GLPI ticket sync failed' });
    }
  }
}
