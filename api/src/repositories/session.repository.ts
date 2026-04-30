import { prisma } from '../../prisma/prismaClient.js';

export const SessionRepository = {
  create: (userId: number, expiresAt: Date, ip?: string, userAgent?: string, device?: string) =>
    prisma.session.create({ data: { userId, expiresAt, ip, userAgent, device } }),
  findValidSession: (id: string) =>
    prisma.session.findFirst({
      where: { id, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    }),
  revoke: (id: string) =>
    prisma.session.update({ where: { id }, data: { revoked: true } }),
  revokeAllForUser: (userId: number) =>
    prisma.session.updateMany({ where: { userId }, data: { revoked: true } }),
  getUserSessions: (userId: number) =>
    prisma.session.findMany({ where: { userId, revoked: false, expiresAt: { gt: new Date() } } }),
};