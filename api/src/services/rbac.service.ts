import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

const MATRICULE_REGEX = /^[A-Z]{2}[0-9]+$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]+$/;

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

  static async createUser(data: any) {
    const firstname = String(data.firstname ?? "").trim();
    const lastname = String(data.lastname ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const username = String(data.username ?? "").trim();
    const matricule = String(data.matricule ?? "").trim();
    const phone = data.phone ? String(data.phone).trim() : null;
    const password = String(data.password ?? "");
    const confirmPassword = String(data.confirmPassword ?? "");
    const status = String(data.status ?? "ACTIVE").trim().toUpperCase();
    const roleId = data.roleId ? Number(data.roleId) : null;

    if (!firstname) throw { status: 400, message: "Le prenom est obligatoire." };
    if (!lastname) throw { status: 400, message: "Le nom est obligatoire." };
    if (!email) throw { status: 400, message: "L'email est obligatoire." };
    if (!username) throw { status: 400, message: "Le nom d'utilisateur est obligatoire." };
    if (!matricule) throw { status: 400, message: "Le matricule est obligatoire." };
    if (!password) throw { status: 400, message: "Le mot de passe est obligatoire." };

    if (!SIMPLE_EMAIL_REGEX.test(email)) {
      throw { status: 400, message: "Format d'email invalide." };
    }

    if (username.length < 3) {
      throw { status: 400, message: "Le nom d'utilisateur doit contenir au moins 3 caracteres." };
    }

    if (password.length < 8) {
      throw { status: 400, message: "Le mot de passe doit contenir au moins 8 caracteres." };
    }

    if (confirmPassword && password !== confirmPassword) {
      throw { status: 400, message: "Le mot de passe et la confirmation ne correspondent pas." };
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      throw { status: 400, message: "Le telephone doit contenir uniquement des chiffres." };
    }

    if (!MATRICULE_REGEX.test(matricule)) {
      throw {
        status: 400,
        message: "Le matricule est invalide. Format attendu: 2 lettres majuscules suivies de chiffres (ex: DL1748)."
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
          { matricule }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email) throw { status: 400, message: "Cette adresse email est deja utilisee." };
      if (existingUser.username === username) throw { status: 400, message: "Ce nom d'utilisateur est deja utilise." };
      if (existingUser.matricule === matricule) throw { status: 400, message: "Ce matricule est deja utilise." };
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const created = await prisma.user.create({
      data: {
        firstname,
        lastname,
        email,
        username,
        matricule,
        phone,
        password_hash,
        status,
        account_status: status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"
      }
    });

    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) throw { status: 400, message: "Role introuvable." };

      await prisma.userRole.create({
        data: { user_id: created.id, role_id: role.id }
      });
    }

    return prisma.user.findUnique({
      where: { id: created.id },
      include: { userRoles: { include: { role: true } } }
    });
  }

  static async updateUser(userId: number, data: any) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw { status: 404, message: "Utilisateur introuvable." };

    const updateData: any = {};

    if (data.firstname !== undefined) updateData.firstname = String(data.firstname).trim();
    if (data.lastname !== undefined) updateData.lastname = String(data.lastname).trim();
    if (data.phone !== undefined) {
      const phoneValue = String(data.phone ?? "").trim();
      if (phoneValue !== "" && !PHONE_REGEX.test(phoneValue)) {
        throw { status: 400, message: "Le telephone doit contenir uniquement des chiffres." };
      }
      updateData.phone = phoneValue === "" ? null : phoneValue;
    }

    let nextEmail: string | null = null;
    if (data.email !== undefined) {
      nextEmail = String(data.email).trim().toLowerCase();
      if (!SIMPLE_EMAIL_REGEX.test(nextEmail)) throw { status: 400, message: "Format d'email invalide." };
      updateData.email = nextEmail;
    }

    let nextUsername: string | null = null;
    if (data.username !== undefined) {
      nextUsername = String(data.username).trim();
      if (nextUsername.length < 3) {
        throw { status: 400, message: "Le nom d'utilisateur doit contenir au moins 3 caracteres." };
      }
      updateData.username = nextUsername;
    }

    let nextMatricule: string | null = null;
    if (data.matricule !== undefined) {
      nextMatricule = String(data.matricule).trim();
      if (!MATRICULE_REGEX.test(nextMatricule)) {
        throw {
          status: 400,
          message: "Le matricule est invalide. Format attendu: 2 lettres majuscules suivies de chiffres (ex: DL1748)."
        };
      }
      updateData.matricule = nextMatricule;
    }

    if (data.status !== undefined) {
      const nextStatus = String(data.status).trim().toUpperCase();
      updateData.status = nextStatus;
      updateData.account_status = nextStatus === "ACTIVE" ? "ACTIVE" : "SUSPENDED";
    }

    if (data.password !== undefined && String(data.password).trim() !== "") {
      const password = String(data.password);
      const confirmPassword = String(data.confirmPassword ?? "");
      if (password.length < 8) {
        throw { status: 400, message: "Le mot de passe doit contenir au moins 8 caracteres." };
      }
      if (confirmPassword && password !== confirmPassword) {
        throw { status: 400, message: "Le mot de passe et la confirmation ne correspondent pas." };
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    if (nextEmail || nextUsername || nextMatricule) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(nextEmail ? [{ email: nextEmail }] : []),
                ...(nextUsername ? [{ username: nextUsername }] : []),
                ...(nextMatricule ? [{ matricule: nextMatricule }] : [])
              ]
            }
          ]
        }
      });

      if (conflict) {
        if (nextEmail && conflict.email.toLowerCase() === nextEmail) throw { status: 400, message: "Cette adresse email est deja utilisee." };
        if (nextUsername && conflict.username === nextUsername) throw { status: 400, message: "Ce nom d'utilisateur est deja utilise." };
        if (nextMatricule && conflict.matricule === nextMatricule) throw { status: 400, message: "Ce matricule est deja utilise." };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } }
    });
  }

  static async deleteUser(userId: number) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw { status: 404, message: "Utilisateur introuvable." };

    const randomPassword = randomBytes(32).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(randomPassword, salt);

    await prisma.userRole.deleteMany({ where: { user_id: userId } });

    return prisma.user.update({
      where: { id: userId },
      data: {
        status: "INACTIVE",
        account_status: "ARCHIVED",
        password_hash,
        termination_date: new Date()
      }
    });
  }
}
