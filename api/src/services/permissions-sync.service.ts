/**
 * Service de synchronisation des permissions — idempotent, safe en production.
 *
 * Comportement :
 *  - Crée uniquement les permissions manquantes (jamais de doublon)
 *  - Ne supprime JAMAIS une permission existante
 *  - Log clairement : créées / déjà présentes / total
 *
 * Usage :
 *  - Au démarrage du serveur : await syncPermissions()
 *  - Peut être appelé à tout moment sans risque
 */

import { prisma } from '../config/prisma.js';
import { PERMISSION_CATALOG } from '../config/permissions.js';

export interface SyncResult {
  created:  number;
  existing: number;
  total:    number;
}

export async function syncPermissions(): Promise<SyncResult> {
  console.log('[permissions-sync] Début de la synchronisation...');

  // 1. Charger tous les codes déjà présents en base (une seule requête)
  const existingRows = await prisma.permission.findMany({ select: { code: true } });
  const existingCodes = new Set(existingRows.map((p: { code: string }) => p.code));

  // 2. Déterminer les permissions manquantes
  const missing = PERMISSION_CATALOG.filter(p => !existingCodes.has(p.code));

  // 3. Créer uniquement les manquantes (une par une pour un log précis)
  for (const p of missing) {
    await prisma.permission.create({ data: { code: p.code, label: p.label } });
    console.log(`[permissions-sync] ✅ Créée : ${p.code} — ${p.label}`);
  }

  const result: SyncResult = {
    created:  missing.length,
    existing: existingCodes.size,
    total:    PERMISSION_CATALOG.length,
  };

  if (missing.length === 0) {
    console.log(`[permissions-sync] ✔  Toutes les permissions sont déjà présentes (${result.existing} en base).`);
  } else {
    console.log(`[permissions-sync] Terminé — ${result.created} créées, ${result.existing} déjà présentes, ${result.total} au total.`);
  }

  return result;
}
