import 'dotenv/config';
import app from './app.js';
import { syncPermissions } from './services/permissions-sync.service.js';
import { syncSeedUsers } from './services/seed-users-sync.service.js';

const PORT = process.env.PORT;

app.listen(PORT, async () => {
  console.log(`API server running on port ${PORT}`);

  // 1. Sync permissions catalog (idempotent)
  await syncPermissions().catch(err =>
    console.error('[permissions-sync] ⚠ Erreur :', err)
  );

  // 2. Sync seed users + rôles (idempotent — ne crée que les absents)
  await syncSeedUsers().catch(err =>
    console.error('[seed-users] ⚠ Erreur :', err)
  );
});
