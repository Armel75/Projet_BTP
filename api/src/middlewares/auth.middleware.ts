import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from '../config/env.js';
import { RbacService } from "../services/rbac.service.js";
import { prisma } from '../config/prisma.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, async (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: "Invalid token." });
      return;
    }

    if (user && user.sessionId) {
       try {
         const session = await prisma.session.findUnique({ where: { id: user.sessionId } });
         if (!session || session.revoked || session.expiresAt < new Date()) {
           res.status(401).json({ error: "Session expired or invalid." });
           return;
         }
       } catch (e) {
         res.status(500).json({ error: "Could not validate session." });
         return;
       }
    }

    (req as AuthRequest).user = user;
    
    if (user && user.tenant_id) {
      const { TenantContext } = await import('../config/tenant-context.js');
      TenantContext.run(user.tenant_id, () => {
        next();
      });
    } else {
      next();
    }
  });
};


export const authenticateToken = requireAuth; // Keep for backward compatibility

// --- RBAC MIDDLEWARES ---

export const requireRole = (roleCode: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;
    if (!user || !user.id) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    try {
      const userRoles = await RbacService.getUserRoles(user.id);
      const hasRole = userRoles.some((ur: any) => ur.role.code === roleCode);
      if (!hasRole) {
         res.status(403).json({ error: "Forbidden: Missing role " + roleCode });
         return;
      }
      next();
    } catch(e) {
      res.status(500).json({ error: "Server error during role validation" });
    }
  };
};

export const requirePermission = (permissionCode: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthRequest).user;
    if (!user || !user.id) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    try {
      const userPermissions = await RbacService.getUserPermissions(user.id);
      if (!userPermissions.includes(permissionCode)) {
         res.status(403).json({ error: "Forbidden: Missing permission " + permissionCode });
         return;
      }
      next();
    } catch(e) {
      res.status(500).json({ error: "Server error during permission validation" });
    }
  };
};
