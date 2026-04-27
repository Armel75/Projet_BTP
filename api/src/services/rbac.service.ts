import { prisma } from "../config/prisma.js";

export class RbacService {
  // ----------------------------------------------------
  // PERMISSIONS
  // ----------------------------------------------------
  static async createPermission(data: { code: string; label: string }) {
    return prisma.permission.create({ data });
  }

  static async getPermissions() {
    return prisma.permission.findMany();
  }

  static async deletePermission(id: number) {
    return prisma.permission.delete({ where: { id } });
  }

  // ----------------------------------------------------
  // ROLES
  // ----------------------------------------------------
  static async createRole(data: { code: string; name: string; description?: string }) {
    return prisma.role.create({ data });
  }

  static async getRoles() {
    return prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
  }

  static async deleteRole(id: number) {
    // Delete role's permissions links first
    await prisma.rolePermission.deleteMany({ where: { role_id: id } });
    await prisma.userRole.deleteMany({ where: { role_id: id } });
    return prisma.role.delete({ where: { id } });
  }

  // ----------------------------------------------------
  // ASSIGNMENTS: ROLE <-> PERMISSION
  // ----------------------------------------------------
  static async addPermissionToRole(roleId: number, permissionId: number) {
    return prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: { role_id: roleId, permission_id: permissionId }
      },
      create: { role_id: roleId, permission_id: permissionId },
      update: {}
    });
  }

  static async removePermissionFromRole(roleId: number, permissionId: number) {
    return prisma.rolePermission.delete({
      where: {
        role_id_permission_id: { role_id: roleId, permission_id: permissionId }
      }
    });
  }

  // ----------------------------------------------------
  // ASSIGNMENTS: USER <-> ROLE
  // ----------------------------------------------------
  static async assignRoleToUser(userId: number, roleId: number, projectId?: number, tenantId?: number) {
    return prisma.userRole.upsert({
      where: {
        user_id_role_id_project_id: {
          user_id: userId,
          role_id: roleId,
          project_id: projectId || 0 // Prisma requires matching what unique index means for nulls, wait, unique with nulls can be tricky. Let's just create if not exists using try catch or let Prisma handle it safely.
        }
      },
      create: { user_id: userId, role_id: roleId, project_id: projectId, tenant_id: tenantId },
      update: {} // If exists, do nothing
    }).catch(async (e: any) => {
        // Fallback for unique constraint with nulls issue in Prisma
        const existing = await prisma.userRole.findFirst({
            where: { user_id: userId, role_id: roleId, project_id: projectId || null }
        });
        if(existing) return existing;
        return prisma.userRole.create({
            data: { user_id: userId, role_id: roleId, project_id: projectId, tenant_id: tenantId }
        });
    });
  }

  static async assignRoleToUserSimple(userId: number, roleId: number) {
     const existing = await prisma.userRole.findFirst({
         where: { user_id: userId, role_id: roleId, project_id: null }
     });
     if(existing) return existing;
     return prisma.userRole.create({
         data: { user_id: userId, role_id: roleId }
     });
  }

  static async removeRoleFromUser(userRoleId: number) {
    return prisma.userRole.delete({ where: { id: userRoleId } });
  }

  // ----------------------------------------------------
  // RESOLUTION
  // ----------------------------------------------------
  static async getUserRoles(userId: number) {
    return prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true }
    });
  }

  static async getUserPermissions(userId: number): Promise<string[]> {
    // get all roles for user
    const userRoles = await prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    // extract permissions unique codes
    const permissionsSet = new Set<string>();
    
    for (const ur of userRoles) {
      if (ur.role && ur.role.rolePermissions) {
        for (const rp of ur.role.rolePermissions) {
          if (rp.permission?.code) {
            permissionsSet.add(rp.permission.code);
          }
        }
      }
    }
    
    return Array.from(permissionsSet);
  }

  static async getAllUsersWithRoles() {
    return prisma.user.findMany({
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });
  }
}
