import { prisma } from '../../prisma/prismaClient.js';

export const UserRepository = {
  findByUsername: (username: string) =>
    prisma.user.findUnique({ where: { username } }),
  findById: (id: number) =>
    prisma.user.findUnique({ where: { id } }),
  incrementFailedLogins: (id: number) =>
    prisma.user.update({ where: { id }, data: { failedLogins: { increment: 1 } } }),
  resetFailedLogins: (id: number) =>
    prisma.user.update({ where: { id }, data: { failedLogins: 0 } }),
  updateLastLogin: (id: number) =>
    prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),
};