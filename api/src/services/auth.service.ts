import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { RbacService } from './rbac.service.js';

const MATRICULE_REGEX = /^[A-Z]{2}[0-9]+$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthService {
  static async registerUser(data: any, reqIp?: string, reqUserAgent?: string) {
    const firstname = String(data.firstname ?? '').trim();
    const lastname = String(data.lastname ?? '').trim();
    const email = String(data.email ?? '').trim().toLowerCase();
    const username = String(data.username ?? '').trim();
    const matricule = String(data.matricule ?? '').trim();
    const password = String(data.password ?? '');
    const confirmPassword = String(data.confirmPassword ?? '');
    const roleCode = data.roleCode ?? "CHEF_PROJET";

    if (!firstname) throw { status: 400, message: "Le prénom est obligatoire." };
    if (!lastname) throw { status: 400, message: "Le nom est obligatoire." };
    if (!email) throw { status: 400, message: "L'email est obligatoire." };
    if (!username) throw { status: 400, message: "Le nom d'utilisateur est obligatoire." };
    if (!matricule) throw { status: 400, message: "Le matricule est obligatoire." };
    if (!password) throw { status: 400, message: "Le mot de passe est obligatoire." };
    if (!confirmPassword) throw { status: 400, message: "La confirmation du mot de passe est obligatoire." };

    if (!SIMPLE_EMAIL_REGEX.test(email)) {
      throw { status: 400, message: "Format d'email invalide." };
    }

    if (username.length < 3) {
      throw { status: 400, message: "Le nom d'utilisateur doit contenir au moins 3 caracteres." };
    }

    if (password.length < 8) {
      throw { status: 400, message: "Le mot de passe doit contenir au moins 8 caracteres." };
    }

    if (password !== confirmPassword) {
      throw { status: 400, message: "Le mot de passe et sa confirmation ne correspondent pas." };
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

    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: process.env.SEED_TENANT_NAME ?? 'SOREPCO' } });
    }

    const user = await prisma.user.create({
      data: { 
        firstname, 
        lastname, 
        email, 
        username, 
        matricule, 
        password_hash,
        status: "ACTIVE", 
        tenant_id: tenant.id
      }
    });

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (role) {
      await prisma.userRole.create({
        data: { user_id: user.id, role_id: role.id }
      });
    }

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        ip: reqIp,
        userAgent: reqUserAgent,
        device: "web"
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, sessionId: session.id, tenant_id: user.tenant_id }, env.JWT_SECRET, { expiresIn: '8h' });
    const { password_hash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  static async loginUser(data: any, reqIp?: string, reqUserAgent?: string) {
    const { email, username, password } = data;
    const loginIdentifier = email || username;

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: loginIdentifier }, { username: loginIdentifier }] },
      include: { userRoles: { include: { role: true } } }
    });

    if (!user) throw { status: 401, message: "Invalid credentials." };

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw { status: 401, message: "Invalid credentials." };

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        ip: reqIp,
        userAgent: reqUserAgent,
        device: "web"
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        sessionId: session.id, 
        tenant_id: user.tenant_id,
        // Embed resolved permissions (not role names) for fast-path middleware checks.
        // Permissions are re-verified from DB on sensitive operations.
        permissions: await RbacService.getUserPermissions(user.id),
      }, 
      env.JWT_SECRET, 
      { expiresIn: '8h' }
    );

    const permissions = await RbacService.getUserPermissions(user.id);
    const { password_hash: _, ...safeUser } = user;
    return { token, user: { ...safeUser, permissions }, session };
  }

  static async logoutUser(sessionId: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revoked: true }
    });
  }

  static async getCurrentUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } }
    });

    if (!user) throw { status: 404, message: "User not found." };

    const permissions = await RbacService.getUserPermissions(userId);
    const { password_hash: _, ...safeUser } = user;
    return { user: { ...safeUser, permissions } };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: tokenHash,
        password_reset_expires: expires,
      },
    });

    return { email: user.email, token: rawToken };
  }

  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: tokenHash,
        password_reset_expires: { gte: new Date() },
      },
    });

    if (!user) throw { status: 400, message: "Token invalide ou expiré." };

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });
  }
}
