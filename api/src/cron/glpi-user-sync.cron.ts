import cron from 'node-cron';
import { GlpiSyncService } from '../services/glpi-sync.service.js';

let isRunning = false;

export function startGlpiUserSyncCron() {
  console.log('[CRON] GLPI user sync cron initialized');

  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.log('[CRON] GLPI user sync skipped because previous sync is still running');
      return;
    }

    isRunning = true;
    console.log('[CRON] GLPI user sync started at', new Date().toISOString());

    try {
      const service = new GlpiSyncService();
      const result = await service.syncUsersToLocalDb(1000);

      if (!result.success) {
        console.warn('[CRON] GLPI user sync warning:', result);
      } else {
        console.log('[CRON] GLPI user sync result:', result);
      }
    } catch (error) {
      console.error('[CRON] GLPI user sync failed:', error);
    } finally {
      isRunning = false;
      console.log('[CRON] GLPI user sync finished at', new Date().toISOString());
    }
  });
}
