import express from "express";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_dev_only";

// --- MIDDLEWARE ---
export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: "Invalid token." });
      return;
    }
    (req as any).user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- AUTHENTICATION ROUTES ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstname, lastname, email, password, roleCode = "CHEF_PROJET" } = req.body;
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: "Email already in use." });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: { firstname, lastname, email, password_hash }
      });

      // Assign default role
      const role = await prisma.role.findUnique({ where: { code: roleCode } });
      if (role) {
         await prisma.userRole.create({
           data: { user_id: user.id, role_id: role.id }
         });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
      
      const { password_hash: _, ...safeUser } = user;
      res.status(201).json({ token, user: safeUser });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({ error: "Server error during registration." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } }
      });

      if (!user) {
        res.status(401).json({ error: "Invalid credentials." });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid credentials." });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, roles: user.roles.map(r => r.role.code) }, 
        JWT_SECRET, 
        { expiresIn: '8h' }
      );

      const { password_hash: _, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Server error during login." });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } }
      });
      if (!user) {
         res.status(404).json({ error: "User not found." });
         return;
      }
      const { password_hash: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
       res.status(500).json({ error: "Server error." });
    }
  });

  // Protect projects route gracefully by making it optionally protected 
  // or fully protected! To avoid breaking immediately before we update the frontend, 
  // we will protect it but frontend will be updated next to send the token.
  app.get("/api/projects", authenticateToken, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
        include: {
          creator: true,
          metadata: true,
        },
      });
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Seed route (to make frontend look good quickly)
  app.post("/api/seed", async (req, res) => {
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

      // 2. Create users (with a real hashed password for demo : "admin123")
      const seedPasswordHash = await bcrypt.hash("admin123", 10);
      const cpUser = await prisma.user.upsert({
        where: { email: "projet@btp.erp" },
        update: { password_hash: seedPasswordHash },
        create: {
          firstname: "Jean",
          lastname: "Bâtisseur",
          email: "projet@btp.erp",
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: Assuming dist is built
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
