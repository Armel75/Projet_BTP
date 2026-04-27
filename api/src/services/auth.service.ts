import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export class AuthService {
  static async registerUser(data: any, reqIp?: string, reqUserAgent?: string) {
    const { firstname, lastname, email, password, username, matricule, roleCode = "CHEF_PROJET" } = data;

    if (!firstname || !lastname || !email || !password || !username || !matricule) {
      throw { status: 400, message: "Missing required fields (matricule, username, password, email, firstname, lastname)." };
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
      if (existingUser.email === email) throw { status: 400, message: "Email already in use." };
      if (existingUser.username === username) throw { status: 400, message: "Username already in use." };
      if (existingUser.matricule === matricule) throw { status: 400, message: "Matricule already in use." };
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: "Default Tenant" } });
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
        roles: user.userRoles?.map((ur: any) => ur.role?.code) || [] 
      }, 
      env.JWT_SECRET, 
      { expiresIn: '8h' }
    );

    const { password_hash: _, ...safeUser } = user;
    return { token, user: safeUser, session };
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

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser };
  }
}
