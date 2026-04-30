import argon2 from 'argon2';
import { Request } from 'express';

export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

export const getSessionFromCookie = (req: Request): string | null => {
  const cookie = req.cookies['session_id'];
  return typeof cookie === 'string' ? cookie : null;
};
