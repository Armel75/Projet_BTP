import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from '../config/prisma.js';

export class SeedController {
  static async runSeed(req: Request, res: Response): Promise<void> {
    try {
      // 1. Create essential roles
      const dgRole = await prisma.role.upsert({
        where: { code: "DG" },
        update: {},
        create: { code: "DG", description: "Direction Générale" },
      });
      const sgRole = await prisma.role.upsert({
        where: { code: "SG" },
        update: {},
        create: { code: "SG", description: "Secrétariat Général" },
      });
      const cpRole = await prisma.role.upsert({
        where: { code: "CHEF_PROJET" },
        update: {},
        create: { code: "CHEF_PROJET", description: "Chef de Projet" },
      });

      let tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await prisma.tenant.create({ data: { name: "Default Tenant" } });
      }

      // 2. Create users (with a real hashed password for demo : "admin123")
      const seedPasswordHash = await bcrypt.hash("admin123", 10);
      const cpUser = await prisma.user.upsert({
        where: { email: "projet@btp.erp" },
        update: { password_hash: seedPasswordHash },
        create: {
          firstname: "Jean",
          lastname: "Bâtisseur",
          email: "projet@btp.erp",
          username: "projet_admin",
          matricule: "MAT-SEED-123",
          status: "ACTIVE",
          tenant_id: tenant.id,
          password_hash: seedPasswordHash,
          roles: { create: { role_id: cpRole.id } },
        },
      });

      // 3. Create a project
      const project = await prisma.project.upsert({
        where: { project_code: "PRJ-2026-001" },
        update: {},
        create: {
          project_code: "PRJ-2026-001",
          title: "Construction Tour Part-Dieu",
          description: "Construction d'une tour de 50 étages au centre de Lyon",
          client_name: "Grand Lyon",
          status: "IN_VALIDATION",
          created_by: cpUser.id,
          metadata: {
            create: {
              budget_estimated: 150000000,
            },
          },
        },
      });

      res.json({ status: "seeded", project });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Seed failed" });
    }
  }
}
