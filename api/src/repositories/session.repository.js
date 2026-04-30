import { prisma } from '../../prisma/prismaClient.js';
export const SessionRepository = {
    create: (userId, expiresAt, ip, userAgent, device) => prisma.session.create({ data: { userId, expiresAt, ip, userAgent, device } }),
    findValidSession: (id) => prisma.session.findFirst({
        where: { id, revoked: false, expiresAt: { gt: new Date() } },
        include: { user: true },
    }),
    revoke: (id) => prisma.session.update({ where: { id }, data: { revoked: true } }),
    revokeAllForUser: (userId) => prisma.session.updateMany({ where: { userId }, data: { revoked: true } }),
    getUserSessions: (userId) => prisma.session.findMany({ where: { userId, revoked: false, expiresAt: { gt: new Date() } } }),
};
