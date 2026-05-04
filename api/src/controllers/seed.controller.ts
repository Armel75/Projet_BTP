import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from '../config/prisma.js';
import { PERMISSION_CATALOG } from '../config/permissions.js';
import { ROLE_CATALOG } from '../services/seed-roles.js';

const DEFAULT_SEED_MATRICULES = {
  admin: "GS001",
  dg: "DG001",
  sg: "SG001",
  directeur: "DR001",
  chefProjet: "CP001",
  conducteurTravaux: "CT001",
} as const;

// ROLE_CATALOG est importé depuis src/services/seed-roles.ts
// Modifier les rôles/permissions dans ce fichier partagé uniquement.

export class SeedController {
  static async runSeed(req: Request, res: Response): Promise<void> {
    try {
      // ── 1. Tenant ─────────────────────────────────────────────────────────
      let tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await prisma.tenant.create({ data: { name: "Default Tenant" } });
      }

      // ── 2. Upsert all permissions ─────────────────────────────────────────
      const permissionMap: Record<string, number> = {};
      for (const p of PERMISSION_CATALOG) {
        const perm = await prisma.permission.upsert({
          where: { code: p.code },
          update: { label: p.label },
          create: { code: p.code, label: p.label },
        });
        permissionMap[p.code] = perm.id;
      }

      // ── 3. Upsert all roles and bind permissions ───────────────────────────
      const roleMap: Record<string, number> = {};
      for (const r of ROLE_CATALOG) {
        const role = await prisma.role.upsert({
          where: { code: r.code },
          update: { name: r.name, description: r.description },
          create: { code: r.code, name: r.name, description: r.description },
        });
        roleMap[r.code] = role.id;

        // Bind permissions to role (idempotent)
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

      // ── 4. Seed users ──────────────────────────────────────────────────────
      // Mot de passe commun à tous les users de seed — configurable via .env
      const seedPassword = process.env.SEED_USER_PASSWORD ?? "admin123";
      const seedPasswordHash = await bcrypt.hash(seedPassword, 10);

      const assignRole = async (userId: number, roleCode: string) => {
        const roleId = roleMap[roleCode];
        if (!roleId) return;
        const existing = await prisma.userRole.findFirst({
          where: { user_id: userId, role_id: roleId, project_id: null },
        });
        if (!existing) {
          await prisma.userRole.create({ data: { user_id: userId, role_id: roleId } });
        }
      };

      // ── Gestionnaire Système (accès total) ───────────────────────────────
      const sysUser = await prisma.user.upsert({
        where: { email: "admin@btp.erp" },
        update: {
          firstname: "Admin",
          lastname: "Système",
          username: "admin_btp",
          matricule: DEFAULT_SEED_MATRICULES.admin,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Admin",
          lastname: "Système",
          email: "admin@btp.erp",
          username: "admin_btp",
          matricule: DEFAULT_SEED_MATRICULES.admin,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(sysUser.id, "GESTIONNAIRE_SYSTEME");

      // ── Direction Générale ────────────────────────────────────────────────
      const dgUser = await prisma.user.upsert({
        where: { email: "dg@btp.erp" },
        update: {
          firstname: "Directeur",
          lastname: "Général",
          username: "dg_btp",
          matricule: DEFAULT_SEED_MATRICULES.dg,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Directeur",
          lastname: "Général",
          email: "dg@btp.erp",
          username: "dg_btp",
          matricule: DEFAULT_SEED_MATRICULES.dg,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(dgUser.id, "DG");

      // ── Secrétariat Général ───────────────────────────────────────────────
      const sgUser = await prisma.user.upsert({
        where: { email: "sg@btp.erp" },
        update: {
          firstname: "Secrétaire",
          lastname: "Général",
          username: "sg_btp",
          matricule: DEFAULT_SEED_MATRICULES.sg,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Secrétaire",
          lastname: "Général",
          email: "sg@btp.erp",
          username: "sg_btp",
          matricule: DEFAULT_SEED_MATRICULES.sg,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(sgUser.id, "SG");

      // ── Directeur ─────────────────────────────────────────────────────────
      const dirUser = await prisma.user.upsert({
        where: { email: "directeur@btp.erp" },
        update: {
          firstname: "Directeur",
          lastname: "Projets",
          username: "directeur_btp",
          matricule: DEFAULT_SEED_MATRICULES.directeur,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Directeur",
          lastname: "Projets",
          email: "directeur@btp.erp",
          username: "directeur_btp",
          matricule: DEFAULT_SEED_MATRICULES.directeur,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(dirUser.id, "DIRECTEUR");

      // ── Chef de Projet (email configurable via SEED_USER_EMAIL) ──────────
      const cpEmail = process.env.SEED_USER_EMAIL ?? "projet@btp.erp";
      const cpUsername = process.env.SEED_USER_USERNAME ?? "projet_admin";
      const cpMatricule = process.env.SEED_USER_MATRICULE ?? DEFAULT_SEED_MATRICULES.chefProjet;
      const cpUser = await prisma.user.upsert({
        where: { email: cpEmail },
        update: {
          firstname: "Jean",
          lastname: "Bâtisseur",
          username: cpUsername,
          matricule: cpMatricule,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Jean",
          lastname: "Bâtisseur",
          email: cpEmail,
          username: cpUsername,
          matricule: cpMatricule,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(cpUser.id, "CHEF_PROJET");

      // ── Conducteur de Travaux ─────────────────────────────────────────────
      const ctUser = await prisma.user.upsert({
        where: { email: "conducteur@btp.erp" },
        update: {
          firstname: "Marc",
          lastname: "Chantier",
          username: "conducteur_btp",
          matricule: DEFAULT_SEED_MATRICULES.conducteurTravaux,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
        create: {
          firstname: "Marc",
          lastname: "Chantier",
          email: "conducteur@btp.erp",
          username: "conducteur_btp",
          matricule: DEFAULT_SEED_MATRICULES.conducteurTravaux,
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
        },
      });
      await assignRole(ctUser.id, "CONDUCTEUR_TRAVAUX");

      res.json({
        status: "seeded",
        permissions_created: PERMISSION_CATALOG.length,
        roles_created: ROLE_CATALOG.map(r => ({ code: r.code, permissions: r.permissions.length })),
        credentials: [
          { email: "admin@btp.erp",        password: seedPassword, role: "GESTIONNAIRE_SYSTEME" },
          { email: "dg@btp.erp",           password: seedPassword, role: "DG" },
          { email: "sg@btp.erp",           password: seedPassword, role: "SG" },
          { email: "directeur@btp.erp",    password: seedPassword, role: "DIRECTEUR" },
          { email: cpEmail,                password: seedPassword, role: "CHEF_PROJET" },
          { email: "conducteur@btp.erp",   password: seedPassword, role: "CONDUCTEUR_TRAVAUX" },
        ],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Seed failed", details: String(error) });
    }
  }
}
