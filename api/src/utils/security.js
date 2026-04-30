import argon2 from 'argon2';
export const hashPassword = (password) => argon2.hash(password, { type: argon2.argon2id });
export const verifyPassword = (hash, password) => argon2.verify(hash, password);
export const getSessionFromCookie = (req) => {
    const cookie = req.cookies['session_id'];
    return typeof cookie === 'string' ? cookie : null;
};
