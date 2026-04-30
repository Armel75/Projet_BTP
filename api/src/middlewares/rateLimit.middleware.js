import rateLimit from 'express-rate-limit';
export const rateLimitLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10, // 10 tentatives max par IP
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
