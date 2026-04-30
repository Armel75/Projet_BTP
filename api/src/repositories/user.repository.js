import { prisma } from '../../prisma/prismaClient.js';
export const UserRepository = {
    findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    incrementFailedLogins: (id) => prisma.user.update({ where: { id }, data: { failedLogins: { increment: 1 } } }),
    resetFailedLogins: (id) => prisma.user.update({ where: { id }, data: { failedLogins: 0 } }),
    updateLastLogin: (id) => prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),
};
