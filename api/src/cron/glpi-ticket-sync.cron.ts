import cron from 'node-cron';
import { GlpiSyncService } from '../services/glpi-sync.service.js';

let isRunning = false;

export function startGlpiTicketSyncCron() {
  console.log('[CRON] GLPI ticket sync cron initialized');

  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.log('[CRON] GLPI ticket sync skipped because previous sync is still running');
      return;
    }

    isRunning = true;
    console.log('[CRON] GLPI ticket sync started at', new Date().toISOString());

    try {
      const service = new GlpiSyncService();
      const result = await service.syncTicketsToLocalDb(1000);

      if (!result.success) {
        console.warn('[CRON] GLPI ticket sync warning:', result);
      } else {
        console.log('[CRON] GLPI ticket sync result:', result);
      }
    } catch (error) {
      console.error('[CRON] GLPI ticket sync failed:', error);
    } finally {
      isRunning = false;
      console.log('[CRON] GLPI ticket sync finished at', new Date().toISOString());
    }
  });
}
