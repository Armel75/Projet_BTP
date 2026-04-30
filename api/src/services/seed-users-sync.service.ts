/**
 * Service de synchronisation des users/rôles de seed — idempotent, safe en production.
 *
 * Comportement :
 *  - Crée le tenant par défaut s'il n'existe pas
 *  - Crée uniquement les rôles manquants et leurs permissions
 *  - Crée uniquement les users manquants (jamais de modification en production)
 *  - Ne supprime JAMAIS un user ou un rôle existant
 *
 * Usage :
 *  - Au démarrage du serveur : await syncSeedUsers()
 *  - Peut être appelé à tout moment sans risque
 */

import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { PERMISSION_CATALOG } from '../config/permissions.js';
import { ROLE_CATALOG } from './seed-roles.js';

export async function syncSeedUsers(): Promise<void> {
  console.log('[seed-users] Début de la synchronisation...');

  // ── 1. Tenant par défaut ────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
    console.log('[seed-users] ✅ Tenant créé');
  }

  // ── 2. Permissions ──────────────────────────────────────────────────────────
  const permissionMap: Record<string, number> = {};
  for (const p of PERMISSION_CATALOG) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, label: p.label },
    });
    permissionMap[p.code] = perm.id;
  }

  // ── 3. Rôles + liaisons permissions ─────────────────────────────────────────
  const roleMap: Record<string, number> = {};
  for (const r of ROLE_CATALOG) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { code: r.code, name: r.name, description: r.description },
    });
    roleMap[r.code] = role.id;

    for (const permCode of r.permissions) {
      const permId = permissionMap[permCode];
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.id, permission_id: permId } },
        update: {},
        create: { role_id: role.id, permission_id: permId },
      });
    }
  }

  // ── 4. Mot de passe commun (configurable via .env) ──────────────────────────
  const seedPassword = process.env.SEED_USER_PASSWORD ?? 'admin123';
  const seedPasswordHash = await bcrypt.hash(seedPassword, 10);

  const ensureUser = async (params: {
    email: string;
    username: string;
    matricule: string;
    firstname: string;
    lastname: string;
    roleCode: string;
  }) => {
    const existing = await prisma.user.findUnique({ where: { email: params.email } });
    if (existing) return existing;

    const user = await prisma.user.create({
      data: {
        firstname: params.firstname,
        lastname: params.lastname,
        email: params.email,
        username: params.username,
        matricule: params.matricule,
        status: 'ACTIVE',
        tenant_id: tenant!.id,
        password_hash: seedPasswordHash,
      },
    });

    const roleId = roleMap[params.roleCode];
    if (roleId) {
      await prisma.userRole.create({ data: { user_id: user.id, role_id: roleId } });
    }

    console.log(`[seed-users] ✅ User créé : ${params.email} (${params.roleCode})`);
    return user;
  };

  // ── 5. Users de seed (1 par rôle) ───────────────────────────────────────────
  const cpEmail     = process.env.SEED_USER_EMAIL      ?? 'projet@btp.erp';
  const cpUsername  = process.env.SEED_USER_USERNAME   ?? 'projet_admin';
  const cpMatricule = process.env.SEED_USER_MATRICULE  ?? 'MAT-CP-001';

  await ensureUser({ email: 'admin@btp.erp',      username: 'admin_btp',      matricule: 'MAT-SYS-001', firstname: 'Admin',      lastname: 'Système',  roleCode: 'GESTIONNAIRE_SYSTEME' });
  await ensureUser({ email: 'dg@btp.erp',         username: 'dg_btp',         matricule: 'MAT-DG-001',  firstname: 'Directeur',  lastname: 'Général',  roleCode: 'DG' });
  await ensureUser({ email: 'sg@btp.erp',         username: 'sg_btp',         matricule: 'MAT-SG-001',  firstname: 'Secrétaire', lastname: 'Général',  roleCode: 'SG' });
  await ensureUser({ email: 'directeur@btp.erp',  username: 'directeur_btp',  matricule: 'MAT-DIR-001', firstname: 'Directeur',  lastname: 'Projets',  roleCode: 'DIRECTEUR' });
  await ensureUser({ email: cpEmail,              username: cpUsername,        matricule: cpMatricule,   firstname: 'Jean',       lastname: 'Bâtisseur',roleCode: 'CHEF_PROJET' });
  await ensureUser({ email: 'conducteur@btp.erp', username: 'conducteur_btp', matricule: 'MAT-CT-001',  firstname: 'Marc',       lastname: 'Chantier', roleCode: 'CONDUCTEUR_TRAVAUX' });

  // ── 6. Référentiel TradeCategory (corps d'état BTP) ─────────────────────────
  // Catalogue normatif global — créé uniquement si absent, jamais modifié.
  const TRADE_CATALOG = [
    { code: 'GROS_OEUVRE',            label: 'Gros Œuvre',                       order: 1  },
    { code: 'CHARPENTE_BOIS',         label: 'Charpente Bois',                   order: 2  },
    { code: 'CHARPENTE_METALLIQUE',   label: 'Charpente Métallique',             order: 3  },
    { code: 'ETANCHEITE',             label: 'Étanchéité',                       order: 4  },
    { code: 'COUVERTURE',             label: 'Couverture',                       order: 5  },
    { code: 'FACADES',                label: 'Façades & Ravalement',             order: 6  },
    { code: 'MENUISERIE_EXT',         label: 'Menuiseries Extérieures',          order: 7  },
    { code: 'MENUISERIE_INT',         label: 'Menuiseries Intérieures',          order: 8  },
    { code: 'CLOISONS_DOUBLAGES',     label: 'Cloisons & Doublages',             order: 9  },
    { code: 'REVETEMENTS_SOLS_MURS',  label: 'Revêtements Sols & Murs',          order: 10 },
    { code: 'PEINTURE',               label: 'Peinture',                         order: 11 },
    { code: 'ELECTRICITE_CFO_CFA',    label: 'Électricité CFO/CFA',              order: 12 },
    { code: 'PLOMBERIE_SANITAIRE',    label: 'Plomberie & Sanitaire',            order: 13 },
    { code: 'CVC',                    label: 'Chauffage Ventilation Climatisation (CVC)', order: 14 },
    { code: 'ASCENSEURS',             label: 'Ascenseurs & Élévateurs',          order: 15 },
    { code: 'VRD',                    label: 'Voirie & Réseaux Divers (VRD)',    order: 16 },
    { code: 'ESPACES_VERTS',          label: 'Espaces Verts & Aménagements',     order: 17 },
    { code: 'DEMOLITION',             label: 'Démolition & Déconstruction',      order: 18 },
    { code: 'AUTRES',                 label: 'Autres corps d\'état',             order: 99 },
  ];

  let tradeSynced = 0;
  for (const t of TRADE_CATALOG) {
    const exists = await prisma.tradeCategory.findUnique({ where: { code: t.code } });
    if (!exists) {
      await prisma.tradeCategory.create({ data: t });
      tradeSynced++;
    }
  }
  if (tradeSynced > 0) {
    console.log(`[seed-users] ✅ TradeCategory : ${tradeSynced} corps d'état créés.`);
  } else {
    console.log('[seed-users] ✔  TradeCategory : tous les corps d\'état déjà présents.');
  }

  console.log('[seed-users] ✔  Synchronisation terminée.');
}
