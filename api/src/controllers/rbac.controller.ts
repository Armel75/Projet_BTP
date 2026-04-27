import { Request, Response } from "express";
import { RbacService } from "../services/rbac.service.js";

export class RbacController {
  
  // --- ROLES ---
  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await RbacService.getRoles();
      res.json(roles);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const { code, name, description } = req.body;
      if (!code || !name) return res.status(400).json({ error: "code and name are required" });
      const role = await RbacService.createRole({ code, name, description });
      res.status(201).json(role);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async deleteRole(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await RbacService.deleteRole(id);
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  // --- PERMISSIONS ---
  static async getPermissions(req: Request, res: Response) {
    try {
      const permissions = await RbacService.getPermissions();
      res.json(permissions);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async createPermission(req: Request, res: Response) {
    try {
      const { code, label } = req.body;
      if (!code || !label) return res.status(400).json({ error: "code and label are required" });
      const permission = await RbacService.createPermission({ code, label });
      res.status(201).json(permission);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async deletePermission(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await RbacService.deletePermission(id);
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  // --- ROLE <> PERMISSIONS ---
  static async addPermissionToRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.id);
      const { permissionId } = req.body;
      const result = await RbacService.addPermissionToRole(roleId, permissionId);
      res.status(201).json(result);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async removePermissionFromRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.id);
      const permissionId = parseInt(req.params.permissionId);
      await RbacService.removePermissionFromRole(roleId, permissionId);
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  // --- USERS <> ROLES ---
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await RbacService.getAllUsersWithRoles();
      // Only keep safe keys (no hashes)
      const safeUsers = users.map((u: any) => {
        const { password_hash, ...safe } = u;
        return safe;
      });
      res.json(safeUsers);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async assignRoleToUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { roleId } = req.body;
      const result = await RbacService.assignRoleToUserSimple(userId, roleId);
      res.status(201).json(result);
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }

  static async removeRoleFromUser(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.roleId);
      const userId = parseInt(req.params.id);
      // Prisma userRole requires unique ID to delete. We can deleteMany based on user_id and role_id
      const { prisma } = await import("../config/prisma.js");
      await prisma.userRole.deleteMany({
          where: { user_id: userId, role_id: roleId }
      });
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({error: "Server error", details: String(err)});
    }
  }
}
